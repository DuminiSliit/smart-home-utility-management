FROM python:3.12-slim

WORKDIR /app

COPY PythonFlask/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt paho-mqtt 

COPY PythonFlask /app/PythonFlask
COPY LocalDev /app/LocalDev

WORKDIR /app
