import test from 'node:test';
import assert from 'node:assert/strict';
import { exportToCSV, escapeCSVValue, getDatasetFilename, CSV_COLUMNS } from '../src/utils/csvExport.js';

test('CSV columns match the 15 research fields in exact specified order', () => {
  const expected = [
    'timestamp',
    'plant_id',
    'plant_type',
    'soil_raw',
    'soil_moisture',
    'temperature',
    'humidity',
    'water_level',
    'flow_rate',
    'water_volume',
    'pump_state',
    'valve_id',
    'watering_duration',
    'target_moisture',
    'watering_label',
  ];
  assert.deepEqual(CSV_COLUMNS, expected);
});

test('CSV header matches the 15 columns', () => {
  const csv = exportToCSV([]);
  assert.equal(csv, CSV_COLUMNS.join(','));
});

test('missing record fields export as empty values without invented sensor values', () => {
  const record = {
    timestamp: '2026-10-17T18:22:24',
    plant_id: 'P01',
    plant_type: 'Aloe Vera',
    soil_raw: 1653,
    soil_moisture: 100,
    temperature: 30.2,
    humidity: 87,
    water_level: 3489,
    // flow_rate is absent
    water_volume: 0,
    pump_state: 0,
    valve_id: 'V01',
    watering_duration: 0,
    target_moisture: 35,
    watering_label: 0,
  };

  const csv = exportToCSV([record]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);

  const row = lines[1].split(',');
  // Column 8 is flow_rate (0-indexed: 8)
  assert.equal(row[8], '');
  // Verify other fields preserved exactly
  assert.equal(row[0], '2026-10-17T18:22:24');
  assert.equal(row[1], 'P01');
  assert.equal(row[2], 'Aloe Vera');
  assert.equal(row[3], '1653');
  assert.equal(row[4], '100');
  assert.equal(row[5], '30.2');
  assert.equal(row[6], '87');
  assert.equal(row[7], '3489');
  assert.equal(row[9], '0');
  assert.equal(row[10], '0');
  assert.equal(row[11], 'V01');
  assert.equal(row[12], '0');
  assert.equal(row[13], '35');
  assert.equal(row[14], '0');
});

test('zero sensor values remain zero and are not exported as empty', () => {
  assert.equal(escapeCSVValue(0), '0');
  assert.equal(escapeCSVValue(null), '');
  assert.equal(escapeCSVValue(undefined), '');
  assert.equal(escapeCSVValue(''), '');
});

test('escaping handles commas, quotes, and newlines per RFC 4180', () => {
  assert.equal(escapeCSVValue('Aloe, Vera'), '"Aloe, Vera"');
  assert.equal(escapeCSVValue('Aloe "Vera"'), '"Aloe ""Vera"""');
  assert.equal(escapeCSVValue("Line1\nLine2"), '"Line1\nLine2"');
  assert.equal(escapeCSVValue(25.5), '25.5');
});

test('filename generator creates expected date format', () => {
  const testDate = new Date(2026, 9, 17); // 2026-10-17
  assert.equal(getDatasetFilename('all', testDate), 'plant-watering-dataset-2026-10-17.csv');
  assert.equal(getDatasetFilename('P01', testDate), 'plant-watering-dataset-p01-2026-10-17.csv');
  assert.equal(getDatasetFilename('P02', testDate), 'plant-watering-dataset-p02-2026-10-17.csv');
  assert.equal(getDatasetFilename('P03', testDate), 'plant-watering-dataset-p03-2026-10-17.csv');
});
