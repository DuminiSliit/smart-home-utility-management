import {API_BASE_URL, getJson} from '../Screens/api';

describe('Flask API client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns JSON from the configured backend', async () => {
    const payload = {lastMinuteUsage: 1};
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    });

    await expect(getJson('/get_homepage_data')).resolves.toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/get_homepage_data`, 
    );
  });

  it('rejects failed API responses', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ok: false, status: 503});

    await expect(getJson('/Hourdata')).rejects.toThrow(
      'Request /Hourdata failed with HTTP 503', 
    );
  });
});
