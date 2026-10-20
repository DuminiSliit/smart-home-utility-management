import { useMemo, useState } from 'react';
import { fetchPlantRecords } from '../services/plantApi';
import { downloadCSV, getDatasetFilename, CSV_COLUMNS, exportResearchCSV } from '../utils/csvExport';
import { filterRecordsByStage, getExperimentIds, getDataQualitySummary } from '../utils/researchData';
import Icon from './Icon';

export default function DatasetExport({ profiles, profilesLoading, profilesError }) {
  const [plantId, setPlantId] = useState('all');
  const [limit, setLimit] = useState('50');
  const [stage, setStage] = useState('all');
  const [experimentId, setExperimentId] = useState('all');
  const [records, setRecords] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const selectedPlantId = plantId !== 'all' && !profiles.some(plant => plant.plant_id === plantId) ? 'all' : plantId;
  const availableRecords = records ?? [];
  const experimentIds = useMemo(() => getExperimentIds(availableRecords), [availableRecords]);
  const quality = useMemo(() => getDataQualitySummary(availableRecords), [availableRecords]);

  const resetFeedback = () => { setError(null); setSuccess(null); };
  const handleDownload = async () => {
    if (exporting || profilesLoading || profilesError || !profiles.length) return;
    setExporting(true);
    setProgress('Preparing dataset...');
    setRecords(null);
    resetFeedback();
    try {
      const fetchedRecords = await fetchPlantRecords(selectedPlantId, limit, undefined, profiles, count => setProgress(`Fetched ${count} records...`));
      setRecords(fetchedRecords);
      const stageRecords = filterRecordsByStage(fetchedRecords, stage);
      const exportRecords = experimentId === 'all' ? stageRecords : stageRecords.filter(record => record.experiment_id === experimentId);
      const csvContent = exportResearchCSV(exportRecords);
      const filename = getDatasetFilename(selectedPlantId);
      setProgress(`Ready to export: ${exportRecords.length} records`);
      await new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
      });
      downloadCSV(csvContent, filename);
      const targetPlant = selectedPlantId === 'all' ? 'All Plants' : (profiles.find(plant => plant.plant_id === selectedPlantId)?.plant_name ?? selectedPlantId);
      setSuccess({ count: exportRecords.length, filename, plant: targetPlant });
    } catch (err) {
      setError('Could not retrieve the complete dataset. CSV was not generated.');
    } finally {
      setExporting(false);
      setProgress('');
    }
  };

  const updateSelection = setter => value => { setRecords(null); setExperimentId('all'); setter(value); resetFeedback(); };

  return (
    <section id="export" className="export-section" aria-labelledby="export-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / RESEARCH DATA</p>
          <h2 id="export-heading">Dataset Export</h2>
          <p>Download raw sensor records for debugging, development, and future experimental analysis.</p>
        </div>
        <span className="section-meta">CSV · {CSV_COLUMNS.length} Research Attributes</span>
      </div>

      <div className="export-card">
        <div className="export-card-header">
          <div className="export-card-title">
            <span className="export-icon-badge"><Icon name="database" /></span>
            <div><h3>IoT Research Dataset Export</h3><p>Direct AWS sensor pipeline extraction with unaltered telemetry.</p></div>
          </div>
        </div>

        <div className="export-controls">
          <label className="export-control-group">
            <span className="control-label">Plant Selection</span>
            <select id="export-plant-select" value={selectedPlantId} onChange={e => updateSelection(setPlantId)(e.target.value)} disabled={exporting || profilesLoading}>
              <option value="all">All Plants</option>
              {profiles.map(plant => <option key={plant.plant_id} value={plant.plant_id}>{plant.plant_name} ({plant.plant_id})</option>)}
            </select>
          </label>
          <label className="export-control-group">
            <span className="control-label">Record Limit</span>
            <select id="export-limit-select" value={limit} onChange={e => updateSelection(setLimit)(e.target.value)} disabled={exporting || profilesLoading}>
              <option value="50">50 records</option><option value="100">100 records</option><option value="300">300 records</option>
              <option value="500">500 records</option><option value="1000">1000 records</option><option value="all">All Available</option>
            </select>
          </label>
          <label className="export-control-group">
            <span className="control-label">Data Stage</span>
            <select id="export-stage-select" value={stage} onChange={e => { setStage(e.target.value); setExperimentId('all'); resetFeedback(); }} disabled={exporting || profilesLoading}>
              <option value="all">All Records</option><option value="development">Development / Testing</option>
              <option value="experiment">Experimental</option><option value="legacy">Legacy / Unclassified</option>
            </select>
          </label>
          {experimentIds.length > 0 && <label className="export-control-group">
            <span className="control-label">Experiment</span>
            <select id="export-experiment-select" value={experimentId} onChange={e => { setExperimentId(e.target.value); resetFeedback(); }} disabled={exporting || profilesLoading}>
              <option value="all">All Experiments</option>
              {experimentIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>}
          <div className="export-action-group">
            <span className="control-label" aria-hidden="true">&nbsp;</span>
            <button type="button" id="download-csv-btn" onClick={handleDownload} disabled={exporting || profilesLoading || Boolean(profilesError) || !profiles.length} aria-busy={exporting} className="export-button">
              <Icon name={exporting ? 'refresh' : 'download'} className={exporting ? 'spin' : ''} />
              {exporting ? 'Preparing dataset...' : 'Download CSV'}
            </button>
          </div>
        </div>

        {exporting && <p className="dataset-load-status" role="status">{progress}</p>}
        {profilesError && <div className="error-state export-feedback" role="alert"><Icon name="alert" /><div><strong>Plant profiles unavailable</strong><p>{profilesError}</p></div></div>}
        {error && <div className="error-state export-feedback" role="alert"><Icon name="alert" /><div><strong>Dataset unavailable</strong><p>{error}</p></div><button type="button" className="text-button" onClick={handleDownload} disabled={exporting}>Retry</button></div>}
        {stage === 'experiment' && quality.experimental === 0 && records && <div className="export-warning" role="status"><Icon name="info" /><p>No validated experimental records are available yet. Complete final sensor calibration and begin an experimental run before using data for machine-learning training.</p></div>}
        {success && <div className="export-success" role="status"><Icon name="check" /><div><strong>Ready to export: {success.count} records</strong><p>Downloaded <b>{success.count}</b> records ({success.plant}) to <code>{success.filename}</code>.</p></div></div>}

        {records && !error && <div className="data-quality" aria-labelledby="data-quality-heading">
          <h3 id="data-quality-heading">Data Quality Summary</h3>
          <dl className="quality-grid">
            <div><dt>Total fetched records</dt><dd>{quality.total}</dd></div>
            <div><dt><span className="research-badge badge-green">Experimental</span></dt><dd>{quality.experimental}</dd></div>
            <div><dt><span className="research-badge badge-amber">Development</span></dt><dd>{quality.development}</dd></div>
            <div><dt><span className="research-badge badge-legacy">Legacy</span></dt><dd>{quality.legacy}</dd></div>
            <div><dt>Records with missing fields</dt><dd>{quality.missingFields}</dd></div>
          </dl>
        </div>}

        <aside className="export-warning"><Icon name="info" /><p>Only records marked as Experimental and collected after final sensor calibration should be used for final machine-learning training and evaluation. Development records remain available for debugging and system development.</p></aside>
        <details className="export-schema-details">
          <summary>View exported schema ({CSV_COLUMNS.length} columns)</summary>
          <div className="schema-tag-grid">{CSV_COLUMNS.map(col => <span key={col} className="schema-tag"><code>{col}</code></span>)}</div>
        </details>
      </div>
    </section>
  );
}
