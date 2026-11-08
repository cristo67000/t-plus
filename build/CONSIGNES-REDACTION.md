# T+ — consignes de rédaction des articles

T+ est une application encyclopédique en français sur l'ordre du Temple (1119-1314) et sa
postérité : articles illustrés, cartes, frise des maîtres. Le lecteur est un adulte curieux,
pas un spécialiste. Le ton est celui d'un historien qui raconte clairement : précis, daté,
sans emphase, sans romance, sans « mystère » gratuit. On décrit ce que les sources disent et
ce que les historiens en concluent ; on ne valide jamais une légende, on explique d'où elle
vient et ce qu'elle vaut.

## Où écrire

- Un fichier par lot : `build/articles/NN-xxx.txt` (le nom est donné dans la mission).
- Les identifiants et les sujets sont ceux de `build/PLAN-ARTICLES.txt`, dans l'ordre du plan.
  N'invente aucun identifiant ; si un sujet manque vraiment, mets-le en note dans ton rapport.
- Écris le fichier avec l'outil Write, en UTF-8, sans jamais écrire de séquence `\uXXXX`
  (écris le caractère lui-même). Pas d'autre fichier.
- Vérifie ton fichier, depuis la racine du projet :
  `node build/construire.mjs --verifier build/articles/NN-xxx.txt`
  Zéro erreur exigée ; lis les avertissements et corrige ce qui mérite de l'être.

## Le format (strict)

Le détail est en tête de `build/construire.mjs`. En résumé :

```
@ identifiant
cat: histoire
nom: Concile de Troyes
alias: concile de 1129, règle latine
dates: 13 janvier 1129
an: 1129
def: Une ou deux phrases (25 à 50 mots) qui disent l'essentiel : qui, quoi, quand, pourquoi c'est important.
texte: Premier paragraphe (80 à 160 mots)…
texte: Deuxième paragraphe…
repere: 1127 — Hugues de Payns part pour l'Occident.
repere: 13 janvier 1129 — Ouverture du concile, sous la présidence du légat Mathieu d'Albano.
attention: L'idée reçue, le point discuté, la légende : ce qu'il ne faut pas croire et pourquoi.
geo: 48.2973, 4.0744
lieu: Troyes, Aube, France
lien: wp Concile de Troyes (1129)
lien: url https://… = ce qu'on y trouve
sources: Demurger, Les Templiers, 2005 ; Barber, The New Knighthood, 1994 ; Wikipédia (fr, en)
voir: fondation-de-l-ordre, bernard-de-clairvaux, regle-du-temple, hugues-de-payns
```

- `cat:` l'une de : histoire, maitres, figures, ordre, orient, france, europe, autres, legendes, sources
  (celle que le plan indique pour ton fichier).
- `nom:` la vedette telle qu'elle s'affiche (majuscule initiale, pas de point).
- `alias:` autres noms, graphies, formes latines, termes cherchés (séparés par des virgules). Facultatif.
- `dates:` ce qui s'affiche sous la vedette : « v. 1070 – 24 mai 1136 », « 1307 – 1314 », « fondée en 1151 ».
  Tiret demi-cadratin « – » entre deux dates, « v. » pour « vers ». Facultatif pour une notion.
- `an:` une seule année (nombre), celle qui place l'article dans la chronologie : naissance ou
  première attestation d'une personne, date d'un événement, fondation d'un lieu. `fin:` facultatif
  (mort, fin de l'événement, suppression). Presque tous les articles ont un `an:`.
- `def:` une ou deux phrases, 25 à 50 mots, qui se suffisent à elles-mêmes (elles servent dans
  les listes, la carte et la recherche). Peut contenir des renvois.
- `texte:` 2 à 6 paragraphes selon l'importance du sujet (voir les longueurs ci-dessous).
  Un paragraphe par `texte:` ; pas de liste, pas de titre, pas de tableau.
- `repere:` 3 à 10 repères datés, dans l'ordre chronologique, « DATE — FAIT. » avec un **tiret
  cadratin « — » entouré d'espaces**. La date tient en 30 caractères (« 13 octobre 1307 »,
  « v. 1120 », « août 1308 », « 1151 »). Le fait est une phrase complète, terminée par un point.
- `attention:` quand il y a une idée reçue, une légende ou un débat entre historiens. Une à
  trois phrases. Très recommandé pour les lieux « dits des Templiers » et pour tout ce qui
  touche au procès, au trésor, aux symboles.
- `geo:` **obligatoire pour les lieux et les batailles** (catégories orient, france, europe, et
  les batailles de la catégorie histoire) : latitude, longitude en degrés décimaux, 4 décimales,
  prises sur Wikipédia/Wikidata/OpenStreetMap, jamais inventées. Le plan donne une valeur
  indicative : vérifie-la. `lieu:` l'endroit en clair, **le pays en dernier** : « Troyes, Aube, France »,
  « Atlit, Israël », « Tomar, Portugal ».
