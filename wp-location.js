// ---- WeatherPower x Median location helper (prompts once, caches) ----
const WP = (() => {
  const KEY = 'wp_coords';
  function readSaved() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  }
  function save(lat, lon) {
    try { localStorage.setItem(KEY, JSON.stringify({ lat, lon, t: Date.now() })); } catch {}
    return { lat, lon };
  }
  function fallback() { return save(33.8957, -94.8266); } // Idabel, OK

  async function ensureAndroidPermission() {
    // Median Android bridge (no-op elsewhere)
    if (!window.median || !median.android || !median.android.geoLocation) return;
    try { await median.android.geoLocation.promptLocationServices(); } catch {}
  }

  function waitForMedianIOSReadyThen(cb) {
    // If Median iOS sets up a ready signal, wait for it; otherwise run immediately
    if (typeof window.median_geolocation_ready === "function") {
      // already provided by Median container
      window.median_geolocation_ready = () => cb();
    } else {
      cb();
    }
  }

  function getCurrentPositionOnce() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(fallback());
      navigator.geolocation.getCurrentPosition(
        pos => resolve(save(pos.coords.latitude, pos.coords.longitude)),
        ()   => resolve(fallback()),
        { timeout: 8000, maximumAge: 0 }
      );
    });
  }

  async function getCoords() {
    const saved = readSaved();
    if (saved) return saved;  // cached; no prompt
    await ensureAndroidPermission();
    return new Promise((resolve)=>{
      waitForMedianIOSReadyThen(async () => {
        const c = await getCurrentPositionOnce();
        resolve(c);
      });
    });
  }

  return { getCoords };
})();
