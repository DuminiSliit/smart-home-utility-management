import os
import logging
import time

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('sparksense-local-init')

endpoint_url = os.environ['DYNAMODB_ENDPOINT_URL'] 
dynamodb = boto3.client(
    'dynamodb',
    endpoint_url=endpoint_url,
    region_name=os.environ.get('AWS_DEFAULT_REGION', 'eu-north-1'),
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID', 'local'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY', 'local'),
    config=Config(
        connect_timeout=2,
        read_timeout=2,
        retries={'total_max_attempts': 1},
    ),
)

tables = {
    os.environ.get('SENSOR_TABLE', 'SensorData'): [
        {'AttributeName': 'DeviceId', 'KeyType': 'HASH'},
        {'AttributeName': 'TS', 'KeyType': 'RANGE'},
    ],
    os.environ.get('HOURLY_TABLE', 'AWS_HourlyData_24hrs'): [
        {'AttributeName': 'Period', 'KeyType': 'HASH'},
        {'AttributeName': 'DateTime', 'KeyType': 'RANGE'},
    ],
    os.environ.get('MONTHLY_TABLE', 'AWS_MonthlyData_30or31Days'): [
        {'AttributeName': 'Period', 'KeyType': 'HASH'},
        {'AttributeName': 'DateTime', 'KeyType': 'RANGE'},
    ],
}

for attempt in range(30):
    try:
        existing_tables = set(dynamodb.list_tables()['TableNames'])
        logger.info('Connected to DynamoDB Local at %s', endpoint_url)
        break
    except BotoCoreError as error:
        if attempt == 29:
            logger.exception('DynamoDB Local did not become available after 30 attempts')
            raise
        logger.warning(
            'DynamoDB Local is not ready (attempt %d/30): %s',
            attempt + 1,
            error,
        )
        time.sleep(1)

for table_name, key_schema in tables.items():
    if table_name in existing_tables:
        description = dynamodb.describe_table(TableName=table_name)['Table']
        actual_schema = description['KeySchema']
        if actual_schema != key_schema:
            raise RuntimeError(
                f'{table_name} has key schema {actual_schema}; expected {key_schema}'
            )
        logger.info('DynamoDB Local table already exists: %s', table_name)
        continue

    attribute_definitions = [
        {
            'AttributeName': key['AttributeName'],
            'AttributeType': 'N' if key['AttributeName'] == 'TS' else 'S',
        }
        for key in key_schema
    ]
    dynamodb.create_table(
        TableName=table_name,
        KeySchema=key_schema,
        AttributeDefinitions=attribute_definitions,
        BillingMode='PAY_PER_REQUEST',
    )
    logger.info('Created DynamoDB Local table: %s', table_name)
