"""Compatibility entry point for the canonical Mohler scoring API.

Run either `uvicorn backend.app:app --reload --port 8000` or
`uvicorn ml_service:app --reload --port 8000` from the project folder.
Both commands serve the same API and the same exported model artifact.
"""

from backend.app import app

__all__ = ["app"]
