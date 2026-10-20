"""Inspect and minimally clean the exported plant watering dataset."""

from pathlib import Path

import pandas as pd


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "plant-watering-dataset.csv"
REQUIRED_COLUMNS = [
    "plant_type",
    "soil_moisture",
    "temperature",
    "humidity",
    "water_level",
    "watering_label",
]


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}. Place the exported CSV there."
        )

    data = pd.read_csv(DATA_PATH)
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in data.columns]
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")

    print(f"Total rows: {len(data)}")
    print(f"Column names: {list(data.columns)}")
    print("Missing values by column:")
    print(data.isna().sum().to_string())
    print("\nWatering label distribution:")
    print(data["watering_label"].value_counts(dropna=False).to_string())
    print("\nPlant type distribution:")
    print(data["plant_type"].value_counts(dropna=False).to_string())

    # Rows without a target or plant type cannot be used for supervised training.
    usable = data.dropna(subset=["watering_label", "plant_type"])
    removed = len(data) - len(usable)
    if removed:
        print(f"\nRows excluded from training due to missing target/plant_type: {removed}")
    print(f"Rows available after minimal checks: {len(usable)}")
    print("Sensor readings are left untouched; no values are fabricated or imputed.")


if __name__ == "__main__":
    main()
