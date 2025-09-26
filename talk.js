// Hide warning if JS runs
(function(){try{var w=document.getElementById('js-warning'); if(w) w.style.display='none';}catch(e){}})();

(()=>{
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('textInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const voiceToggle = document.getElementById('voiceToggle');
  const talkToggle = document.getElementById('talkToggle');
  const locateBtn = document.getElementById('locateBtn');
  const miniNow = document.getElementById('miniNow');
  const btnF = document.getElementById('btnF');
  const btnC = document.getElementById('btnC');
  const selfCheckBtn = document.getElementById('selfCheckBtn');

  let unit = localStorage.getItem('weBot_unit') || 'fahrenheit';
  let voiceOn = true;
  let talkMode = false;
  let currentCoords = null, lastCoords = null, lastPlaceName = null;
  let busy = false;
  let recognizer = null, isListening = false;

  const ts = () => new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  function add(role, html){
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + role;
    wrap.innerHTML = `<div class="avatar">${role==='bot'?'☁️':'👤'}</div><div><div class="bubble">${html}</div><div class="timestamp">${ts()}</div></div>`;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }
  const F = c => Math.round(c * 9/5 + 32);
  const Kmh = ms => Math.round(ms * 3.6);
  const Mph = ms => Math.round(ms * 2.23694);

  function speak(text){
    if(!voiceOn || !('speechSynthesis' in window)) return Promise.resolve();
    return new Promise(res=>{
      try{
        const u = new SpeechSynthesisUtterance(text);
        u.onend = ()=>res();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }catch{ res(); }
    });
  }

  function setupRecognizer(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return null;
    const r = new SR();
    r.lang='en-US'; r.continuous=false; r.interimResults=false; r.maxAlternatives=1;
    r.onresult = ev => { const t = ev.results[0][0].transcript; inputEl.value = t; add('me', t); answer(t); };
    r.onerror = ()=>{ isListening=false; micBtn.textContent='🎤'; if(talkMode) loopTalk(); };
    r.onend = ()=>{ isListening=false; micBtn.textContent='🎤'; if(talkMode) loopTalk(); };
    return r;
  }
  recognizer = setupRecognizer();
  async function listenOnce(){
    if(!recognizer) return;
    if(isListening) return;
    isListening = true; micBtn.textContent='🎙️';
    try{ recognizer.start(); }catch{ isListening=false; }
  }
  async function loopTalk(){
    if(!talkMode) return;
    await listenOnce();
  }

  // NOAA/Geocode
  async function geocode(place){
    const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(place)+'&count=1&language=en&format=json');
    const j = await r.json();
    if(!j.results || !j.results.length) throw new Error('No results');
    const g = j.results[0];
    return {lat:g.latitude, lon:g.longitude, name:`${g.name}${g.admin1?', '+g.admin1:''}${g.country?', '+g.country:''}`};
  }
  async function getPoint(lat, lon){
    const r = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {headers:{'Accept':'application/geo+json'}});
    if(!r.ok){ throw new Error('points failed '+r.status+' '+r.statusText); }
    return await r.json();
  }
  async function getStations(stationsUrl){
    const r = await fetch(stationsUrl, {headers:{'Accept':'application/geo+json'}});
    if(!r.ok){ throw new Error('stations failed '+r.status+' '+r.statusText); }
    return await r.json();
  }
  async function getLatestObs(stationId){
    const url = `https://api.weather.gov/stations/${stationId}/observations/latest`;
    const r = await fetch(url, {headers:{'Accept':'application/geo+json'}});
    if(!r.ok){ throw new Error('obs failed '+r.status+' '+r.statusText); }
    return await r.json();
  }
  async function getAlerts(lat, lon){
    const r = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {headers:{'Accept':'application/geo+json'}});
    if(!r.ok){ throw new Error('alerts failed '+r.status+' '+r.statusText); }
    return await r.json();
  }

  const skyIcon = (desc='') => {
    const d = desc.toLowerCase();
    if(d.includes('thunder')) return '⛈️';
    if(d.includes('snow')) return '❄️';
    if(d.includes('rain')||d.includes('drizzle')||d.includes('showers')) return '🌧️';
    if(d.includes('cloud')) return '☁️';
    if(d.includes('fog')||d.includes('mist')) return '🌫️';
    if(d.includes('clear')) return '☀️';
    return '🌡️';
  };

  async function fetchNwsNow(coords){
    const point = await getPoint(coords.lat, coords.lon);
    const stationsUrl = point.properties.observationStations;
    const stations = await getStations(stationsUrl);
    if(!stations.features || !stations.features.length) throw new Error('no stations');
    const stationId = stations.features[0].properties.stationIdentifier;
    const obs = await getLatestObs(stationId);
    const p = obs.properties || {};
    const cTempC = p.temperature && p.temperature.value;
    const windMs = p.windSpeed && p.windSpeed.value;
    const relh = p.relativeHumidity && p.relativeHumidity.value;
    const visM = p.visibility && p.visibility.value;
    const text = p.textDescription || 'conditions';
    const icon = skyIcon(text);
    const when = p.timestamp ? new Date(p.timestamp).toLocaleString() : 'now';
    const tempStr = cTempC != null ? (unit==='fahrenheit' ? F(cTempC)+'°F' : Math.round(cTempC)+'°C') : '—';
    const windStr = windMs != null ? (unit==='fahrenheit' ? Mph(windMs)+' mph' : Kmh(windMs)+' km/h') : '—';
    const visStr  = visM  != null ? (unit==='fahrenheit' ? Math.round(visM/1609.34)+' mi' : Math.round(visM/1000)+' km') : '—';
    return { stationId, icon, text, tempStr, windStr, relh, visStr, when };
  }

  function parseQuery(q){
    const lower = q.toLowerCase().trim();
    const wantsAlerts = /alert|warning|watch|advisory/.test(lower);
    const stationMatch = lower.match(/station\s+([a-z0-9]{4})/);
    const here = /(now here|alerts near me)/.test(lower);
    let placeMatch = lower.match(/\b(in|for|at)\s+([a-z\s\.,'-]+)/);
    let station = stationMatch ? stationMatch[1].toUpperCase() : null;
    let place = placeMatch ? placeMatch[2].replace(/[?\.!,]/g,'').trim() : null;
    return { wantsAlerts, station, place, here };
  }

  async function answer(query){
    if(busy) return; busy = true; sendBtn.disabled = true; sendBtn.textContent='Working…';
    const bot = add('bot','<span class="spinner"></span> Working…');
    try{
      const intent = parseQuery(query);
      let coords = null, name = null;

      if (intent.station){
        const obs = await getLatestObs(intent.station);
        const p = obs.properties || {};
        const c = p.temperature && p.temperature.value;
        const w = p.windSpeed && p.windSpeed.value;
        const text = p.textDescription || 'conditions';
        const when = p.timestamp ? new Date(p.timestamp).toLocaleString() : 'now';
        const tempStr = c!=null ? (unit==='fahrenheit'? F(c)+'°F' : Math.round(c)+'°C') : '—';
        const windStr = w!=null ? (unit==='fahrenheit'? Mph(w)+' mph' : Kmh(w)+' km/h') : '—';
        const reply = `At station ${intent.station}: ${text}, ${tempStr}, wind ${windStr}.`;
        bot.querySelector('.bubble').innerHTML = `📡 <b>${intent.station}</b> — ${text}, <b>${tempStr}</b> · wind ${windStr}<br><span class="tiny">${when}</span>`;
        await speak(reply);
        return;
      }

      if (intent.here && currentCoords){ coords = currentCoords; name = 'your location'; }
      else if (intent.place){ const g = await geocode(intent.place); coords = {lat:g.lat, lon:g.lon}; name = g.name; lastCoords = coords; lastPlaceName = name; }
      else if (lastCoords){ coords = lastCoords; name = lastPlaceName; }
      else if (currentCoords){ coords = currentCoords; name = 'your location'; }
      else { const msg="Tell me a U.S. place (e.g., now in Idabel) or a station (e.g., now at station KOKC)."; bot.querySelector('.bubble').innerHTML=msg; await speak(msg); return; }

      const now = await fetchNwsNow(coords);
      let reply = `In ${name}: ${now.text}, ${now.tempStr}, wind ${now.windStr}.`;
      let html = `📍 <b>${name}</b> (${now.stationId})<br>${now.icon} ${now.text} — <b>${now.tempStr}</b> · wind ${now.windStr} · RH ${now.relh!=null?Math.round(now.relh)+'%':'—'} · vis ${now.visStr}<br><span class="tiny">Obs time: ${now.when} (nearest NWS station)</span>`;

      if (intent.wantsAlerts){
        const alerts = await getAlerts(coords.lat, coords.lon);
        const feats = alerts.features || [];
        html += '<br><br><b>Alerts:</b><br>';
        if(feats.length===0){ html += '✅ None active.'; reply += ' No active alerts.'; }
        else{
          for(const f of feats.slice(0,3)){
            const p = f.properties || {};
            const ends = p.ends ? new Date(p.ends).toLocaleString() : 'TBA';
            html += `• ${p.event || 'Alert'} — until ${ends}<br>`;
          }
        }
      }

      bot.querySelector('.bubble').innerHTML = html;
      miniNow.innerHTML = html.replace(/<br><span class="tiny">[\s\S]*$/,'');
      await speak(reply);
    }catch(e){
      const msg = 'Error: ' + (e && e.message || e);
      bot.querySelector('.bubble').innerHTML = msg;
      try{ await speak('Sorry. '+msg.replace(/<[^>]+>/g,'')); }catch{}
    } finally {
      busy = false; sendBtn.disabled = false; sendBtn.textContent='Send ➤';
      if(talkMode) loopTalk();
    }
  }

  // Events
  sendBtn.addEventListener('click', () => { const t = inputEl.value.trim(); if (!t) return; add('me', t); inputEl.value=''; answer(t); });
  inputEl.addEventListener('keydown', e=>{ if(e.key==='Enter') sendBtn.click(); });
  document.querySelectorAll('[data-suggest]').forEach(btn => { btn.addEventListener('click', () => { const q = btn.getAttribute('data-suggest'); inputEl.value=q; add('me', q); answer(q); }); });

  // Self-check
  selfCheckBtn.addEventListener('click', async () => {
    const t = add('bot','<span class="spinner"></span> Self‑check…');
    try{
      const r = await fetch('https://api.weather.gov/points/35.4676,-97.5164', {headers:{'Accept':'application/geo+json'}});
      if(!r.ok){ t.querySelector('.bubble').innerHTML = '❌ api.weather.gov: ' + r.status + ' ' + r.statusText; }
      else { t.querySelector('.bubble').innerHTML = '✅ api.weather.gov reachable.'; }
    }catch(e){ t.querySelector('.bubble').innerHTML = '❌ Fetch error: ' + (e && e.message || e); }
  });

  // Location
  locateBtn.addEventListener('click', async () => {
    if (!navigator.geolocation){ add('bot','Geolocation not available on this device.'); return; }
    const thinking = add('bot','<span class="spinner"></span> Locating…');
    try{
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000}));
      currentCoords = {lat:pos.coords.latitude, lon:pos.coords.longitude};
      lastCoords = currentCoords; lastPlaceName = 'your location';
      thinking.querySelector('.bubble').innerHTML = '📍 Got your location. Try “now here” or “alerts near me”.';
      await speak('Got your location. Ask, now here, or alerts near me.');
      if(talkMode) loopTalk();
    }catch{ thinking.querySelector('.bubble').innerHTML = 'Location failed or blocked. Try “now in Idabel, OK”.'; }
  });

  // Voice toggles
  voiceToggle.addEventListener('click', ()=>{
    voiceOn = !voiceOn;
    voiceToggle.textContent = voiceOn ? '🔊 Voice: On' : '🔇 Voice: Off';
    if(!voiceOn && window.speechSynthesis) window.speechSynthesis.cancel();
  });
  talkToggle.addEventListener('click', async ()=>{
    if(!recognizer){ add('bot', "Talk mode needs a browser with speech recognition (Chrome/Edge)."); return; }
    talkMode = !talkMode;
    talkToggle.textContent = talkMode ? '🗣️ Talk Mode: On' : '🗣️ Talk Mode: Off';
    if(talkMode){ await speak('Talk mode on. Say a location like now in Idabel.'); loopTalk(); }
    else { try{ recognizer.stop(); }catch{} }
  });

  // Units
  function refreshUnitButtons(){ const f = unit==='fahrenheit'; btnF.classList.toggle('active',f); btnC.classList.toggle('active',!f); btnF.setAttribute('aria-pressed', f); btnC.setAttribute('aria-pressed', !f); }
  btnF.addEventListener('click', ()=>{ unit='fahrenheit'; localStorage.setItem('weBot_unit',unit); refreshUnitButtons(); add('bot','Units set to °F & mph.'); });
  btnC.addEventListener('click', ()=>{ unit='celsius'; localStorage.setItem('weBot_unit',unit); refreshUnitButtons(); add('bot','Units set to °C & km/h.'); });
  refreshUnitButtons();

  // Welcome
  add('bot', "WeBot can now talk. Toggle <b>🗣️ Talk Mode</b> for hands‑free. Try: <b>now in Idabel</b> or <b>now at station KOKC</b>.");
})();
