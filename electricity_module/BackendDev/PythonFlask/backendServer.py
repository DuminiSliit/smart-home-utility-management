import os
from pathlib import Path
from dotenv import load_dotenv
import boto3
import pandas as pd
from flask import Flask, Response, jsonify
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from datetime import datetime
from decimal import Decimal
import threading
import time

load_dotenv(Path(__file__).with_name('.env'))

# Initialize Flask app
app = Flask(__name__)

# Use boto3's standard credential chain and allow the deployment region to be configured.
dynamodb = boto3.resource(
    'dynamodb',
    region_name=os.getenv('AWS_REGION', 'eu-north-1'),
    endpoint_url=os.getenv('DYNAMODB_ENDPOINT_URL') or None,
)
device_id = os.getenv('DEVICE_ID', 'sparksense-1')
device_name = os.getenv('DEVICE_NAME')
local_timezone = 'Asia/Colombo'

#Dynamodb Tables 
table = dynamodb.Table(os.getenv('SENSOR_TABLE', 'SensorData'))
table2 = dynamodb.Table(os.getenv('HOURLY_TABLE', 'AWS_HourlyData_24hrs'))
table3 = dynamodb.Table(os.getenv('MONTHLY_TABLE', 'AWS_MonthlyData_30or31Days'))

#variables for sending hompage data 
lastMinuteUsage = 0
lastHourUsage = 0
LasthourPeak = 0
live_reading_timeout_ms = 5000
current_sensor_enabled = os.getenv('CURRENT_SENSOR_ENABLED', '0') == '1'



# Lock for synchronization (shared resource access)
#for homepage data
data_lock_homeData = threading.Lock()

#for database access
data_lock_dataBase = threading.Lock()


#Insert the hourly usage to the within day usage data table
def set_data_day(df):
    if df.empty:
        return

    hour_start = (
        pd.Timestamp.now(tz=local_timezone)
        .tz_localize(None)
        .floor('h')
        - pd.Timedelta(hours=1)
    )
    item = {
        'Period': hour_start.strftime('%Y-%m-%d'),
        'DateTime': hour_start.strftime('%Y-%m-%d %H:%M:%S'),
        'Watt-Hour': Decimal(str(df['Watt-Hour'].sum())),
    }
    with data_lock_dataBase:
        table2.put_item(Item=item)
    app.logger.info("Hourly usage stored")


def query_periods(dynamodb_table, periods, start_time, end_time):
    items = []
    for period in periods:
        query_kwargs = {
            'KeyConditionExpression': (
                Key('Period').eq(period)
                & Key('DateTime').between(
                    start_time.strftime('%Y-%m-%d %H:%M:%S'),
                    end_time.strftime('%Y-%m-%d %H:%M:%S'),
                )
            )
        }
        while True:
            with data_lock_dataBase:
                response = dynamodb_table.query(**query_kwargs)
            items.extend(response.get('Items', []))
            last_key = response.get('LastEvaluatedKey')
            if not last_key:
                break
            query_kwargs['ExclusiveStartKey'] = last_key
    return items

#get the data from the database (24hrs usage)
def get_data_day():
    end_time = pd.Timestamp.now(tz=local_timezone).tz_localize(None).floor('h') - pd.Timedelta(hours=1)
    start_time = end_time - pd.Timedelta(hours=23)
    hourly_index = pd.date_range(start=start_time, end=end_time, freq='h')
    periods = pd.date_range(start=start_time.normalize(), end=end_time.normalize(), freq='D')
    items = query_periods(
        table2,
        [period.strftime('%Y-%m-%d') for period in periods],
        start_time.to_pydatetime(),
        end_time.to_pydatetime(),
    )
    df = pd.DataFrame(items, columns=['DateTime', 'Watt-Hour'])

    if df.empty:
        return pd.DataFrame({'DateTime': hourly_index, 'Watt-Hour': [0] * len(hourly_index)})

    df['DateTime'] = pd.to_datetime(df['DateTime'])
    df = df[(df['DateTime'] >= start_time) & (df['DateTime'] <= end_time)]
    df_resampled = (
        df.set_index('DateTime')['Watt-Hour']
        .resample('h').sum()
        .reindex(hourly_index, fill_value=0)
        .reset_index()
    )
    df_resampled.columns = ['DateTime', 'Watt-Hour']
    return df_resampled





#Saves the total usage within the day to the data table of monthly usage
def set_data_month():
    yesterday = (
        pd.Timestamp.now(tz=local_timezone).tz_localize(None).date()
        - pd.Timedelta(days=1)
    )
    day_data = get_data_day()
    yesterday_data = day_data[pd.to_datetime(day_data['DateTime']).dt.date == yesterday]
    total_watt_hour = Decimal(str(yesterday_data['Watt-Hour'].sum()))
    item = {
        'Period': yesterday.strftime('%Y-%m'),
        'DateTime': datetime.combine(yesterday, datetime.min.time()).strftime('%Y-%m-%d %H:%M:%S'),
        'Usage': total_watt_hour,
    }
    with data_lock_dataBase:
        table3.put_item(Item=item)
    app.logger.info("Daily usage stored")



