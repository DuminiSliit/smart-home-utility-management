export const API_BASE_URL = 'https://wrw4z562lj.execute-api.ap-southeast-2.amazonaws.com';
export const API_URL = `${API_BASE_URL}/sensor-data`;

export async function fetchPlantProfiles(signal) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`${API_BASE_URL}/plants`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`Plant profiles API returned HTTP ${response.status}.`);
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Plant profiles API returned invalid JSON.'); }
  if (!Array.isArray(result.data)) throw new Error('Plant profiles response is missing its data array.');
  const invalidProfile = result.data.find(profile => !profile || typeof profile !== 'object' || Array.isArray(profile)
    || typeof profile.plant_id !== 'string' || !profile.plant_id.trim()
    || typeof profile.plant_name !== 'string' || !profile.plant_name.trim()
    || typeof profile.plant_type !== 'string' || !profile.plant_type.trim()
    || profile.target_moisture === null || profile.target_moisture === ''
    || !Number.isFinite(Number(profile.target_moisture))
    || typeof profile.water_requirement !== 'string'
    || typeof profile.valve_id !== 'string'
    || typeof profile.status !== 'string');
  if (invalidProfile) throw new Error('Plant profiles API returned an invalid plant profile.');
  return result.data
    .filter(profile => profile.status.toLowerCase() === 'active')
    .map(profile => ({ ...profile, target_moisture: Number(profile.target_moisture) }));
}

export async function createPlantProfile(plantData, signal) {
  const response = await fetch(`${API_BASE_URL}/plants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plantData),
    signal,
  });
  if (response.status === 409) {
    const error = new Error('This Plant ID already exists.');
    error.status = 409;
    throw error;
  }
  if (!response.ok) {
    let message = `Plant profile API returned HTTP ${response.status}.`;
    try {
      const result = await response.json();
      if (typeof result.message === 'string' && result.message.trim()) message = result.message;
    } catch { /* Keep the HTTP error when the API has no JSON error body. */ }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

export async function getPlantHistory(plantId, limit = 20, signal) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`${API_URL}?plant_id=${encodeURIComponent(plantId)}&limit=${limit}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`Sensor API returned HTTP ${response.status}.`);
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Sensor API returned invalid JSON.'); }
  if (!Array.isArray(result.data)) throw new Error('Sensor API response is missing its data array.');
  if (result.data.some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
    throw new Error('Sensor API returned an invalid record.');
  }
  return result.data;
}
async function getPlantHistoryPage(plantId, limit, signal, nextKey) {
  const timeout = AbortSignal.timeout(15000);
  const params = new URLSearchParams({ plant_id: plantId, limit: String(limit) });
  if (nextKey !== undefined && nextKey !== null) params.set('next_key', typeof nextKey === 'string' ? nextKey : JSON.stringify(nextKey));
  const response = await fetch(`${API_URL}?${params}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`Sensor API returned HTTP ${response.status}.`);
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Sensor API returned invalid JSON.'); }
  if (!Array.isArray(result.data) || result.data.some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
    throw new Error('Sensor API response is missing a valid data array.');
  }
  return {
    records: result.data,
    hasNextKey: Object.prototype.hasOwnProperty.call(result, 'next_key'),
    nextKey: result.next_key,
  };
}
export async function getPlantLatest(plantId, signal) {
  return getLatestSensorRecord(await getPlantHistory(plantId, 20, signal));
}

const hasValidTimestamp = record => typeof record?.timestamp === 'string'
  && record.timestamp !== 'undefined'
  && !Number.isNaN(new Date(record.timestamp).getTime());

export function getLatestSensorRecord(records) {
  return [...records].filter(hasValidTimestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;
}

const isPositiveSensorValue = value => value !== null && value !== undefined && value !== ''
  && Number.isFinite(Number(value)) && Number(value) > 0;

export function getLastWateringEvent(records) {
  return [...records]
    .filter(record => hasValidTimestamp(record)
      && (isPositiveSensorValue(record.water_volume) || isPositiveSensorValue(record.watering_duration)))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;
}

export async function getPlantLiveData(plantId, signal) {
  const records = await getPlantHistory(plantId, 100, signal);
  return {
    data: getLatestSensorRecord(records),
    wateringEvent: getLastWateringEvent(records),
  };
}
export async function fetchPlantRecords(plantId = 'all', limit = 50, signal, _profiles = null, onProgress = () => {}) {
  const allAvailable = limit === 'all' || limit === 'All Available';
  const parsedLimit = allAvailable ? Infinity : Number(limit) || 50;
  const allPlants = !plantId || plantId === 'all' || plantId === 'ALL';
  const plantProfiles = allPlants ? await fetchPlantProfiles(signal) : [{ plant_id: plantId, plant_name: plantId }];
  const records = [];

  try {
    for (const plant of plantProfiles) {
      let nextKey;
      let fetchedForPlant = 0;
      do {
        const remaining = parsedLimit - fetchedForPlant;
        const pageLimit = allAvailable ? 100 : remaining;
        const page = await getPlantHistoryPage(plant.plant_id, pageLimit, signal, nextKey);
        records.push(...page.records);
        fetchedForPlant += page.records.length;
        onProgress(records.length);

        if (allAvailable && !page.hasNextKey) {
          throw new Error(`The API response for ${plant.plant_id} does not include next_key, so the full dataset cannot be verified. Enable DynamoDB pagination on GET /sensor-data and retry.`);
        }
        if (page.hasNextKey && page.nextKey !== null && page.nextKey !== undefined && fetchedForPlant < parsedLimit) {
          if (page.records.length === 0 || JSON.stringify(page.nextKey) === JSON.stringify(nextKey)) {
            throw new Error(`Pagination did not advance for ${plant.plant_id}.`);
          }
          nextKey = page.nextKey;
        } else {
          nextKey = null;
        }
      } while (nextKey !== null && (allAvailable || fetchedForPlant < parsedLimit));
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not retrieve the complete dataset. CSV was not generated.');
  }

  const chronological = records.sort((a, b) => {
    const timeA = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : NaN;
    const timeB = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : NaN;
    const validA = Number.isFinite(timeA);
    const validB = Number.isFinite(timeB);
    if (validA && validB && timeA !== timeB) return timeA - timeB;
    if (validA !== validB) return validA ? -1 : 1;
    return (a.plant_id || '').localeCompare(b.plant_id || '');
  });
  if (allAvailable || chronological.length <= parsedLimit) return chronological;

  const validTimestamps = chronological.filter(record => Number.isFinite(Date.parse(record.timestamp)));
  const selected = validTimestamps.slice(-parsedLimit);
  if (selected.length < parsedLimit) {
    selected.unshift(...chronological.filter(record => !Number.isFinite(Date.parse(record.timestamp))).slice(0, parsedLimit - selected.length));
  }
  return selected.sort((a, b) => {
    const timeA = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : NaN;
    const timeB = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : NaN;
    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) return timeA - timeB;
    if (Number.isFinite(timeA) !== Number.isFinite(timeB)) return Number.isFinite(timeA) ? -1 : 1;
    return (a.plant_id || '').localeCompare(b.plant_id || '');
  });
}
export const isNumber = value => typeof value === 'number' && Number.isFinite(value);
export const displayValue = (value, unit = '') => value === null || value === undefined || value === '' ? '—' : `${value}${unit}`;
export const errorMessage = error => error.name === 'TimeoutError' ? 'Request timed out. Retrying on the next refresh.' : error.message || 'Unable to reach the sensor API.';

