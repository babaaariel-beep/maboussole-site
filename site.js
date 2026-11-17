// Année du pied de page, et bouton Mac grisé tant que la version Mac n'est pas en ligne
document.getElementById("annee").textContent = new Date().getFullYear();
(function () {
  var mac = document.getElementById("dlMac");
  fetch(mac.getAttribute("href"), { method: "HEAD" }).then(function (r) {
    if (!r.ok) { mac.classList.add("indispo"); mac.textContent = "Version Mac bientôt disponible"; }
  }).catch(function () { /* hors ligne : on laisse le bouton */ });
})();
