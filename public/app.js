const $ = (id) => document.getElementById(id);
const DEFAULT_API = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:3000";
let config = { mode: "demo", apiBase: DEFAULT_API, apiKey: "" };
let map, marker, accuracyCircle, currentPosition = { lat: 11.0168, lng: 76.9558 };
let alertCache = [];
let lastTelemetry = null;
let demoTimer = null;
const thresholds = { obstacleCm: 100, gasRaw: 500, moisture: 60, groundJumpCm: 24 };
const demo = () => ({
  deviceId: "smart-shoe-01", distanceCm: 84 + Math.round(Math.random() * 35),
  groundDistanceCm: +(11 + Math.random() * 4).toFixed(1),
  gasRaw: 150 + Math.round(Math.random() * 100), accelerationG: +(0.92 + Math.random() * .25).toFixed(2),
  fallDetected: false, pressure: 55 + Math.round(Math.random() * 30), moisture: 10 + Math.round(Math.random() * 18),
  latitude: currentPosition.lat, longitude: currentPosition.lng, batteryPercent: 78,
  deviceOnline: true, hazardFlags: { obstacle: false, dropOff: false, gas: false, wetFloor: false, fall: false }
});
function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2800); }
function timeLabel(date) { return new Date(date).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
function setStatus(id, text, type="normal") { const el=$(id); if(!el)return; el.textContent=text; el.classList.remove("warning","danger"); if(type==="warning")el.classList.add("warning"); if(type==="danger")el.classList.add("danger"); }
function setBar(id, percent) { const el=$(id); if(el)el.style.width=Math.max(0,Math.min(100,Number(percent)||0))+"%"; }
function fmtCoord(value, positive, negative) { return `${Math.abs(value).toFixed(5)}° ${value >= 0 ? positive : negative}`; }
function initMap() {
  if (!window.L) { $("map").innerHTML='<div class="empty-state"><b>Map library unavailable</b><small>Check your internet connection to load Leaflet.</small></div>'; return; }
  map = L.map("map", { zoomControl: true }).setView([currentPosition.lat,currentPosition.lng], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
  const shoeIcon = L.divIcon({ className:"", html:'<div style="width:28px;height:28px;border:3px solid #d7fff7;background:#35d9c5;border-radius:50%;box-shadow:0 0 0 7px #35d9c52b,0 0 25px #35d9c5aa"></div>', iconSize:[28,28], iconAnchor:[14,14] });
  marker = L.marker([currentPosition.lat,currentPosition.lng], {icon:shoeIcon}).addTo(map).bindPopup("<b>StrideGuard demo location</b><br>Waiting for a real GPS fix.");
  accuracyCircle = L.circle([currentPosition.lat,currentPosition.lng], {radius:30,color:"#42e5cf",fillColor:"#42e5cf",fillOpacity:.08,weight:1}).addTo(map);
}

function updateMap(lat, lng, live = false) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 || lat > 90 ||
    lng < -180 || lng > 180
  ) return;

  currentPosition = { lat, lng };

  // Update GPS information only if the HTML element exists
  if ($("latitude")) {
    $("latitude").textContent = fmtCoord(lat, "N", "S");
  }

  if ($("longitude")) {
    $("longitude").textContent = fmtCoord(lng, "E", "W");
  }

  if ($("gpsFix")) {
    $("gpsFix").textContent = live
      ? timeLabel(new Date())
      : "Demo position";
  }

  if ($("gpsValue")) {
    $("gpsValue").textContent =
      lat.toFixed(3) + ", " + lng.toFixed(3);
  }

  // Update the map if it has been initialized
  if (map && marker) {
    marker.setLatLng([lat, lng]);

    marker.setPopupContent(
      `<b>${live ? "Latest GPS fix" : "StrideGuard demo location"}</b>
      <br>${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );

    if (accuracyCircle) {
      accuracyCircle.setLatLng([lat, lng]);
    }

    if (live) {
      map.panTo([lat, lng]);
    }
  }
}

function activeHazards(data) {
  const f=data.hazardFlags||{};
  const result=[];
  if(f.obstacle || (Number.isFinite(+data.distanceCm) && +data.distanceCm < thresholds.obstacleCm)) result.push({type:"obstacle",label:"Obstacle detected",severity:"warning",value:data.distanceCm,unit:" cm"});
  if(f.dropOff) result.push({type:"dropOff",label:"Possible stair / drop-off",severity:"critical",value:data.groundDistanceCm,unit:" cm"});
  if(f.gas || (Number.isFinite(+data.gasRaw) && +data.gasRaw >= thresholds.gasRaw)) result.push({type:"gas",label:"Gas / smoke threshold exceeded",severity:"critical",value:data.gasRaw,unit:" raw"});
  if(f.wetFloor || (Number.isFinite(+data.moisture) && +data.moisture >= thresholds.moisture)) result.push({type:"wetFloor",label:"Wet surface detected",severity:"warning",value:data.moisture,unit:"%"});
  if(f.fall || data.fallDetected) result.push({type:"fall",label:"Possible fall detected",severity:"critical",value:data.accelerationG,unit:" g"});
  return result;
}
function render(data, live=false) {
  lastTelemetry=data;
  const hazards=activeHazards(data);
  $("safetyValue").textContent=hazards.length?"Attention needed":"All clear";
  $("safetyMessage").textContent=hazards.length?`${hazards.length} hazard condition${hazards.length>1?"s":""} flagged`:"No active hazards detected";
  $("deviceValue").textContent=live?(data.deviceOnline===false?"Offline":"Connected"):"Demo mode";
  $("deviceMessage").textContent=live?"Latest telemetry received":"Waiting for ESP32 connection";
  $("deviceId").textContent=data.deviceId||"smart-shoe-01";
  $("sideDevice").textContent=live?"ESP32 connected":"Demo device";
  $("sideConnection").textContent=live?"API telemetry received":"Sample data active";
  $("activeCount").innerHTML=`${hazards.length} <small>events</small>`;
  $("alertMessage").textContent=hazards.length?"Review hazard conditions":"No urgent events";
  $("lastEvent").textContent=hazards.length?hazards[0].label:"None yet";
  $("distanceValue").textContent=Number.isFinite(+data.distanceCm)?Math.round(+data.distanceCm):"—";
  $("groundValue").textContent=Number.isFinite(+data.groundDistanceCm)?(+data.groundDistanceCm).toFixed(1):"—";
  $("gasValue").textContent=Number.isFinite(+data.gasRaw)?Math.round(+data.gasRaw):"—";
  $("motionValue").textContent=data.fallDetected?"Fall detected":"Stable";
  $("pressureValue").textContent=Number.isFinite(+data.pressure)?Math.round(+data.pressure):"—";
  $("moistureValue").textContent=Number.isFinite(+data.moisture)?Math.round(+data.moisture):"—";
  setBar("distanceBar",Math.max(3,100-(+data.distanceCm||0))); setBar("groundBar",Math.min(100,(+data.groundDistanceCm||0)*4)); setBar("gasBar",Math.min(100,(+data.gasRaw||0)/10)); setBar("motionBar",data.fallDetected?100:20); setBar("pressureBar",data.pressure); setBar("moistureBar",data.moisture);
  setStatus("obstacleStatus",(+data.distanceCm<thresholds.obstacleCm)?"CHECK":"NORMAL",(+data.distanceCm<thresholds.obstacleCm)?"warning":"normal");
  setStatus("dropStatus",data.hazardFlags?.dropOff?"CHECK":"NORMAL",data.hazardFlags?.dropOff?"danger":"normal");
  setStatus("gasStatus",(+data.gasRaw>=thresholds.gasRaw)?"HIGH":"NORMAL",(+data.gasRaw>=thresholds.gasRaw)?"danger":"normal");
  setStatus("motionStatus",data.fallDetected?"FALL":"STABLE",data.fallDetected?"danger":"normal");
  setStatus("pressureStatus",(+data.pressure>5)?"DETECTED":"NO CONTACT",(+data.pressure>5)?"normal":"warning");
  setStatus("moistureStatus",(+data.moisture>=thresholds.moisture)?"WET":"DRY",(+data.moisture>=thresholds.moisture)?"warning":"normal");
  const critical=hazards.some(h=>h.severity==="critical");
  $("responseBanner").classList.toggle("alert",hazards.length>0);
  $("responseTitle").textContent=hazards.length?(critical?"Critical hazard flagged":"Hazard warning"):"All systems monitoring";
  $("responseDescription").textContent=hazards.length?hazards.map(h=>h.label).join(" · "):"No active hazard in current readings.";
  $("vibrationText").textContent=hazards.length?"Firmware should trigger a hazard pattern":"Standby · no pattern active";
  $("buzzerText").textContent=critical?"Critical alert should sound buzzer":"Standby · no sound requested";
  $("caregiverText").textContent=critical?"Send caregiver alert with GPS":"Waiting for a hazard event";
  $("vibrationState").textContent=hazards.length?"ALERT":"IDLE"; $("vibrationState").className="state-tag "+(hazards.length?"warning":"");
  $("buzzerState").textContent=critical?"ALERT":"IDLE"; $("buzzerState").className="state-tag "+(critical?"danger":"");
  $("caregiverState").textContent=critical?"NOTIFY":"READY"; $("caregiverState").className="state-tag "+(critical?"danger":"");
  $("batteryValue").innerHTML=Number.isFinite(+data.batteryPercent)?`${Math.round(+data.batteryPercent)} <small>%</small>`:"— <small>%</small>";
  setBar("batteryBar",data.batteryPercent);
  $("batteryMessage").textContent=Number.isFinite(+data.batteryPercent)?"Battery estimate from telemetry":"Add battery measurement to firmware";
  $("updateLabel").textContent=live?"API telemetry":"Sample data";
  $("modeLabel").textContent=live?"LIVE API":"DEMO LIVE";
  $("espStatus")?.textContent;
  updateMap(Number(data.latitude),Number(data.longitude),live);
  if(hazards.length && !live) {
    // Demo mode intentionally shows threshold status without fabricating persisted emergency records.
  }
}
function addAlert(alert) {
  const key=alert._id || `${alert.type}-${alert.createdAt||alert.time||""}-${alert.message}`;
  if(alertCache.some(a=>(a._id||`${a.type}-${a.createdAt||a.time||""}-${a.message}`)===key))return;
  alertCache.unshift({...alert,_key:key}); alertCache=alertCache.slice(0,80); drawAlerts();
}
function drawAlerts() {
  const list=$("alertList");
  if(!alertCache.length){list.innerHTML='<div class="empty-state"><span>◷</span><b>No alerts yet</b><small>Hazard events will appear here.</small></div>';}
  else list.innerHTML=alertCache.map(a=>`<div class="alert-row"><div class="alert-mark ${a.severity==="critical"?"critical":""}">${a.severity==="critical"?"!":"⚑"}</div><div class="alert-content"><b>${escapeHtml(a.message||a.label||a.type||"Hazard event")}</b><small>${escapeHtml(new Date(a.createdAt||a.time||Date.now()).toLocaleString())}${a.sensorValue!==undefined&&a.sensorValue!==null?" · Reading: "+escapeHtml(String(a.sensorValue)):""}</small><span class="alert-type">${escapeHtml(String(a.severity||"warning").toUpperCase())} · ${escapeHtml(String(a.type||"event").toUpperCase())}</span></div>${a._id?`<button class="ack-btn" data-ack="${a._id}" ${a.acknowledged?"disabled":""}>${a.acknowledged?"ACKED":"Acknowledge"}</button>`:""}</div>`).join("");
  $("eventTotal").textContent=`${alertCache.length} event${alertCache.length===1?"":"s"} recorded`;
  $("activeCount").innerHTML=`${alertCache.filter(a=>!a.acknowledged).length} <small>events</small>`;
  list.querySelectorAll("[data-ack]").forEach(btn=>btn.addEventListener("click",()=>ackAlert(btn.dataset.ack)));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function apiFetch(path, options={}) {
  const headers={ "Content-Type":"application/json", ...(config.apiKey?{"x-device-key":config.apiKey}:{}), ...(options.headers||{}) };
  const response=await fetch(config.apiBase.replace(/\/$/,"")+path,{...options,headers});
  if(!response.ok)throw new Error(`API ${response.status}`);
  return response.json();
}
async function refreshLive() {
  try {
    const [latest,alerts]=await Promise.all([apiFetch("/api/latest"),apiFetch("/api/alerts?limit=50")]);
    if(!latest || !Object.keys(latest).length) { $("updateLabel").textContent="Waiting for telemetry"; $("deviceValue").textContent="No data yet"; return; }
    render(latest,true); alertCache=[]; alerts.forEach(a=>alertCache.push(a)); drawAlerts();
    $("sideConnection").textContent="MongoDB-backed API"; $("deviceMessage").textContent="Telemetry received from backend";
  } catch(error) {console.error("StrideGuard refresh error:", error);
  $("updateLabel").textContent = "Update failed";
  toast("Dashboard update failed. Check browser console.");}
}
async function ackAlert(id) {
  try { const updated=await apiFetch(`/api/alerts/${id}/acknowledge`,{method:"PATCH"}); alertCache=alertCache.map(a=>a._id===id?updated:a); drawAlerts(); toast("Alert acknowledged."); }
  catch(e){toast("Could not acknowledge alert.");}
}
function openModal(){ $("settingsModal").classList.add("open"); $("settingsModal").setAttribute("aria-hidden","false"); $("modeSelect").value=config.mode==="api"?"api":"demo"; $("apiFields").classList.toggle("hidden",config.mode!=="api"); $("apiBase").value=config.apiBase; $("deviceKey").value=config.apiKey; $("modalMessage").textContent=""; }
function closeModal(){ $("settingsModal").classList.remove("open"); $("settingsModal").setAttribute("aria-hidden","true"); }
$("openSettings").addEventListener("click",openModal); $("topConnect").addEventListener("click",openModal); $("closeModal").addEventListener("click",closeModal); $("cancelModal").addEventListener("click",closeModal);
$("modeSelect").addEventListener("change",()=> $("apiFields").classList.toggle("hidden",$("modeSelect").value!=="api"));
$("saveConnection").addEventListener("click",()=>{
  if($("modeSelect").value==="api"){
    const base=$("apiBase").value.trim().replace(/\/$/,"");
    if(!base){$("modalMessage").textContent="Enter your API base URL.";return;}
    try{new URL(base);}catch(e){$("modalMessage").textContent="Enter a valid URL including http:// or https://.";return;}
    config={mode:"api",apiBase:base,apiKey:$("deviceKey").value.trim()};
    closeModal(); $("modeLabel").textContent="LIVE API"; refreshLive(); clearInterval(demoTimer); demoTimer=setInterval(refreshLive,5000); toast("Live API connection configured.");
  } else {
    config={mode:"demo",apiBase:DEFAULT_API,apiKey:""}; closeModal(); render(demo(),false); clearInterval(demoTimer); demoTimer=setInterval(()=>render(demo(),false),4000); toast("Demo mode enabled.");
  }
});
$("refreshBtn").addEventListener("click",()=>config.mode==="api"?refreshLive():render(demo(),false));
$("centerMap").addEventListener("click",()=>{if(map)map.setView([currentPosition.lat,currentPosition.lng],16);});
$("openMaps").addEventListener("click",()=>window.open(`https://www.google.com/maps?q=${currentPosition.lat},${currentPosition.lng}`,"_blank","noopener"));
$("clearAlerts").addEventListener("click",async()=>{
  if(!confirm("Clear alert history? This removes alerts from the database."))return;
  if(config.mode==="api"){try{await apiFetch("/api/alerts",{method:"DELETE"});}catch(e){toast("Could not clear server history.");return;}}
  alertCache=[];drawAlerts();toast("Alert history cleared.");
});
$("menuBtn").addEventListener("click",()=> $("sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-item[href]").forEach(a=>a.addEventListener("click",()=> $("sidebar").classList.remove("open")));
$("todayLabel")?.remove();
const dateEl=document.createElement("div"); dateEl.className="kicker"; dateEl.style.marginLeft="auto"; dateEl.textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); document.querySelector(".topbar").appendChild(dateEl);
initMap(); render(demo(),false); demoTimer=setInterval(()=>{if(config.mode==="demo")render(demo(),false);},4000);
