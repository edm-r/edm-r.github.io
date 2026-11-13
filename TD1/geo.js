var options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
        };

function success(pos) {
    var crd = pos.coords;
    document.getElementById('longitude').textContent = `${crd.longitude}`;
    document.getElementById('latitude').textContent = `${crd.latitude}`;
    document.getElementById('hauteur').textContent = `${crd.altitude}`;
    document.getElementById('precision').textContent = `${crd.accuracy}`;
    document.getElementById('vitesse').textContent = `${crd.speed}`;
    document.getElementById('temps').textContent = `${pos.timestamp}`;
    }

function error(err) {
    console.warn(`ERREUR (${err.code}): ${err.message}`);

}
 navigator.geolocation.getCurrentPosition(success, error, options);
