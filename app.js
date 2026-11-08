(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const history = Object.fromEntries(["1H","24H","7D"].map((range) => [range,{values:[],labels:[]}]));
  const readings = [];
  let cloudReadings = [];
  let currentRange = "1H";
  let latest = {temperature:29.5,humidity:64,light:728,distance:42};
  let supabaseClient = null;
  let lastSavedAt = 0;
  let isSaving = false;

  const randomBetween = (min,max,decimals=0) => Number((min+Math.random()*(max-min)).toFixed(decimals));
  const timeLabel = (value = new Date()) => new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const statusFor = (key,value) => key==="temperature" ? (value>32?"Check":"Normal") : key==="humidity" ? (value>75||value<35?"Check":"Normal") : key==="light" ? (value<180?"Low":"Normal") : (value<12?"Near":"Normal");
  const sensorMeta = [
    {key:"temperature",name:"Temperature",type:"temperature",device:"ESP32-01",unit:"°C"},
    {key:"humidity",name:"Humidity",type:"humidity",device:"ESP32-01",unit:"%"},
    {key:"light",name:"Light level",type:"light",device:"ESP32-02",unit:"lx"},
    {key:"distance",name:"Distance",type:"distance",device:"ESP32-02",unit:"cm"}
  ];

  function setCloudStatus(message,state="pending") {
    const node=$("supabaseStatus");
    if(!node)return;
    node.textContent=message;
    node.className="db-badge "+state;
    node.title=message;
  }
  function updateStatus(id,key,value) {
    const node=$(id),status=statusFor(key,value);
    node.textContent=status;
    node.className="status "+(status==="Normal"?"normal":"warning");
  }
  function addHistory(value) {
    const now=new Date();
    Object.keys(history).forEach((range)=>{
      const item=history[range];
      item.values.push(value);
      item.labels.push(range==="7D"?now.toLocaleDateString([],{weekday:"short"}):now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
      if(item.values.length>100){item.values.shift();item.labels.shift();}
    });
  }
  function setChartValues(values,labels) {
    const target=history[currentRange];
    target.values=values.slice(-100);
    target.labels=labels.slice(-100);
    drawChart();
  }
  function drawChart() {
    const series=history[currentRange],values=series.values;
    if(!values.length)return;
    const width=760,height=202,min=26,max=34;
    const points=values.map((value,index)=>[values.length===1?width:index*width/(values.length-1),Math.max(4,Math.min(height,height-((Number(value)-min)/(max-min))*height))]);
    const line=points.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    $("chartLine").setAttribute("d",line);
    $("chartArea").setAttribute("d",line+" L "+width+" "+height+" L 0 "+height+" Z");
    const last=points[points.length-1];
    $("chartPoint").setAttribute("cx",last[0]);
    $("chartPoint").setAttribute("cy",last[1]);
    const indexes=Array.from({length:7},(_,i)=>Math.round(i*(series.labels.length-1)/6));
    $("chartLabels").innerHTML=indexes.map((i)=>"<span>"+(series.labels[i]||"")+"</span>").join("");
    $("chartCurrent").textContent=Number(values[values.length-1]).toFixed(1)+"°C";
  }
  function renderReadings() {
    const rows=cloudReadings.length?cloudReadings.slice(0,8):readings.slice(0,8);
    $("readingsTable").innerHTML=rows.map((item)=>{
      const key=item.key||item.sensor_type;
      const value=Number(item.value??item.sensor_value);
      const unit=item.unit;
      const status=statusFor(key,value);
      const name=item.name||sensorMeta.find((sensor)=>sensor.type===item.sensor_type)?.name||item.sensor_type;
      const device=item.device||item.sensor_name;
      const timestamp=item.time||item.created_at;
      return "<tr><td><span class=\"sensor-dot\"></span>"+name+"</td><td>"+device+"</td><td><strong>"+value+" "+unit+"</strong></td><td>"+timeLabel(timestamp)+"</td><td><span class=\"status "+(status==="Normal"?"normal":"warning")+"\">"+status+"</span></td></tr>";
    }).join("");
  }
  function generateReadings() {
    latest={temperature:randomBetween(27.1,31.8,1),humidity:randomBetween(48,76),light:randomBetween(260,950),distance:randomBetween(18,115)};
    $("temperatureValue").textContent=latest.temperature.toFixed(1);
    $("humidityValue").textContent=latest.humidity;
    $("lightValue").textContent=latest.light;
    $("distanceValue").textContent=latest.distance;
    updateStatus("temperatureStatus","temperature",latest.temperature);
    updateStatus("humidityStatus","humidity",latest.humidity);
    updateStatus("lightStatus","light",latest.light);
    updateStatus("distanceStatus","distance",latest.distance);
    $("lastUpdated").textContent="just now";
    addHistory(latest.temperature);
    sensorMeta.forEach((sensor)=>readings.unshift({name:sensor.name,device:sensor.device,value:latest[sensor.key],unit:sensor.unit,key:sensor.key,time:new Date().toISOString()}));
    if(readings.length>40)readings.length=40;
    if(!cloudReadings.length)renderReadings();
    drawChart();
  }
  function initSupabase() {
    if(!window.supabase||typeof window.supabase.createClient!=="function"){
      setCloudStatus("Supabase library unavailable","error");
      return;
    }
    try {
      supabaseClient=window.supabase.createClient(
        "https://bbnvfbjkzjexcfyprkbl.supabase.co",
        "sb_publishable_LVBYcxg9tXCvag0DVPjumQ_uBoGI451"
      );
      setCloudStatus("Supabase connected","online");
      loadCloudReadings();
      saveSnapshot();
      window.setInterval(saveSnapshot,30000);
      window.setInterval(loadCloudReadings,60000);
    } catch(error) {
      console.error("Supabase initialization failed:",error);
      setCloudStatus("Supabase setup error","error");
    }
  }
  async function loadCloudReadings() {
    if(!supabaseClient)return;
    const {data,error}=await supabaseClient.from("sensor_readings")
      .select("id,created_at,sensor_name,sensor_type,sensor_value,unit")
      .order("created_at",{ascending:false}).limit(100);
    if(error){
      console.error("Could not load Supabase readings:",error);
      setCloudStatus("Database read blocked","error");
      return;
    }
    cloudReadings=data||[];
    setCloudStatus("Supabase live · "+cloudReadings.length+" saved","online");
    renderReadings();
    const temperatures=cloudReadings.filter((row)=>row.sensor_type==="temperature").reverse();
    if(temperatures.length){
      const values=temperatures.map((row)=>Number(row.sensor_value));
      const labels=temperatures.map((row)=>new Date(row.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
      Object.keys(history).forEach((range)=>{history[range]={values:values.slice(-100),labels:labels.slice(-100)};});
      drawChart();
    }
  }
  async function saveSnapshot() {
    if(!supabaseClient||isSaving)return;
    isSaving=true;
    const now=new Date().toISOString();
    const rows=sensorMeta.map((sensor)=>({
      sensor_name:sensor.device,
      sensor_type:sensor.type,
      sensor_value:latest[sensor.key],
      unit:sensor.unit
    }));
    const {error}=await supabaseClient.from("sensor_readings").insert(rows);
    isSaving=false;
    if(error){
      console.error("Could not save simulated readings:",error);
      setCloudStatus("Database write failed","error");
      return;
    }
    lastSavedAt=Date.now();
    setCloudStatus("Supabase live · saved","online");
    await loadCloudReadings();
  }

  document.querySelectorAll(".range-tab").forEach((button)=>button.addEventListener("click",()=>{
    document.querySelectorAll(".range-tab").forEach((tab)=>tab.classList.remove("active"));
    button.classList.add("active");
    currentRange=button.dataset.range;
    drawChart();
  }));
  $("refreshButton").addEventListener("click",generateReadings);

  for(let i=0;i<12;i++){
    const value=randomBetween(28,30.8,1);
    Object.keys(history).forEach((range)=>{
      history[range].values.push(value);
      history[range].labels.push(range==="7D"?new Date(Date.now()-(11-i)*86400000).toLocaleDateString([],{weekday:"short"}):new Date(Date.now()-(11-i)*300000).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
    });
  }
  generateReadings();
  window.setInterval(generateReadings,5000);
  initSupabase();
})();