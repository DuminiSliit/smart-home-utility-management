"""Print and optionally chart Random Forest feature importances."""

from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "random_forest_model.pkl"
CHART_PATH = BASE_DIR / "models" / "feature_importance.png"


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Saved model not found at {MODEL_PATH}. Run src/train_model.py first."
        )

    model = joblib.load(MODEL_PATH)
    if not hasattr(model, "named_steps"):
        raise TypeError("Expected the saved model to be a scikit-learn Pipeline.")

    preprocessing = model.named_steps.get("preprocessing")
    classifier = model.named_steps.get("classifier")
    if preprocessing is None or classifier is None:
        raise ValueError("Pipeline must contain 'preprocessing' and 'classifier' steps.")
    if not hasattr(classifier, "feature_importances_"):
        raise TypeError("The pipeline classifier does not expose feature_importances_.")

    # ColumnTransformer and OneHotEncoder provide names for the expanded plant_type
    # categories, followed by the passthrough numeric features.
    try:
        feature_names = preprocessing.get_feature_names_out()
    except (AttributeError, ValueError) as error:
        raise RuntimeError(
            "Could not obtain transformed feature names from the saved preprocessing pipeline."
        ) from error

    importances = classifier.feature_importances_
    if len(feature_names) != len(importances):
        raise ValueError(
            "Transformed feature name count does not match the model importance count."
        )

    results = pd.DataFrame({"feature": feature_names, "importance": importances})
    results = results.sort_values("importance", ascending=False, ignore_index=True)
    print("Feature importances (highest to lowest):")
    for row in results.itertuples(index=False):
        print(f"{row.feature}: {row.importance:.6f}")

    CHART_PATH.parent.mkdir(parents=True, exist_ok=True)
    chart_data = results.sort_values("importance", ascending=True)
    height = max(3.5, 0.4 * len(chart_data))
    figure, axis = plt.subplots(figsize=(10, height))
    axis.barh(chart_data["feature"], chart_data["importance"])
    axis.set_xlabel("Importance")
    axis.set_title("Random Forest Feature Importance")
    figure.tight_layout()
    figure.savefig(CHART_PATH, dpi=150)
    plt.close(figure)
    print(f"Saved chart to: {CHART_PATH}")


if __name__ == "__main__":
    main()
