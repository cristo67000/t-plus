# -*- coding: utf-8 -*-
"""Écrit build/illustrations.txt à partir de build/choix-images.txt.

    python build/assembler_illustrations.py

Pour chaque image choisie, va lire sur Wikimedia Commons son auteur et sa date
(par lots de cinquante), compose le crédit (« Auteur, année ») et écrit le bloc
que lit build/illustrer.py. Une image servant à plusieurs articles n'est écrite
qu'une fois. Le script échoue si un fichier est introuvable ou sous une licence
refusée : rien n'arrive dans illustrations.txt qui n'ait été vérifié.
"""
import io
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verifier_commons import lot

sys.stdout.reconfigure(encoding='utf-8')
ICI = os.path.dirname(os.path.abspath(__file__))
CHOIX = os.path.join(ICI, 'choix-images.txt')
SORTIE = os.path.join(ICI, 'illustrations.txt')
ENTETE_FIN = '# ── Les images (écrites par build/assembler_illustrations.py, ne pas retoucher à la main) ──'


def lire():
    lignes = []
    for n, l in enumerate(io.open(CHOIX, encoding='utf-8').read().splitlines(), 1):
        if not l.strip() or l.startswith('#'):
            continue
        morceaux = [x.strip() for x in l.split(' | ')]
        if len(morceaux) not in (3, 4):
            sys.exit('choix-images.txt:%d — trois ou quatre champs attendus : articles | fichier | légende [| crédit]' % n)
        articles = [a.strip() for a in morceaux[0].split(',') if a.strip()]
        lignes.append({'n': n, 'pour': articles, 'fichier': morceaux[1].replace('_', ' '), 'legende': morceaux[2],
                       'credit': morceaux[3] if len(morceaux) == 4 else None})
    return lignes


AUTEURS_VIDES = re.compile(r'^(own work|travail personnel|unknown|anonymous|inconnu|unknown author|anonymous unknown author)\b', re.I)


def credit(info):
    auteur = re.sub(r'\s+', ' ', info.get('auteur') or '').strip(' .,;')
    auteur = re.sub(r'\b(Own work|Travail personnel)\b', '', auteur, flags=re.I).strip(' .,;-')
    auteur = re.sub(r'\s*(https?://\S+|\+…|\+\.\.\.)', '', auteur).strip(' .,;-+')
    # les restes des métadonnées de Commons
    auteur = re.sub(r'^The original uploader was (\S+) at .*$', r'\1', auteur)
    auteur = re.sub(r'^\S+\.(?:jpe?g|png)\s*:\s*\((\w+)\)\s*derivative work:\s*(\w+).*$', r'\1 et \2', auteur, flags=re.I)
    auteur = re.sub(r'\s*;\s*deriva\w* work:\s*', ' et ', auteur, flags=re.I)
    auteur = re.sub(r'\s*\(\s*(talk|MJJR)\s*\)', '', auteur)
    auteur = re.sub(r'\s*\([^)]*[֐-׿؀-ۿ][^)]*\)', '', auteur)
    if re.search(r'[֐-׿؀-ۿ]', auteur) or re.match(r'^in Quelle', auteur):
        auteur = 'auteur inconnu'
    if auteur == 'auteur inconnu':
        pass
    elif auteur[:1].islower() and ' ' in auteur:
        auteur = ' '.join(m.capitalize() for m in auteur.split(' '))
    else:
        auteur = auteur[:1].upper() + auteur[1:]
    if not auteur or AUTEURS_VIDES.match(auteur):
        auteur = 'auteur inconnu'
    if len(auteur) > 70:
        auteur = auteur[:70].rsplit(' ', 1)[0] + '…'
    annee = re.search(r'\b(1[0-9]\d\d|20[0-2]\d)\b', info.get('date') or '')
    return auteur + (', ' + annee.group(1) if annee else '')


def ident(article, k):
    return article + ('-' + str(k) if k > 1 else '')


def main():
    choix = lire()
    fichiers = sorted({c['fichier'] for c in choix})
    infos = {}
    for i in range(0, len(fichiers), 50):
        infos.update(lot(fichiers[i:i + 50]))
    erreurs = []
    for c in choix:
        info = infos.get(c['fichier'])
        if not info:
            erreurs.append('ligne %d : fichier introuvable « %s »' % (c['n'], c['fichier']))
        elif not info['accepte']:
            erreurs.append('ligne %d : licence refusée (%s) « %s »' % (c['n'], info['licence'], c['fichier']))
    if erreurs:
        print('\n'.join('  ✗ ' + e for e in erreurs))
        sys.exit(1)

    # une image par fichier ; les articles s'ajoutent
    par_fichier = {}
    ordre = []
    compte = {}
    for c in choix:
        if c['fichier'] in par_fichier:
            for a in c['pour']:
                if a not in par_fichier[c['fichier']]['pour']:
                    par_fichier[c['fichier']]['pour'].append(a)
            continue
        premier = c['pour'][0]
        compte[premier] = compte.get(premier, 0) + 1
        entree = dict(c, id=ident(premier, compte[premier]), info=infos[c['fichier']])
        par_fichier[c['fichier']] = entree
        ordre.append(entree)

    texte = io.open(SORTIE, encoding='utf-8').read() if os.path.exists(SORTIE) else ''
    tete = texte.split(ENTETE_FIN)[0].rstrip() + '\n\n' + ENTETE_FIN + '\n'
    blocs = []
    for e in ordre:
        blocs.append('\n'.join([
            '= ' + e['id'],
            'commons: ' + e['info']['titre'],
            'legende: ' + e['legende'],
            'credit: ' + (e['credit'] or credit(e['info'])),
            'pour: ' + ', '.join(e['pour']),
        ]))
    io.open(SORTIE, 'w', encoding='utf-8', newline='\n').write(tete + '\n' + '\n\n'.join(blocs) + '\n')
    print('%d images pour %d articles écrites dans build/illustrations.txt' % (len(ordre), len({a for e in ordre for a in e['pour']})))


if __name__ == '__main__':
    main()
