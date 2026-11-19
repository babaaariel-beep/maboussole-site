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
      document.getElementById("commandePrix").textContent = (carte.querySelector(".prix") || {}).textContent.replace(/\s+/g, " ").trim();
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
