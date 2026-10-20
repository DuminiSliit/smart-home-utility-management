import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlantProfile } from '../src/services/plantApi.js';
import { validatePlantProfile } from '../src/utils/plantProfileValidation.js';

const validPlant = {
  plant_id: 'P05',
  plant_name: 'Rose',
  plant_type: 'Rose',
  target_moisture: 50,
  water_requirement: 'Medium',
  valve_id: 'V05',
  status: 'active',
};

test('valid plant profiles pass validation including target boundaries', () => {
  assert.equal(validatePlantProfile(validPlant), null);
  assert.equal(validatePlantProfile({ ...validPlant, target_moisture: 0 }), null);
  assert.equal(validatePlantProfile({ ...validPlant, target_moisture: 100 }), null);
});

test('required fields and invalid target moisture fail validation', () => {
  for (const [field, value] of [
    ['plant_id', ' '], ['plant_name', ''], ['plant_type', ''],
    ['target_moisture', ''], ['target_moisture', 'not a number'],
    ['target_moisture', -1], ['target_moisture', 101],
    ['water_requirement', ''], ['water_requirement', 'Very High'], ['valve_id', ' '],
  ]) {
    assert.ok(validatePlantProfile({ ...validPlant, [field]: value }), `${field}=${value} should be rejected`);
  }
});

test('createPlantProfile sends JSON to the profiles endpoint and accepts HTTP 201', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /\/plants$/);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), validPlant);
    return new Response(JSON.stringify({ message: 'created' }), { status: 201 });
  });
  assert.deepEqual(await createPlantProfile(validPlant), { message: 'created' });
});

test('createPlantProfile reports a duplicate plant ID with HTTP 409', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 409 }));
  await assert.rejects(createPlantProfile(validPlant), error => {
    assert.equal(error.status, 409);
    assert.equal(error.message, 'This Plant ID already exists.');
    return true;
  });
});
