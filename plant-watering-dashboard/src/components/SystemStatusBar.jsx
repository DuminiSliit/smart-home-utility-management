import Icon from './Icon';
import { formatTimestamp } from '../utils/dateFormat';
export default function SystemStatusBar({ states, total, records, activePumps, pumpCount, loading, live, sensorStatus }) {
  const successCount = states.filter(state => !state.loading && !state.error).length;
  const dates = records.map(record => record.timestamp).filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value)));
  const latest = dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const irrigation = activePumps > 0 ? 'Watering' : total > 0 && pumpCount === total ? 'Idle' : 'Unknown / partial data';
  const items = [
    ['cloud', 'Cloud connection', loading ? 'Connecting' : total > 0 && successCount === total ? 'Connected' : successCount > 0 ? 'Partially connected' : 'Unavailable'],
    ['network', 'Sensor network', loading ? 'Connecting' : sensorStatus],
    ['pump', 'Irrigation system', irrigation],
    ['clock', 'Last data update', formatTimestamp(latest)],
  ];
  return <section className="system-status" aria-label="System status">
    <dl className="status-grid">{items.map(([icon, label, value]) => <div key={label}><Icon name={icon} /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>
    {!live && !loading && <p className="status-caption">{sensorStatus} · Showing last known data</p>}
  </section>;
}
