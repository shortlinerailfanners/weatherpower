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