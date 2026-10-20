"""Run a manual watering prediction with the saved model pipeline."""

from pathlib import Path

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "random_forest_model.pkl"
FEATURES = ["plant_type", "soil_moisture", "temperature", "humidity", "water_level"]


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Saved model not found at {MODEL_PATH}. Run src/train_model.py first."
        )

    # Replace these sample inputs with the values you want to check.
    test_input = pd.DataFrame(
        [
            {
                "plant_type": "Aloe Vera",
                "soil_moisture": 25,
                "temperature": 30.5,
                "humidity": 80.0,
                "water_level": 3540,
            }
        ],
        columns=FEATURES,
    )

    model = joblib.load(MODEL_PATH)
    prediction = model.predict(test_input)[0]

    if prediction == 1:
        print("Prediction: NEEDS WATER")
    elif prediction == 0:
        print("Prediction: DOES NOT NEED WATER")
    else:
        print(f"Prediction: {prediction!r} (unrecognized watering_label)")

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(test_input)[0]
        classes = model.classes_
        probability_by_class = dict(zip(classes, probabilities))
        print(f"Probability - No Water: {probability_by_class.get(0, 0.0):.4f}")
        print(f"Probability - Needs Water: {probability_by_class.get(1, 0.0):.4f}")


if __name__ == "__main__":
    main()
