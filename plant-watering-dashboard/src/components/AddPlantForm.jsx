import { useEffect, useRef, useState } from 'react';
import { createPlantProfile } from '../services/plantApi';
import { validatePlantProfile } from '../utils/plantProfileValidation';

const emptyForm = {
  plant_id: '',
  plant_name: '',
  plant_type: '',
  target_moisture: '',
  water_requirement: '',
  valve_id: '',
  status: 'active',
};

export default function AddPlantForm({ onClose, onCreated }) {
  const dialogRef = useRef(null);
  const submissionLock = useRef(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const update = event => {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
    setError(null);
  };

  const submit = async event => {
    event.preventDefault();
    if (submissionLock.current) return;
    const validationError = validatePlantProfile(form);
    if (validationError) { setError(validationError); return; }

    const plantData = {
      ...form,
      plant_id: form.plant_id.trim(),
      plant_name: form.plant_name.trim(),
      plant_type: form.plant_type.trim(),
      target_moisture: Number(form.target_moisture),
      valve_id: form.valve_id.trim(),
    };
    submissionLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await createPlantProfile(plantData);
      await onCreated();
    } catch (failure) {
      setError(failure.status === 409 ? 'This Plant ID already exists.' : failure.message || 'Unable to create plant profile.');
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return <dialog className="plant-dialog" ref={dialogRef} aria-labelledby="add-plant-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="plant-dialog-header">
      <div><p className="eyebrow">PLANT PROFILES</p><h2 id="add-plant-title">Add New Plant</h2><p>Create a profile for monitoring and baseline decisions.</p></div>
      <button type="button" className="dialog-close" aria-label="Close add plant form" onClick={onClose} disabled={submitting}>X</button>
    </div>
    <form onSubmit={submit} noValidate>
      <div className="plant-form-grid">
        <label>Plant ID<input name="plant_id" value={form.plant_id} onChange={update} required autoComplete="off" placeholder="P05" /></label>
        <label>Plant Name<input name="plant_name" value={form.plant_name} onChange={update} required autoComplete="off" placeholder="Rose" /></label>
        <label>Plant Type<input name="plant_type" value={form.plant_type} onChange={update} required autoComplete="off" placeholder="Rose" /></label>
        <label>Target Moisture (%)<input name="target_moisture" type="number" min="0" max="100" step="any" value={form.target_moisture} onChange={update} required inputMode="decimal" placeholder="50" /></label>
        <label>Water Requirement<select name="water_requirement" value={form.water_requirement} onChange={update} required><option value="">Select requirement</option><option>Low</option><option>Medium</option><option>High</option></select></label>
        <label>Valve ID<input name="valve_id" value={form.valve_id} onChange={update} required autoComplete="off" placeholder="V05" /></label>
        <label>Status<select name="status" value={form.status} onChange={update} required><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </div>
      {error && <p className="plant-form-error" role="alert">{error}</p>}
      <div className="plant-form-actions">
        <button type="button" className="plant-form-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
        <button type="submit" disabled={submitting}>{submitting ? 'Adding plant...' : 'Add Plant'}</button>
      </div>
    </form>
  </dialog>;
}
