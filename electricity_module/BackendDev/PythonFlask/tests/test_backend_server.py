import unittest
from decimal import Decimal
from unittest.mock import patch

import pandas as pd

import backendServer


class BackendDataTests(unittest.TestCase):
    def test_hour_data_resamples_sensor_records_and_updates_homepage(self):
        end_time = (
            pd.Timestamp.now(tz=backendServer.local_timezone)
            .floor('min')
            - pd.Timedelta(minutes=2)
        )
        timestamp_ms = int(end_time.tz_convert('UTC').timestamp() * 1000)
        with patch.object(
            backendServer.table,
            'query',
            return_value={
                'Items': [{'TS': Decimal(timestamp_ms), 'Watt-Hour': Decimal('0.5')}]
            },
        ) as query:
            frame = backendServer.get_data_hour()

        self.assertEqual(len(frame), 61)
        self.assertAlmostEqual(frame['Watt-Hour'].sum(), 0.5)
        query.assert_called_once()
        self.assertEqual(backendServer.lastMinuteUsage, 0.5)
        self.assertEqual(backendServer.lastHourUsage, 0.5)

    def test_day_and_month_series_are_filled_to_expected_length(self):
        day_end = (
            pd.Timestamp.now(tz=backendServer.local_timezone)
            .tz_localize(None)
            .floor('h')
            - pd.Timedelta(hours=1)
        )
        day_item = {
            'Period': day_end.strftime('%Y-%m-%d'),
            'DateTime': day_end.strftime('%Y-%m-%d %H:%M:%S'),
            'Watt-Hour': Decimal('2.5'),
        }
        month_end = pd.Timestamp.now(tz=backendServer.local_timezone).tz_localize(None).normalize()
        month_item = {
            'Period': month_end.strftime('%Y-%m'),
            'DateTime': month_end.strftime('%Y-%m-%d %H:%M:%S'),
            'Usage': Decimal('20'),
        }

        with patch.object(backendServer, 'query_periods', return_value=[day_item]):
            day = backendServer.get_data_day()
        with patch.object(backendServer, 'query_periods', return_value=[month_item]):
            month = backendServer.get_data_month()

        self.assertEqual(len(day), 24)
        self.assertAlmostEqual(day['Watt-Hour'].sum(), 2.5)
        self.assertEqual(len(month), 30)
        self.assertAlmostEqual(month['Watt-Hour'].sum(), 20)

    def test_hour_endpoint_returns_iso_dates(self):
        frame = pd.DataFrame({
            'DateTime': [pd.Timestamp('2026-10-07 12:00:00')],
            'Watt-Hour': [1.25],
        })
        with patch.object(backendServer, 'get_data_hour', return_value=frame):
            response = backendServer.app.test_client().get('/Hourdata')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()[0]['DateTime'], '2026-10-07T12:00:00.000')

    def test_homepage_endpoint_refreshes_and_returns_current_values(self):
        def refresh_homepage_values():
            backendServer.lastMinuteUsage = 0.75
            backendServer.lastHourUsage = 12.5
            backendServer.LasthourPeak = 1.25

        with patch.object(backendServer, 'get_data_hour', side_effect=refresh_homepage_values):
            response = backendServer.app.test_client().get('/get_homepage_data')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            'lastMinuteUsage': 0.75,
            'lastHourUsage': 12.5,
            'lastHourPeak': 1.25,
        })

    def test_live_endpoint_returns_measured_current_and_unavailable_metrics(self):
        timestamp_ms = int(pd.Timestamp.now(tz='UTC').timestamp() * 1000)
        with (
            patch.object(backendServer, 'current_sensor_enabled', True),
            patch.object(
                backendServer.table,
                'query',
                return_value={
                    'Items': [{
                        'DeviceId': 'sparksense-1',
                        'DeviceName': 'FAN',
                        'TS': Decimal(timestamp_ms),
                        'Current-A': Decimal('0.42'),
                    }]
                },
            ) as query,
        ):
            response = backendServer.app.test_client().get('/api/live')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            'deviceId': 'sparksense-1',
            'deviceName': 'FAN',
            'status': 'online',
            'lastSeenMs': timestamp_ms,
            'currentA': 0.42,
            'voltageV': None,
            'powerW': None,
            'energyWh': None,
            'frequencyHz': None,
            'powerFactor': None,
        })
        query.assert_called_once()
        self.assertFalse(query.call_args.kwargs['ScanIndexForward'])
        self.assertEqual(query.call_args.kwargs['Limit'], 1)

    def test_live_endpoint_marks_device_offline_when_no_reading_exists(self):
        with patch.object(backendServer.table, 'query', return_value={'Items': []}):
            response = backendServer.app.test_client().get('/api/live')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'offline')
        self.assertIsNone(response.get_json()['currentA'])

    def test_live_endpoint_hides_measurements_when_latest_reading_is_stale(self):
        stale_timestamp = int(pd.Timestamp.now(tz='UTC').timestamp() * 1000) - 6000
        with patch.object(
            backendServer.table,
            'query',
            return_value={
                'Items': [{
                    'DeviceId': 'sparksense-1',
                    'TS': Decimal(stale_timestamp),
                    'Current-A': Decimal('3.1'),
                    'Watt-Hour': Decimal('2.5'),
                }]
            },
        ):
            response = backendServer.app.test_client().get('/api/live')

        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'offline')
        self.assertIsNone(data['currentA'])
        self.assertIsNone(data['energyWh'])

    def test_live_endpoint_hides_current_when_current_sensor_is_disabled(self):
        timestamp_ms = int(pd.Timestamp.now(tz='UTC').timestamp() * 1000)
        with (
            patch.object(backendServer, 'current_sensor_enabled', False),
            patch.object(
                backendServer.table,
                'query',
                return_value={
                    'Items': [{
                        'DeviceId': 'sparksense-1',
                        'TS': Decimal(timestamp_ms),
                        'Current-A': Decimal('3.1'),
                    }]
                },
            ),
        ):
            response = backendServer.app.test_client().get('/api/live')

        data = response.get_json()
        self.assertEqual(data['status'], 'online')
        self.assertIsNone(data['currentA'])

    def test_live_endpoint_does_not_treat_legacy_energy_as_measured_energy(self):
        stale_timestamp = int(pd.Timestamp.now(tz='UTC').timestamp() * 1000) - 6000
        with patch.object(
            backendServer.table,
            'query',
            return_value={
                'Items': [{
                    'DeviceId': 'sparksense-1',
                    'TS': Decimal(stale_timestamp),
                    'Watt-Hour': Decimal('2.5'),
                }]
            },
        ):
            response = backendServer.app.test_client().get('/api/live')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'offline')
        self.assertIsNone(response.get_json()['currentA'])
        self.assertIsNone(response.get_json()['energyWh'])

    def test_daily_rollup_persists_yesterday_under_month_partition(self):
        now = pd.Timestamp.now(tz=backendServer.local_timezone).tz_localize(None)
        yesterday = now.date() - pd.Timedelta(days=1)
        yesterday_start = pd.Timestamp(yesterday)
        day_data = pd.DataFrame({
            'DateTime': pd.date_range(start=yesterday_start, periods=24, freq='h'),
            'Watt-Hour': [1.0] * 24,
        })
        with (
            patch.object(backendServer, 'get_data_day', return_value=day_data),
            patch.object(backendServer.table3, 'put_item') as put_item,
        ):
            backendServer.set_data_month()

        item = put_item.call_args.kwargs['Item']
        self.assertEqual(item['Period'], yesterday.strftime('%Y-%m'))
        self.assertEqual(item['DateTime'], yesterday.strftime('%Y-%m-%d 00:00:00'))
        self.assertEqual(item['Usage'], Decimal('24.0'))


if __name__ == '__main__':
    unittest.main()
