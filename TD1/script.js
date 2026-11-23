"use strict";

// Script partagé : l'exercice 1 affiche les mesures, le 2 initialise Leaflet.
const exercice = document.body.dataset.exercise;
const optionsPosition = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
let watchId = null;
let carte = null;
let marqueurPosition = null;
let cerclePrecision = null;
let dernierePosition = null;
let calquePosition = null;
let centrerProchainePosition = true;

// Leaflet utilise [latitude, longitude].
const nice = [43.697399, 7.27017]; // Place Masséna
const marseille = [43.2965, 5.3698]; // Vieux-Port

function afficherTexte(id, texte) {
  const element = document.getElementById(id);
  if (element) element.textContent = texte;
}

function auClic(id, action) {
  document.getElementById(id)?.addEventListener("click", action);
}

function formaterNombre(nombre, decimales = 1) {
  return nombre.toLocaleString("fr-FR", { maximumFractionDigits: decimales });
}

function messageErreurPosition(erreur) {
  switch (erreur.code) {
    case 1: return "Localisation refusée. Autorisez-la dans les paramètres du navigateur puis réessayez.";
    case 2: return "Position indisponible. Vérifiez le service de localisation de votre appareil.";
    case 3: return "Le délai de localisation est dépassé. Réessayez, si possible près d’une fenêtre.";
    default: return "Impossible d’obtenir votre position. Réessayez.";
  }
}

function afficherMesure(position, suffixe) {
  const coordonnees = position.coords;
  afficherTexte("longitude" + suffixe, coordonnees.longitude.toFixed(6) + "°");
  afficherTexte("latitude" + suffixe, coordonnees.latitude.toFixed(6) + "°");
  afficherTexte("hauteur" + suffixe, coordonnees.altitude === null
    ? "Non disponible" : formaterNombre(coordonnees.altitude) + " m");
  afficherTexte("precision" + suffixe, formaterNombre(coordonnees.accuracy) + " m");
  afficherTexte("vitesse" + suffixe, coordonnees.speed === null
    ? "Non disponible" : formaterNombre(coordonnees.speed) + " m/s");
  afficherTexte("temps" + suffixe, new Date(position.timestamp).toLocaleString("fr-FR"));
}

function actualiserPositionCarte(position) {
  // Une réponse ponctuelle ancienne ne doit pas remplacer une mesure plus récente.
  if (dernierePosition && position.timestamp < dernierePosition.timestamp) return;
  dernierePosition = position;
  const { latitude, longitude, accuracy } = position.coords;
  const point = [latitude, longitude];
  // map.distance calcule la distance du grand cercle en mètres (CRS par défaut).
  const distanceKm = carte.distance(point, marseille) / 1000;

  if (!marqueurPosition) {
    marqueurPosition = L.marker(point).addTo(calquePosition);
    cerclePrecision = L.circle(point, {
      color: "#6d28d9", fillOpacity: 0.15, radius: accuracy,
    }).addTo(calquePosition);
  } else {
    marqueurPosition.setLatLng(point);
    cerclePrecision.setLatLng(point).setRadius(accuracy);
  }
  marqueurPosition.bindPopup(
    "Votre position<br>Précision estimée : " + formaterNombre(accuracy) +
    " m<br>Marseille à vol d’oiseau : " + formaterNombre(distanceKm) + " km"
  );
  afficherTexte("position-summary", latitude.toFixed(6) + "°, " + longitude.toFixed(6) +
    "° · précision estimée : " + formaterNombre(accuracy) + " m");
  afficherTexte("distance-marseille", formaterNombre(distanceKm) + " km à vol d’oiseau");
  afficherTexte("map-status", "Position mise à jour à " +
    new Date(position.timestamp).toLocaleTimeString("fr-FR") + ". Le suivi est actif.");

  if (centrerProchainePosition) {
    carte.addLayer(calquePosition);
    carte.setView(point, 15);
    centrerProchainePosition = false;
  }
}

function afficherPosition(position, suffixe) {
  if (exercice === "1") {
    afficherMesure(position, suffixe);
    afficherTexte(suffixe === "2" ? "status-watch" : "status-once",
      suffixe === "2" ? "Position actualisée : suivi actif." : "Position ponctuelle obtenue.");
  } else if (carte) {
    actualiserPositionCarte(position);
  }
}

function demanderPosition() {
  if (exercice === "2") centrerProchainePosition = true;
  afficherTexte(exercice === "1" ? "status-once" : "map-status", "Recherche de votre position…");
  navigator.geolocation.getCurrentPosition(
    (position) => afficherPosition(position, ""),
    (erreur) => afficherTexte(exercice === "1" ? "status-once" : "map-status",
      messageErreurPosition(erreur)),
    optionsPosition
  );
}

