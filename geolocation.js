document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
if (navigator.geolocation) {
navigator.geolocation.getCurrentPosition(showWeather, showError, {
enableHighAccuracy: true,
timeout: 5000,
maximumAge: 0
});
} else {
document.getElementById("location-weather").innerHTML = "Geolocation not supported.";
}
}
function showWeather(position) {
const lat = position.coords.latitude;
const lon = position.coords.longitude;
const apiKey = "962f12fdf48a09046d18f1927913816f";
fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`)
.then(res => res.json())
.then(data => {
const city = data.name;
const temp = data.main.temp;
const desc = data.weather[0].description;
const wind = data.wind.speed;
document.getElementById("location-weather").innerHTML =
`<strong>${city}</strong><br>
🌡️ Temp: ${temp}°F<br>
🌥️ Conditions: ${desc}<br>
💨 Wind: ${wind} mph`;
})
.catch(err => {
document.getElementById("location-weather").innerHTML = "Failed to load weather.";
});
}
function showError(error) {
document.getElementById("location-weather").innerHTML =
"Location error: " + error.message;
}