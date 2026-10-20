import { useState } from 'react';
import { isNumber, displayValue } from '../services/plantApi';
import { formatTime, formatTimestamp } from '../utils/dateFormat';
import Icon from './Icon';

export default function SensorChart({ records, field, label, unit, description, icon }) {
  const [selected, setSelected] = useState(null);
  const timed = records.map(record => ({ ...record, time: typeof record.timestamp === 'string' ? Date.parse(record.timestamp) : NaN }))
    .filter(record => Number.isFinite(record.time)).sort((a, b) => a.time - b.time);
  const valid = timed.filter(record => isNumber(record[field]));
  if (!valid.length) return <article className="chart-card"><h3>{label}</h3><div className="empty-state"><Icon name="chart" /><p>No timestamped readings available for this metric.</p></div></article>;
  const values = valid.map(record => record[field]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min || Math.abs(max) || 1) * 0.15;
  const low = min - padding;
  const high = max + padding;
  const first = timed[0].time;
  const last = timed[timed.length - 1].time;
  const x = time => last === first ? 238 : 52 + (time - first) / (last - first) * 372;
  const y = value => 151 - (value - low) / (high - low) * 125;
  let previousValid = false;
  const path = timed.map(record => {
    if (!isNumber(record[field])) { previousValid = false; return ''; }
    const command = previousValid ? 'L' : 'M';
    previousValid = true;
    return `${command} ${x(record.time)} ${y(record[field])}`;
  }).join(' ');
  const latest = valid[valid.length - 1];
  const inspected = selected === null ? latest : valid[selected] || latest;
  return <article className="chart-card">
    <div className="chart-heading"><div><h3><Icon name={icon} />{label}</h3><p>{description}</p></div><span className="reading-count">{valid.length} readings</span></div>
    <dl className="chart-context"><div><dt>Latest</dt><dd>{latest[field]}<span>{unit}</span></dd></div>{field === 'soil_moisture' && <div><dt>Target</dt><dd>{displayValue(latest.target_moisture, '%')}</dd></div>}</dl>
    <svg viewBox="0 0 440 195" role="group" aria-label={`${label} history. Focus a reading to inspect it.`}>
      {[0, 1, 2].map(index => {
        const value = low + (high - low) * index / 2;
        return <g key={index}><line x1="52" x2="424" y1={y(value)} y2={y(value)} className="chart-gridline" /><text x="43" y={y(value) + 4} textAnchor="end">{Number(value.toFixed(1))}</text></g>;
      })}
      <path d={path} fill="none" className="chart-line" />
      {valid.map((record, index) => <circle key={index} cx={x(record.time)} cy={y(record[field])} r="4" tabIndex="0" className={`chart-point${selected === index ? ' is-selected' : ''}`}
        onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onClick={() => setSelected(index)}
        onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }}
        aria-label={`${formatTimestamp(record.timestamp)}: ${record[field]}${unit}`}>
        <title>{`${formatTimestamp(record.timestamp)}: ${record[field]}${unit}`}</title>
      </circle>)}
      <text x="52" y="183" textAnchor="start">{formatTime(timed[0].timestamp, false)}</text>
      {first !== last && <text x="424" y="183" textAnchor="end">{formatTime(timed[timed.length - 1].timestamp, false)}</text>}
    </svg>
    <div className="chart-tooltip" aria-live="polite"><span>{formatTimestamp(inspected.timestamp)}</span><strong>{inspected[field]}{unit}</strong></div>
    <details><summary>View exact readings</summary><div className="readings-table"><table><thead><tr><th scope="col">Time as reported</th><th scope="col">Value{unit && ` (${unit.trim()})`}</th></tr></thead><tbody>{valid.map((record, index) => <tr key={index}><td><time dateTime={record.timestamp} title={record.timestamp}>{formatTimestamp(record.timestamp)}</time></td><td>{record[field]}</td></tr>)}</tbody></table></div></details>
  </article>;
}
