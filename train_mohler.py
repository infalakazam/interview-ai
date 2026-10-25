"""Train and export PrepAI's classical ML Mohler answer scorer.

Compares three traditional regressors with grouped cross-validation, reports an
untouched question-group holdout, then fits the selected pipeline on all rows.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from datasets import load_dataset
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_val_score
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler
from sklearn.svm import LinearSVR
from backend.model_features import (
    answer_pair_text,
    combined_text,
    comparison_features,
)

ROOT = Path(__file__).resolve().parent
ARTIFACT_FILE = ROOT / "prepai_mohler_model.joblib"
METRICS_FILE = ROOT / "mohler_model_metrics.json"
DATASET_NAME = "nkazi/MohlerASAG"
SAF_DATASET = "Short-Answer-Feedback/saf_communication_networks_english"
JORGPT_CSV = "https://zenodo.org/records/18981627/files/dataset_en.csv?download=1"


def normalize_group(question: str) -> str:
    return re.sub(r"\W+", " ", question.casefold()).strip()


def compose_text(question: str, reference: str, answer: str) -> str:
    return f"Question: {question}\nReference answer: {reference}\nStudent answer: {answer}"


def clean_text_column(values: pd.Series) -> pd.Series:
    return values.fillna("").astype(str).str.replace("<br>", " ", regex=False).str.strip()


def load_training_data() -> pd.DataFrame:
    """Load human-scored Mohler, SAF, and JorGPT answer examples."""
    moh = load_dataset(DATASET_NAME, name="cleaned", split="open_ended").to_pandas()
    moh = moh.rename(columns={"instructor_answer": "reference_answer", "student_answer": "student_answer", "score_avg": "score"})
    moh = moh[["question", "reference_answer", "student_answer", "score"]].copy()
    moh["source"] = "Mohler"

    saf_splits = load_dataset(SAF_DATASET)
    saf_parts = [saf_splits[name].to_pandas() for name in ("train", "validation") if name in saf_splits]
    if not saf_parts:
        raise ValueError("The SAF dataset did not provide train or validation rows.")
    saf = pd.concat(saf_parts, ignore_index=True).rename(columns={"provided_answer": "student_answer"})
    saf["score"] = pd.to_numeric(saf["score"], errors="coerce")
    question_max = saf.groupby("question")["score"].transform("max")
    saf["score"] = (saf["score"] / question_max.replace(0, np.nan)) * 5.0
    saf = saf[["question", "reference_answer", "student_answer", "score"]].copy()
    saf["source"] = "SAF Communication Networks"

    jorgpt = load_dataset("csv", data_files=JORGPT_CSV, split="train").to_pandas()
    jorgpt = jorgpt.rename(columns={"question_text": "question", "student_answer": "student_answer", "ideal_answer": "reference_answer"})
    jorgpt["score"] = pd.to_numeric(jorgpt["teacher_grade"], errors="coerce") / 2.0
    jorgpt = jorgpt[["question", "reference_answer", "student_answer", "score"]].copy()
    jorgpt["source"] = "JorGPT English"

    frame = pd.concat([moh, saf, jorgpt], ignore_index=True)
    for column in ("question", "reference_answer", "student_answer"):
        frame[column] = clean_text_column(frame[column])
    frame["score"] = pd.to_numeric(frame["score"], errors="coerce")
    frame = frame[
        frame["question"].ne("")
        & frame["reference_answer"].ne("")
        & frame["student_answer"].ne("")
        & frame["score"].between(0, 5)
    ].drop_duplicates(subset=["question", "reference_answer", "student_answer", "score"])
    frame = frame.reset_index(drop=True)
    if frame.empty:
        raise ValueError("No usable answer-grading examples were loaded.")
    return frame


BASELINE_NAME = "Baseline TF-IDF + LinearSVR"


def build_baseline_pipeline(regressor=None) -> Pipeline:
    return Pipeline(
        [
            ("text", FunctionTransformer(combined_text, validate=False)),
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    stop_words="english",
                    ngram_range=(1, 2),
                    max_features=12000,
                    sublinear_tf=True,
                ),
            ),
            ("regressor", regressor or LinearSVR(C=0.5, epsilon=0.1, random_state=42, max_iter=20000)),
        ]
    )


def build_hybrid_features() -> FeatureUnion:
    return FeatureUnion(
        [
            (
                "combined_word_tfidf",
                Pipeline(
                    [
                        ("text", FunctionTransformer(combined_text, validate=False)),
                        ("tfidf", TfidfVectorizer(lowercase=True, strip_accents="unicode", stop_words="english", ngram_range=(1, 2), max_features=14000, min_df=2, sublinear_tf=True)),
                    ]
                ),
            ),
            (
                "answer_pair_word_tfidf",
                Pipeline(
                    [
                        ("text", FunctionTransformer(answer_pair_text, validate=False)),
                        ("tfidf", TfidfVectorizer(lowercase=True, strip_accents="unicode", stop_words="english", ngram_range=(1, 2), max_features=9000, min_df=2, sublinear_tf=True)),
                    ]
                ),
            ),
            (
                "answer_pair_char_tfidf",
                Pipeline(
                    [
                        ("text", FunctionTransformer(answer_pair_text, validate=False)),
                        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=18000, min_df=2, sublinear_tf=True)),
                    ]
                ),
            ),
            (
                "answer_comparison",
                Pipeline(
                    [
                        ("features", FunctionTransformer(comparison_features, validate=False)),
                        ("scale", StandardScaler(with_mean=False)),
                    ]
                ),
            ),
        ],
        n_jobs=1,
    )


def build_hybrid_pipeline(regressor) -> Pipeline:
    return Pipeline([("features", build_hybrid_features()), ("regressor", regressor)])


def model_candidates() -> dict[str, Pipeline]:
    return {
        BASELINE_NAME: build_baseline_pipeline(),
        "Hybrid Ridge (alpha=0.5)": build_hybrid_pipeline(Ridge(alpha=0.5)),
        "Hybrid Ridge (alpha=2.0)": build_hybrid_pipeline(Ridge(alpha=2.0)),
        "Hybrid LinearSVR (C=0.25)": build_hybrid_pipeline(LinearSVR(C=0.25, epsilon=0.08, random_state=42, max_iter=20000)),
        "Hybrid LinearSVR (C=0.75)": build_hybrid_pipeline(LinearSVR(C=0.75, epsilon=0.08, random_state=42, max_iter=20000)),
    }


def main() -> None:
    frame = load_training_data()
    target = frame["score"].astype(float).to_numpy()
    if target.min() < 0 or target.max() > 5:
        raise ValueError(f"Expected normalized training scores on a 0-5 scale; observed {target.min()} to {target.max()}.")

    groups = frame["question"].map(normalize_group).to_numpy()
    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(split.split(frame, target, groups))
    cv_splits = min(5, len(np.unique(groups[train_idx])))
    if cv_splits < 2:
        raise ValueError("Not enough distinct questions for grouped model selection.")
    cv = GroupKFold(n_splits=cv_splits)

    comparisons = {}
    candidates = model_candidates()
    for name, pipeline in candidates.items():
        negative_mae = cross_val_score(
            pipeline,
            frame.iloc[train_idx],
            target[train_idx],
            groups=groups[train_idx],
            cv=cv,
            scoring="neg_mean_absolute_error",
            n_jobs=1,
        )
        comparisons[name] = {
            "grouped_cv_mae_mean": float(-negative_mae.mean()),
            "grouped_cv_mae_std": float(negative_mae.std()),
        }

    selected_name = min(comparisons, key=lambda key: comparisons[key]["grouped_cv_mae_mean"])
    test_frame = frame.iloc[test_idx]
    baseline = model_candidates()[BASELINE_NAME]
    baseline.fit(frame.iloc[train_idx], target[train_idx])
    selected = model_candidates()[selected_name]
    selected.fit(frame.iloc[train_idx], target[train_idx])
    baseline_predictions = np.clip(baseline.predict(test_frame), 0, 5)
    predictions = np.clip(selected.predict(test_frame), 0, 5)
    baseline_metrics = {
        "mae": float(mean_absolute_error(target[test_idx], baseline_predictions)),
        "rmse": float(np.sqrt(mean_squared_error(target[test_idx], baseline_predictions))),
        "r2": float(r2_score(target[test_idx], baseline_predictions)),
    }
    selected_metrics = {
        "mae": float(mean_absolute_error(target[test_idx], predictions)),
        "rmse": float(np.sqrt(mean_squared_error(target[test_idx], predictions))),
        "r2": float(r2_score(target[test_idx], predictions)),
    }
    metrics = {
        "datasets": {
            "Mohler": f"{DATASET_NAME} cleaned/open_ended; CC BY 4.0",
            "SAF Communication Networks": f"{SAF_DATASET} train + validation; CC BY 4.0; per-question score normalization",
            "JorGPT English": "Zenodo record 18981627 dataset_en.csv; teacher grades only; grade 0-10 divided by 2; CC BY 4.0",
        },
        "rows_by_dataset": {str(name): int(count) for name, count in frame["source"].value_counts().items()},
        "rows": int(len(frame)),
        "distinct_questions": int(pd.Series(groups).nunique()),
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "question_overlap": int(len(set(groups[train_idx]) & set(groups[test_idx]))),
        "score_scale": "0-5",
        "feature_pipeline": "Combined and answer-pair word TF-IDF, character n-grams, and explicit answer-reference overlap/length features",
        "model_comparison": comparisons,
        "selected_model": selected_name,
        "baseline_holdout": baseline_metrics,
        "selected_holdout": selected_metrics,
        "holdout_mae": selected_metrics["mae"],
        "holdout_rmse": selected_metrics["rmse"],
        "holdout_r2": selected_metrics["r2"],
        "split": "GroupShuffleSplit by normalized question, test_size=0.2, random_state=42",
    }

    deployment_model = model_candidates()[selected_name]
    deployment_model.fit(frame, target)
    joblib.dump(
        {
            "pipeline": deployment_model,
            "feature_version": 3,
            "target_min": 0.0,
            "target_max": 5.0,
            "dataset": "Mohler + SAF Communication Networks + JorGPT English (human grades)",
            "training_rows": len(frame),
            "selected_model": selected_name,
            "metrics": metrics,
        },
        ARTIFACT_FILE,
    )
    METRICS_FILE.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"Saved model artifact: {ARTIFACT_FILE}")
    print(f"Saved held-out metrics: {METRICS_FILE}")


if __name__ == "__main__":
    main()
