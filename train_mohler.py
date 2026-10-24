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
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVR

ROOT = Path(__file__).resolve().parent
ARTIFACT_FILE = ROOT / "prepai_mohler_model.joblib"
METRICS_FILE = ROOT / "mohler_model_metrics.json"
DATASET_NAME = "nkazi/MohlerASAG"


def normalize_group(question: str) -> str:
    return re.sub(r"\W+", " ", question.casefold()).strip()


def compose_text(question: str, reference: str, answer: str) -> str:
    return f"Question: {question}\nReference answer: {reference}\nStudent answer: {answer}"


def build_pipeline(regressor) -> Pipeline:
    return Pipeline(
        [
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
            ("regressor", regressor),
        ]
    )


def model_candidates() -> dict[str, object]:
    return {
        "Ridge Regression": Ridge(alpha=2.0),
        "Linear Support Vector Regression": LinearSVR(C=0.5, epsilon=0.1, random_state=42, max_iter=10000),
        "Extra Trees Regression": ExtraTreesRegressor(
            n_estimators=180,
            min_samples_leaf=2,
            max_features=0.8,
            random_state=42,
            n_jobs=-1,
        ),
    }


def main() -> None:
    dataset = load_dataset(DATASET_NAME, name="cleaned", split="open_ended")
    frame = dataset.to_pandas()[
        ["question", "instructor_answer", "student_answer", "score_avg"]
    ].copy()
    for column in ["question", "instructor_answer", "student_answer"]:
        frame[column] = frame[column].fillna("").astype(str).str.strip()
    frame = frame[
        (frame["question"] != "")
        & (frame["instructor_answer"] != "")
        & (frame["student_answer"] != "")
        & frame["score_avg"].notna()
    ].reset_index(drop=True)
    if frame.empty:
        raise ValueError("No usable open-ended Mohler rows were loaded.")

    texts = [
        compose_text(question, reference, answer)
        for question, reference, answer in zip(
            frame["question"], frame["instructor_answer"], frame["student_answer"]
        )
    ]
    target = frame["score_avg"].astype(float).to_numpy()
    if target.min() < 0 or target.max() > 5:
        raise ValueError(f"Expected Mohler scores on a 0-5 scale; observed {target.min()} to {target.max()}.")

    groups = frame["question"].map(normalize_group).to_numpy()
    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(split.split(texts, target, groups))
    cv_splits = min(5, len(np.unique(groups[train_idx])))
    if cv_splits < 2:
        raise ValueError("Not enough distinct questions for grouped model selection.")
    cv = GroupKFold(n_splits=cv_splits)

    comparisons = {}
    for name, regressor in model_candidates().items():
        pipeline = build_pipeline(regressor)
        negative_mae = cross_val_score(
            pipeline,
            [texts[i] for i in train_idx],
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
    selected = build_pipeline(model_candidates()[selected_name])
    train_texts = [texts[i] for i in train_idx]
    test_texts = [texts[i] for i in test_idx]
    selected.fit(train_texts, target[train_idx])
    predictions = np.clip(selected.predict(test_texts), 0, 5)
    metrics = {
        "dataset": f"{DATASET_NAME}, cleaned/open_ended",
        "rows": int(len(frame)),
        "distinct_questions": int(pd.Series(groups).nunique()),
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "question_overlap": int(len(set(groups[train_idx]) & set(groups[test_idx]))),
        "score_scale": "0-5",
        "feature_pipeline": "TF-IDF word unigrams and bigrams over question, reference answer, and student answer",
        "model_comparison": comparisons,
        "selected_model": selected_name,
        "holdout_mae": float(mean_absolute_error(target[test_idx], predictions)),
        "holdout_rmse": float(np.sqrt(mean_squared_error(target[test_idx], predictions))),
        "holdout_r2": float(r2_score(target[test_idx], predictions)),
        "split": "GroupShuffleSplit by normalized question, test_size=0.2, random_state=42",
    }

    deployment_model = build_pipeline(model_candidates()[selected_name])
    deployment_model.fit(texts, target)
    joblib.dump(
        {
            "pipeline": deployment_model,
            "feature_version": 2,
            "target_min": 0.0,
            "target_max": 5.0,
            "dataset": f"{DATASET_NAME}/cleaned/open_ended",
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
