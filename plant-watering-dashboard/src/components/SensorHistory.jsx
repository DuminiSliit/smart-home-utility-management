import { useEffect, useState } from 'react';
import { getPlantHistory, errorMessage } from '../services/plantApi';
import SensorChart from './SensorChart';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorState from './ErrorState';
import Icon from './Icon';

const metrics = [
  { field: 'soil_moisture', label: 'Soil Moisture', unit: '%', description: 'Reported moisture over time', icon: 'droplets' },
  { field: 'temperature', label: 'Temperature', unit: ' °C', description: 'Environmental temperature', icon: 'temperature' },
  { field: 'humidity', label: 'Humidity', unit: '%', description: 'Environmental humidity', icon: 'humidity' },
  { field: 'water_level', label: 'Water Level', unit: '', description: 'Raw water-level sensor readings', icon: 'gauge' },
];

function HistoryData({ plantId, refreshKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      setLoading(true);
      try {
        const result = await getPlantHistory(plantId, 20, controller.signal);
        if (!controller.signal.aborted) { setRecords(result); setError(null); }
      } catch (failure) {
        if (!controller.signal.aborted) setError(errorMessage(failure));
      } finally {
        busy = false;
        if (!controller.signal.aborted) { setLoading(false); setLoaded(true); }
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [plantId, refreshKey, retry]);
  return <div aria-busy={loading}>
    <p className="history-status" role="status">{loading ? 'Syncing latest history…' : 'Latest 20 records requested · timestamps as reported'}</p>
    {error && <ErrorState title="Unable to load sensor history." message={error} retained={records.length > 0} onRetry={() => setRetry(value => value + 1)} disabled={loading} />}
    {!loaded ? <div className="chart-grid">{metrics.map(metric => <div className="chart-card" key={metric.field}><h3>{metric.label}</h3><LoadingSkeleton kind="chart" /></div>)}</div> :
      records.length > 0 ? <div className="chart-grid">{metrics.map(metric => <SensorChart key={metric.field} {...metric} records={records} />)}</div> :
      <div className="empty-state history-empty"><Icon name="chart" /><h3>{error ? 'History is currently unavailable.' : 'No historical readings available yet.'}</h3><p>{error ? 'Retry or wait for the next automatic refresh.' : 'Sensor trends will appear when readings are received.'}</p></div>}
  </div>;
}

export default function SensorHistory({ profiles, profilesLoading, profilesError, refreshKey }) {
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const plantId = profiles.some(plant => plant.plant_id === selectedPlantId) ? selectedPlantId : profiles[0]?.plant_id ?? '';
  return <section id="history" className="history-section" aria-labelledby="history-heading">
    <div className="section-heading"><div><p className="eyebrow">02 / SENSOR TRENDS</p><h2 id="history-heading">Sensor History</h2><p>Latest sensor trends from AWS.</p></div>
      <label className="plant-selector">Select plant<select value={plantId} disabled={profilesLoading || !profiles.length} onChange={event => setSelectedPlantId(event.target.value)}>{profiles.map(plant => <option key={plant.plant_id} value={plant.plant_id}>{plant.plant_name} ({plant.plant_id})</option>)}</select></label>
    </div>
    {profilesLoading ? <p className="history-status" role="status">Loading plant profiles…</p> : profilesError ? <p className="history-status" role="status">Plant profiles are unavailable. Retry profile loading to view history.</p> : plantId ? <HistoryData key={plantId} plantId={plantId} refreshKey={refreshKey} /> : <div className="empty-state">No plant profiles are available for history.</div>}
  </section>;
}
