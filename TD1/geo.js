const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
};

function afficherPosition(pos, suffixe) {
    const crd = pos.coords;
    
    document.getElementById('longitude' + suffixe).textContent = `${crd.longitude}`;
    document.getElementById('latitude' + suffixe).textContent = `${crd.latitude}`;
    document.getElementById('hauteur' + suffixe).textContent = `${crd.altitude ?? 'Non disponible'}`;
    document.getElementById('precision' + suffixe).textContent = `${crd.accuracy} m`;
    document.getElementById('vitesse' + suffixe).textContent = `${crd.speed ?? '0'} m/s`;
    
    // Conversion du timestamp en heure lisible
    const date = new Date(pos.timestamp);
    document.getElementById('temps' + suffixe).textContent = date.toLocaleTimeString();
}

// Callbacks spécifiques pour chaque méthode
function successOnce(pos) {
    afficherPosition(pos, ""); // Remplit les IDs sans chiffre
}

function successWatch(pos) {
    afficherPosition(pos, "2"); // Remplit les IDs finissant par "2"
}

function error(err) {
    console.warn(`ERREUR (${err.code}): ${err.message}`);
}

// 1. Appel fige
navigator.geolocation.getCurrentPosition(successOnce, error, options);

// 2. Appel continu (se met à jour à chaque déplacement)
const watchId = navigator.geolocation.watchPosition(successWatch, error, options);