# T+ — les Templiers

Application web hors ligne (PWA) sur l'ordre du Temple, de sa fondation à Jérusalem
vers 1119 au bûcher de Jacques de Molay en 1314, et sur ce que les siècles en ont fait.

- **Articles** illustrés et vérifiés, en dix thèmes : histoire, maîtres de l'ordre,
  personnages, l'ordre et sa vie (règle, hiérarchie, commanderies, économie, symboles),
  Terre sainte et Orient, France, Europe, autres ordres militaires, mythes et postérité,
  sources et historiens. Chaque article donne ses repères datés, ce qu'il ne faut pas
  croire, ses sources et des liens pour aller plus loin.
- **Frise** des vingt-trois maîtres, avec à côté, au choix, les papes, les rois de France
  et les rois de Jérusalem du même temps ; une chronologie de tous les articles datés.
- **Carte** hors ligne des commanderies, châteaux et champs de bataille, de la France
  au Levant, avec la position (facultative) et les itinéraires.
- **À cette date** : qui était maître, pape, roi, et ce qui se passait cette année-là.

En ligne : <https://cristo67000.github.io/t-plus/>

## Dossier

    index.html, sw.js, manifest.webmanifest, css/, js/   l'application (zéro build)
    data/articles.json                                    les articles
    data/frises.json                                      la frise des maîtres et le contexte
    data/carte.json                                       le fond de carte (Natural Earth)
    data/precache.json                                    les images, avec leur empreinte
    img/*.webp                                            les illustrations
    build/articles/*.txt                                  LES ARTICLES, écrits à la main (format en tête de build/construire.mjs)
    build/frises.txt                                      les listes de la frise
    build/choix-images.txt                                le choix des images : fichier Commons, légende, articles
    build/illustrations.txt                               les images et leur source (écrit par assembler_illustrations.py)
    build/PLAN-ARTICLES.txt                               le plan : identifiants et sujets
    build/CONSIGNES-REDACTION.md                          les règles de rédaction et de vérification

## Reconstruire

    node build/construire.mjs --verifier build/articles/NN-xxx.txt   vérifie un lot d'articles
    python build/verifier_commons.py liste.txt                       vérifie des images proposées (existence, licence)
    python build/assembler_illustrations.py                          build/choix-images.txt → build/illustrations.txt (crédits lus sur Commons)
    python build/illustrer.py                                        télécharge et convertit les images (licences vérifiées)
    node build/construire.mjs                                        assemble data/ ; échoue à la moindre incohérence
    node build/fond_de_carte.mjs                                     refait le fond de carte (rarement)
    python build/generer-icones.py                                   refait les icônes et l'image d'aperçu
    node build/essais.mjs                                            épreuves des données et de l'application
    python build/verifier_liens.py                                   vérifie en ligne les liens « pour aller plus loin »

## Développement

Serveur local sans cache : configuration `t-plus` du `.claude/launch.json` du dossier
parent (port 8250). Ouvrir `index.html?sans-sw` pour travailler sans le service worker.

À chaque version : `VERSION` dans `sw.js` et `application-version` dans `index.html`, ensemble.

## Sources et licences

- Textes : originaux, écrits d'après les travaux des historiens (Alain Demurger, Malcolm
  Barber, Helen Nicholson, Damien Carraz, Barbara Frale, Julien Théry, Xavier Hélary…) et
  les sources éditées, vérifiés date par date ; chaque article cite ses sources.
- Images : [Wikimedia Commons](https://commons.wikimedia.org/), domaine public, CC0 ou
  licences libres avec attribution (CC BY, CC BY-SA) ; auteur et licence sous chaque image.
- Fond de carte : [Natural Earth](https://www.naturalearthdata.com/) (domaine public).
- Code et textes de l'application : © 2026, tous droits réservés.
