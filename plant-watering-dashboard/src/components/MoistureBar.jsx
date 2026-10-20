import { displayValue, isNumber } from '../services/plantApi';
export default function MoistureBar({ moisture, target }) {
  const inRange = isNumber(moisture) && moisture >= 0 && moisture <= 100;
  const targetInRange = isNumber(target) && target >= 0 && target <= 100;
  return <div className="moisture">
    <p className="metric-label">SOIL MOISTURE</p>
    <div className="moisture-value"><strong>{displayValue(moisture, '%')}</strong><span>Target <b>{displayValue(target, '%')}</b></span></div>
    <div className="moisture-track" aria-hidden="true">
      {inRange && <div className="moisture-fill" style={{ width: `${moisture}%` }} />}
      {targetInRange && <span className="target-marker" style={{ left: `${target}%` }} />}
    </div>
    <div className="gauge-caption"><span>{isNumber(moisture) && !inRange ? 'Outside 0–100% display range' : 'Reported sensor reading'}</span><span>│ Target</span></div>
  </div>;
}
