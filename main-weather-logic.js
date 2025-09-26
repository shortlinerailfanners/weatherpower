let lastAlertCount = 0;
const alertAudio = new Audio('alert.mp3');
async function checkAlerts() {
try {
const response = await fetch('https://api.openweathermap.org/data/2.5/weather?q=Idabel,US&appid=962f12fdf48a09046d18f1927913816f');
const data = await response.json();
if (data.weather && data.weather.length > lastAlertCount) {
alertAudio.play();
lastAlertCount = data.weather.length;
}
} catch (e) {
console.error('Alert check failed:', e);
}
}
setInterval(checkAlerts, 60000);
let lastWeather = {};
const conditionAudio = new Audio('alert.mp3');
async function checkWeatherConditions() {
try {
const res = await fetch('https://api.openweathermap.org/data/2.5/weather?lat=33.8958&lon=-94.8261&appid=962f12fdf48a09046d18f1927913816f&units=imperial');
const data = await res.json();
const currentDesc = data.weather[0].description;
const wind = data.wind.speed;
const temp = data.main.temp;
const alertBox = document.getElementById('live-alerts');
let alerts = [];
if (currentDesc.includes("rain")) {
alerts.push("🌧️ Rain detected in your area");
}
if (wind > 25) {
alerts.push("💨 Wind gusts over 25 MPH");
}
if (temp > 100) {
alerts.push("🌡️ Extreme heat: " + temp + "°F");
}
if (JSON.stringify(lastWeather) !== JSON.stringify(data.weather)) {
if (alerts.length > 0) conditionAudio.play();
}
lastWeather = data.weather;
alertBox.innerHTML = alerts.length > 0
? "<strong>⚠️ Live Alerts:</strong><ul><li>" + alerts.join("</li><li>") + "</li></ul>"
: "<strong>✅ No active weather alerts</strong>";
} catch (e) {
console.error("Weather condition check failed", e);
}
}
setInterval(checkWeatherConditions, 60000);
window.onload = checkWeatherConditions;
firebase.database().ref("wewatches").on("value", (snapshot) => {
const now = new Date();
snapshot.forEach((child) => {
const data = child.val();
const expiry = new Date(data.expires);
if (expiry < now) {
firebase.database().ref("wewatches/" + child.key).remove();
return;
}
if (window.map && typeof L !== "undefined") {
const coords = JSON.parse(data.polygon);
const poly = L.polygon(coords, {
color: data.type.includes("Tornado") ? "red" : "orange",
fillOpacity: 0.4
}).addTo(map);
setTimeout(() => map.removeLayer(poly), (expiry - now));
}
});
});