function actualiserBoutonsSuivi() {
  const demarrer = document.getElementById("start-watch");
  const arreter = document.getElementById("stop-watch");
  if (demarrer) demarrer.disabled = watchId !== null;
  if (arreter) arreter.disabled = watchId === null;
}

function arreterSuivi() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  actualiserBoutonsSuivi();
}

function demarrerSuivi() {
  if (watchId !== null) return;
  afficherTexte(exercice === "1" ? "status-watch" : "map-status", "Suivi : attente de la première position…");
  watchId = navigator.geolocation.watchPosition(
    (position) => afficherPosition(position, "2"),
    (erreur) => {
      // Un refus termine cet abonnement ; les autres erreurs peuvent être temporaires.
      if (erreur.code === 1) arreterSuivi();
      afficherTexte(exercice === "1" ? "status-watch" : "map-status", messageErreurPosition(erreur));
    },
    optionsPosition
  );
  actualiserBoutonsSuivi();
}

async function chargerJSON(url) {
  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), 15000);
  try {
    const reponse = await fetch(url, { signal: controleur.signal });
    if (!reponse.ok) throw new Error("Réponse HTTP " + reponse.status);
    return await reponse.json();
  } finally {
    clearTimeout(delai);
  }
}

function initialiserCarte() {
  if (!window.L) {
    afficherTexte("map-status", "Leaflet n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.");
    ["locate-position", "show-riviera", "show-bermuda", "load-geojson", "load-route"].forEach((id) => {
      document.getElementById(id).disabled = true;
    });
    return false;
  }

  carte = L.map("map").setView(nice, 13);
  const openStreetMap = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(carte);
  const relief = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution: 'Données &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | ' +
      'Relief : SRTM, Sonny | Fond &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  });
  relief.on("tileerror", () => afficherTexte("map-status",
    "Le fond OpenTopoMap est indisponible ici. Vous pouvez sélectionner OpenStreetMap dans les fonds de carte."));

  calquePosition = L.layerGroup().addTo(carte);
  const reperes = L.layerGroup().addTo(carte);
  L.marker(nice).bindPopup("Nice · Place Masséna").addTo(reperes);
  L.marker(marseille).bindPopup("Marseille · Vieux-Port").addTo(reperes);
  L.polyline([marseille, nice], { color: "#2563eb", weight: 3 })
    .bindPopup("Segment Marseille–Nice à vol d’oiseau").addTo(reperes);

  const bermudes = L.polygon([
    [32.3078, -64.7505], // Bermudes
    [25.7617, -80.1918], // Miami
    [18.4655, -66.1057], // San Juan (Porto Rico)
  ], { color: "red", fillOpacity: 0.2 }).bindPopup("Triangle des Bermudes").addTo(carte);
  const communes = L.layerGroup().addTo(carte);
  const itineraire = L.layerGroup().addTo(carte);
  L.control.layers({ OpenStreetMap: openStreetMap, "Relief · OpenTopoMap": relief }, {
    "Ma position et sa précision": calquePosition,
    "Nice, Marseille et leur segment": reperes,
    "Triangle des Bermudes": bermudes,
    "Communes des Alpes-Maritimes (GeoJSON)": communes,
    "Itinéraire routier Nice–Marseille": itineraire,
  }).addTo(carte);
  L.control.scale({ imperial: false }).addTo(carte);

  auClic("show-riviera", () => {
    carte.addLayer(reperes);
    carte.fitBounds([nice, marseille], { padding: [35, 35] });
  });
  auClic("show-bermuda", () => {
    carte.addLayer(bermudes);
    carte.fitBounds(bermudes.getBounds(), { padding: [35, 35] });
  });

  async function chargerCommunes(centrer = false) {
    const bouton = document.getElementById("load-geojson");
    bouton.disabled = true;
    afficherTexte("geojson-status", "Chargement des communes des Alpes-Maritimes…");
    try {
      // GeoJSON utilise [longitude, latitude] ; L.geoJSON convertit cet ordre.
      const donnees = await chargerJSON(
        "https://geo.api.gouv.fr/departements/06/communes?fields=nom,code,centre&format=geojson&geometry=centre"
      );
      if (donnees.type !== "FeatureCollection" || !Array.isArray(donnees.features) || !donnees.features.length) {
        throw new Error("La réponse ne contient aucune commune GeoJSON.");
      }
      const nouveauCalque = L.geoJSON(donnees, {
        pointToLayer: (feature, point) => L.circleMarker(point, {
          radius: 5, color: "#166534", fillColor: "#4ade80", fillOpacity: 0.65,
        }),
        onEachFeature: (feature, calque) => {
          // Afficher les propriétés distantes sans interpréter du HTML.
          const contenu = document.createElement("p");
          contenu.textContent = (feature.properties.nom || "Commune") +
            " · code INSEE : " + (feature.properties.code || "non disponible");
          calque.bindPopup(contenu);
        },
      });
      communes.clearLayers();
      communes.addLayer(nouveauCalque);
      carte.addLayer(communes);
      if (centrer) carte.fitBounds(nouveauCalque.getBounds(), { padding: [35, 35] });
      afficherTexte("geojson-status", donnees.features.length + " communes affichées ");
    } catch (erreur) {
      afficherTexte("geojson-status", "Chargement des communes impossible. Réessayez avec le bouton. " +
        (communes.getLayers().length ? "Les données précédentes restent affichées." : ""));
      console.warn("GeoJSON :", erreur);
    } finally {
      bouton.disabled = false;
    }
  }

  async function chargerItineraire(centrer = false) {
    const bouton = document.getElementById("load-route");
    bouton.disabled = true;
    afficherTexte("route-status", "Calcul du trajet routier Nice–Marseille…");
    try {
      // OSRM attend longitude,latitude pour chaque étape.
      const etapes = [nice, marseille].map(([latitude, longitude]) => longitude + "," + latitude).join(";");
      const donnees = await chargerJSON("https://router.project-osrm.org/route/v1/driving/" +
        etapes + "?overview=full&geometries=geojson");
      const trajet = donnees.routes?.[0];
      if (donnees.code !== "Ok" || !trajet || trajet.geometry?.type !== "LineString" ||
          !trajet.geometry.coordinates?.length || !Number.isFinite(trajet.distance) ||
          !Number.isFinite(trajet.duration)) {
        throw new Error("Aucun itinéraire routier disponible.");
      }
      const description = "Nice–Marseille : " + formaterNombre(trajet.distance / 1000) +
        " km par la route · environ " + Math.round(trajet.duration / 60) + " min (hors trafic).";
      const nouveauCalque = L.geoJSON(trajet.geometry, {
        style: { color: "#c2410c", weight: 5, opacity: 0.85 },
      }).bindPopup(description);
      itineraire.clearLayers();
      itineraire.addLayer(nouveauCalque);
      carte.addLayer(itineraire);
      if (centrer) carte.fitBounds(nouveauCalque.getBounds(), { padding: [35, 35] });
      afficherTexte("route-status", description);
    } catch (erreur) {
      afficherTexte("route-status", "Itinéraire OSRM indisponible. Réessayez avec le bouton. " +
        (itineraire.getLayers().length ? "Le trajet précédent reste affiché." : ""));
      console.warn("OSRM :", erreur);
    } finally {
      bouton.disabled = false;
    }
  }

  auClic("load-geojson", () => chargerCommunes(true));
  auClic("load-route", () => chargerItineraire(true));
  chargerCommunes();
  chargerItineraire();
  return true;
}

