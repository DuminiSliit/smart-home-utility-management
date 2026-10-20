/**
 * Research Dataset CSV Export Utilities
 * Prepares and formats real sensor records for machine-learning analysis.
 */

export const CSV_COLUMNS = [
  'timestamp',
  'plant_id',
  'plant_type',
  'data_stage',
  'experiment_id',
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

export const exportResearchCSV = records => exportToCSV(records, CSV_COLUMNS);

/**
 * Escapes a single cell value according to RFC 4180 CSV standard.
 * Missing or null/undefined properties become empty strings.
 * Original numerical and string sensor values are preserved without modification.
 */
export function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of raw sensor records into an RFC 4180 compliant CSV string.
 * Missing properties are left empty; original measurements are preserved exactly.
 */
export function exportToCSV(records = [], columns = CSV_COLUMNS) {
  const header = columns.join(',');
  const rows = records.map(record => {
    return columns.map(col => escapeCSVValue(record[col])).join(',');
  });
  return [header, ...rows].join('\r\n');
}

/**
 * Generates an automatic dataset file name including current date.
 * E.g.: plant-watering-dataset-2026-10-17.csv (for all plants)
 * or    plant-watering-dataset-p01-2026-10-17.csv (for individual plant)
 */
export function getDatasetFilename(plantId = 'all', date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  if (!plantId || plantId === 'all' || plantId === 'ALL') {
    return `plant-watering-dataset-${dateStr}.csv`;
  }
  return `plant-watering-dataset-${plantId.toLowerCase()}-${dateStr}.csv`;
}

/**
 * Triggers a browser file download of the CSV content.
 */
export function downloadCSV(csvContent, filename) {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (url && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
}
