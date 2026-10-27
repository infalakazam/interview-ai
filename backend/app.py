"""FastAPI adapter for PrepAI's classical ML Mohler answer scorer."""

from __future__ import annotations

import base64
from datetime import datetime
import hashlib
import hmac
import json
import binascii
from pathlib import Path
import os
import re
import time
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
ARTIFACT_PATH = ROOT / "prepai_mohler_model.joblib"
load_dotenv(ROOT / ".env")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]
SESSION_SECRET = os.getenv("SESSION_SECRET", "").strip()

app = FastAPI(title="PrepAI Mohler scoring API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Serve only the public frontend assets when deployed as a single Render web
# service. An explicit allowlist prevents exposing .env, .git, or source files.
PUBLIC_ASSETS = {
    "index.html", "login.html", "start-practice.html", "practice-by-topic.html",
    "practice-session.html", "feedback.html", "question-bank.html", "short-notes.html",
    "performance-report.html", "skill-gaps.html", "profile-settings.html",
    "mock-interview.html", "prepare.html", "topic-notes.html",
    "login.js", "main.js", "style.css", "questions.json", "README.md",
}


class ScoreRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    reference_answer: str = Field(default="", max_length=12000)
    student_answer: str = Field(min_length=1, max_length=20000)
    key_concepts: list[str] = Field(default_factory=list, max_length=100)
    current_difficulty: str = "Medium"
    recent_scores: list[float] = Field(default_factory=list, max_length=20)


class ScoreResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    score_out_of_5: float = Field(ge=0, le=5)
    matched_concepts: list[str]
    recommended_difficulty: str
    method: str
    note: str


class PracticeSessionRecord(BaseModel):
    id: str = Field(min_length=1, max_length=128)
    topic: str = Field(default="", max_length=200)
    difficulty: str = Field(default="", max_length=40)
    mode: str = Field(default="practice", max_length=40)
    role: str = Field(default="", max_length=200)
    date: datetime
    answers: list[dict[str, Any]] = Field(default_factory=list, max_length=100)


class PracticeHistorySync(BaseModel):
    sessions: list[PracticeSessionRecord] = Field(default_factory=list, max_length=100)


model: Any | None = None
model_metadata: dict[str, Any] = {}
model_status = "The trained Mohler artifact is missing. Run train_mohler.py to create it."
LEVELS = ["Easy", "Medium", "Hard"]
_TOKEN_RE = re.compile(r"[a-z0-9+#.]+", re.IGNORECASE)
_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "by", "for",
    "from", "has", "have", "in", "into", "is", "it", "its", "of", "on", "or",
    "that", "the", "their", "this", "to", "was", "were", "with", "which", "when",
}


def load_model() -> None:
    global model, model_metadata, model_status
    if not ARTIFACT_PATH.is_file():
        return
    try:
        import joblib

        artifact = joblib.load(ARTIFACT_PATH)
        if artifact.get("feature_version") not in {2, 3} or "pipeline" not in artifact:
            raise ValueError("Unsupported model artifact. Re-run train_mohler.py.")
        model = artifact["pipeline"]
        model_metadata = artifact
        model_status = f"PrepAI {artifact.get('selected_model', 'regression')} model loaded."
    except Exception as error:
        model = None
        model_status = f"Model could not be loaded: {type(error).__name__}: {error}"


load_model()


def _token_segment(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def create_session_token(sub: str, email: str, name: str) -> str:
    if not SESSION_SECRET:
        return ""
    payload = _token_segment(json.dumps({
        "sub": sub,
        "email": email,
        "name": name,
        "exp": int(time.time()) + 60 * 60 * 24 * 7,
    }, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(SESSION_SECRET.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest()
    return f"{payload}.{_token_segment(signature)}"


def authenticated_user(authorization: str | None) -> dict[str, str]:
    if not authorization or not authorization.startswith("Bearer ") or not SESSION_SECRET:
        raise HTTPException(status_code=401, detail="Sign in again to sync your practice history.")
    try:
        payload, signature = authorization[7:].split(".", 1)
        expected = hmac.new(SESSION_SECRET.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, supplied):
            raise ValueError("Invalid signature")
        decoded = base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))
        user = json.loads(decoded)
        if not user.get("sub") or int(user.get("exp", 0)) <= int(time.time()):
            raise ValueError("Expired session")
        return {
            "sub": str(user["sub"]),
            "email": str(user.get("email", "")),
            "name": str(user.get("name", "")),
        }
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, binascii.Error) as error:
        raise HTTPException(status_code=401, detail="Your sign-in expired. Sign in again to sync history.") from error


def connect_database():
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="PostgreSQL is not configured; browser history is still available.")
    try:
        import psycopg

        return psycopg.connect(DATABASE_URL)
    except Exception as error:
        raise HTTPException(status_code=503, detail="PostgreSQL is unavailable; browser history is still available.") from error


