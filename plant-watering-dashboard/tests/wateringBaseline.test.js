import test from 'node:test';
import assert from 'node:assert/strict';
import { getWateringDecision } from '../src/utils/wateringBaseline.js';

test('Aloe needs water below its baseline target', () => {
  assert.deepEqual(getWateringDecision(20, 35), {
    wateringRequired: true,
    wateringLabel: 1,
    status: 'Needs Water',
  });
});

test('Aloe is normal above its baseline target', () => {
  assert.deepEqual(getWateringDecision(50, 35), {
    wateringRequired: false,
    wateringLabel: 0,
    status: 'Normal',
  });
});

test('Chilli needs water below its baseline target', () => {
  assert.equal(getWateringDecision(40, 55).status, 'Needs Water');
});

test('Mint is normal above its baseline target', () => {
  assert.equal(getWateringDecision(70, 65).status, 'Normal');
});

test('moisture equal to target is normal', () => {
  assert.equal(getWateringDecision(35, 35).wateringLabel, 0);
});

test('missing, invalid, or non-finite inputs return an unavailable decision', () => {
  const unavailable = { wateringRequired: null, wateringLabel: null, status: 'Unavailable' };
  assert.deepEqual(getWateringDecision(undefined, 35), unavailable);
  assert.deepEqual(getWateringDecision('invalid', 35), unavailable);
  assert.deepEqual(getWateringDecision(20, undefined), unavailable);
  assert.deepEqual(getWateringDecision(Number.NaN, 35), unavailable);
});