- `lien:` 1 à 3 pages extérieures, chacune sur sa ligne. Sortes : `wp Titre exact` (Wikipédia
  en français), `en Title` (anglais), `de`, `es`, `pt` (autres langues, si rien en français),
  `ws Titre` (Wikisource), `gallica ark = libellé`, `ia identifiant = libellé`,
  `persee chemin = libellé`, `url https://… = libellé` (site d'un monument, d'un musée, d'une
  revue). **Vérifie que la page existe et traite bien du sujet** (télécharge-la ; écarte les pages
  d'homonymie et les redirections vers un autre sujet). Le titre Wikipédia est le titre exact de
  la page, avec ses majuscules et ses parenthèses.
- `sources:` une ligne : les ouvrages, articles et pages que tu as réellement consultés pour cet
  article (auteur, titre court, année). C'est la garantie du lecteur ; ne cite pas ce que tu n'as pas lu.
- `voir:` 4 à 8 identifiants du plan, les plus proches du sujet.

Dans `def`, `texte`, `repere`, `attention` :
- `[[id]]` renvoie à un article du plan et s'affiche sous son nom ; `[[id|libellé]]` sous un autre
  texte (« les [[chevaliers-du-temple|frères chevaliers]] »). Pour les catégories ordre et
  legendes, l'application met elle-même la minuscule en cours de phrase ; pour les autres, le nom
  s'affiche tel quel : utilise un libellé si la phrase l'exige. Renvoie généreusement (3 à 12
  renvois par article), mais une seule fois par article pour un même identifiant, au premier
  endroit utile.
- `*titre*` : italique pour les titres d'œuvres (*De laude novae militiae*) et les mots étrangers.
- Aucun HTML, aucun Markdown, aucun `**gras**`, aucune note de bas de page, aucun « [1] ».
- Guillemets français « » avec une espace à l'intérieur. Apostrophe droite ou courbe, au choix
  (le script normalise). Siècles en chiffres romains : « XIIe siècle » (le script met l'exposant).
- Dates : « 13 octobre 1307 », jamais « 13/10/1307 ». Calendrier julien, celui de l'époque.

## Longueurs

- Article pivot (ordre-du-temple, proces-des-templiers, jacques-de-molay, regle-du-temple,
  tresor-des-templiers, hospitaliers) : 700 à 1 100 mots, 6 à 10 repères.
- Événement, maître, personnage, notion : 350 à 600 mots, 4 à 8 repères.
- Lieu majeur (Sainte-Eulalie, Tomar, Acre, Château Pèlerin, enclos du Temple) : 350 à 550 mots.
- Petit lieu (une chapelle, une commanderie rurale) : 150 à 300 mots, 3 à 5 repères ; dis ce qui
  est attesté (date, cartulaire), ce qui subsiste, ce qu'on visite, et ce qui est faussement
  attribué.

## Vérifier, c'est le cœur de la mission

- Chaque date, chaque nom, chaque chiffre doit être vérifié dans une source fiable : Wikipédia
  en français et en anglais (en lisant la page, pas seulement son titre), les ouvrages de
  référence quand tu peux y accéder (Alain Demurger, *Les Templiers, une chevalerie chrétienne au
  Moyen Âge*, 2005, et *Jacques de Molay*, 2007 ; Malcolm Barber, *The New Knighthood*, 1994, et
  *The Trial of the Templars*, 2006 ; Helen Nicholson ; Damien Carraz ; Nicole Bériou et Philippe
  Josserand, *Prier et combattre*, 2009 ; Barbara Frale ; Julien Théry ; Xavier Hélary), les
  articles de Persée et OpenEdition, les sites officiels des monuments. Utilise WebSearch et WebFetch.
- Quand les sources divergent (1119 ou 1120 pour la fondation ; 11 ou 18 mars 1314 pour le bûcher ;
  « neuf chevaliers »), dis-le dans le texte plutôt que de trancher en silence.
- Les dossiers de `build/.atelier/drive/` (condensés de documents de recherche de l'utilisateur,
  surtout pour la France et les régions) sont une matière première : lis ceux qui touchent ton
  sujet, mais recoupe leurs affirmations, et tiens compte de leur section « Réserves ».
  S'ils ne sont pas encore là quand tu commences, avance et reviens les lire avant de finir.
- Pas de chiffre spectaculaire sans source (« 15 000 Templiers », « 9 000 commanderies » sont des
  légendes ; les historiens parlent de quelques milliers de frères et d'environ 700 maisons en France).
- Ce que tu n'as pas pu vérifier ne va pas dans l'article : mets-le dans ton rapport.

## Le style

Lis d'abord `../arcanes/build/articles/45-templiers.txt` (l'application sœur Arcanes) : ce sont
des articles du même auteur sur le même sujet, dans le même format ; c'est la voix à tenir
(phrases nettes, faits datés, « attention » qui démonte l'idée reçue, aucune formule creuse).
Ne recopie pas ces articles : les sujets qu'ils traitent sont réécrits pour T+ avec leurs
propres identifiants.

Chaque article se lit seul, mais ne raconte pas toute l'histoire de l'ordre : il traite son
sujet et renvoie aux voisins. Évite les répétitions d'un article à l'autre de ton lot.

## Le rapport final

Quand ton fichier passe la vérification sans erreur, réponds par un rapport court :
1. les identifiants écrits, le nombre de mots total ;
2. les points que tu n'as pas pu vérifier ou où les sources divergent (et ce que tu as écrit) ;
3. pour chaque article, 1 à 3 propositions d'illustration sur Wikimedia Commons, sous la forme
   `id : File:Nom_exact_du_fichier.jpg (licence vue : PD / CC0 / CC BY-SA 4.0…) — ce que c'est`,
   seulement des fichiers que tu as réellement trouvés (sceaux, miniatures médiévales, gravures
   anciennes, photographies récentes de monuments sous licence libre). Pas de fichier deviné.
