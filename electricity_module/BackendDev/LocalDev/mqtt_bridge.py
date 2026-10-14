import json
import logging
import os
import time
from decimal import Decimal, InvalidOperation

import boto3
import paho.mqtt.client as mqtt


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('sparksense-local-bridge')

dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url=os.environ['DYNAMODB_ENDPOINT_URL'],
    region_name=os.environ.get('AWS_DEFAULT_REGION', 'eu-north-1'),
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID', 'local'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY', 'local'),
)
table = dynamodb.Table(os.environ.get('SENSOR_TABLE', 'SensorData')) 
topic = os.environ.get('MQTT_TOPIC', 'ESP32_AWSDB/pub')

numeric_fields = {
    'Current-A': (Decimal('0'), None),
    'Voltage-V': (Decimal('0'), None),
    'Power-W': (Decimal('0'), None),
    'Watt-Hour': (Decimal('0'), None),
    'Frequency-Hz': (Decimal('0'), None),
    'Power-Factor': (Decimal('0'), Decimal('1')),
}


def reading_to_item(payload):
    if not isinstance(payload, dict):
        raise ValueError('MQTT payload must be a JSON object')

    device_id = payload.get('DeviceId')
    timestamp = payload.get('TS')
    if (
        not isinstance(device_id, str)
        or not device_id.strip()
        or isinstance(timestamp, bool)
        or not isinstance(timestamp, int)
        or timestamp <= 0
    ):
        raise ValueError('DeviceId and positive TS are required')

    item = {'DeviceId': device_id, 'TS': timestamp}
    device_name = payload.get('DeviceName')
    if device_name is not None:
        if not isinstance(device_name, str) or not device_name.strip():
            raise ValueError('DeviceName must be a nonempty string')
        item['DeviceName'] = device_name

    for field, (minimum, maximum) in numeric_fields.items():
        if field not in payload:
            continue
        value = Decimal(str(payload[field]))
        if (
            not value.is_finite()
            or value < minimum
            or (maximum is not None and value > maximum)
        ):
            raise ValueError(f'{field} is outside its valid range')
        item[field] = value

    return item


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        logger.error('MQTT connection failed: %s', reason_code)
        return
    client.subscribe(topic)
    logger.info('Subscribed to MQTT topic %s', topic) 


def on_message(client, userdata, message):
    try:
        item = reading_to_item(json.loads(message.payload))
        table.put_item(Item=item)
        logger.info('Stored reading from %s at %d', item['DeviceId'], item['TS'])
    except (KeyError, TypeError, ValueError, InvalidOperation, json.JSONDecodeError):
        logger.exception('Ignoring invalid MQTT payload from topic %s', message.topic)


def run():
    while True:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='sparksense-local-bridge')
        client.on_connect = on_connect
        client.on_message = on_message
        try:
            client.connect(
                os.environ.get('MQTT_HOST', 'mosquitto'), 
                int(os.environ.get('MQTT_PORT', '1883')),
                keepalive=60,
            )
            client.loop_forever()
        except OSError:
            logger.exception('Unable to connect to local MQTT broker; retrying')
            time.sleep(3)


if __name__ == '__main__':
    run()
