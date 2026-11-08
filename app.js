(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SUPABASE_URL = "https://bbnvfbjkzjexcfyprkbl.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LVBYcxg9tXCvag0DVPjumQ_uBoGI451";
  const SENSOR_META = {
    temperature: { label: "Temperature", metric: "temperatureValue", status: "temperatureStatus", unit: "°C" },
    humidity: { label: "Humidity", metric: "humidityValue", status: "humidityStatus", unit: "%" },
    light: { label: "Light level", metric: "lightValue", status: "lightStatus", unit: "lx" },
    distance: { label: "Distance", metric: "distanceValue", status: "distanceStatus", unit: "cm" }
  };

  let supabaseClient = null;
  let rows = [];
  let currentRange = "1H";
  let lastFetchAt = null;

  function setCloudStatus(message, state = "pending") {
    const node = $("supabaseStatus");
    node.textContent = message;
    node.className = "db-badge " + state;
    node.title = message;
  }

  function formatTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  function getStatus(type, value) {
    if (type === "temperature") return value > 32 ? "Check" : "Normal";
    if (type === "humidity") return value > 75 || value < 35 ? "Check" : "Normal";
    if (type === "light") return value < 180 ? "Low" : "Normal";
    if (type === "distance") return value < 12 ? "Near" : "Normal";
    return "Recorded";
  }

  function updateMetric(type, row) {
    const meta = SENSOR_META[type];
    if (!meta) return;

    const valueNode = $(meta.metric);
    const statusNode = $(meta.status);

    if (!row) {
      valueNode.textContent = "—";
      statusNode.textContent = "No data";
      statusNode.className = "status";
      return;
    }

    const value = Number(row.sensor_value);
    valueNode.textContent = Number.isFinite(value) ? String(value) : "—";
    const status = getStatus(type, value);
    statusNode.textContent = status;
    statusNode.className = "status " + (status === "Normal" ? "normal" : "warning");
  }

  function latestByType() {
    const latest = {};
    for (const row of rows) {
      if (!latest[row.sensor_type]) latest[row.sensor_type] = row;
    }
    return latest;
  }

  function renderMetrics() {
    const latest = latestByType();
    Object.keys(SENSOR_META).forEach((type) => updateMetric(type, latest[type]));
    const newest = rows[0];
    $("lastUpdated").textContent = newest ? formatTime(newest.created_at) : "No readings yet";
  }

  function renderTable() {
    const body = $("readingsTable");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">No sensor readings found in Supabase yet.</td></tr>';
      return;
    }

    body.innerHTML = rows.slice(0, 20).map((row) => {
      const meta = SENSOR_META[row.sensor_type] || { label: row.sensor_type || "Unknown" };
      const value = Number(row.sensor_value);
      const status = getStatus(row.sensor_type, value);
      const statusClass = status === "Normal" ? "normal" : "warning";
      return '<tr>' +
        '<td><span class="sensor-dot"></span>' + meta.label + '</td>' +
        '<td>' + (row.sensor_name || "—") + '</td>' +
        '<td><strong>' + (Number.isFinite(value) ? value : "—") + ' ' + (row.unit || "") + '</strong></td>' +
        '<td>' + formatTime(row.created_at) + '</td>' +
        '<td><span class="status ' + statusClass + '">' + status + '</span></td>' +
      '</tr>';
    }).join("");
  }

  function rowsInRange() {
    const now = Date.now();
    const rangeMs = currentRange === "1H" ? 60 * 60 * 1000 :
      currentRange === "24H" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    return rows
      .filter((row) => row.sensor_type === "temperature" && new Date(row.created_at).getTime() >= now - rangeMs)
      .slice()
      .reverse();
  }

  function drawChart() {
    const pointsData = rowsInRange();
    const width = 760;
    const height = 202;

    if (!pointsData.length) {
      $("chartLine").setAttribute("d", "");
      $("chartArea").setAttribute("d", "");
      $("chartLabels").innerHTML = "<span>No temperature history in this range</span>";
      $("chartCurrent").textContent = "—";
      return;
    }

    const values = pointsData.map((row) => Number(row.sensor_value));
    const low = Math.min(20, ...values) - 1;
    const high = Math.max(40, ...values) + 1;
    const xFor = (index) => pointsData.length === 1 ? width / 2 : index * width / (pointsData.length - 1);
    const yFor = (value) => height - ((value - low) / (high - low)) * height;
    const coords = values.map((value, index) => [xFor(index), yFor(value)]);
    const line = coords.map((point, index) =>
      (index ? "L" : "M") + point[0].toFixed(1) + " " + point[1].toFixed(1)
    ).join(" ");

    $("chartLine").setAttribute("d", line);
    $("chartArea").setAttribute("d", line + " L " + width + " " + height + " L 0 " + height + " Z");

    const last = coords[coords.length - 1];
    $("chartPoint").setAttribute("cx", last[0]);
    $("chartPoint").setAttribute("cy", last[1]);
    $("chartCurrent").textContent = values[values.length - 1] + "°C";

    const firstTime = pointsData[0].created_at;
    const lastTime = pointsData[pointsData.length - 1].created_at;
    $("chartLabels").innerHTML =
      "<span>" + new Date(firstTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</span>" +
      "<span>" + new Date(lastTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</span>";
  }

  async function loadReadings() {
    if (!supabaseClient) return;

    setCloudStatus("Refreshing database…", "pending");

    const { data, error } = await supabaseClient
      .from("sensor_readings")
      .select("id,created_at,sensor_name,sensor_type,sensor_value,unit")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Supabase read failed:", error);
      setCloudStatus("Database read failed", "error");
      $("readingsTable").innerHTML =
        '<tr><td colspan="5" class="empty-state">Could not read sensor_readings. Check the Supabase Data API grants and SELECT policy.</td></tr>';
      return;
    }

    rows = data || [];
    lastFetchAt = new Date();
    setCloudStatus("Connected · " + rows.length + " database readings", "online");
    renderMetrics();
    renderTable();
    drawChart();
  }

  function init() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      setCloudStatus("Supabase library unavailable", "error");
      return;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    // Display only rows that already exist in Supabase. This page does not invent or insert readings.
    loadReadings();
    window.setInterval(loadReadings, 10000);

    document.querySelectorAll(".range-tab").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".range-tab").forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        currentRange = button.dataset.range;
        drawChart();
      });
    });

    const refreshButton = $("refreshButton");
    refreshButton.innerHTML = "↻ <span>Refresh database</span>";
    refreshButton.addEventListener("click", loadReadings);
  }

  init();
})();