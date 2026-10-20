export const AI_API_BASE_URL = 'http://127.0.0.1:8000';
export const AI_PREDICTION_URL = `${AI_API_BASE_URL}/predict`;

const numericValue = value => value !== null && value !== undefined && value !== ''
  && typeof value !== 'boolean' && Number.isFinite(Number(value));

export function createPredictionInput(plantType, readings) {
  if (typeof plantType !== 'string' || !plantType.trim() || !readings) return null;

  const { soil_moisture, temperature, humidity, water_level } = readings;
  if (![soil_moisture, temperature, humidity, water_level].every(numericValue)) return null;

  const input = {
    plant_type: plantType.trim(),
    soil_moisture: Number(soil_moisture),
    temperature: Number(temperature),
    humidity: Number(humidity),
    water_level: Number(water_level),
  };

  if (input.soil_moisture < 0 || input.soil_moisture > 100
    || input.temperature < -50 || input.temperature > 80
    || input.humidity < 0 || input.humidity > 100
    || input.water_level < 0) return null;

  return input;
}

export async function predictWatering(input, signal) {
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(AI_PREDICTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`AI prediction API returned HTTP ${response.status}.`);

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('AI prediction API returned invalid JSON.');
  }

  if (![0, 1].includes(result?.prediction)
    || !['NEEDS WATER', 'DOES NOT NEED WATER'].includes(result?.label)) {
    throw new Error('AI prediction API returned an invalid prediction.');
  }

  const probabilityNoWater = result.probability_no_water;
  const probabilityNeedsWater = result.probability_needs_water;
  const validProbability = value => value === null || value === undefined
    || (Number.isFinite(value) && value >= 0 && value <= 1);
  if (!validProbability(probabilityNoWater) || !validProbability(probabilityNeedsWater)) {
    throw new Error('AI prediction API returned invalid probabilities.');
  }

  return {
    prediction: result.prediction,
    label: result.label,
    probabilityNoWater,
    probabilityNeedsWater,
  };
}
