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
var REGISTRE = "https://script.google.com/macros/s/AKfycbzAvgfdbiKtq7JVGKf7sfQTUQgdj620tS3j4r_2XydvI24G2vuJbWCvSQoB8a5sV3gC9Q/exec";
// Les prix sont fixés en F CFA ; chaque visiteur les voit dans sa monnaie (devinée, ou choisie dans la liste), au taux du jour.
var DEVISES = {
  XOF: ["F CFA", "Franc CFA (UEMOA)"], XAF: ["F CFA", "Franc CFA (CEMAC)"], EUR: ["€", "Euro"], USD: ["$ US", "Dollar américain"], GBP: ["£", "Livre sterling"],
  CAD: ["$ CA", "Dollar canadien"], CHF: ["CHF", "Franc suisse"], MAD: ["DH", "Dirham marocain"], DZD: ["DA", "Dinar algérien"], TND: ["DT", "Dinar tunisien"],
  GNF: ["GNF", "Franc guinéen"], CDF: ["FC", "Franc congolais"], NGN: ["₦", "Naira"], GHS: ["GH₵", "Cedi"], KES: ["KSh", "Shilling kényan"], ZAR: ["R", "Rand"], EGP: ["E£", "Livre égyptienne"]
};
var TAUX = { XOF: 1, XAF: 1, EUR: 1 / 655.957 };               // parités fixes ; les autres monnaies arrivent du service de taux
var devise = "XOF";
function devinerDevise() {
  var tz = "", langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* rien */ }
  var fr = /^fr/i.test(langs[0] || "");
  var parFuseau = { "Africa/Abidjan": "XOF", "Africa/Dakar": "XOF", "Africa/Bamako": "XOF", "Africa/Ouagadougou": "XOF", "Africa/Niamey": "XOF", "Africa/Lome": "XOF",
    "Africa/Porto-Novo": "XOF", "Africa/Bissau": "XOF", "Africa/Conakry": "GNF", "Africa/Douala": "XAF", "Africa/Libreville": "XAF", "Africa/Brazzaville": "XAF",
    "Africa/Ndjamena": "XAF", "Africa/Bangui": "XAF", "Africa/Malabo": "XAF", "Africa/Kinshasa": "CDF", "Africa/Lubumbashi": "CDF", "Africa/Casablanca": "MAD",
    "Africa/Algiers": "DZD", "Africa/Tunis": "TND", "Africa/Accra": "GHS", "Africa/Nairobi": "KES", "Africa/Johannesburg": "ZAR", "Africa/Cairo": "EGP",
    "Europe/London": "GBP", "Europe/Zurich": "CHF", "America/Toronto": "CAD", "America/Vancouver": "CAD", "America/Montreal": "CAD", "America/Edmonton": "CAD", "America/Winnipeg": "CAD", "America/Halifax": "CAD" };
  if (tz === "Africa/Lagos") return fr ? "XAF" : "NGN";                       // même heure pour le Nigeria et l'Afrique centrale : la langue tranche
  if (/^(Atlantic\/Reykjavik|Etc\/GMT|Etc\/UTC|UTC|GMT)$/.test(tz) && fr) return "XOF";   // heure GMT d'un PC en français : Afrique de l'Ouest
  if (parFuseau[tz]) return parFuseau[tz];
  var pays = { CI: "XOF", SN: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", TG: "XOF", BJ: "XOF", GW: "XOF", CM: "XAF", GA: "XAF", CG: "XAF", TD: "XAF", CF: "XAF", GQ: "XAF",
    GN: "GNF", CD: "CDF", MA: "MAD", DZ: "DZD", TN: "TND", NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR", EG: "EGP", GB: "GBP", CH: "CHF", CA: "CAD", US: "USD",
    FR: "EUR", BE: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", LU: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", MC: "EUR" };
  if (/^Europe\//.test(tz) && !/^Europe\/(London|Zurich|Moscow|Istanbul|Kiev|Kyiv|Warsaw|Prague|Budapest|Bucharest|Sofia|Stockholm|Oslo|Copenhagen|Belgrade)$/.test(tz)) return "EUR";
  if (/^America\//.test(tz)) return "USD";
  for (var k = 0; k < langs.length; k++) { var m = /-([A-Z]{2})$/i.exec(langs[k] || ""); if (m && pays[m[1].toUpperCase()]) return pays[m[1].toUpperCase()]; }
  return fr ? "XOF" : "USD";
}
function enDevise(xof) {                                          // [montant affiché, symbole]
  var t = TAUX[devise], v = xof * t, d = DEVISES[devise];
  var dec = v >= 1000 ? 0 : v >= 100 ? 1 : 2;
  return [v.toLocaleString("fr-FR", { minimumFractionDigits: devise === "XOF" || devise === "XAF" ? 0 : dec, maximumFractionDigits: devise === "XOF" || devise === "XAF" ? 0 : dec }), d[0]];
}
function afficherPrix() {
  if (TAUX[devise] == null) devise = "XOF";
  var cartes = document.querySelectorAll(".tarif[data-jours]"), xof30 = 0;
  cartes.forEach(function (c) { if (c.dataset.xof == null) c.dataset.xof = (c.querySelector(".prix b").textContent || "").replace(/\D/g, ""); if (c.dataset.jours === "30") xof30 = +c.dataset.xof; });
  cartes.forEach(function (c) {
    var xof = +c.dataset.xof, mois = Math.max(1, Math.round(+c.dataset.jours / 30)), p = enDevise(xof), pm = enDevise(xof / mois);
    c.querySelector(".prix b").textContent = p[0]; c.querySelector(".prix span").textContent = p[1];
    c.querySelector(".par-mois").firstChild.textContent = "soit " + pm[0] + " " + pm[1] + " par mois";
    var eco = c.querySelector(".economie"), base = xof30 * mois;
    if (eco) { if (base > xof) { var e = enDevise(base - xof); eco.textContent = e[0] + " " + e[1] + " d'économie"; eco.hidden = false; } else eco.hidden = true; }
  });
  var note = document.getElementById("deviseNote"), sel = document.getElementById("devise");
  if (sel && sel.value !== devise) sel.value = devise;
  if (note) { note.hidden = devise === "XOF" || devise === "XAF"; note.textContent = "Prix convertis au taux du jour, à titre indicatif. Le paiement se fait en F CFA (Mobile Money ou carte) : votre opérateur ou votre banque convertit automatiquement."; }
}
window.prixEnDevise = function (xof) { var p = enDevise(xof); return devise === "XOF" || devise === "XAF" ? p[0] + " " + p[1] : p[0] + " " + p[1] + " (" + Math.round(xof).toLocaleString("fr-FR") + " F CFA)"; };
(function () {
  var choisi = null; try { choisi = localStorage.getItem("mbgDevise"); } catch (e) { /* rien */ }
  devise = DEVISES[choisi] ? choisi : devinerDevise();
  var sel = document.getElementById("devise");
  if (sel) {
    sel.innerHTML = Object.keys(DEVISES).map(function (k) { return '<option value="' + k + '">' + DEVISES[k][1] + " (" + DEVISES[k][0] + ")</option>"; }).join("");
    sel.addEventListener("change", function () { devise = sel.value; try { localStorage.setItem("mbgDevise", devise); } catch (e) { /* rien */ } afficherPrix(); });
  }
  afficherPrix();
  // taux du jour (gardés 12 h dans le navigateur)
  var cache = null; try { cache = JSON.parse(localStorage.getItem("mbgTaux") || "null"); } catch (e) { /* rien */ }
  var appliquer = function (r) { for (var k in DEVISES) if (r[k] && k !== "XOF" && k !== "XAF" && k !== "EUR") TAUX[k] = r[k]; afficherPrix(); };
  if (cache && cache.t > Date.now() - 12 * 3600e3 && cache.r) appliquer(cache.r);
  else fetch("https://open.er-api.com/v6/latest/XOF").then(function (r) { return r.json(); }).then(function (d) {
    if (d && d.result === "success" && d.rates) { try { localStorage.setItem("mbgTaux", JSON.stringify({ t: Date.now(), r: d.rates })); } catch (e) { /* rien */ } appliquer(d.rates); }
  }).catch(function () { /* service de taux injoignable : F CFA et euro restent justes, les autres monnaies retombent en F CFA */ });
})();

(function () {
  if (!REGISTRE) return;                                     // pas encore publiée : on garde les prix écrits dans la page
  fetch(REGISTRE + "?action=tarifs").then(function (r) { return r.json(); }).then(function (d) {
    var tarifs = {}; (d.tarifs || []).forEach(function (t) { tarifs[t.jours] = t; });
    if (!Object.keys(tarifs).length) return;
    document.querySelectorAll(".tarif[data-jours]").forEach(function (carte) {
      var t = tarifs[carte.dataset.jours];
      if (!t) { carte.hidden = true; return; }               // durée mise sur « NON » dans la feuille : cachée
      carte.hidden = false; carte.dataset.xof = Math.round(+t.prix);
    });
    afficherPrix();
  }).catch(function () { /* feuille injoignable : on garde les prix écrits dans la page */ });
})();

// Commande en ligne : nom + e-mail, puis page de paiement SasPay (mobile money / carte) ; la clé part par e-mail toute seule.
// Tant que REGISTRE est vide, les boutons gardent l'e-mail au support.
(function () {
  var merci = document.getElementById("merci");
  var SUPPORT = "mailto:babaaariel@gmail.com?subject=" + encodeURIComponent("Aide pour mon paiement MaBoussole Graphiques");
  function bandeau(classe, html) {
    merci.className = "bandeau-merci " + classe;
    merci.innerHTML = html + ' <button type="button" aria-label="Fermer">×</button>';
    merci.hidden = false;
    merci.querySelector("button[aria-label]").onclick = function () { merci.hidden = true; };
  }
  var boutonsAide = '<span class="bandeau-actions"><a class="bouton petit" href="' + SUPPORT + '">✉ Écrire au support</a> <a class="bouton fantome petit" href="#tarifs">Réessayer</a></span>';
  if (/[?&]merci=1/.test(location.search) && merci) {     // retour de la page de paiement : on vérifie où en est la commande
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* rien */ }
    var session = ""; try { session = localStorage.getItem("mbgCommande") || ""; } catch (e) { /* rien */ }
    if (!REGISTRE || !session) {
      bandeau("", "Merci ! Si votre paiement est validé, votre clé arrive par e-mail dans quelques minutes (regardez aussi les spams). Un souci ? " + boutonsAide);
    } else {
      bandeau("attente", "⏳ Vérification de votre paiement…");
      var essais = 0;
      var verifier = function () {
        fetch(REGISTRE, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "etat", session: session }) })
          .then(function (r) { return r.json(); }).then(function (d) {
            if (!d.ok) { bandeau("", "Merci ! Si votre paiement est validé, votre clé arrive par e-mail dans quelques minutes (regardez aussi les spams). Un souci ? " + boutonsAide); return; }
            if (d.statut === "paye") { try { localStorage.removeItem("mbgCommande"); } catch (e) { /* rien */ }
              bandeau("", "✅ Paiement reçu, merci ! Votre clé arrive par e-mail dans quelques minutes (regardez aussi les spams)."); return; }
            if (d.statut === "echec") { bandeau("echec", "❌ Votre paiement n'a pas abouti : aucun montant n'a été validé. Nous pouvons vous aider à le finaliser. " + boutonsAide); return; }
            if (++essais < 24) { setTimeout(verifier, 5000); return; }
            bandeau("attente", "⏳ Votre paiement est encore en cours de validation : votre clé partira par e-mail dès qu'il sera confirmé. Un souci ? " + boutonsAide);
          }).catch(function () { bandeau("attente", "Nous n'arrivons pas à vérifier votre paiement pour l'instant. Si vous avez payé, votre clé arrivera par e-mail. Un souci ? " + boutonsAide); });
      };
      verifier();
    }
  }
  if (!REGISTRE) return;
  var fen = document.getElementById("commande"), form = document.getElementById("commandeForm");
  var err = document.getElementById("commandeErreur"), payer = document.getElementById("commandePayer"), jours = 0;
  var note = document.querySelector(".tarifs-note");
  if (note) note.textContent = "Cliquez sur votre formule, payez en Mobile Money (Orange, MTN, Wave, Moov) ou par carte : votre clé arrive par e-mail en quelques minutes.";
  function fermer() { fen.hidden = true; }
  document.getElementById("commandeFermer").onclick = fermer;
  fen.addEventListener("click", function (e) { if (e.target === fen) fermer(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermer(); });
  document.querySelectorAll(".tarif[data-jours] a.bouton").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var carte = a.closest(".tarif");
      jours = +carte.dataset.jours;
      document.getElementById("commandeFormule").textContent = "· " + (carte.querySelector("h3") || {}).textContent;
      document.getElementById("commandePrix").textContent = window.prixEnDevise ? window.prixEnDevise(+carte.dataset.xof) : (carte.querySelector(".prix") || {}).textContent.replace(/\s+/g, " ").trim();
      err.hidden = true; payer.disabled = false; fen.hidden = false;
      document.getElementById("commandeNom").focus();
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.hidden = true; payer.disabled = true;
    var corps = JSON.stringify({ action: "acheter", jours: jours, nom: document.getElementById("commandeNom").value.trim(),
      email: document.getElementById("commandeEmail").value.trim() });
    // text/plain : accepté par Google sans requête préalable ; le nom et l'e-mail voyagent dans le corps, pas dans l'adresse
    fetch(REGISTRE, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: corps }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok && /^https:\/\//.test(d.url)) { try { if (d.session) localStorage.setItem("mbgCommande", d.session); } catch (e) { /* rien */ } location.href = d.url; return; }
      err.innerHTML = ""; err.appendChild(document.createTextNode((d.erreur || "Paiement momentanément indisponible. Réessayez dans un instant.") + " "));
      var aide = document.createElement("a"); aide.href = SUPPORT; aide.textContent = "Écrire au support"; err.appendChild(aide);
      err.hidden = false; payer.disabled = false;
    }).catch(function () {
      err.textContent = "Connexion impossible. Vérifiez votre internet et réessayez."; err.hidden = false; payer.disabled = false;
    });
  });
})();
