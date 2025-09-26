fetch('https://api.openweathermap.org/data/2.5/weather?q=Idabel&appid=962f12fdf48a09046d18f1927913816f&units=imperial')
.then(response => response.json())
.then(data => {
const weatherDiv = document.getElementById('weather');
weatherDiv.innerHTML = `
<h2>Current Conditions in ${data.name}</h2>
<p>${data.weather[0].description}, ${data.main.temp}°F</p>
`;
});
let playedSound = false;
fetch('https://api.weather.gov/alerts/active')
.then(response => response.json())
.then(data => {
const wisSection = document.getElementById('wis');
const alertSound = document.getElementById('alertSound');
if (data.features && data.features.length > 0) {
let alertsHTML = "<h2>⚠️ Active Weather Alerts Across the U.S.</h2><div class='alert-feed'>";
data.features.forEach(alert => {
alertsHTML += `
<div class="alert-item">
<strong>${alert.properties.event}</strong><br/>
<em>${alert.properties.areaDesc}</em><br/>
<small>${alert.properties.headline}</small><br/>
<p>${alert.properties.description || ''}</p>
<p><strong>Start:</strong> ${new Date(alert.properties.onset || alert.properties.effective || alert.properties.sent).toLocaleString()}<br/>
<strong>Expires:</strong> ${new Date(alert.properties.expires).toLocaleString()}</p>
<hr/>
</div>
`;
});
alertsHTML += "</div>";
wisSection.innerHTML = alertsHTML;
if (!playedSound) {
alertSound.play().catch(() => {
console.log("User interaction required for audio.");
});
playedSound = true;
}
} else {
wisSection.innerHTML = "<h2>✅ No active weather alerts in the U.S.</h2>";
}
})
.catch(err => {
const wisSection = document.getElementById('wis');
wisSection.innerHTML = "<h2>⚠️ Could not load national alerts.</h2>";
});