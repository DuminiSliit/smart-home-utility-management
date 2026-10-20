"""FastAPI service exposing the saved plant watering classifier."""

from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "random_forest_model.pkl"
FEATURE_COLUMNS = [
    "plant_type",
    "soil_moisture",
    "temperature",
    "humidity",
    "water_level",
]


class PredictionRequest(BaseModel):
    plant_type: str
    soil_moisture: float = Field(ge=0, le=100)
    temperature: float = Field(ge=-50, le=80, description="Temperature in degrees Celsius")
    humidity: float = Field(ge=0, le=100)
    water_level: float = Field(ge=0)

    @field_validator("plant_type")
    @classmethod
    def plant_type_must_not_be_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("plant_type must not be empty")
        return value


class PredictionResponse(BaseModel):
    prediction: int
    label: str
    probability_no_water: Optional[float] = None
    probability_needs_water: Optional[float] = None


model = joblib.load(MODEL_PATH)

app = FastAPI(title="Plant Watering AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "Plant Watering AI API"}


@app.get("/health")
def health() -> dict[str, object]:
    return {"status": "healthy", "model_loaded": model is not None}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    input_data = pd.DataFrame(
        [request.model_dump()],
        columns=FEATURE_COLUMNS,
    )
    prediction = int(model.predict(input_data)[0])
    if prediction not in (0, 1):
        raise HTTPException(status_code=500, detail="Model returned an unsupported watering label.")

    probabilities: dict[int, float] = {}
    if callable(getattr(model, "predict_proba", None)):
        raw_probabilities = model.predict_proba(input_data)[0]
        probabilities = {
            int(class_label): float(probability)
            for class_label, probability in zip(model.classes_, raw_probabilities)
        }

    return PredictionResponse(
        prediction=prediction,
        label="NEEDS WATER" if prediction == 1 else "DOES NOT NEED WATER",
        probability_no_water=probabilities.get(0),
        probability_needs_water=probabilities.get(1),
    )
