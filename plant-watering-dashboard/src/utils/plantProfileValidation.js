const requiredFields = [
  ['plant_id', 'Plant ID'],
  ['plant_name', 'Plant Name'],
  ['plant_type', 'Plant Type'],
  ['water_requirement', 'Water Requirement'],
  ['valve_id', 'Valve ID'],
];

export function validatePlantProfile(plant) {
  for (const [field, label] of requiredFields) {
    if (typeof plant[field] !== 'string' || !plant[field].trim()) return `${label} is required.`;
  }
  if (plant.target_moisture === '' || plant.target_moisture === null || plant.target_moisture === undefined) {
    return 'Target Moisture is required.';
  }
  const targetMoisture = Number(plant.target_moisture);
  if (!Number.isFinite(targetMoisture) || targetMoisture < 0 || targetMoisture > 100) {
    return 'Target Moisture must be between 0 and 100.';
  }
  if (!['Low', 'Medium', 'High'].includes(plant.water_requirement)) {
    return 'Choose a valid Water Requirement.';
  }
  if (!['active', 'inactive'].includes(plant.status)) return 'Choose a valid Status.';
  return null;
}
