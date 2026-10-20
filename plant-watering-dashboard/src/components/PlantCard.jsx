import StatusBadge from './StatusBadge';
import MoistureBar from './MoistureBar';
import IrrigationPanel from './IrrigationPanel';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorState from './ErrorState';
import Icon from './Icon';
import { useEffect, useState } from 'react';
import { displayValue } from '../services/plantApi';
import { formatTimestamp } from '../utils/dateFormat';
import { getWateringDecision } from '../utils/wateringBaseline';
import { createPredictionInput, predictWatering } from '../services/aiPrediction';

function AiPredictionPanel({ plantName, aiState, confidence, basedOnLastKnown }) {
  const ready = aiState.status === 'ready';
  const needsWater = ready && aiState.prediction.prediction === 1;
  return <section className={`ai-prediction${ready ? needsWater ? ' ai-needs-water' : ' ai-normal' : ''}`} aria-label={`${plantName} AI prediction`}>
    <div className="baseline-decision-heading"><div><span>Decision Method</span><strong>AI Prediction</strong></div>
      <div><span>AI Decision</span><StatusBadge tone={ready ? needsWater ? 'amber' : 'green' : 'neutral'}>
        {aiState.status === 'loading' ? 'Loading...' : ready ? aiState.prediction.label : 'Unavailable'}
      </StatusBadge></div></div>
    <p>{ready
      ? confidence === null ? 'AI confidence unavailable.' : `AI Confidence: ${(confidence * 100).toFixed(0)}% · Prediction probability, not model accuracy.`
      : aiState.status === 'loading' ? 'AI Prediction: Loading...' : 'AI Prediction: Unavailable. Check the local API and sensor values.'}</p>
    {basedOnLastKnown && <p className="last-known-prediction">Based on last known sensor data · not a live prediction.</p>}
  </section>;
}

function DecisionComparisonPanel({ comparison = { ruleDecision: null, aiDecision: null, aiStatus: 'unavailable', status: 'NOT_AVAILABLE' } }) {
  const decisionText = decision => decision === 'NEEDS_WATER' ? 'NEEDS WATER' : decision === 'NO_WATER' ? 'NO WATER' : 'Not Available';
  const resultText = comparison.status === 'AGREE' || comparison.status === 'DISAGREE'
    ? comparison.status
    : comparison.status === 'LOADING' ? 'Loading...' : 'Not Available';
  const tone = comparison.status === 'AGREE' ? 'green' : comparison.status === 'DISAGREE' ? 'amber' : 'neutral';
  return <section className="decision-comparison" aria-label="Decision Comparison">
    <h4>Decision Comparison</h4>
    <dl>
      <div><dt>Rule-Based</dt><dd>{decisionText(comparison.ruleDecision)}</dd></div>
      <div><dt>AI</dt><dd>{comparison.aiDecision ? decisionText(comparison.aiDecision) : comparison.aiStatus === 'loading' ? 'Loading...' : 'Not Available'}</dd></div>
      <div><dt>Comparison</dt><dd><StatusBadge tone={tone}>{resultText}</StatusBadge></dd></div>
    </dl>
  </section>;
}

