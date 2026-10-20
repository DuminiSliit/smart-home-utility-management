# Automatic Plant Watering System AI Module

This module trains a Random Forest classifier and provides a local API to predict whether a plant needs watering.

## Development model

Initial features:

- `plant_type`
- `soil_moisture`
- `temperature`
- `humidity`
- `water_level`

Target: `watering_label`, where `0` means **Does Not Need Water** and `1` means **Needs Water**.

Current datasets may contain development or legacy records. Final research training and results must use validated, controlled experimental data. The model should be retrained with that data. `flow_rate`, `water_volume`, `watering_duration`, and `pump_state` are not part of the initial model because current historical records are incomplete for those fields.

## Dataset and model

Place the exported CSV at `ai/data/plant-watering-dataset.csv`. It must contain the feature columns above and `watering_label`. The training scripts skip incomplete rows and do not fill missing sensor readings with invented values.

The existing trained pipeline, including categorical encoding for `plant_type`, is loaded from `ai/models/random_forest_model.pkl`. The API does not retrain or overwrite it.

## Install and start the API

From the `ai` folder:

```powershell
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

Health endpoint: <http://127.0.0.1:8000/>  
Swagger UI: <http://127.0.0.1:8000/docs>  
Model health: <http://127.0.0.1:8000/health>

The API accepts requests from `http://localhost:5173` for local dashboard development. The dashboard is not connected to this API yet.

### Example `POST /predict`

```json
{
  "plant_type": "Aloe Vera",
  "soil_moisture": 25,
  "temperature": 30.5,
  "humidity": 80.0,
  "water_level": 3540
}
```

The response includes the model prediction and label. If the model supports `predict_proba`, it also includes `probability_no_water` and `probability_needs_water`; these fields are `null` if probabilities are unavailable.

## Existing training utilities

To inspect data or train/evaluate a development model, place the CSV at the path above and run from `ai`:

```powershell
python src/preprocess.py
python src/train_model.py
python src/evaluate_model.py
```

Training is not part of starting the API. Final research results must use real, validated experimental data.
