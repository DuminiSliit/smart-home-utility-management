import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareDecisions,
  normalizeAiDecision,
  normalizeRuleDecision,
  summarizeComparisons,
} from '../src/utils/decisionComparison.js';

test('rule and AI results normalize into the same decision vocabulary', () => {
  assert.equal(normalizeRuleDecision({ wateringRequired: true }), 'NEEDS_WATER');
  assert.equal(normalizeRuleDecision({ wateringRequired: false }), 'NO_WATER');
  assert.equal(normalizeRuleDecision({ wateringRequired: null }), null);
  assert.equal(normalizeAiDecision(1), 'NEEDS_WATER');
  assert.equal(normalizeAiDecision(0), 'NO_WATER');
  assert.equal(normalizeAiDecision(null), null);
});

test('missing decisions are unavailable, not disagreements', () => {
  assert.equal(compareDecisions('NO_WATER', null), 'NOT_AVAILABLE');
  assert.equal(compareDecisions(null, 'NEEDS_WATER'), 'NOT_AVAILABLE');
  assert.equal(compareDecisions('NO_WATER', 'NO_WATER'), 'AGREE');
  assert.equal(compareDecisions('NEEDS_WATER', 'NO_WATER'), 'DISAGREE');
});

test('summary counts only comparable plants and calculates agreement rate', () => {
  const summary = summarizeComparisons(['AGREE', 'AGREE', 'DISAGREE', 'NOT_AVAILABLE']);
  assert.deepEqual({
    plantsCompared: summary.plantsCompared,
    agreements: summary.agreements,
    disagreements: summary.disagreements,
  }, {
    plantsCompared: 3,
    agreements: 2,
    disagreements: 1,
  });
  assert.ok(Math.abs(summary.agreementRate - (200 / 3)) < Number.EPSILON * 100);
  assert.deepEqual(summarizeComparisons(['NOT_AVAILABLE']), {
    plantsCompared: 0,
    agreements: 0,
    disagreements: 0,
    agreementRate: null,
  });
});
