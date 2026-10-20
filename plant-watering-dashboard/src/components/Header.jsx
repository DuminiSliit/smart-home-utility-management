import StatusBadge from './StatusBadge';
import Icon from './Icon';
import { formatTime } from '../utils/dateFormat';
export default function Header({ refreshing, lastSynced, healthy, onRefresh }) {
  return <header className="page-header">
    <div className="header-copy"><p className="eyebrow">SMART PLANT MONITORING</p>
      <h1>Automatic Plant Watering</h1>
      <p className="subtitle">AI IoT Household Utility Management System</p>
      <p className="context-line">Real-time environmental monitoring and automated irrigation decision support.</p>
    </div>
    <div className="system-controls">
      <div className="control-top"><StatusBadge tone={healthy ? 'green' : 'amber'}><span className="status-dot" />{healthy ? 'Sensors Live' : refreshing && !lastSynced ? 'Connecting' : 'Sensors Offline / Partial'}</StatusBadge>
        <button onClick={onRefresh} disabled={refreshing} aria-label="Refresh all sensor data"><Icon name="refresh" className={refreshing ? 'spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh'}</button>
      </div>
      <dl className="sync-details"><div><dt>Last synced</dt><dd>{lastSynced ? formatTime(lastSynced) : 'Awaiting data'}</dd></div><div><dt>Auto refresh</dt><dd>Every 10 seconds</dd></div></dl>
    </div>
  </header>;
}
