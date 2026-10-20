import Icon from './Icon';
export default function ErrorState({ title, message, onRetry, disabled, retained = false }) {
  return <div className="error-state" role="status">
    <Icon name="alert" /><div><strong>{title}</strong><p>{message}{retained && ' Last successful data is shown.'}</p></div>
    <button className="text-button" onClick={onRetry} disabled={disabled}>Retry</button>
  </div>;
}
