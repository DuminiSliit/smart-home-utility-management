import Icon from './Icon';
import LoadingSkeleton from './LoadingSkeleton';
export default function SummaryCard({ label, value, detail, icon, active = false, loading = false }) {
  return <article className={`summary-card${active ? ' is-active' : ''}`}>
    <div className="summary-label"><span className="metric-icon"><Icon name={icon} /></span><p>{label}</p></div>
    {loading ? <LoadingSkeleton kind="summary" /> : <><strong className="summary-value">{value}</strong><small>{detail}</small></>}
  </article>;
}
