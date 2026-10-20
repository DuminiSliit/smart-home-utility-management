import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPlantProfiles, getPlantLatest, getPlantHistory, fetchPlantRecords, displayValue, isNumber } from '../src/services/plantApi.js';

const profiles = ['P01', 'P02', 'P03'].map((plant_id, index) => ({
  plant_id,
  plant_name: ['Aloe Vera', 'Chilli', 'Mint'][index],
  plant_type: ['Aloe Vera', 'Chilli', 'Mint'][index],
  target_moisture: [35, 55, 65][index],
  water_requirement: ['Low', 'Medium', 'High'][index],
  valve_id: `V0${index + 1}`,
  status: 'active',
}));

test('plant profiles load from the profiles API and normalize numeric targets', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /\/plants$/);
    return new Response(JSON.stringify({ count: 2, data: [
      { ...profiles[0], target_moisture: '35' },
      { ...profiles[1], status: 'inactive' },
    ] }));
  });
  const result = await fetchPlantProfiles();
  assert.equal(result.length, 1);
  assert.equal(result[0].plant_id, 'P01');
  assert.equal(result[0].target_moisture, 35);
});

test('plant profile API errors and malformed profiles are reported', async t => {
  for (const [response, message] of [
    [new Response('', { status: 503 }), /HTTP 503/],
    [new Response('not json'), /invalid JSON/],
    [new Response('{}'), /data array/],
    [new Response('{"data":[{}]}'), /invalid plant profile/],
  ]) {
    const mocked = t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(fetchPlantProfiles(), message);
    mocked.mock.restore();
  }
});

test('latest requests use limit=1 and empty data remains empty', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /plant_id=P01&limit=1$/);
    return new Response(JSON.stringify({ data: [] }));
  });
  assert.equal(await getPlantLatest('P01'), null);
});

test('history requests use 20 records and encode the plant parameter', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /plant_id=P01%26extra&limit=20$/);
    return new Response(JSON.stringify({ data: [] }));
  });
  assert.deepEqual(await getPlantHistory('P01&extra'), []);
});

test('HTTP failures, malformed JSON and invalid records report errors', async t => {
  for (const [response, message] of [
    [new Response('', { status: 503 }), /HTTP 503/],
    [new Response('not json'), /invalid JSON/],
    [new Response('{}'), /data array/],
    [new Response('{"data":[null]}'), /invalid record/],
  ]) {
    const mocked = t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(getPlantHistory('P01'), message);
    mocked.mock.restore();
  }
});

test('a failed plant request does not prevent other requests completing', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('P02')) throw new TypeError('Failed to fetch');
    return new Response('{"data":[]}');
  });
  const results = await Promise.allSettled(['P01', 'P02', 'P03'].map(id => getPlantLatest(id)));
  assert.deepEqual(results.map(result => result.status), ['fulfilled', 'rejected', 'fulfilled']);
});

test('request cancellation propagates to fetch', async t => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal.throwIfAborted();
  });
  await assert.rejects(getPlantLatest('P01', controller.signal), { name: 'AbortError' });
});

test('missing sensor values stay missing and zero values remain zero', () => {
  assert.equal(displayValue(null, '%'), '—');
  assert.equal(displayValue(undefined), '—');
  assert.equal(displayValue(0, '%'), '0%');
  assert.equal(displayValue(103, '%'), '103%');
  assert.equal(isNumber(null), false);
  assert.equal(isNumber(NaN), false);
  assert.equal(isNumber(0), true);
});

test('fetchPlantRecords for single plant queries plant_id and specified limit', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /plant_id=P02&limit=50$/);
    return new Response(JSON.stringify({
      data: [
        { timestamp: '2026-10-17T12:00:00', plant_id: 'P02', soil_moisture: 75 },
        { timestamp: '2026-10-17T11:00:00', plant_id: 'P02', soil_moisture: 70 },
      ],
    }));
  });

  const records = await fetchPlantRecords('P02', 50);
  assert.equal(records.length, 2);
  // Verified sorted by timestamp ascending
  assert.equal(records[0].timestamp, '2026-10-17T11:00:00');
  assert.equal(records[1].timestamp, '2026-10-17T12:00:00');
});

test('fetchPlantRecords for all plants queries P01, P02, P03 separately and sorts combined records', async t => {
  const queried = [];
  t.mock.method(globalThis, 'fetch', async url => {
    queried.push(url);
    if (url.includes('P01')) {
      return new Response(JSON.stringify({
        data: [{ timestamp: '2026-10-17T10:05:00', plant_id: 'P01', soil_moisture: 80 }],
      }));
    }
    if (url.includes('P02')) {
      return new Response(JSON.stringify({
        data: [{ timestamp: '2026-10-17T10:00:00', plant_id: 'P02', soil_moisture: 60 }],
      }));
    }
    if (url.includes('P03')) {
      return new Response(JSON.stringify({
        data: [{ timestamp: '2026-10-17T10:10:00', plant_id: 'P03', soil_moisture: 90 }],
      }));
    }
    return new Response(JSON.stringify({ data: [] }));
  });

  const records = await fetchPlantRecords('all', 50, undefined, profiles);
  assert.equal(queried.length, 3);
  assert.ok(queried.some(u => u.includes('plant_id=P01')));
  assert.ok(queried.some(u => u.includes('plant_id=P02')));
  assert.ok(queried.some(u => u.includes('plant_id=P03')));

  assert.equal(records.length, 3);
  // Sorted chronologically
  assert.equal(records[0].plant_id, 'P02'); // 10:00:00
  assert.equal(records[1].plant_id, 'P01'); // 10:05:00
  assert.equal(records[2].plant_id, 'P03'); // 10:10:00
});

test('fetchPlantRecords for all plants fails completely if one plant fails', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('P02')) {
      return new Response('', { status: 500 });
    }
    return new Response(JSON.stringify({ data: [{ timestamp: '2026-10-17T10:00:00', plant_id: 'P01' }] }));
  });

  await assert.rejects(
    fetchPlantRecords('all', 20, undefined, profiles),
    /Failed to fetch records for Chilli \(P02\)/
  );
});

