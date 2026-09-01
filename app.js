const CONFIG = {
  masjidName: "El-Madina",
  fallback: { lat: -6.4815, lon: 106.8294, label: "Cibinong, Bogor" },
  method: 20, // Kementerian Agama Republik Indonesia
  school: 0,
  api: "https://api.aladhan.com/v1/timings"
};

const state = {
  lat: CONFIG.fallback.lat, lon: CONFIG.fallback.lon, locationLabel: CONFIG.fallback.label,
  timings: null, hijri: null, next: null, fetchedAt: null,
  settings: JSON.parse(localStorage.getItem("elMadinaSettings") || "{}")
};

const prayerDefs = [
  ["Imsak","Imsak"],["Subuh","Fajr"],["Terbit","Sunrise"],["Dzuhur","Dhuhr"],
  ["Ashar","Asr"],["Maghrib","Maghrib"],["Isya","Isha"]
];

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,"0");

function dateKey(d=new Date()){
  return `${d.getDate().toString().padStart(2,"0")}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getFullYear()}`;
}
function localDateText(d=new Date()){
  return new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d);
}
function setText(id,text){ if($(id)) $(id).textContent=text; }

function renderClock(){
  const now = new Date();
  setText("clock", now.toLocaleTimeString("id-ID",{hour12:false}));
  setText("gregorianDate", localDateText(now));
  updateNextPrayer(now);
}
setInterval(renderClock,1000); renderClock();

async function fetchPrayerTimes(){
  setText("statusText","Memuat jadwal shalat…");
  try{
    const url = `${CONFIG.api}/${dateKey()}?latitude=${encodeURIComponent(state.lat)}&longitude=${encodeURIComponent(state.lon)}&method=${CONFIG.method}&school=${CONFIG.school}&iso8601=true`;
    const res = await fetch(url,{cache:"no-store"});
    if(!res.ok) throw new Error("API error");
    const json = await res.json();
    state.timings = json.data.timings;
    state.hijri = json.data.date?.hijri;
    state.fetchedAt = new Date();
    renderPrayerGrid();
    renderDates();
    setText("statusText",`Jadwal diperbarui • ${state.locationLabel}`);
    setText("lastUpdated",`Diperbarui ${state.fetchedAt.toLocaleTimeString("id-ID",{hour12:false})}`);
  }catch(err){
    console.error(err);
    setText("statusText","Jadwal belum dapat diperbarui. Coba lagi.");
  }
}

function renderDates(){
  if(!state.hijri) return;
  const h=state.hijri;
  const full=`${h.day} ${h.month?.ar || h.month?.en || ""} ${h.year} H`;
  setText("hijriDate",`${h.day} ${h.month?.en || ""} ${h.year} H`);
  setText("hijriFull",full);
  setText("coords",`${state.lat.toFixed(4)}, ${state.lon.toFixed(4)}`);
  setText("locationBadge",state.locationLabel);
}

function cleanTime(value){
  if(!value) return null;
  const m=String(value).match(/(\d{1,2}):(\d{2})/);
  return m ? `${pad(m[1])}:${m[2]}` : null;
}
function timeToday(hhmm,base=new Date()){
  const [h,m]=hhmm.split(":").map(Number);
  const d=new Date(base); d.setHours(h,m,0,0); return d;
}

function renderPrayerGrid(){
  const grid=$("prayerGrid"); grid.innerHTML="";
  const now=new Date();
  const relevant=prayerDefs.filter(([name,key])=>key!=="Imsak" && key!=="Sunrise");
  const activeKey=state.next?.key;
  relevant.forEach(([name,key])=>{
    const t=cleanTime(state.timings[key]);
    const card=document.createElement("div");
    card.className="prayer-card"+(key===activeKey?" active":"");
    card.innerHTML=`<div class="name">${name}</div><div class="time">${t||"--:--"}</div>`;
    grid.appendChild(card);
  });
}

