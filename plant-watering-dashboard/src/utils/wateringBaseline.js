export function getWateringDecision(soilMoisture, targetMoisture) {
  if (!Number.isFinite(soilMoisture) || !Number.isFinite(targetMoisture)) {
    return {
      wateringRequired: null,
      wateringLabel: null,
      status: 'Unavailable',
    };
  }

  const wateringRequired = soilMoisture < targetMoisture;
  return {
    wateringRequired,
    wateringLabel: Number(wateringRequired),
    status: wateringRequired ? 'Needs Water' : 'Normal',
  };
}
