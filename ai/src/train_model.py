"""Train a development Random Forest model from the exported CSV dataset."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


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

    data = pd.read_csv(DATA_PATH)
    required = FEATURES + [TARGET]
    missing_columns = [column for column in required if column not in data.columns]
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")

    # Use only complete feature/target records; never fabricate sensor readings.
    usable = data[required].dropna().copy()
    if usable.empty:
        raise ValueError("No complete records are available for training.")
    if usable[TARGET].nunique() < 2:
        raise ValueError("Training requires at least two watering_label classes.")

    X = usable[FEATURES]
    y = usable[TARGET]
    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=stratify,
    )

    print(f"Training records: {len(X_train)}")
    print(f"Testing records: {len(X_test)}")
    print("Training class distribution:")
    print(y_train.value_counts().sort_index().to_string())

    preprocessing = ColumnTransformer(
        transformers=[("plant_type", OneHotEncoder(handle_unknown="ignore"), ["plant_type"])],
        remainder="passthrough",
    )
    model = Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            ("classifier", RandomForestClassifier(random_state=RANDOM_STATE)),
        ]
    )
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    print(f"Accuracy: {accuracy_score(y_test, predictions):.4f}")
    print(f"Precision: {precision_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print(f"Recall: {recall_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print(f"F1 Score: {f1_score(y_test, predictions, average='weighted', zero_division=0):.4f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Saved development model to: {MODEL_PATH}")

    # Final research results must be generated later using real controlled experimental data.


if __name__ == "__main__":
    main()
