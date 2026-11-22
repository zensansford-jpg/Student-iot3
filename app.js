(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SUPABASE_URL = "https://bbnvfbjkzjexcfyprkbl.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LVBYcxg9tXCvag0DVPjumQ_uBoGI451";
  const DEVICE_NAME = "ESP32-01";
  const SENSOR_META = {
    temperature: { label: "Temperature", metric: "temperatureValue", status: "temperatureStatus", unit: "°C" },
    humidity: { label: "Humidity", metric: "humidityValue", status: "humidityStatus", unit: "%" }
  };
  const ONLINE_WINDOW_MS = 30000;
  let client = null;
  let rows = [];
  let currentRange = "1H";
  let refreshTimer = null;
  let channel = null;

  function setCloudStatus(message, state = "pending") {
    const node = $("supabaseStatus");
    node.textContent = message;
    node.className = "db-badge " + state;
    node.title = message;
  }

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString([], {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  function statusFor(type, value) {
    if (!Number.isFinite(value)) return "Invalid";
    if (type === "temperature") return value < 0 || value > 40 ? "Check" : "Normal";
    if (type === "humidity") return value < 20 || value > 90 ? "Check" : "Normal";
    return "Recorded";
  }

  function latestByType() {
    const latest = {};
    for (const row of rows) if (!latest[row.sensor_type]) latest[row.sensor_type] = row;
    return latest;
  }

  function renderMetric(type, row) {
    const meta = SENSOR_META[type];
    const valueNode = $(meta.metric);
    const statusNode = $(meta.status);
    if (!row) {
      valueNode.textContent = "—";
      statusNode.textContent = "No data";
      statusNode.className = "status";
      return;
    }
    const value = Number(row.sensor_value);
    valueNode.textContent = Number.isFinite(value) ? value.toFixed(1).replace(/\.0$/, "") : "—";
    const status = statusFor(type, value);
    statusNode.textContent = status;
    statusNode.className = "status " + (status === "Normal" ? "normal" : "warning");
  }

  function renderDevice(latest) {
    const newest = rows[0];
    const stamp = newest ? new Date(newest.created_at).getTime() : 0;
    const online = stamp > 0 && Date.now() - stamp <= ONLINE_WINDOW_MS;
    $("deviceLastSeen").textContent = newest ? "Last data: " + formatTime(newest.created_at) : "Waiting for first sensor upload";
    $("deviceConnection").innerHTML = online ? "<i></i> Online" : "<i></i> Offline / stale";
    $("deviceConnection").style.color = online ? "#8ce1c8" : "#ffd28d";
    $("lastUpdated").textContent = newest ? formatTime(newest.created_at) : "No readings received";
  }

  function renderMetrics() {
    const latest = latestByType();
    Object.keys(SENSOR_META).forEach((type) => renderMetric(type, latest[type]));
    renderDevice(latest);
  }

  function renderTable() {
    const body = $("readingsTable");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">Waiting for real ESP32 DHT11 readings. Check Wi-Fi, wiring and firmware.</td></tr>';
      return;
    }
    body.innerHTML = rows.slice(0, 25).map((row) => {
      const meta = SENSOR_META[row.sensor_type] || { label: row.sensor_type || "Unknown" };
      const value = Number(row.sensor_value);
      const status = statusFor(row.sensor_type, value);
      const cls = status === "Normal" ? "normal" : "warning";
      return '<tr><td><span class="sensor-dot"></span>' + safeText(meta.label) + '</td>' +
        '<td>' + safeText(row.sensor_name) + '</td>' +
        '<td><strong>' + (Number.isFinite(value) ? value : "—") + ' ' + safeText(row.unit) + '</strong></td>' +
        '<td>' + safeText(formatTime(row.created_at)) + '</td>' +
        '<td><span class="status ' + cls + '">' + safeText(status) + '</span></td></tr>';
    }).join("");
  }

  function rowsInRange() {
    const rangeMs = currentRange === "1H" ? 3600000 :
      currentRange === "24H" ? 86400000 : 604800000;
    return rows.filter((row) => row.sensor_type === "temperature" &&
      new Date(row.created_at).getTime() >= Date.now() - rangeMs).slice().reverse();
  }

  function drawChart() {
    const points = rowsInRange();
    const width = 760, height = 202;
    if (!points.length) {
      $("chartLine").setAttribute("d", "");
      $("chartArea").setAttribute("d", "");
      $("chartPoint").setAttribute("r", "0");
      $("chartLabels").innerHTML = "<span>No temperature readings in this time range</span>";
      $("chartCurrent").textContent = "—";
      return;
    }
    const values = points.map((r) => Number(r.sensor_value)).filter(Number.isFinite);
    if (!values.length) return;
    const min = Math.min(...values) - 1, max = Math.max(...values) + 1;
    const span = Math.max(max - min, 2);
    const coords = values.map((v, i) => [
      points.length === 1 ? width / 2 : i * width / (points.length - 1),
      height - ((v - min) / span) * height
    ]);
    const line = coords.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    $("chartLine").setAttribute("d", line);
    $("chartArea").setAttribute("d", line + " L " + width + " " + height + " L 0 " + height + " Z");
    const last = coords[coords.length - 1];
    $("chartPoint").setAttribute("r", "5");
    $("chartPoint").setAttribute("cx", last[0]);
    $("chartPoint").setAttribute("cy", last[1]);
    $("chartCurrent").textContent = values[values.length - 1] + "°C";
    $("chartLabels").innerHTML = "<span>" +
      safeText(new Date(points[0].created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})) +
      "</span><span>" +
      safeText(new Date(points[points.length - 1].created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})) +
      "</span>";
  }

  function render() {
    renderMetrics();
    renderTable();
    drawChart();
  }

  async function loadReadings(showStatus = true) {
    if (!client) return;
    if (showStatus) setCloudStatus("Syncing live sensor data…", "pending");
    const { data, error } = await client.from("sensor_readings")
      .select("id,created_at,sensor_name,sensor_type,sensor_value,unit")
      .eq("sensor_name", DEVICE_NAME)
      .in("sensor_type", ["temperature", "humidity"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("Supabase read failed:", error);
      setCloudStatus("Database read failed", "error");
      return;
    }
    rows = data || [];
    setCloudStatus("Supabase connected · " + rows.length + " readings", "online");
    render();
  }

  function startRealtime() {
    channel = client.channel("studentiot-dht11-live")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "sensor_readings"
      }, (payload) => {
        const row = payload.new;
        if (row && row.sensor_name === DEVICE_NAME &&
            (row.sensor_type === "temperature" || row.sensor_type === "humidity")) {
          rows = [row, ...rows.filter((r) => r.id !== row.id)].slice(0, 500);
          setCloudStatus("Live · new ESP32 reading received", "online");
          render();
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setCloudStatus("Realtime connected · ESP32-01", "online");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setCloudStatus("Realtime reconnecting · polling fallback", "pending");
        }
      });
  }

  function init() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      setCloudStatus("Supabase library unavailable", "error");
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    loadReadings();
    startRealtime();
    // Fallback keeps the interface fresh if a browser/network temporarily drops Realtime.
    refreshTimer = window.setInterval(() => loadReadings(false), 15000);
    window.setInterval(() => renderDevice(latestByType()), 5000);

    document.querySelectorAll(".range-tab").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".range-tab").forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        currentRange = button.dataset.range;
        drawChart();
      });
    });
    $("refreshButton").addEventListener("click", () => loadReadings());
    window.addEventListener("beforeunload", () => {
      if (refreshTimer) window.clearInterval(refreshTimer);
      if (channel) client.removeChannel(channel);
    });
  }

  init();
})();