def ensure_database_schema(connection: Any) -> None:
    connection.execute("""
        CREATE TABLE IF NOT EXISTS prepai_users (
            google_sub TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            display_name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    connection.execute("""
        CREATE TABLE IF NOT EXISTS practice_sessions (
            google_sub TEXT NOT NULL REFERENCES prepai_users(google_sub) ON DELETE CASCADE,
            session_id TEXT NOT NULL,
            session_date TIMESTAMPTZ NOT NULL,
            session_data JSONB NOT NULL,
            PRIMARY KEY (google_sub, session_id)
        )
    """)


def upsert_database_user(connection: Any, user: dict[str, str]) -> None:
    connection.execute("""
        INSERT INTO prepai_users (google_sub, email, display_name)
        VALUES (%s, %s, %s)
        ON CONFLICT (google_sub) DO UPDATE SET
            email = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            updated_at = NOW()
    """, (user["sub"], user["email"], user["name"]))


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "api_ready": True,
        "model_ready": model is not None,
        "model_file": ARTIFACT_PATH.name,
        "selected_model": model_metadata.get("selected_model"),
        "message": model_status,
    }


@app.get("/api/auth/config")
def auth_config() -> dict[str, Any]:
    """Expose the public Google OAuth client ID to the browser login page."""
    return {
        "google_enabled": bool(GOOGLE_CLIENT_ID),
        "google_client_id": GOOGLE_CLIENT_ID,
        "database_configured": bool(DATABASE_URL),
        "history_sync_enabled": bool(DATABASE_URL and SESSION_SECRET),
    }


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=20, max_length=10000)


@app.post("/api/auth/google")
def authenticate_google(payload: GoogleCredential) -> dict[str, Any]:
    """Verify Google's signed ID token before the client stores profile details."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server.")
    try:
        from google.auth.exceptions import GoogleAuthError
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        claims = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ImportError as error:
        raise HTTPException(status_code=503, detail="Install the google-auth package to enable sign-in.") from error
    except (ValueError, GoogleAuthError) as error:
        raise HTTPException(status_code=401, detail="Google could not verify this sign-in. Please try again.") from error

    if not claims.get("email_verified") or not claims.get("sub") or not claims.get("email"):
        raise HTTPException(status_code=401, detail="Google did not provide a verified account email.")
    user = {
        "sub": str(claims["sub"]),
        "email": str(claims["email"]),
        "name": str(claims.get("name") or claims["email"].split("@")[0]),
        "picture": str(claims.get("picture") or ""),
        "history_sync_enabled": bool(DATABASE_URL and SESSION_SECRET),
    }
    session_token = create_session_token(user["sub"], user["email"], user["name"])
    if session_token:
        user["session_token"] = session_token
    if user["history_sync_enabled"]:
        try:
            with connect_database() as connection:
                ensure_database_schema(connection)
                upsert_database_user(connection, user)
        except Exception:
            # Keep sign-in available with browser-only history when Postgres is temporarily down.
            user["database_available"] = False
        else:
            user["database_available"] = True
    return user


@app.get("/api/history")
def get_practice_history(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = authenticated_user(authorization)
    try:
        with connect_database() as connection:
            ensure_database_schema(connection)
            upsert_database_user(connection, user)
            rows = connection.execute(
                "SELECT session_data FROM practice_sessions WHERE google_sub = %s ORDER BY session_date DESC LIMIT 100",
                (user["sub"],),
            ).fetchall()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=503, detail="PostgreSQL could not load history. Your browser copy is preserved.") from error
    return [row[0] for row in rows]


@app.put("/api/history")
def sync_practice_history(
    payload: PracticeHistorySync,
    authorization: str | None = Header(default=None),
) -> dict[str, int]:
    user = authenticated_user(authorization)
    try:
        from psycopg.types.json import Jsonb

        with connect_database() as connection:
            ensure_database_schema(connection)
            upsert_database_user(connection, user)
            for session in payload.sessions:
                session_data = session.model_dump(mode="json")
                connection.execute("""
                    INSERT INTO practice_sessions (google_sub, session_id, session_date, session_data)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (google_sub, session_id) DO UPDATE SET
                        session_date = EXCLUDED.session_date,
                        session_data = EXCLUDED.session_data
                """, (user["sub"], session.id, session.date, Jsonb(session_data)))
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=503, detail="PostgreSQL could not save history. Your browser copy is preserved.") from error
    return {"saved": len(payload.sessions)}


@app.delete("/api/history")
def clear_practice_history(authorization: str | None = Header(default=None)) -> dict[str, int]:
    user = authenticated_user(authorization)
    try:
        with connect_database() as connection:
            ensure_database_schema(connection)
            cursor = connection.execute("DELETE FROM practice_sessions WHERE google_sub = %s", (user["sub"],))
            deleted = cursor.rowcount
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=503, detail="PostgreSQL could not clear history. Your server copy is unchanged.") from error
    return {"deleted": deleted}


