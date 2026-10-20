export const REQUIRED_RESEARCH_FIELDS = [
  'timestamp', 'plant_id', 'soil_raw', 'soil_moisture', 'temperature',
  'humidity', 'water_level', 'pump_state', 'target_moisture', 'watering_label',
];

export function getRecordStage(record) {
  if (record?.data_stage === 'development' || record?.data_stage === 'experiment') return record.data_stage;
  return 'legacy';
}

export function filterRecordsByStage(records, stage) {
  if (stage === 'all') return records;
  return records.filter(record => getRecordStage(record) === stage);
}

export function getExperimentIds(records) {
  return [...new Set(records.map(record => record?.experiment_id).filter(value => typeof value === 'string' && value.trim()))].sort((a, b) => a.localeCompare(b));
}

export function validateResearchRecord(record) {
  return REQUIRED_RESEARCH_FIELDS.filter(field => record?.[field] === undefined || record?.[field] === null || record?.[field] === '');
}

export function getDataQualitySummary(records) {
  return {
    total: records.length,
    experimental: records.filter(record => getRecordStage(record) === 'experiment').length,
    development: records.filter(record => getRecordStage(record) === 'development').length,
    legacy: records.filter(record => getRecordStage(record) === 'legacy').length,
    missingFields: records.filter(record => validateResearchRecord(record).length > 0).length,
  };
}