#Starting from the lowest day in the database, till one monnth to the future 
def get_data_month():
    end_date = pd.Timestamp.now(tz=local_timezone).tz_localize(None).normalize()
    date_range = pd.date_range(end=end_date, periods=30, freq='D')
    periods = pd.date_range(start=date_range[0].replace(day=1), end=end_date, freq='MS')
    items = query_periods(
        table3,
        [period.strftime('%Y-%m') for period in periods],
        date_range[0].to_pydatetime(),
        end_date.to_pydatetime(),
    )
    df = pd.DataFrame(items, columns=['DateTime', 'Usage'])

    if df.empty:
        return pd.DataFrame({'DateTime': date_range, 'Watt-Hour': [0] * len(date_range)})

    df['DateTime'] = pd.to_datetime(df['DateTime']).dt.normalize()
    df = df[(df['DateTime'] >= date_range[0]) & (df['DateTime'] <= date_range[-1])]
    df_resampled = (
        df.groupby('DateTime')['Usage']
        .sum()
        .reindex(date_range, fill_value=0)
        .reset_index()
    )
    df_resampled.columns = ['DateTime', 'Watt-Hour']
    return df_resampled
#Get usage by minute from the data table
#Convertions and then get the usage within an hour
#Add data to the necessary tables and returns the hourly usage
def get_data_hour():
    end_time = pd.Timestamp.now(tz='Asia/Colombo').floor('min') - pd.Timedelta(minutes=2)
    start_time = end_time - pd.Timedelta(hours=1)
    start_ms = int(start_time.tz_convert('UTC').timestamp() * 1000)
    end_ms = int(end_time.tz_convert('UTC').timestamp() * 1000)
    query_kwargs = {
        'KeyConditionExpression': Key('DeviceId').eq(device_id) & Key('TS').between(start_ms, end_ms),
        'ProjectionExpression': '#ts, #usage',
        'ExpressionAttributeNames': {'#ts': 'TS', '#usage': 'Watt-Hour'},
    }
    items = []
    while True:
        with data_lock_dataBase:
            response = table.query(**query_kwargs)
        items.extend(response.get('Items', []))
        last_key = response.get('LastEvaluatedKey')
        if not last_key:
            break
        query_kwargs['ExclusiveStartKey'] = last_key

    minutes = pd.date_range(
        start=start_time.tz_localize(None),
        end=end_time.tz_localize(None),
        freq='min',
    )
    df = pd.DataFrame(items, columns=['TS', 'Watt-Hour'])
    if df.empty:
        df_first_hour = pd.DataFrame({'DateTime': minutes, 'Watt-Hour': [0] * len(minutes)})
    else:
        df['TS'] = pd.to_numeric(df['TS'])
        df['DateTime'] = (
            pd.to_datetime(df['TS'], unit='ms', utc=True)
            .dt.tz_convert('Asia/Colombo')
            .dt.tz_localize(None)
            .dt.floor('min')
        )
        usage_by_minute = df.set_index('DateTime')['Watt-Hour'].resample('min').sum()
        df_first_hour = usage_by_minute.reindex(minutes, fill_value=0).rename('Watt-Hour').reset_index()
        df_first_hour.columns = ['DateTime', 'Watt-Hour']

    global lastMinuteUsage, lastHourUsage, LasthourPeak
    with data_lock_homeData:
        lastMinuteUsage = float(df_first_hour['Watt-Hour'].iloc[-1])
        lastHourUsage = float(df_first_hour['Watt-Hour'].sum())
        LasthourPeak = float(df_first_hour['Watt-Hour'].max())

    return df_first_hour



 
#run hour by hour to update the hourly usage
def addDataHourly():    
    print("Thread 1 running")
    while True:
        
        if pd.Timestamp.now(tz=local_timezone).minute == 0:
            try:
                df_first_hour = pd.DataFrame(get_data_hour())
                set_data_day(df_first_hour)
                print(f"send to insert - minute{datetime.now()}")
                time.sleep(60)

            except Exception as e:
                app.logger.exception("Unable to store hourly usage")
                time.sleep(20)
        else:
            time.sleep(20)

