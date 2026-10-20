import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, formatTimestamp } from '../src/utils/dateFormat.js';

test('unzoned sensor timestamps retain their reported calendar date and wall time', () => {
  assert.equal(formatTimestamp('2026-10-17T17:47:14'), '17 Oct 2026 · 5:47:14 PM');
  assert.equal(formatTime('2026-10-17T17:47:14', false), '5:47 PM');
});

test('missing and invalid timestamps never render Invalid Date', () => {
  for (const value of [null, undefined, '', 'not-a-date']) {
    assert.equal(formatTimestamp(value), 'Not available');
    assert.equal(formatTime(value), '—');
  }
});

test('formatting leaves the original sensor timestamp unchanged', () => {
  const value = '2026-10-17T17:47:14';
  formatTimestamp(value);
  assert.equal(value, '2026-10-17T17:47:14');
});
