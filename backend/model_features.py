"""Text and answer-comparison features used by the Mohler scorer."""

from __future__ import annotations

import re

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

_TOKEN_PATTERN = re.compile(r"[a-z0-9+#.]+", re.IGNORECASE)
_STOP_WORDS = set(ENGLISH_STOP_WORDS)


def _column(frame, name: str) -> list[str]:
    """Read a frame column or the one-row mapping used by the scoring API."""
    if isinstance(frame, dict):
        return [str(frame.get(name, "") or "")]
    if isinstance(frame, (list, tuple)) and frame and isinstance(frame[0], dict):
        return [str(row.get(name, "") or "") for row in frame]
    return [str(value or "") for value in frame[name]]


def combined_text(frame) -> list[str]:
    return [
        f"Question: {question}\nReference answer: {reference}\nStudent answer: {answer}"
        for question, reference, answer in zip(_column(frame, "question"), _column(frame, "reference_answer"), _column(frame, "student_answer"))
    ]


def answer_pair_text(frame) -> list[str]:
    return [
        f"Reference answer: {reference}\nStudent answer: {answer}"
        for reference, answer in zip(_column(frame, "reference_answer"), _column(frame, "student_answer"))
    ]


def student_answer_text(frame) -> list[str]:
    return _column(frame, "student_answer")


def reference_answer_text(frame) -> list[str]:
    return _column(frame, "reference_answer")


def _tokens(text: str) -> list[str]:
    return [token.casefold() for token in _TOKEN_PATTERN.findall(str(text or ""))]


def _content_tokens(text: str) -> list[str]:
    return [token for token in _tokens(text) if token not in _STOP_WORDS and len(token) > 1]


def comparison_features(frame) -> csr_matrix:
    """Explicitly measure answer coverage, overlap, and answer length."""
    features: list[list[float]] = []
    for question, reference, answer in zip(_column(frame, "question"), _column(frame, "reference_answer"), _column(frame, "student_answer")):
        reference_tokens = _content_tokens(reference)
        answer_tokens = _content_tokens(answer)
        question_tokens = _content_tokens(question)
        reference_set = set(reference_tokens)
        answer_set = set(answer_tokens)
        question_set = set(question_tokens)
        overlap = reference_set & answer_set
        question_overlap = question_set & answer_set
        precision = len(overlap) / max(1, len(answer_set))
        recall = len(overlap) / max(1, len(reference_set))
        f1 = 2 * precision * recall / max(1e-8, precision + recall)
        union = reference_set | answer_set
        ref_bigrams = set(zip(reference_tokens, reference_tokens[1:]))
        answer_bigrams = set(zip(answer_tokens, answer_tokens[1:]))
        bigram_union = ref_bigrams | answer_bigrams
        features.append([
            np.log1p(len(reference_tokens)),
            np.log1p(len(answer_tokens)),
            np.log1p(len(str(reference or ""))),
            np.log1p(len(str(answer or ""))),
            len(answer_tokens) / max(1, len(reference_tokens)),
            len(overlap),
            precision,
            recall,
            f1,
            len(overlap) / max(1, len(union)),
            len(question_overlap) / max(1, len(question_set)),
            len(ref_bigrams & answer_bigrams) / max(1, len(bigram_union)),
            len(answer_set) / max(1, len(answer_tokens)),
            len(reference_set) / max(1, len(reference_tokens)),
            min(1.0, len(answer_tokens) / 40),
        ])
    return csr_matrix(np.asarray(features, dtype=np.float32))
