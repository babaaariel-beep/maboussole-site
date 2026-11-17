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

// Onglets « Comment installer » (Windows / Mac) ; le Mac est choisi d'office sur un Mac.
(function () {
  var onglets = document.querySelectorAll(".install-onglet"), pages = document.querySelectorAll(".install-page");
  function choisir(os) {
    onglets.forEach(function (b) { var oui = b.dataset.os === os; b.classList.toggle("actif", oui); b.setAttribute("aria-selected", oui); });
    pages.forEach(function (p) { p.hidden = p.dataset.os !== os; });
  }
  onglets.forEach(function (b) { b.addEventListener("click", function () { choisir(b.dataset.os); }); });
  if (/Mac/i.test(navigator.platform || navigator.userAgent) && !/iPhone|iPad/i.test(navigator.userAgent)) choisir("mac");
})();

// Prix lus dans votre feuille Google (onglet « Tarifs ») : changez un prix là-bas, le site suit tout seul.
// REGISTRE = adresse de l'application Web de la feuille (se termine par /exec), remplie une fois la feuille publiée.
var REGISTRE = "";
(function () {
  if (!REGISTRE) return;                                     // pas encore publiée : on garde les prix écrits dans la page
  fetch(REGISTRE + "?action=tarifs").then(function (r) { return r.json(); }).then(function (d) {
    var tarifs = {}; (d.tarifs || []).forEach(function (t) { tarifs[t.jours] = t; });
    if (!Object.keys(tarifs).length) return;
    var fmt = function (n) { return Math.round(n).toLocaleString("fr-FR"); };
    document.querySelectorAll(".tarif[data-jours]").forEach(function (carte) {
      var t = tarifs[carte.dataset.jours];
      if (!t) { carte.hidden = true; return; }               // durée mise sur « NON » dans la feuille : cachée
      carte.hidden = false;
      carte.querySelector(".prix b").textContent = fmt(t.prix);
      var mois = Math.max(1, Math.round(t.jours / 30)), pm = carte.querySelector(".par-mois");
      var eco = carte.querySelector(".economie"), base = tarifs[30] ? tarifs[30].prix * mois : 0;
      pm.firstChild.textContent = "soit " + fmt(t.prix / mois) + " F par mois";
      if (eco) { if (base > t.prix) eco.textContent = fmt(base - t.prix) + " F d'économie"; else eco.hidden = true; }
    });
  }).catch(function () { /* feuille injoignable : on garde les prix écrits dans la page */ });
})();
