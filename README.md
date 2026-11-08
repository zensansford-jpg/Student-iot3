# StudentIoT — Sensor Monitoring Dashboard

A responsive, browser-based dashboard for demonstrating an ESP32-style sensor monitoring system.

## Current mode: simulated data

No physical ESP32, sensors, Wi-Fi, database, or API is required. The website generates fresh readings locally every 5 seconds and when **Generate readings** is clicked.

| Virtual device | Simulated sensor | Unit |
| --- | --- | --- |
| ESP32-01 | Temperature | °C |
| ESP32-01 | Humidity | % |
| ESP32-02 | Light level | lx |
| ESP32-02 | Distance | cm |

Features include live metric cards, virtual device status, a temperature history chart (1H / 24H / 7D), and a recent readings table. Values and device states are clearly identified as simulated.

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

No build tools or package installation are needed.

## Publish with GitHub Pages

1. Open repository **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then save.
4. Wait for GitHub Pages to publish the site.

## Future ESP32 integration

The simulator is isolated in `app.js`. Later, replace the local data generator with an API, MQTT, or WebSocket data feed from the physical ESP32 while keeping the dashboard UI.

> This version is a demonstration only. It does not read real sensor hardware.