export default function PlantCard({ plant, state, onRetry, refreshing, live, comparison, onAiStateChange }) {
  const { data, error, loading } = state || {};
  const active = data?.pump_state === 1;
  const decision = getWateringDecision(data?.soil_moisture, plant.target_moisture);
  const [aiState, setAiState] = useState({ status: 'loading', prediction: null });
  const aiInput = createPredictionInput(plant.plant_type, data);
  const aiInputsKey = aiInput ? JSON.stringify(aiInput) : '';
  const stale = Boolean(data) && !live;
  const sensorStatus = data ? live ? 'Online' : 'Offline' : loading ? 'Connecting' : 'No sensor data';
  const requirement = String(plant.water_requirement || 'unknown');

  useEffect(() => {
    if (!aiInputsKey) return undefined;

    const controller = new AbortController();
    // Deferring one tick lets React StrictMode cancel its first development-only
    // effect pass before it can issue a duplicate request.
    const timer = setTimeout(() => predictWatering(JSON.parse(aiInputsKey), controller.signal)
      .then(prediction => setAiState({ inputKey: aiInputsKey, status: 'ready', prediction }))
      .catch(() => {
        if (!controller.signal.aborted) setAiState({ inputKey: aiInputsKey, status: 'unavailable', prediction: null });
      }), 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [aiInputsKey]);

  const visibleAiStatus = !aiInputsKey
    ? 'unavailable'
    : aiState.inputKey === aiInputsKey ? aiState.status : 'loading';
  const visibleAiPrediction = visibleAiStatus === 'ready' ? aiState.prediction : null;
  const visibleAiState = { status: visibleAiStatus, prediction: visibleAiPrediction };

  useEffect(() => {
    onAiStateChange?.(plant.plant_id, aiInputsKey, { status: visibleAiStatus, prediction: visibleAiPrediction });
  }, [plant.plant_id, aiInputsKey, visibleAiStatus, visibleAiPrediction, onAiStateChange]);

  const aiConfidence = visibleAiState.prediction?.prediction === 1
    ? visibleAiState.prediction.probabilityNeedsWater
    : visibleAiState.prediction?.prediction === 0
      ? visibleAiState.prediction.probabilityNoWater
      : null;
  return <article className={`plant-card${active ? ' plant-active' : ''}${stale ? ' plant-stale' : ''}`} aria-labelledby={`plant-${plant.plant_id}`}>
    <div className="plant-heading"><div className="plant-name"><span className="plant-icon"><Icon name="leaf" /></span><div><h3 id={`plant-${plant.plant_id}`}>{plant.plant_name}</h3><p>{plant.plant_id} <span>·</span> {plant.plant_type} <span>·</span> Valve {plant.valve_id}</p></div></div>
      <StatusBadge tone={stale || error ? 'amber' : live ? 'green' : 'neutral'}>{sensorStatus}</StatusBadge>
    </div>
    <span className={`requirement requirement-${requirement.toLowerCase()}`} title={`${requirement} Water Requirement`}>{requirement} water</span>
    {error && <ErrorState title={`Unable to load ${plant.plant_name} data.`} message={error} retained={Boolean(data)} onRetry={onRetry} disabled={refreshing} />}
    {!data ? <>
      {loading ? <LoadingSkeleton kind="plant" /> : <div className="empty-state no-sensor-state"><Icon name="leaf" /><p>No sensor data yet</p><small>Target moisture: {plant.target_moisture}%</small></div>}
      <AiPredictionPanel plantName={plant.plant_name} aiState={visibleAiState} confidence={aiConfidence} basedOnLastKnown={Boolean(data) && stale} />
      <DecisionComparisonPanel comparison={comparison} />
    </> : <>
      {stale && <p className="stale-reading-note" role="status">Offline · Showing last known data</p>}
      <MoistureBar moisture={data.soil_moisture} target={plant.target_moisture} />
      <section className={`baseline-decision${decision.wateringRequired ? ' baseline-needs-water' : decision.wateringRequired === false ? ' baseline-normal' : ''}`} aria-label={`${plant.plant_name} rule-based baseline decision`}>
        <div className="baseline-decision-heading"><div><span>Decision Method</span><strong>Rule-Based Baseline</strong></div>
          <div><span>Watering Decision</span><StatusBadge tone={decision.wateringRequired ? 'amber' : decision.wateringRequired === false ? 'green' : 'neutral'}>{decision.status}</StatusBadge></div></div>
        <p>{decision.wateringRequired === null
          ? 'Decision unavailable because soil moisture or the baseline target is missing or invalid.'
          : `Current moisture (${displayValue(data.soil_moisture, '%')}) is ${decision.wateringRequired ? 'below' : 'at or above'} the baseline target (${plant.target_moisture}%).`}</p>
      </section>
      <AiPredictionPanel plantName={plant.plant_name} aiState={visibleAiState} confidence={aiConfidence} basedOnLastKnown={Boolean(data) && stale} />
      <DecisionComparisonPanel comparison={comparison} />
      <dl className="sensor-grid">
        {[
          ['temperature', 'Temperature', displayValue(data.temperature, ' °C')],
          ['humidity', 'Humidity', displayValue(data.humidity, '%')],
          ['gauge', 'Water level', displayValue(data.water_level)],
          ['droplets', 'Raw moisture', displayValue(data.soil_raw)],
        ].map(([icon, label, value]) => <div key={label}><Icon name={icon} /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}
      </dl>
      <IrrigationPanel data={data} wateringEvent={state?.wateringEvent} />
      <footer className="reading-time"><Icon name="clock" /><span>{stale ? 'Showing last known data · ' : ''}Last updated<time dateTime={data.timestamp || undefined} title={data.timestamp}>{formatTimestamp(data.timestamp)}</time></span></footer>
    </>}
  </article>;
}
