# StudentIoT — ESP32 DHT11 Live Monitoring

A GitHub Pages dashboard that displays real ESP32 + DHT11 readings stored in Supabase.

## Architecture

ESP32 + DHT11 → HTTPS Supabase REST insert → `public.sensor_readings` → Supabase Realtime → GitHub Pages dashboard.

The dashboard does not generate fake readings. It listens for new database inserts and also polls as a fallback every 15 seconds.

## Hardware wiring

| DHT11 | ESP32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| DATA | GPIO 4 |

For a bare 4-pin DHT11 sensor (not a breakout module), use the required pull-up resistor between DATA and 3V3. Many breakout modules already include it.

## Firmware setup

1. Open `firmware/StudentIoT_DHT11/StudentIoT_DHT11.ino` in Arduino IDE.
2. Select your ESP32 board and port.
3. Install **DHT sensor library by Adafruit** and **Adafruit Unified Sensor**.
4. Replace `YOUR_WIFI_NAME`, `YOUR_WIFI_PASSWORD`, and `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY`.
5. Upload and open Serial Monitor at 115200 baud.

The firmware sends temperature and humidity every 10 seconds. The database supplies `created_at` automatically.

## Supabase setup already present

- Table: `public.sensor_readings`
- Columns: `sensor_name`, `sensor_type`, `sensor_value`, `unit`, `created_at`
- RLS enabled, with public SELECT and validated INSERT policies already present.
- `sensor_readings` is already included in the `supabase_realtime` publication.

The publishable/anon key is designed for public clients and is constrained by RLS. **Never use a service_role or secret key in the browser or ESP32 firmware.** The existing anonymous INSERT policy is suitable only for a classroom prototype: anyone who obtains the public key can attempt writes that satisfy its validation rules. For a production deployment, move device ingestion behind a device-authenticated Edge Function and keep its secret server-side.

## Dashboard behavior

- Real DHT11 temperature and humidity only.
- Supabase Realtime INSERT subscription.
- 15-second polling fallback if Realtime disconnects.
- Device status becomes stale/offline if no reading arrives for 30 seconds.
- Historical temperature chart and recent readings table.
- No automatic schema changes, data deletion, or self-modifying code.

## Safe upgrade workflow

The dashboard's UI and sensor data pipeline are kept separate. Future interface updates should be committed as versioned Git changes, tested before deployment, and must preserve the existing element IDs and Supabase table contract unless a planned migration is added. The page refreshes its data automatically; it does not rewrite or upgrade its own source code.

## Publish

GitHub Pages should use branch `main`, folder `/(root)`. After each commit, GitHub Pages deploys the updated static website.
