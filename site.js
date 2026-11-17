// Année du pied de page ; boutons de téléchargement vers la dernière version publiée ; compteur de téléchargements.
document.getElementById("annee").textContent = new Date().getFullYear();
(function () {
  var DEPOT = "babaaariel-beep/maboussole-site";
  var win = document.getElementById("dlWin"), mac = document.getElementById("dlMac"), cpt = document.getElementById("compteurDl");
  fetch("https://api.github.com/repos/" + DEPOT + "/releases?per_page=100").then(function (r) { return r.ok ? r.json() : []; }).then(function (versions) {
    var total = 0, derniere = null;
    versions.forEach(function (v) {
      if (v.tag_name.indexOf("logiciel-") !== 0) return;             // les autres publications sont l'historique des cotations
      if (!derniere) derniere = v;
      v.assets.forEach(function (a) { if (/^MaBoussole-(Setup\.exe|Mac\.zip)$/.test(a.name)) total += a.download_count; });
    });
    if (derniere) {
      derniere.assets.forEach(function (a) {
        if (a.name === "MaBoussole-Setup.exe") win.href = a.browser_download_url;
        if (a.name === "MaBoussole-Mac.zip") { mac.href = a.browser_download_url; mac.dataset.ok = "1"; }
      });
    }
    if (!mac.dataset.ok) { mac.classList.add("indispo"); mac.textContent = "Version Mac bientôt disponible"; mac.removeAttribute("href"); }
    if (cpt && total > 0) { cpt.textContent = total.toLocaleString("fr-FR") + " téléchargement" + (total > 1 ? "s" : ""); cpt.hidden = false; }
  }).catch(function () { /* hors ligne : les boutons gardent le fichier du site */ });
})();
