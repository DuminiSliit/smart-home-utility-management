import StatusBadge from './StatusBadge';
import Icon from './Icon';
import { displayValue } from '../services/plantApi';
import { formatTimestamp } from '../utils/dateFormat';

function formatMeasure(value, unit) {
  const numeric = value !== null && value !== undefined && value !== '' ? Number(value) : NaN;
  return Number.isFinite(numeric) ? `${numeric.toFixed(2)} ${unit}` : '—';
}

export default function IrrigationPanel({ data, wateringEvent }) {
  const pumpOn = data.pump_state === 1;
  const pumpOff = data.pump_state === 0;
  const hasEvent = Boolean(wateringEvent);
  return <section className={`irrigation-panel watering-activity${pumpOn ? ' is-active' : ''}`} aria-label="Watering Activity">
    <div className="irrigation-heading"><h4><Icon name="droplets" />Watering Activity</h4><StatusBadge tone={pumpOn ? 'green' : 'neutral'}>{pumpOn ? 'Pump ON' : pumpOff ? 'Pump OFF' : 'Pump —'}</StatusBadge></div>
    <dl>
      <div><dt>Pump</dt><dd>{pumpOn ? 'ON' : pumpOff ? 'OFF' : '—'}</dd></div>
      <div><dt>Valve ID</dt><dd>{displayValue(data.valve_id)}</dd></div>
      <div><dt>Last Volume</dt><dd>{hasEvent ? formatMeasure(wateringEvent.water_volume, 'mL') : '—'}</dd></div>
      <div><dt>Flow Rate</dt><dd>{hasEvent ? formatMeasure(wateringEvent.flow_rate, 'mL/min') : '—'}</dd></div>
      <div><dt>Duration</dt><dd>{hasEvent ? formatMeasure(wateringEvent.watering_duration, 'sec') : '—'}</dd></div>
      <div><dt>Last Watered</dt><dd>{hasEvent ? formatTimestamp(wateringEvent.timestamp) : '—'}</dd></div>
      <div><dt>Watering status</dt><dd>{pumpOn ? 'Watering' : data.watering_label === 1 ? 'Needs Water' : data.watering_label === 0 ? 'Normal' : 'Unknown'}</dd></div>
    </dl>
    {!hasEvent && <p className="watering-event-note">No watering event recorded yet</p>}
  </section>;
}
