"""Evaluate the saved model on the deterministic held-out dataset split."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "plant-watering-dataset.csv"
MODEL_PATH = BASE_DIR / "models" / "random_forest_model.pkl"
FEATURES = ["plant_type", "soil_moisture", "temperature", "humidity", "water_level"]
TARGET = "watering_label"
RANDOM_STATE = 42


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}. Place the exported CSV there."
        )
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Saved model not found at {MODEL_PATH}. Run src/train_model.py first."
        )

    data = pd.read_csv(DATA_PATH)
    required = FEATURES + [TARGET]
    missing_columns = [column for column in required if column not in data.columns]
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")

    usable = data[required].dropna().copy()
    if usable.empty:
        raise ValueError("No complete records are available for evaluation.")
    X = usable[FEATURES]
    y = usable[TARGET]
    stratify = y if y.nunique() > 1 and y.value_counts().min() >= 2 else None
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=stratify
    )

    model = joblib.load(MODEL_PATH)
    predictions = model.predict(X_test)

    print(f"Accuracy: {accuracy_score(y_test, predictions):.4f}")
    print(f"Precision: {precision_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print(f"Recall: {recall_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print(f"F1 Score: {f1_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, predictions))
    print("\nClassification Report:")
    print(classification_report(y_test, predictions, zero_division=0))


if __name__ == "__main__":
    main()
