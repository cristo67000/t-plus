# -*- coding: utf-8 -*-
"""Vérifie en ligne les liens « Pour aller plus loin » de data/articles.json.

    python build/verifier_liens.py

Wikipédia (toutes langues) : par l'API, cinquante titres à la fois — page absente,
redirection (on donne la cible), page d'homonymie. Les autres adresses : une
requête GET, qui doit répondre 200 sans changer de site. À relancer avant
chaque version : les pages bougent.
"""
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
AGENT = {'User-Agent': 'TPlusLiens/1.0 (https://cristo67000.github.io/t-plus/; cristo67apps@gmail.com)'}


def obtenir(url, essais=4):
    for k in range(essais):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=40) as r:
                return r.status, r.geturl(), r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and k < essais - 1:
                time.sleep(4 + 4 * k)
                continue
            return e.code, url, b''
        except Exception as e:
            if k == essais - 1:
                return 0, url, str(e).encode()
            time.sleep(3)


def main():
    articles = json.load(io.open(os.path.join(RACINE, 'data', 'articles.json'), encoding='utf-8'))['articles']
    wikis = {}
    autres = []
    for a in articles:
        for source, libelle, adresse in a['li']:
            m = re.match(r'https://([a-z]+)\.wikipedia\.org/wiki/(.+)$', adresse)
            if m:
                titre = urllib.parse.unquote(m.group(2)).replace('_', ' ')
                wikis.setdefault(m.group(1), {}).setdefault(titre, []).append(a['id'])
            else:
                autres.append((a['id'], adresse))
    problemes = 0
    for langue, titres in wikis.items():
        liste = sorted(titres)
        for i in range(0, len(liste), 50):
            lot = liste[i:i + 50]
            p = {'action': 'query', 'titles': '|'.join(lot), 'redirects': '1', 'prop': 'pageprops', 'ppprop': 'disambiguation', 'format': 'json'}
            statut, _, corps = obtenir('https://%s.wikipedia.org/w/api.php?%s' % (langue, urllib.parse.urlencode(p)))
            q = json.loads(corps).get('query', {})
            norm = {n['from']: n['to'] for n in q.get('normalized', [])}
            redir = {n['from']: n['to'] for n in q.get('redirects', [])}
            pages = {pg['title']: pg for pg in q.get('pages', {}).values()}
            for t in lot:
                t2 = norm.get(t, t)
                cible = redir.get(t2)
                pg = pages.get(cible or t2)
                ou = ', '.join(titres[t])
                if not pg or 'missing' in pg or 'invalid' in pg:
                    print('  ABSENTE     %s:%s  (%s)' % (langue, t, ou)); problemes += 1
                elif 'pageprops' in pg and 'disambiguation' in pg['pageprops']:
                    print('  HOMONYMIE   %s:%s  (%s)' % (langue, t, ou)); problemes += 1
                elif cible:
                    print('  REDIRIGÉE   %s:%s -> %s  (%s)' % (langue, t, cible, ou)); problemes += 1
    for ident, adresse in sorted(set(autres)):
        statut, finale, _ = obtenir(adresse)
        hote = urllib.parse.urlparse(adresse).hostname
        if statut != 200:
            print('  HTTP %s     %s  (%s)' % (statut, adresse, ident)); problemes += 1
        elif urllib.parse.urlparse(finale).hostname != hote:
            print('  AILLEURS    %s -> %s  (%s)' % (adresse, finale, ident)); problemes += 1
    total = sum(len(t) for t in wikis.values()) + len(set(autres))
    print('\n%d adresses distinctes vérifiées, %d à revoir' % (total, problemes))


if __name__ == '__main__':
    main()
