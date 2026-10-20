import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import SummaryCard from './components/SummaryCard';
import PlantCard from './components/PlantCard';
import SensorHistory from './components/SensorHistory';
import { fetchPlantProfiles, getPlantLiveData, isNumber, errorMessage } from './services/plantApi';
import SystemStatusBar from './components/SystemStatusBar';
import ErrorState from './components/ErrorState';
import DatasetExport from './components/DatasetExport';
import AddPlantForm from './components/AddPlantForm';
import Icon from './components/Icon';
import './App.css';
import { getWateringDecision } from './utils/wateringBaseline';
import { createPredictionInput } from './services/aiPrediction';
import { compareDecisions, normalizeAiDecision, normalizeRuleDecision, summarizeComparisons } from './utils/decisionComparison';

const profilesEqual = (current, next) => current.length === next.length && current.every((profile, index) => {
  const updated = next[index];
  return updated && ['plant_id', 'plant_name', 'plant_type', 'target_moisture', 'water_requirement', 'valve_id', 'status']
    .every(field => profile[field] === updated[field]);
});

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState(null);
  const [profilesRetry, setProfilesRetry] = useState(0);
  const [plantData, setPlantData] = useState({});
  const [refreshing, setRefreshing] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const [plantCreateSuccess, setPlantCreateSuccess] = useState('');
  const [aiResults, setAiResults] = useState({});
  const current = useRef(null);

  const reportAiState = useCallback((plantId, inputKey, aiState) => {
    setAiResults(previous => {
      const currentResult = previous[plantId];
      if (currentResult?.inputKey === inputKey
        && currentResult.status === aiState.status
        && currentResult.prediction === aiState.prediction) return previous;
      return {
        ...previous,
        [plantId]: { inputKey, status: aiState.status, prediction: aiState.prediction },
      };
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setProfilesLoading(true);
    fetchPlantProfiles(controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setProfiles(result);
        setPlantData(Object.fromEntries(result.map(plant => [plant.plant_id, { loading: true }])));
        setProfilesError(null);
      })
      .catch(error => {
        if (!controller.signal.aborted) setProfilesError(errorMessage(error));
      })
      .finally(() => { if (!controller.signal.aborted) setProfilesLoading(false); });
    return () => controller.abort();
  }, [profilesRetry]);

  const loadData = useCallback(async () => {
    if (current.current || !profiles.length) return;
    const controller = new AbortController();
    current.current = controller;
    setRefreshing(true);
    let received = false;
    await Promise.all(profiles.map(async plant => {
      try {
        const reading = await getPlantLiveData(plant.plant_id, controller.signal);
        if (controller.signal.aborted) return;
        received = true;
        setPlantData(previous => ({ ...previous, [plant.plant_id]: { ...reading, loading: false, error: null } }));
      } catch (error) {
        if (controller.signal.aborted) return;
        setPlantData(previous => ({ ...previous, [plant.plant_id]: { ...previous[plant.plant_id], loading: false, error: errorMessage(error) } }));
      }
    }));
    if (!controller.signal.aborted) {
      if (received) setLastSynced(new Date());
      setRefreshing(false);
      current.current = null;
    }
  }, [profiles]);

  useEffect(() => {
    loadData();
    if (!profiles.length) { setRefreshing(false); return undefined; }
    const interval = setInterval(loadData, 10000);
    return () => { clearInterval(interval); current.current?.abort(); current.current = null; };
  }, [loadData, profiles.length]);

  const records = profiles.map(plant => plantData[plant.plant_id]?.data).filter(Boolean);
  const average = (field, unit) => {
    const values = records.map(record => record[field]).filter(isNumber);
    return values.length ? `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)}${unit}` : '—';
  };
  const pumpRecords = records.filter(record => record.pump_state === 0 || record.pump_state === 1);
  const isLive = (record, plantId) => {
    const timestamp = record?.timestamp;
    if (!timestamp || timestamp === 'undefined') return false;

    const readingTime = new Date(timestamp).getTime();
    if (Number.isNaN(readingTime)) return false;

    const difference = Date.now() - readingTime;
    const isOnline = difference >= 0 && difference <= 2 * 60 * 1000;
    console.log({
      plantId,
      timestamp,
      parsedTime: new Date(timestamp),
      ageSeconds: difference / 1000,
      isOnline,
    });
    return isOnline;
  };
  const onlineCount = profiles.filter(plant => {
    const state = plantData[plant.plant_id];
    return !state?.error && isLive(state?.data, plant.plant_id);
  }).length;
  const healthy = profiles.length > 0 && onlineCount === profiles.length;
  const sensorStatus = healthy ? 'Sensors Live' : 'Sensors Offline / Partial';
  const initialLoading = profilesLoading || Object.values(plantData).some(state => state.loading);
  const activePumps = pumpRecords.filter(record => record.pump_state === 1).length;
  const allFailed = profiles.length > 0 && profiles.every(plant => plantData[plant.plant_id]?.error);
  const baselineDecisions = profiles.map(plant => getWateringDecision(plantData[plant.plant_id]?.data?.soil_moisture, plant.target_moisture));
  const plantsNeedingWater = baselineDecisions.filter(decision => decision.wateringRequired === true).length;
  const availableBaselineDecisions = baselineDecisions.filter(decision => decision.wateringRequired !== null).length;
  const comparisonByPlant = Object.fromEntries(profiles.map(plant => {
    const data = plantData[plant.plant_id]?.data;
    const input = createPredictionInput(plant.plant_type, data);
    const inputKey = input ? JSON.stringify(input) : '';
    const reportedAi = aiResults[plant.plant_id];
    const aiState = !inputKey
      ? { status: 'unavailable', prediction: null }
      : reportedAi?.inputKey === inputKey
        ? reportedAi
        : { status: 'loading', prediction: null };
    const ruleDecision = normalizeRuleDecision(getWateringDecision(data?.soil_moisture, plant.target_moisture));
    const aiDecision = aiState.status === 'ready'
      ? normalizeAiDecision(aiState.prediction?.prediction)
      : null;
    const status = ruleDecision && aiDecision
      ? compareDecisions(ruleDecision, aiDecision)
      : aiState.status === 'loading' ? 'LOADING' : 'NOT_AVAILABLE';
    return [plant.plant_id, { ruleDecision, aiDecision, aiStatus: aiState.status, status }];
  }));
  const comparisonSummary = summarizeComparisons(Object.values(comparisonByPlant).map(result => result.status));
  const refreshProfiles = () => fetchPlantProfiles()
    .then(result => {
      setProfiles(previous => profilesEqual(previous, result) ? previous : result);
      setPlantData(previous => Object.fromEntries(result.map(plant => [
        plant.plant_id,
        previous[plant.plant_id] ?? { loading: true },
      ])));
      setProfilesError(null);
    });
  const handlePlantCreated = () => {
    setAddPlantOpen(false);
    setPlantCreateSuccess('Plant profile created successfully.');
    refreshProfiles().catch(error => setProfilesError(errorMessage(error)));
  };
  const refreshAll = () => {
    if (current.current) return;
    if (profilesError && !profiles.length) {
      setProfilesRetry(key => key + 1);
      return;
    }
    loadData();
    setRefreshKey(key => key + 1);
    refreshProfiles().catch(error => setProfilesError(errorMessage(error)));
  };
  return <div className="app-shell">
    <a className="skip-link" href="#overview">Skip to dashboard</a>
    <div className="app-bar"><div><span className="brand-mark"><Icon name="leaf" /></span><span>PlantCare <b>Research</b></span></div>
      <nav aria-label="Dashboard navigation"><a href="#overview">Overview</a><a href="#plants">Plants</a><a href="#history">History</a><a href="#export">Export</a></nav>
    </div>
    <main className="dashboard" id="overview">
      <Header refreshing={refreshing} lastSynced={lastSynced} healthy={healthy} onRefresh={refreshAll} />
      {profilesError && <ErrorState title="Unable to load plant profiles" message={profilesError} onRetry={refreshAll} disabled={profilesLoading} />}
      {allFailed && <ErrorState title="Unable to reach sensor data" message="Latest readings could not be retrieved. Check your connection and retry." onRetry={refreshAll} disabled={refreshing} />}
      <section className="summary-grid" aria-label="Latest sensor overview">
        <SummaryCard icon="leaf" label="Total Plants" value={profiles.length} detail={`${records.length} of ${profiles.length} readings available`} loading={profilesLoading} />
        <SummaryCard icon="droplets" label="Average Soil Moisture" value={average('soil_moisture', '%')} detail="Across available plant readings" loading={initialLoading} />
        <SummaryCard icon="temperature" label="Average Temperature" value={average('temperature', ' °C')} detail="Current environment" loading={initialLoading} />
        <SummaryCard icon="humidity" label="Average Humidity" value={average('humidity', '%')} detail="Current environment" loading={initialLoading} />
        <SummaryCard icon="pump" label="Active Pumps" value={pumpRecords.length ? activePumps : '—'} detail={activePumps > 0 ? 'Irrigation in progress' : pumpRecords.length === profiles.length ? 'Irrigation currently idle' : 'Pump data incomplete'} active={activePumps > 0} loading={initialLoading} />
        <SummaryCard icon="droplets" label="Plants Needing Water" value={`${plantsNeedingWater} / ${profiles.length}`} detail={`Rule-Based Baseline · ${availableBaselineDecisions} decisions available`} loading={initialLoading} />
      </section>
      <SystemStatusBar states={Object.values(plantData)} total={profiles.length} records={records} activePumps={activePumps} pumpCount={pumpRecords.length} loading={initialLoading} live={healthy} sensorStatus={sensorStatus} />
      <section id="plants" aria-labelledby="plants-heading"><div className="section-heading"><div><p className="eyebrow">01 / LIVE OVERVIEW</p><h2 id="plants-heading">Plant Monitoring</h2><p>Live measurements and irrigation state for each plant.</p></div><button type="button" className="add-plant-button" onClick={() => { setPlantCreateSuccess(''); setAddPlantOpen(true); }}>+ Add New Plant</button></div>
        {plantCreateSuccess && <p className="plant-create-success" role="status">{plantCreateSuccess}</p>}
        {profilesLoading ? <div className="plant-grid"><div className="empty-state">Loading plant profiles…</div></div> : profiles.length ? <>
          <div className="plant-grid">{profiles.map(plant => <PlantCard key={plant.plant_id} plant={plant} state={plantData[plant.plant_id]} onRetry={refreshAll} refreshing={refreshing} live={isLive(plantData[plant.plant_id]?.data, plant.plant_id)} comparison={comparisonByPlant[plant.plant_id]} onAiStateChange={reportAiState} />)}</div>
          <section className="comparison-summary" aria-labelledby="comparison-summary-title">
            <div><p className="eyebrow">RESEARCH COMPARISON</p><h2 id="comparison-summary-title">Rule-Based vs AI</h2></div>
            <dl>
              <div><dt>Plants Compared</dt><dd>{comparisonSummary.plantsCompared}</dd></div>
              <div><dt>Agreements</dt><dd>{comparisonSummary.agreements}</dd></div>
              <div><dt>Disagreements</dt><dd>{comparisonSummary.disagreements}</dd></div>
              <div><dt>Agreement Rate</dt><dd>{comparisonSummary.agreementRate === null ? 'Not Available' : `${comparisonSummary.agreementRate.toFixed(0)}%`}</dd></div>
            </dl>
            <p>Agreement compares decisions only; it is not model accuracy. AI confidence is prediction probability, not model accuracy.</p>
            <p className="comparison-research-note">Development comparison only. Final evaluation must use validated experimental data.</p>
          </section>
        </> : !profilesError && <div className="empty-state">No plant profiles are configured.</div>}
      </section>
      <SensorHistory profiles={profiles} profilesLoading={profilesLoading} profilesError={profilesError} refreshKey={refreshKey} />
      <DatasetExport profiles={profiles} profilesLoading={profilesLoading} profilesError={profilesError} />
      <aside className="research-note"><Icon name="info" /><div><strong>Research & calibration note</strong><p>Sensor moisture percentages currently use provisional calibration values and will be replaced with validated calibration results during final experimental evaluation.</p></div></aside>
      <footer className="page-footer"><span>Automatic Plant Watering System</span><span>AI IoT Household Utility Management System</span></footer>
      {addPlantOpen && <AddPlantForm onClose={() => setAddPlantOpen(false)} onCreated={handlePlantCreated} />}
    </main>
  </div>;
}
