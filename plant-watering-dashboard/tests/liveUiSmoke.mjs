// Read-only integration check: renders components using actual AWS records.
// Run with: node tests/liveUiSmoke.mjs
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchPlantProfiles, getPlantLatest, getPlantHistory, fetchPlantRecords } from '../src/services/plantApi.js';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalError = console.error;
const renderErrors = [];
console.error = (...args) => { renderErrors.push(args.map(String).join(' ')); };
try {
  const { default: PlantCard } = await vite.ssrLoadModule('/src/components/PlantCard.jsx');
  const { default: AddPlantForm } = await vite.ssrLoadModule('/src/components/AddPlantForm.jsx');
  const { default: SensorHistory } = await vite.ssrLoadModule('/src/components/SensorHistory.jsx');
  const { default: DatasetExport } = await vite.ssrLoadModule('/src/components/DatasetExport.jsx');
  const { default: SensorChart } = await vite.ssrLoadModule('/src/components/SensorChart.jsx');
  const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
  const initial = renderToStaticMarkup(createElement(App));
  assert.ok(initial.includes('Automatic Plant Watering'));
  assert.ok(initial.includes('Loading summary data'));
  assert.ok(initial.includes('Loading plant profiles'));
  assert.ok(initial.includes('Dataset Export'));
  assert.ok(initial.includes('+ Add New Plant'));
  assert.ok(initial.includes('Loading records'));
  assert.ok(initial.includes('provisional calibration values'));
  const plants = await fetchPlantProfiles();
  assert.ok(plants.length >= 3, 'expected the active plant profiles from the API');
  const historySelector = renderToStaticMarkup(createElement(SensorHistory, { profiles: plants, profilesLoading: false, refreshKey: 0 }));
  const exportSelector = renderToStaticMarkup(createElement(DatasetExport, { profiles: plants, profilesLoading: false }));
  const addPlantForm = renderToStaticMarkup(createElement(AddPlantForm, { onClose: () => {}, onCreated: () => {} }));
  for (const field of ['Plant ID', 'Plant Name', 'Plant Type', 'Target Moisture (%)', 'Water Requirement', 'Valve ID', 'Status']) {
    assert.ok(addPlantForm.includes(field), `add plant form missing ${field}`);
  }
  for (const plant of plants) {
    assert.ok(historySelector.includes(`${plant.plant_name} (${plant.plant_id})`), `${plant.plant_id} missing from history selector`);
    assert.ok(exportSelector.includes(`${plant.plant_name} (${plant.plant_id})`), `${plant.plant_id} missing from export selector`);
  }
  const exportedRecords = await fetchPlantRecords('all', 20, undefined, plants);
  assert.ok(exportedRecords.length > 0, 'dynamic all-plants sensor export returned no records');
  for (const plant of plants) {
    const [latest, history] = await Promise.all([getPlantLatest(plant.plant_id), getPlantHistory(plant.plant_id, 20)]);
    const card = renderToStaticMarkup(createElement(PlantCard, {
      plant, state: { data: latest, loading: false }, onRetry: () => {}, live: Boolean(latest),
    }));
    assert.ok(card.includes(plant.plant_name));
    if (latest) {
      assert.ok(card.includes(String(latest.soil_moisture) + '%'));
      assert.ok(card.includes('Online'), plant.plant_id + ' fresh status missing');
      if (latest.water_volume === 0) assert.ok(card.includes('No watering event'));
    } else {
      assert.ok(card.includes('No sensor data yet'), plant.plant_id + ' empty sensor state missing');
    }
    for (const field of ['soil_moisture', 'temperature', 'humidity', 'water_level']) {
      const chart = renderToStaticMarkup(createElement(SensorChart, { records: history, field, label: field, unit: '', description: 'Actual AWS records', icon: 'chart' }));
      assert.ok(chart.includes(history.length ? 'View exact readings' : 'No timestamped readings'), plant.plant_id + ' ' + field + ' chart state missing');
      assert.ok(!chart.includes('NaN'), plant.plant_id + ' ' + field + ' invalid chart geometry');
    }
    if (latest) {
      const staleCard = renderToStaticMarkup(createElement(PlantCard, {
        plant, state: { data: latest, error: 'Connection failed' }, onRetry: () => {}, live: false,
      }));
      assert.ok(staleCard.includes('Offline'));
      assert.ok(staleCard.includes('Showing last known data'));
      assert.ok(staleCard.includes('Last successful data is shown.'));
      assert.ok(staleCard.includes('Retry'));
    }
    const emptyCard = renderToStaticMarkup(createElement(PlantCard, {
      plant, state: { data: null, loading: false }, onRetry: () => {}, live: false,
    }));
    assert.ok(emptyCard.includes('No sensor data'));
    assert.ok(emptyCard.includes(`Target moisture: ${plant.target_moisture}%`));
    assert.ok(emptyCard.includes(plant.plant_name));
    assert.ok(emptyCard.includes(plant.valve_id));
    console.log(plant.plant_id + ': ' + (latest ? 'latest reading' : 'no sensor data yet') + ', card and four chart states passed (' + history.length + ' history records).');
  }
  assert.equal(renderErrors.length, 0, renderErrors[0]);
  console.log('All ' + plants.length + ' active API profiles loaded into history/export selectors; dynamic all-plant sensor export returned ' + exportedRecords.length + ' records.');
  console.log('Initial loading layout and all real-data component render checks passed without React warnings.');
} finally {
  console.error = originalError;
  await vite.close();
}