def compose_text(question: str, reference_answer: str, student_answer: str) -> str:
    return (
        f"Question: {question}\nReference answer: {reference_answer}"
        f"\nStudent answer: {student_answer}"
    )


def recommend_difficulty(score: int, current: str, previous: list[float]) -> str:
    """Increase/decrease one level using the recent score average."""
    recent = [max(0.0, min(100.0, float(value))) for value in previous[-2:]]
    average = sum(recent + [score]) / (len(recent) + 1)
    index = LEVELS.index(current) if current in LEVELS else 1
    if average >= 78:
        index = min(len(LEVELS) - 1, index + 1)
    elif average < 42:
        index = max(0, index - 1)
    return LEVELS[index]


def _content_terms(text: str) -> set[str]:
    """Return useful lexical evidence while ignoring common function words."""
    terms = {token.casefold() for token in _TOKEN_RE.findall(text)}
    return {term for term in terms if term not in _STOP_WORDS and len(term) > 1}


def _concept_is_present(concept: str, answer_terms: set[str], answer: str) -> bool:
    normalized = concept.casefold().strip()
    if not normalized:
        return False
    if normalized in answer.casefold():
        return True
    concept_terms = _content_terms(normalized)
    # For a multiword concept, require most of its meaningful words. This
    # supports wording variation while avoiding credit for a single generic word.
    if len(concept_terms) >= 2:
        return len(concept_terms & answer_terms) / len(concept_terms) >= 0.67
    return bool(concept_terms & answer_terms)


def apply_relevance_guard(
    prediction: float, reference: str, answer: str, concepts: list[str]
) -> tuple[float, list[str]]:
    """Cap predictions with little evidence that the answer addresses the prompt."""
    reference_terms = _content_terms(reference)
    answer_terms = _content_terms(answer)
    overlap = reference_terms & answer_terms
    ref_coverage = len(overlap) / max(1, len(reference_terms))
    answer_precision = len(overlap) / max(1, len(answer_terms))
    matched = [concept for concept in concepts if _concept_is_present(concept, answer_terms, answer)]
    concept_coverage = len(matched) / max(1, len([c for c in concepts if c.strip()]))

    # The Mohler-trained regressor can over-credit fluent but unrelated text.
    # A conservative ceiling is safer than treating its raw score as certainty.
    if len(answer_terms) < 2:
        prediction = min(prediction, 1.0)
    elif ref_coverage < 0.05 and concept_coverage == 0:
        prediction = min(prediction, 0.75)
    elif ref_coverage < 0.12 and concept_coverage < 0.20 and answer_precision < 0.15:
        prediction = min(prediction, 1.5)
    return prediction, matched


@app.post("/api/score", response_model=ScoreResponse)
def score(payload: ScoreRequest) -> ScoreResponse:
    if model is None:
        raise HTTPException(status_code=503, detail=model_status)
    if not payload.reference_answer.strip():
        raise HTTPException(status_code=422, detail="A reference answer is required for this model.")

    if model_metadata and model_metadata.get("feature_version") == 3:
        model_input = [{
            "question": payload.question,
            "reference_answer": payload.reference_answer,
            "student_answer": payload.student_answer,
        }]
    else:
        # Keep compatibility with the original v2 TF-IDF artifact.
        model_input = [compose_text(payload.question, payload.reference_answer, payload.student_answer)]
    raw_prediction = float(model.predict(model_input)[0])
    raw_prediction, matched = apply_relevance_guard(
        raw_prediction,
        payload.reference_answer,
        payload.student_answer,
        payload.key_concepts,
    )
    score_out_of_5 = max(0.0, min(5.0, raw_prediction))
    score_100 = round(score_out_of_5 * 20)
    return ScoreResponse(
        score=score_100,
        score_out_of_5=round(score_out_of_5, 3),
        matched_concepts=matched,
        recommended_difficulty=recommend_difficulty(
            score_100, payload.current_difficulty, payload.recent_scores
        ),
        method="multi_dataset_tfidf_classical_ml",
        note=(
            "ML estimate with a relevance check against the reference answer and key concepts. "
            "The model was trained on Mohler, SAF communication-network, and JorGPT answers; "
            "technical paraphrases can still need human review."
        ),
    )


@app.get("/", include_in_schema=False)
def serve_home() -> FileResponse:
    return FileResponse(ROOT / "login.html")


@app.get("/{asset_path:path}", include_in_schema=False)
def serve_frontend_asset(asset_path: str) -> FileResponse:
    if asset_path not in PUBLIC_ASSETS:
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(ROOT / asset_path)
