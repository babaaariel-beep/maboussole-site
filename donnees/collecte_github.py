"""Robot de collecte de l'historique minute par minute, exécuté par GitHub Actions (votre PC peut rester éteint).

Pour chaque actif : chaque mois manquant (du plus récent au plus ancien, sans les 11 derniers mois que donne le flux
temps réel) est téléchargé — FXCM pour les grandes paires depuis 2012 (rapide), Dukascopy pour le reste — puis rangé
dans un fichier compressé « <SYMBOLE>_AAAA-MM.m1.xz » et déposé aussitôt dans la publication GitHub « donnees-<SYMBOLE> ».
L'application de vos clients télécharge ces fichiers (rapide), sans MetaTrader ni Dukascopy.

Format d'un fichier : lzma de lignes struct "<Iiiiif" = t (UTC), ouverture, clôture, bas, haut, volume, en points entiers
(identique à historique_local.py dans l'application).

Usage (par le robot) :  python collecte_github.py <part> <nombre_de_parts> <minutes_max>
"""
import gzip
import json
import lzma
import os
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

ICI = os.path.dirname(os.path.abspath(__file__))
LIGNE = struct.Struct("<Iiiiif")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
FXCM_DEBUT = 2012
DEBUT = time.time()


# ------------------------------------------------------------------ téléchargements
def http(url, essais=5):
    """Contenu, b"" si absent (404/403), None si la source ne répond pas."""
    for k in range(essais):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):
                return b""
            time.sleep(3 * (k + 1))
        except Exception:  # noqa: BLE001
            time.sleep(2 * (k + 1))
    return None


def jour_dukascopy(sym, d):
    brut = http("https://datafeed.dukascopy.com/datafeed/%s/%04d/%02d/%02d/BID_candles_min_1.bi5" % (sym, d.year, d.month - 1, d.day))
    if brut is None:
        return None
    if not brut:
        return []
    d0 = int(datetime(d.year, d.month, d.day, tzinfo=timezone.utc).timestamp())
    x = lzma.decompress(brut)
    out = []
    for i in range(0, len(x) - 23, 24):
        t, o, c, b, h, v = struct.unpack(">iiiiif", x[i:i + 24])
        if v > 0:
            out.append((d0 + t, o, c, b, h, v))
    return out


def semaine_fxcm(sym, y, w):
    brut = http("https://candledata.fxcorporate.com/m1/%s/%d/%d.csv.gz" % (sym, y, w), essais=4)
    if brut is None:
        return None
    if not brut:
        return []
    k = 1e3 if sym.endswith("JPY") else 1e5
    out = []
    for ligne in gzip.decompress(brut).decode("ascii", "replace").splitlines()[1:]:
        c = ligne.split(",")
        try:
            d = datetime.strptime(c[0][:19], "%m/%d/%Y %H:%M:%S").replace(tzinfo=timezone.utc)
            o, h, b, cl = (int(round(float(x) * k)) for x in c[1:5])
        except (ValueError, IndexError):
            continue
        out.append((int(d.timestamp()), o, cl, b, h, 1.0))
    return out


def jours_ouvres(y, m):
    d, out = date(y, m, 1), []
    while d.month == m:
        if d.weekday() != 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def collecter_mois(actif, info, y, m, pool, cache_fxcm):
    """Lignes du mois, ou None si une source n'a pas répondu (le mois sera repris au prochain passage)."""
    lignes = {}
    jours = jours_ouvres(y, m)
    if info["fxcm"] and y >= FXCM_DEBUT:
        cle = (actif, y)
        if cle not in cache_fxcm:                       # une année FXCM en une fois (une semaine par fichier)
            semaines = [(y - 1, 52), (y - 1, 53)] + [(y, w) for w in range(1, 54)] + [(y + 1, 1)]
            res = list(pool.map(lambda yw: semaine_fxcm(actif, *yw), semaines))
            cache_fxcm.clear()
            cache_fxcm[cle] = None if any(r is None for r in res) else [x for r in res for x in r]
        for x in cache_fxcm[cle] or []:
            dt = datetime.fromtimestamp(x[0], timezone.utc)
            if dt.year == y and dt.month == m:
                lignes[x[0]] = x
    vus = {datetime.fromtimestamp(t, timezone.utc).date() for t in lignes}
    a_completer = [d for d in jours if d not in vus and (d.weekday() < 5 or not lignes)]
    if a_completer:
        res = list(pool.map(lambda d: jour_dukascopy(info["duka"], d), a_completer))
        if any(r is None for r in res):
            return None
        for r in res:
            for x in r:
                lignes[x[0]] = x
    return sorted(lignes.values())


# ------------------------------------------------------------------ publication GitHub
def gh(*args, sortie=False):
    r = subprocess.run(["gh"] + list(args), capture_output=True, text=True)
    return r.stdout if sortie else r.returncode == 0


def fichiers_publies(tag):
    if not gh("release", "view", tag):
        gh("release", "create", tag, "--title", "Historique " + tag[8:], "--notes",
           "Historique minute par minute (fichiers mensuels compressés) pour MaBoussole Graphiques.")
        return set()
    txt = gh("release", "view", tag, "--json", "assets", sortie=True)
    try:
        return {a["name"] for a in json.loads(txt)["assets"]}
    except (ValueError, KeyError):
        return set()


def mois_a_faire(debut_annee):
    fin = datetime.fromtimestamp(time.time() - 330 * 86400, timezone.utc)
    y, m = fin.year, fin.month
    while y >= debut_annee:
        yield y, m
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)


def main():
    part, parts, minutes = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])
    actifs = json.load(open(os.path.join(ICI, "actifs.json"), encoding="utf-8"))
    mes_actifs = [a for i, a in enumerate(sorted(actifs)) if i % parts == part]
    pool = ThreadPoolExecutor(max_workers=4)
    os.makedirs("sortie", exist_ok=True)
    faits = 0
    for actif in mes_actifs:
        info = actifs[actif]
        tag = "donnees-" + info["duka"]
        deja = fichiers_publies(tag)
        cache_fxcm = {}
        vides = 0
        for y, m in mois_a_faire(info["debut"]):
            if (time.time() - DEBUT) / 60 > minutes:
                print("Temps écoulé : reprise au prochain passage.", flush=True)
                return
            nom = "%s_%04d-%02d.m1.xz" % (info["duka"], y, m)
            if nom in deja:
                continue
            lignes = collecter_mois(actif, info, y, m, pool, cache_fxcm)
            if lignes is None:
                print("%s %04d-%02d : source muette, repris plus tard" % (actif, y, m), flush=True)
                time.sleep(20)
                continue
            if not lignes:
                vides += 1
                if vides >= 6:                        # 6 mois vides de suite : début réel des données atteint
                    break
                continue
            vides = 0
            f = os.path.join("sortie", nom)
            with open(f, "wb") as h:
                h.write(lzma.compress(b"".join(LIGNE.pack(*x) for x in lignes), preset=6))
            if gh("release", "upload", tag, f, "--clobber"):
                faits += 1
                print("%s %04d-%02d : %d bougies déposées" % (actif, y, m, len(lignes)), flush=True)
            os.remove(f)
    print("Terminé : %d mois déposés." % faits, flush=True)


if __name__ == "__main__":
    main()
