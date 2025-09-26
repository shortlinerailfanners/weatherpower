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