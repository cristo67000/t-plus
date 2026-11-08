# -*- coding: utf-8 -*-
"""Vérifie des noms de fichiers Wikimedia Commons avant de les mettre dans
build/illustrations.txt : existence, licence (acceptée ou non par illustrer.py),
auteur, dimensions.

    python build/verifier_commons.py liste.txt       une ligne par fichier : « id : File:Nom.jpg … »
    python build/verifier_commons.py --json liste.txt  même chose, sortie JSON (build/.atelier/commons-<liste>.json)

Une ligne de la liste peut porter du texte autour du nom : seul « File:… » (jusqu'à
l'extension) compte, et l'identifiant d'article avant les deux-points, s'il y en a un.
"""
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from illustrer import libre, nettoyer  # même règle de licence que l'outil de production

sys.stdout.reconfigure(encoding='utf-8')
API = 'https://commons.wikimedia.org/w/api.php'
AGENT = {'User-Agent': 'TPlusIllustrations/1.0 (https://cristo67000.github.io/t-plus/; cristo67apps@gmail.com)'}
MOTIF = re.compile(r'(?:File|Fichier):([^|\n]+?\.(?:jpe?g|png|tiff?|gif|svg|webp|pdf|djvu))', re.I)


def obtenir(url):
    for essai in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=60) as r:
                return json.loads(r.read())
        except Exception:
            if essai == 4:
                raise
            time.sleep(3 + 4 * essai)


def lot(titres):
    p = {'action': 'query', 'titles': '|'.join('File:' + t for t in titres), 'prop': 'imageinfo', 'redirects': '1',
         'iiprop': 'size|extmetadata|mime', 'format': 'json'}
    r = obtenir(API + '?' + urllib.parse.urlencode(p))
    q = r.get('query', {})
    norm = {n['from']: n['to'] for n in q.get('normalized', [])}
    redir = {n['from']: n['to'] for n in q.get('redirects', [])}
    pages = {p['title']: p for p in q.get('pages', {}).values()}
    sortie = {}
    for t in titres:
        cle = 'File:' + t
        cle = norm.get(cle, cle)
        cle = redir.get(cle, cle)
        page = pages.get(cle)
        if not page or 'imageinfo' not in page:
            sortie[t] = None
            continue
        ii = page['imageinfo'][0]
        em = ii.get('extmetadata', {})
        info = {
            'titre': cle[len('File:'):],
            'licence': nettoyer(em.get('LicenseShortName', {}).get('value')),
            'licence_code': nettoyer(em.get('License', {}).get('value')).lower(),
            'auteur': nettoyer(em.get('Artist', {}).get('value'))[:120],
            'date': nettoyer(em.get('DateTimeOriginal', {}).get('value'))[:60],
            'desc': nettoyer(em.get('ImageDescription', {}).get('value'))[:160],
            'w': ii.get('width'), 'h': ii.get('height'), 'mime': ii.get('mime'),
        }
        info['accepte'] = libre(info)
        sortie[t] = info
    return sortie


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    texte = io.open(args[0], encoding='utf-8').read() if args else sys.stdin.read()
    demandes = []
    for ligne in texte.splitlines():
        for m in MOTIF.finditer(ligne):
            ident = re.match(r'^\s*[-*]?\s*`?([a-z0-9][a-z0-9-]+)`?\s*:', ligne)
            demandes.append((ident.group(1) if ident else '', m.group(1).strip().replace('_', ' ')))
    titres = sorted({t for _, t in demandes})
    resultats = {}
    for i in range(0, len(titres), 50):
        resultats.update(lot(titres[i:i + 50]))
    bons = absents = refuses = 0
    lignes = []
    for ident, t in demandes:
        r = resultats.get(t)
        if r is None:
            absents += 1
            lignes.append({'id': ident, 'fichier': t, 'etat': 'absent'})
        elif not r['accepte']:
            refuses += 1
            lignes.append({'id': ident, 'fichier': t, 'etat': 'refusé', 'licence': r['licence']})
        else:
            bons += 1
            lignes.append(dict(r, id=ident, fichier=r['titre'], etat='ok'))
    if '--json' in sys.argv:
        os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.atelier'), exist_ok=True)
        nom = os.path.splitext(os.path.basename(args[0]))[0] if args else 'stdin'
        json.dump(lignes, io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.atelier', 'commons-' + nom + '.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
    for l in lignes:
        if l['etat'] == 'ok':
            print('  ok      %-28s %s  [%s · %s · %sx%s]' % (l['id'], l['fichier'], l['accepte'], l['auteur'][:40], l['w'], l['h']))
        else:
            print('  %-7s %-28s %s %s' % (l['etat'], l['id'], l['fichier'], l.get('licence', '')))
    print('\n%d acceptés, %d refusés (licence), %d introuvables' % (bons, refuses, absents))


if __name__ == '__main__':
    main()