#run each day to update the monthly usage
def addDataDaily():
    print("Thread 2 running")
    while True:   
        #add data of each day to monthly record
        #Should not turn on within the 00:00 more than once (multiple rows can be added)
        now = pd.Timestamp.now(tz=local_timezone)
        if now.hour == 0 and now.minute == 5:
                try:
                    set_data_month()
                    print(f"send to insert - day{datetime.now()}")
                    time.sleep(86400)  # 86400 seconds = 1 day

                except Exception as e:
                    app.logger.exception("Unable to store daily usage")
                    time.sleep(20)

        else:
            time.sleep(20)#Trying again to insert in  20 seconds 
            
#To do : If insertion didnt go as planned, get an error handling mechanism



@app.route('/Hourdata', methods=['GET'])
def get_data_withinHour():
    try:
        df = pd.DataFrame(get_data_hour())
        return Response(df.to_json(orient="records", date_format="iso"), mimetype="application/json")
    except ClientError:
        app.logger.exception("Unable to read hourly sensor data")
        return jsonify({"error": "Unable to read hourly sensor data"}), 500
    


@app.route('/DayData', methods=['GET'])
def get_data_withinDay():
    try:
        df = pd.DataFrame(get_data_day())
        return Response(df.to_json(orient="records", date_format="iso"), mimetype="application/json")
    except ClientError:
        app.logger.exception("Unable to read daily usage data")
        return jsonify({"error": "Unable to read daily usage data"}), 500


@app.route('/MonthData', methods=['GET'])
def get_data_withinMonth():
    try:
        df = pd.DataFrame(get_data_month())
        return Response(df.to_json(orient="records", date_format="iso"), mimetype="application/json")
    except ClientError:
        app.logger.exception("Unable to read monthly usage data")
        return jsonify({"error": "Unable to read monthly usage data"}), 500












@app.route('/get_homepage_data', methods=['GET'])
def get_homepage_data():
    try:
        get_data_hour()
    except ClientError:
        app.logger.exception("Unable to refresh homepage sensor data")
        return jsonify({"error": "Unable to refresh homepage sensor data"}), 500

    with data_lock_homeData:
        return jsonify({
            "lastMinuteUsage": lastMinuteUsage,
            "lastHourUsage": lastHourUsage,
            "lastHourPeak": LasthourPeak,
        }), 200


@app.route('/api/live', methods=['GET'])
def get_live_reading():
    try:
        response = table.query(
            KeyConditionExpression=Key('DeviceId').eq(device_id),
            ProjectionExpression='#device, #ts, #name, #current, #voltage, #power, #energy, #frequency, #factor',
            ExpressionAttributeNames={
                '#device': 'DeviceId',
                '#ts': 'TS',
                '#name': 'DeviceName',
                '#current': 'Current-A',
                '#voltage': 'Voltage-V',
                '#power': 'Power-W',
                '#energy': 'Watt-Hour',
                '#frequency': 'Frequency-Hz',
                '#factor': 'Power-Factor',
            },
            ScanIndexForward=False,
            Limit=1,
        )
    except ClientError:
        app.logger.exception("Unable to read latest sensor reading")
        return jsonify({"error": "Unable to read latest sensor reading"}), 500

    items = response.get('Items', [])
    if not items:
        return jsonify({
            "deviceId": device_id,
            "deviceName": None,
            "status": "offline",
            "lastSeenMs": None,
            "currentA": None,
            "voltageV": None,
            "powerW": None,
            "energyWh": None,
            "frequencyHz": None,
            "powerFactor": None,
        }), 200

    item = items[0]
    last_seen_ms = int(item['TS'])
    age_ms = int(time.time() * 1000) - last_seen_ms
    is_online = 0 <= age_ms <= live_reading_timeout_ms

    def measurement(field):
        value = item.get(field) if is_online else None
        return float(value) if value is not None else None

    return jsonify({
        "deviceId": device_id,
        "deviceName": device_name or item.get('DeviceName'),
        "status": "online" if is_online else "offline",
        "lastSeenMs": last_seen_ms,
        "currentA": measurement('Current-A') if current_sensor_enabled else None,
        "voltageV": measurement('Voltage-V'),
        "powerW": measurement('Power-W'),
        "energyWh": measurement('Watt-Hour') if 'Current-A' in item else None,
        "frequencyHz": measurement('Frequency-Hz'),
        "powerFactor": measurement('Power-Factor'),
    }), 200

if __name__ == '__main__':
    if os.getenv('RUN_BACKGROUND_JOBS', '0') == '1':
        threading.Thread(target=addDataHourly, daemon=True).start()
        threading.Thread(target=addDataDaily, daemon=True).start()

    app.run(
        host=os.getenv('HOST', '127.0.0.1'),
        port=int(os.getenv('PORT', '5000')),
        debug=os.getenv('FLASK_DEBUG', '0') == '1',
        use_reloader=False,
    )




#To be checked : must recieve the lates values from the database. (Spaces couses between values)
