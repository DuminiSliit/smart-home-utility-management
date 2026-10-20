import assert from 'node:assert/strict';
import { fetchPlantRecords } from '../src/services/plantApi.js';
import { exportToCSV, getDatasetFilename, CSV_COLUMNS } from '../src/utils/csvExport.js';

console.log('--- Starting Comprehensive Live Export Verification ---');

// 1. Verify P01 export
console.log('1. Testing P01 live export (limit=20)...');
const p01Records = await fetchPlantRecords('P01', 20);
assert.equal(p01Records.length, 20, 'P01 should return 20 records');
const p01CSV = exportToCSV(p01Records);
const p01Lines = p01CSV.split('\r\n');
assert.equal(p01Lines[0], CSV_COLUMNS.join(','), 'P01 CSV header must match exactly');
assert.equal(p01Lines.length, 21, 'P01 CSV must have 1 header line + 20 data lines');
console.log('✔ P01 export verified with 20 real records.');

// 2. Verify P02 export
console.log('2. Testing P02 live export (limit=20)...');
const p02Records = await fetchPlantRecords('P02', 20);
assert.equal(p02Records.length, 20, 'P02 should return 20 records');
const p02CSV = exportToCSV(p02Records);
const p02Lines = p02CSV.split('\r\n');
assert.equal(p02Lines[0], CSV_COLUMNS.join(','), 'P02 CSV header must match exactly');
assert.equal(p02Lines.length, 21, 'P02 CSV must have 1 header line + 20 data lines');
console.log('✔ P02 export verified with 20 real records.');

// 3. Verify P03 export
console.log('3. Testing P03 live export (limit=20)...');
const p03Records = await fetchPlantRecords('P03', 20);
assert.equal(p03Records.length, 20, 'P03 should return 20 records');
const p03CSV = exportToCSV(p03Records);
const p03Lines = p03CSV.split('\r\n');
assert.equal(p03Lines[0], CSV_COLUMNS.join(','), 'P03 CSV header must match exactly');
assert.equal(p03Lines.length, 21, 'P03 CSV must have 1 header line + 20 data lines');
console.log('✔ P03 export verified with 20 real records.');

// 4. Verify All Plants export
console.log('4. Testing All Plants live export (limit=20 per plant = 60 combined)...');
const allRecords = await fetchPlantRecords('all', 20);
assert.equal(allRecords.length, 60, 'All plants combined should return 60 records');
const allCSV = exportToCSV(allRecords);
const allLines = allCSV.split('\r\n');
assert.equal(allLines[0], CSV_COLUMNS.join(','), 'All Plants CSV header must match exactly');
assert.equal(allLines.length, 61, 'All Plants CSV must have 1 header line + 60 data lines');

// 5. Verify timestamp ordering (chronological)
for (let i = 1; i < allRecords.length; i++) {
  const prevTime = Date.parse(allRecords[i - 1].timestamp);
  const currTime = Date.parse(allRecords[i].timestamp);
  assert.ok(prevTime <= currTime, `Record ${i} must have timestamp >= previous record`);
}
console.log('✔ All Plants records are properly sorted chronologically by timestamp.');

// 6. Verify column values and that NO fake sensor values were introduced
const sampleRecord = allRecords[0];
const sampleLine = allLines[1].split(',');
assert.equal(sampleLine[0], String(sampleRecord.timestamp ?? ''));
assert.equal(sampleLine[1], String(sampleRecord.plant_id ?? ''));
assert.equal(sampleLine[2], String(sampleRecord.plant_type ?? ''));
assert.equal(sampleLine[3], String(sampleRecord.soil_raw ?? ''));
assert.equal(sampleLine[4], String(sampleRecord.soil_moisture ?? ''));
assert.equal(sampleLine[5], String(sampleRecord.temperature ?? ''));
assert.equal(sampleLine[6], String(sampleRecord.humidity ?? ''));
assert.equal(sampleLine[7], String(sampleRecord.water_level ?? ''));
assert.equal(sampleLine[8], String(sampleRecord.flow_rate ?? ''));
assert.equal(sampleLine[9], String(sampleRecord.water_volume ?? ''));
assert.equal(sampleLine[10], String(sampleRecord.pump_state ?? ''));
assert.equal(sampleLine[11], String(sampleRecord.valve_id ?? ''));
assert.equal(sampleLine[12], String(sampleRecord.watering_duration ?? ''));
assert.equal(sampleLine[13], String(sampleRecord.target_moisture ?? ''));
assert.equal(sampleLine[14], String(sampleRecord.watering_label ?? ''));
console.log('✔ All fields mapped directly from live API without fabrication or alteration.');

// 7. Verify filenames
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const dateStr = `${yyyy}-${mm}-${dd}`;
assert.equal(getDatasetFilename('all'), `plant-watering-dataset-${dateStr}.csv`);
assert.equal(getDatasetFilename('P01'), `plant-watering-dataset-p01-${dateStr}.csv`);

console.log('--- All Live Export Verification Checks Passed Successfully ---');