function initialiserGeolocalisation() {
  let indisponibilite = "";
  if (!window.isSecureContext) {
    indisponibilite = "La géolocalisation nécessite HTTPS ou un serveur local sur localhost / 127.0.0.1.";
  } else if (!navigator.geolocation) {
    indisponibilite = "Ce navigateur ne prend pas en charge la géolocalisation.";
  }
  if (indisponibilite) {
    ["status-once", "status-watch", "map-status"].forEach((id) => afficherTexte(id, indisponibilite));
    ["refresh-position", "start-watch", "stop-watch", "locate-position"].forEach((id) => {
      const bouton = document.getElementById(id);
      if (bouton) bouton.disabled = true;
    });
    return;
  }

  auClic("refresh-position", demanderPosition);
  auClic("start-watch", demarrerSuivi);
  auClic("stop-watch", () => {
    arreterSuivi();
    afficherTexte("status-watch", "Suivi arrêté. La dernière mesure reste affichée.");
  });
  auClic("locate-position", () => {
    demanderPosition();
    demarrerSuivi();
  });
  demanderPosition();
  demarrerSuivi();

  let reprendreSuivi = false;
  window.addEventListener("pagehide", () => {
    reprendreSuivi = watchId !== null;
    arreterSuivi();
  });
  window.addEventListener("pageshow", (evenement) => {
    if (evenement.persisted && reprendreSuivi) demarrerSuivi();
  });
}

if (exercice === "1" || (exercice === "2" && initialiserCarte())) {
  initialiserGeolocalisation();
}