function updateNextPrayer(now=new Date()){
  if(!state.timings) return;
  const candidates=[["Subuh","Fajr"],["Dzuhur","Dhuhr"],["Ashar","Asr"],["Maghrib","Maghrib"],["Isya","Isha"]]
    .map(([name,key])=>({name,key,time:cleanTime(state.timings[key])}))
    .filter(x=>x.time);

  let next=candidates.map(x=>({...x,date:timeToday(x.time,now)})).find(x=>x.date>now);
  if(!next){
    // after Isya: next is tomorrow's Subuh
    const first=candidates[0];
    next={...first,date:timeToday(first.time,new Date(now.getTime()+86400000))};
    next.date.setDate(next.date.getDate()+0);
  }
  state.next=next;
  setText("nextPrayerName",next.name);
  setText("nextPrayerTime",next.time);

  let diff=Math.max(0,next.date-now);
  const totalSec=Math.floor(diff/1000);
  const h=Math.floor(totalSec/3600), m=Math.floor((totalSec%3600)/60), s=totalSec%60;
  setText("countdown",`${pad(h)}:${pad(m)}:${pad(s)}`);

  // Approximate progress from previous prayer to next.
  let prev=candidates.map(x=>timeToday(x.time,now)).filter(d=>d<=now).pop();
  if(!prev){ prev=timeToday(candidates[candidates.length-1].time,new Date(now.getTime()-86400000)); }
  const span=next.date-prev;
  const pct=Math.min(100,Math.max(0,((now-prev)/span)*100));
  $("progressBar").style.width=`${pct}%`;
  renderPrayerGrid();
}
setInterval(()=>updateNextPrayer(new Date()),1000);

async function requestLocation(){
  const mode=state.settings.locationMode || "auto";
  if(mode==="cibinong"){
    state.lat=CONFIG.fallback.lat;state.lon=CONFIG.fallback.lon;state.locationLabel=CONFIG.fallback.label;
    await fetchPrayerTimes();return;
  }
  if(!navigator.geolocation){
    state.locationLabel=CONFIG.fallback.label;await fetchPrayerTimes();return;
  }
  navigator.geolocation.getCurrentPosition(async pos=>{
    state.lat=pos.coords.latitude;state.lon=pos.coords.longitude;
    state.locationLabel=`Lokasi perangkat • ${state.lat.toFixed(2)}, ${state.lon.toFixed(2)}`;
    await fetchPrayerTimes();
  },async ()=>{
    state.lat=CONFIG.fallback.lat;state.lon=CONFIG.fallback.lon;state.locationLabel=CONFIG.fallback.label;
    await fetchPrayerTimes();
  },{enableHighAccuracy:true,timeout:10000,maximumAge:300000});
}

const announcements=[
  ["Kajian Rutin","Mari hadir dan ramaikan kajian bersama keluarga besar El-Madina."],
  ["Jaga Kebersihan","Mohon menjaga kebersihan dan ketenangan area masjid."],
  ["Infak & Sedekah","Salurkan infak terbaik untuk kemakmuran dan kegiatan masjid."]
];
const agenda=[
  ["Ba'da Maghrib","Kajian & tilawah bersama"],
  ["Jumat","Khutbah dan shalat Jumat"],
  ["Setiap Hari","Shalat berjamaah 5 waktu"]
];
function renderContent(){
  $("announcementList").innerHTML=announcements.map(a=>`<div class="announcement"><strong>${a[0]}</strong><p>${a[1]}</p></div>`).join("");
  $("agendaList").innerHTML=agenda.map(a=>`<div class="agenda"><div class="agenda-time">${a[0]}</div><div><strong>${a[1]}</strong><p>Informasi dapat disesuaikan oleh pengelola.</p></div></div>`).join("");
  $("tickerText").textContent="Selamat datang di Masjid El-Madina • Jaga ketenangan • Luruskan dan rapatkan shaf • Semoga setiap langkah menuju masjid menjadi keberkahan.";
}
renderContent();

$("refreshBtn").addEventListener("click",fetchPrayerTimes);
$("settingsBtn").addEventListener("click",()=>{ $("settingsModal").classList.remove("hidden"); });
$("closeModal").addEventListener("click",()=>{$("settingsModal").classList.add("hidden")});
$("settingsModal").addEventListener("click",e=>{if(e.target.id==="settingsModal")$("settingsModal").classList.add("hidden")});
$("saveSettings").addEventListener("click",()=>{
  state.settings.locationMode=$("locationMode").value;
  state.settings.slideSeconds=Number($("slideSeconds").value)||15;
  state.settings.masjidName=$("masjidNameInput").value.trim()||"El-Madina";
  localStorage.setItem("elMadinaSettings",JSON.stringify(state.settings));
  $("settingsModal").classList.add("hidden");
  requestLocation();
});

$("masjidNameInput").value=state.settings.masjidName||"El-Madina";
$("locationMode").value=state.settings.locationMode||"auto";
$("slideSeconds").value=state.settings.slideSeconds||15;

requestLocation();
