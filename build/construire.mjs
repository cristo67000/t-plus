/*
 * Construit les données de T+ à partir des sources de build/.
 *
 *     node build/construire.mjs                       tout construire → data/articles.json, data/frises.json
 *     node build/construire.mjs --verifier <fichier>  vérifier un seul fichier d'articles (format, renvois)
 *
 * ── Le format d'un article (build/articles/*.txt) ───────────────────────────
 *
 * Une ligne « clé: valeur » par champ ; une ligne qui commence par deux espaces
 * continue le champ précédent. Une ligne vide sépare deux champs, « # » ouvre
 * un commentaire.
 *
 *     @ hugues-de-payns             l'identifiant (minuscules, chiffres, tirets)
 *     cat: maitres                  la catégorie (voir CATEGORIES)
 *     nom: Hugues de Payns          la vedette
 *     alias: Hugo de Paganis, …     autres noms cherchés par la recherche (facultatif)
 *     dates: v. 1070 – 1136         (facultatif) ce qu'on affiche sous la vedette
 *     an: 1119                      (facultatif) l'année qui place l'article dans la chronologie
 *     fin: 1136                     (facultatif, avec an) la fin, pour une durée
 *     def: Une phrase.              la définition courte : listes, carte, recherche
 *     texte: Un paragraphe…         le corps ; un « texte: » par paragraphe
 *     repere: 1129 — Un fait.       (facultatif) une date — tiret cadratin — un fait ; dans l'ordre
 *     attention: …                  (facultatif) l'idée reçue, la légende, le point discuté
 *     geo: 48.3819, 3.9742          (facultatif ; obligatoire pour un lieu) latitude, longitude
 *     lieu: Aube, France            (avec geo) où c'est, en clair ; le pays en dernier
 *     lien: wp Hugues de Payns      (facultatif, plusieurs) une page extérieure : voir SORTES
 *     sources: Demurger 2005 ; …    (facultatif) les ouvrages et pages consultés, en clair
 *     voir: id, id                  articles voisins
 *
 * Dans « def », « texte », « repere » et « attention » :
 *     [[id]]  renvoi vers un article (affiché sous son nom) ; [[id|texte]] sous un autre texte ;
 *     *titre* italique.
 *
 * Le script échoue à la moindre incohérence : une erreur de contenu ne doit pas
 * arriver dans le téléphone de quelqu'un.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.dirname(ICI);

export const CATEGORIES = [
  { id: 'histoire', nom: 'Histoire', couleur: '#a7322f', commun: false },
  { id: 'maitres', nom: 'Maîtres de l’ordre', couleur: '#8d2a28', commun: false },
  { id: 'figures', nom: 'Personnages', couleur: '#6b4c9a', commun: false },
  { id: 'ordre', nom: 'L’ordre et sa vie', couleur: '#9c7c2b', commun: true },
  { id: 'orient', nom: 'Terre sainte et Orient', couleur: '#b4702e', commun: false },
  { id: 'france', nom: 'France', couleur: '#2f5fa3', commun: false },
  { id: 'europe', nom: 'Europe', couleur: '#2a7f7a', commun: false },
  { id: 'autres', nom: 'Autres ordres', couleur: '#4f6d3a', commun: false },
  { id: 'legendes', nom: 'Mythes et postérité', couleur: '#8a5a8a', commun: true },
  { id: 'sources', nom: 'Sources et historiens', couleur: '#6f675c', commun: false },
];
const ID_CATEGORIES = new Set(CATEGORIES.map((c) => c.id));

/* Les articles de catégorie « commune » (ordre, legendes) s'écrivent en
 * minuscule au fil d'une phrase (« la [[commanderie]] »), sauf les noms propres. */
const NOMS_PROPRES = new Set(['baucent', 'devise-non-nobis', 'baphomet', 'chapelle-de-rosslyn', 'rennes-le-chateau',
  'stricte-observance', 'ordre-du-temple-solaire', 'vendredi-13', 'templiers-et-graal', 'templiers-en-ecosse',
  'templiers-en-amerique', 'templiers-et-cathares', 'franc-maconnerie-et-templiers', 'templiers-dans-la-litterature',
  'templiers-au-cinema-et-dans-les-jeux', 'flotte-de-la-rochelle', 'malediction-de-jacques-de-molay',
  'suaire-de-turin-et-templiers', 'tresor-des-templiers', 'graffiti-de-domme-et-chinon', 'tete-de-templiers',
  'templiers-et-hospitaliers', 'templiers-et-musulmans']);

const CLES = new Set(['cat', 'nom', 'alias', 'dates', 'an', 'fin', 'def', 'texte', 'repere', 'attention', 'geo', 'lieu', 'lien', 'sources', 'voir']);

const erreurs = [];
const avertissements = [];
/* --souple : un mandat de frise dont l'article manque encore devient un mandat sans lien (pour les essais). */
const SOUPLE = process.argv.includes('--souple');
function erreur(lieu, message) { erreurs.push(lieu + ' — ' + message); }
function avertir(lieu, message) { avertissements.push(lieu + ' — ' + message); }

// ── Typographie ─────────────────────────────────────────────────────────────

const FINE = String.fromCharCode(0x202f);
const INSECABLE = String.fromCharCode(0xa0);
const EXPOSANT_E = String.fromCharCode(0x1d49);
const EXPOSANT_R = String.fromCharCode(0x2b3);
export function typographie(texte) {
  return String(texte || '')
    .replace(/(\p{L})'(?=\p{L}|\[\[|\*)/gu, '$1’')
    .replace(/\b([IVX]+)e(?=[\s,.;:!?)–-]|$)/g, '$1' + EXPOSANT_E)
    .replace(/\b([IVX]+)er(?=[\s,.;:!?)–-]|$)/g, '$1' + EXPOSANT_E + EXPOSANT_R)
    .replace(/ ([;:!?])/g, FINE + '$1')
    .replace(/« /g, '«' + INSECABLE)
    .replace(/ »/g, INSECABLE + '»')
    .replace(/ – /g, INSECABLE + '– ');
}

// ── Lecture d'un fichier d'articles ─────────────────────────────────────────

export function lireFichier(fichier, articles) {
  const nom = path.basename(fichier);
  const lignes = fs.readFileSync(fichier, 'utf-8').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let article = null;
  let champ = null;

  lignes.forEach((ligne, i) => {
    const lieu = nom + ':' + (i + 1);
    if (ligne.trim() === '') { champ = null; return; }
    if (ligne.startsWith('#')) return;

    if (ligne.startsWith('@ ')) {
      const id = ligne.slice(2).trim();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) erreur(lieu, 'identifiant invalide « ' + id + ' »');
      article = { id, cat: null, nom: null, al: [], dates: '', an: null, fin: null, def: '', textes: [], reperes: [],
        attention: '', geo: null, lo: '', liens: [], sources: '', voir: [], lieu, fichier: nom };
      articles.push(article);
      champ = null;
      return;
    }
    if (!article) { erreur(lieu, 'contenu avant le premier « @ identifiant »'); return; }

    if (ligne.startsWith('  ')) {
      if (!champ) { erreur(lieu, 'ligne indentée sans champ à continuer'); return; }
      if (champ.indice !== undefined) {
        champ.cible[champ.cle][champ.indice] = (champ.cible[champ.cle][champ.indice] + ' ' + ligne.trim()).trim();
      } else {
        champ.cible[champ.cle] = (champ.cible[champ.cle] + ' ' + ligne.trim()).trim();
      }
      return;
    }

    const m = /^([a-z]+):\s?(.*)$/.exec(ligne);
    if (!m || !CLES.has(m[1])) { erreur(lieu, 'ligne incomprise : « ' + ligne.slice(0, 70) + ' »'); return; }
    const cle = m[1];
    const valeur = m[2].trim();
    champ = null;
    switch (cle) {
      case 'cat': article.cat = valeur; break;
      case 'nom': article.nom = valeur; break;
      case 'alias': article.al = valeur.split(',').map((s) => s.trim()).filter(Boolean); break;
      case 'dates': article.dates = valeur; break;
      case 'an':
        if (!/^-?\d{1,4}$/.test(valeur)) erreur(lieu, 'année invalide « ' + valeur + ' » (un nombre seul)');
        article.an = parseInt(valeur, 10);
        break;
      case 'fin':
        if (!/^-?\d{1,4}$/.test(valeur)) erreur(lieu, 'année de fin invalide « ' + valeur + ' »');
        article.fin = parseInt(valeur, 10);
        break;
      case 'def':
        if (article.def) erreur(lieu, 'deux « def: »');
        article.def = valeur; champ = { cible: article, cle: 'def' };
        break;
      case 'texte':
        article.textes.push(valeur);
        champ = { cible: article, cle: 'textes', indice: article.textes.length - 1 };
        break;
      case 'repere':
        article.reperes.push(valeur);
        champ = { cible: article, cle: 'reperes', indice: article.reperes.length - 1 };
        break;
      case 'attention': article.attention = valeur; champ = { cible: article, cle: 'attention' }; break;
      case 'geo': {
        const g = /^(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})$/.exec(valeur);
        if (!g) { erreur(lieu, 'coordonnées illisibles « ' + valeur + ' » (« 48.3819, 3.9742 »)'); break; }
        const [lat, lon] = [parseFloat(g[1]), parseFloat(g[2])];
        if (Math.abs(lat) > 78 || Math.abs(lon) > 180) erreur(lieu, 'coordonnées hors de la carte « ' + valeur + ' »');
        article.geo = [lat, lon];
        break;
      }
      case 'lieu': article.lo = valeur; break;
      case 'lien': article.liens.push({ texte: valeur, lieu }); break;
      case 'sources': article.sources = valeur; champ = { cible: article, cle: 'sources' }; break;
      case 'voir': article.voir = valeur.split(',').map((s) => s.trim()).filter(Boolean); break;
      default: break;
    }
  });
}

// ── Les renvois dans le texte ───────────────────────────────────────────────

function analyser(texte, lieu, ids) {
  const cites = [];
  const sansLiens = texte.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (tout, id, libelle) => {
    if (!ids.has(id)) erreur(lieu, 'renvoi vers un article inexistant « ' + id + ' »');
    if (libelle !== undefined && !libelle.trim()) erreur(lieu, 'renvoi au libellé vide « ' + id + ' »');
    if (libelle !== undefined && libelle.includes('*')) erreur(lieu, 'italique dans le libellé d’un renvoi « ' + id + ' »');
    cites.push(id);
    return libelle || 'X';
  });
  if (/\[\[|\]\]/.test(sansLiens)) erreur(lieu, 'crochets de renvoi mal fermés');
  if ((sansLiens.match(/\*/g) || []).length % 2) erreur(lieu, 'italique mal fermée (nombre impair d’astérisques)');
  if (/\bTBD\b|\bXXX\b|\?\?\?|à compléter|lorem ipsum|\[citation/i.test(texte)) erreur(lieu, 'marque de travail restée dans le texte');
  if (/<[a-z]+>|&[a-z]+;|\*\*/.test(texte)) erreur(lieu, 'balise HTML ou Markdown dans le texte (seuls [[ ]] et * sont permis)');
  if (/\s{2,}/.test(texte)) avertir(lieu, 'espaces doublées');
  return cites;
}

export function nu(texte, noms) {
  return String(texte || '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (tout, id, libelle) => libelle || (noms && noms.get(id)) || id)
    .replace(/\*/g, '');
}

// ── Les repères ─────────────────────────────────────────────────────────────

function anneeDe(date) {
  if (/si[eè]cle/.test(date)) return null;
  const nombres = date.match(/\d{1,4}/g);
  if (!nombres) return null;
  const n = nombres.reduce((a, b) => (b.length > a.length ? b : a));
  return /av\.\s?J\.-C\./.test(date) ? -parseInt(n, 10) : parseInt(n, 10);
}

function lireReperes(a, lieu, ids, liens) {
  const sortie = [];
  let avant = null;
  for (const r of a.reperes) {
    const m = /^(.+?) — (.+)$/.exec(r);
    if (!m) { erreur(lieu, 'repère sans « date — fait » (tiret cadratin entouré d’espaces) : « ' + r.slice(0, 50) + ' »'); continue; }
    const [, date, fait] = m;
    if (date.length > 30) erreur(lieu, 'date de repère trop longue « ' + date + ' »');
    if (!/\d|si[eè]cle/.test(date)) erreur(lieu, 'date de repère sans année « ' + date + ' »');
    if (!/[.!?»)]$/.test(fait)) avertir(lieu, 'repère sans point final « ' + fait.slice(-30) + ' »');
    for (const id of analyser(fait, lieu, ids)) liens.add(id);
    const an = anneeDe(date);
    if (an !== null && avant !== null && an < avant) erreur(lieu, 'repères dans le désordre : « ' + date + ' » après ' + avant);
    if (an !== null) avant = an;
    sortie.push([typographie(date), typographie(fait)]);
  }
  return sortie;
}

// ── Les liens vers d'autres sites ───────────────────────────────────────────

function titreUrl(titre) {
  return encodeURIComponent(titre.replace(/ /g, '_')).replace(/%2F/g, '/').replace(/%3A/g, ':')
    .replace(/%2C/g, ',').replace(/%28/g, '(').replace(/%29/g, ')').replace(/%27/g, "'");
}
const SORTES = {
  wp: (v) => ['Wikipédia', v, 'https://fr.wikipedia.org/wiki/' + titreUrl(v)],
  en: (v) => ['Wikipedia (en anglais)', v, 'https://en.wikipedia.org/wiki/' + titreUrl(v)],
  de: (v) => ['Wikipedia (en allemand)', v, 'https://de.wikipedia.org/wiki/' + titreUrl(v)],
  es: (v) => ['Wikipedia (en espagnol)', v, 'https://es.wikipedia.org/wiki/' + titreUrl(v)],
  pt: (v) => ['Wikipedia (en portugais)', v, 'https://pt.wikipedia.org/wiki/' + titreUrl(v)],
  ws: (v, l) => ['Wikisource', l || v, 'https://fr.wikisource.org/wiki/' + titreUrl(v)],
  gallica: (v, l) => ['Gallica (BnF)', l, 'https://gallica.bnf.fr/ark:/12148/' + v],
  ia: (v, l) => ['Internet Archive', l, 'https://archive.org/details/' + v],
  persee: (v, l) => ['Persée', l, 'https://www.persee.fr/doc/' + v],
  url: (v, l) => [new URL(v).hostname.replace(/^www\./, ''), l, v],
};
const AVEC_LIBELLE = new Set(['gallica', 'ia', 'persee', 'url']);
const VALEURS = {
  gallica: /^(bpt6k|btv1b|bd6t|cb)[0-9a-z]+(\/f\d+(\.item)?)?$/,
  ia: /^[A-Za-z0-9._-]+$/,
  url: /^https:\/\/[^\s]+$/,
};

function lireLien(morceau, lieu) {
  const mm = /^([a-z]+) (.+)$/.exec(morceau.trim());
  if (!mm || !SORTES[mm[1]]) { erreur(lieu, 'lien incompris « ' + morceau + ' » (sortes : ' + Object.keys(SORTES).join(', ') + ')'); return null; }
  const [, sorte, brut] = mm;
  let valeur = brut.trim();
  let libelle = '';
  const k = valeur.indexOf(' = ');
  if (k >= 0) {
    libelle = valeur.slice(k + 3).trim();
    valeur = valeur.slice(0, k).trim();
  } else if (AVEC_LIBELLE.has(sorte)) {
    erreur(lieu, 'lien « ' + sorte + ' » sans « = libellé »'); return null;
  }
  if (VALEURS[sorte] && !VALEURS[sorte].test(valeur)) { erreur(lieu, 'valeur « ' + sorte + ' » invalide « ' + valeur + ' »'); return null; }
  if (/wikipedia\.org|wikisource\.org/.test(valeur) && sorte === 'url') { erreur(lieu, 'une page Wikipédia s’écrit « wp Titre », pas en adresse'); return null; }
  return SORTES[sorte](valeur, typographie(libelle));
}

// ── Les illustrations ───────────────────────────────────────────────────────

/* build/illustrations.json, écrit par build/illustrer.py : chaque image, son
 * fichier dans img/, sa légende, son crédit, sa licence, les articles où elle
 * paraît. */
function lireIllustrations(ids) {
  const fichier = path.join(ICI, 'illustrations.json');
  const resultat = { parArticle: new Map(), nombre: 0, octets: 0 };
  if (!fs.existsSync(fichier)) return resultat;
  const { images } = JSON.parse(fs.readFileSync(fichier, 'utf-8'));
  for (const [id, im] of Object.entries(images)) {
    const chemin = path.join(RACINE, im.f);
    if (!fs.existsSync(chemin)) { erreur('illustrations', 'fichier absent : ' + im.f + ' (relancer build/illustrer.py)'); continue; }
    resultat.nombre += 1;
    resultat.octets += fs.statSync(chemin).size;
    for (const ref of im.pour) {
      if (!ids.has(ref)) { (SOUPLE ? avertir : erreur)('illustrations', 'image « ' + id + ' » : article inexistant « ' + ref + ' »'); continue; }
      if (!resultat.parArticle.has(ref)) resultat.parArticle.set(ref, []);
      resultat.parArticle.get(ref).push({ f: im.f, v: im.v, w: im.w, h: im.h, l: typographie(im.l), cr: typographie(im.cr), li: im.li, src: im.src });
    }
  }
  return resultat;
}

// ── Les frises ──────────────────────────────────────────────────────────────

const DATE = /^~?-?\d{1,4}(-\d\d){0,2}$/;

function lireFrises(ids) {
  const fichier = path.join(ICI, 'frises.txt');
  const frises = [];
  if (!fs.existsSync(fichier)) return frises;
  let f = null;
  let periode = null;
  let titreCourant = '';
  let voieCourante = '';
  fs.readFileSync(fichier, 'utf-8').replace(/\r\n?/g, '\n').split('\n').forEach((ligne, i) => {
    const lieu = 'frises.txt:' + (i + 1);
    if (!ligne.trim() || ligne.startsWith('#')) return;
    if (ligne.startsWith('@ ')) {
      f = { id: ligne.slice(2).trim(), nom: '', titre: '', couleur: '', voies: [], periodes: [], mandats: [] };
      frises.push(f);
      periode = null; titreCourant = ''; voieCourante = '';
      return;
    }
    if (!f) { erreur(lieu, 'contenu avant « @ frise »'); return; }
    if (ligne.startsWith('% ')) {
      const p = ligne.slice(2).split('|').map((s) => s.trim());
      if (p.length < 5) { erreur(lieu, 'période incomplète'); return; }
      periode = { id: p[0], nom: p[1], debut: p[2], fin: p[3] || null, couleur: p[4], voie: '' };
      if (!DATE.test(periode.debut) || (periode.fin && !DATE.test(periode.fin))) erreur(lieu, 'date de période illisible');
      f.periodes.push(periode);
      titreCourant = '';
      voieCourante = f.voies.length ? f.voies[0].id : '';
      return;
    }
    if (ligne.startsWith('= ')) {
      const p = ligne.slice(2).split('|').map((s) => s.trim());
      if (p.length < 4) { erreur(lieu, 'mandat incomplet (article | début | fin | Nom)'); return; }
      if (!periode) { erreur(lieu, 'mandat hors de toute période'); return; }
      let [a, debut, fin, nom] = p;
      if (a !== '-' && !ids.has(a)) {
        if (SOUPLE) { avertir(lieu, 'article inexistant « ' + a + ' » (mandat sans lien)'); a = '-'; }
        else erreur(lieu, 'article inexistant « ' + a + ' »');
      }
      if (!DATE.test(debut) || (fin && !DATE.test(fin))) erreur(lieu, 'date de mandat illisible « ' + debut + ' | ' + fin + ' »');
      const m = { a, debut, fin: fin || null, nom, titre: p[4] || titreCourant, note: p[5] || '', periode: periode.id, voie: voieCourante };
      if (!m.titre) erreur(lieu, 'mandat sans titre, et la période n’en donne pas');
      if (!m.voie) erreur(lieu, 'mandat sans voie');
      f.mandats.push(m);
      return;
    }
    const m = /^([a-z]+):\s?(.*)$/.exec(ligne);
    if (!m) { erreur(lieu, 'ligne incomprise « ' + ligne.slice(0, 60) + ' »'); return; }
    const [, cle, valeur] = m;
    if (cle === 'voie') {
      if (periode) { voieCourante = valeur.trim(); if (!f.voies.some((v) => v.id === voieCourante)) erreur(lieu, 'voie inconnue « ' + voieCourante + ' »'); periode.voie = voieCourante; return; }
      const [id, nom] = valeur.split('|').map((s) => s.trim());
      f.voies.push({ id, nom: nom || id });
      if (!voieCourante) voieCourante = id;
      return;
    }
    if (cle === 'titre') { if (periode) titreCourant = valeur.trim(); else f.titre = valeur.trim(); return; }
    if (cle === 'nom') { f.nom = valeur.trim(); return; }
    if (cle === 'couleur') { f.couleur = valeur.trim(); return; }
    erreur(lieu, 'champ inconnu « ' + cle + ' »');
  });
  for (const fr of frises) {
    if (!fr.nom || !fr.titre || !fr.couleur || !fr.voies.length) erreur('frises.txt', 'frise « ' + fr.id + ' » : nom, titre, couleur ou voie manquant');
    /* Un successeur connu à l'année seule (« 1149 ») ne commence pas avant la
     * fin, datée au jour, de son prédécesseur (« 1149-01-13 ») : sans cela,
     * l'échelle verrait deux maîtres en même temps et les mettrait en colonnes. */
    for (const v of fr.voies) {
      let prec = null;
      for (const m of fr.mandats.filter((x) => x.voie === v.id)) {
        if (prec && prec.fin && /^~?\d{1,4}$/.test(m.debut) && parseInt(m.debut.replace('~', ''), 10) === parseInt(prec.fin.replace('~', ''), 10) && prec.fin.length > 5) {
          m.debut = prec.fin.replace('~', '');
        }
        prec = m;
      }
    }
    for (const m of fr.mandats) {
      m.titre = typographie(m.titre);
      m.note = typographie(m.note);
      m.nom = typographie(m.nom);
    }
    for (const p of fr.periodes) p.nom = typographie(p.nom);
  }
  return frises;
}

// ── Le plan ─────────────────────────────────────────────────────────────────

export function lirePlan() {
  const fichier = path.join(ICI, 'PLAN-ARTICLES.txt');
  const ids = new Set();
  if (!fs.existsSync(fichier)) return ids;
  for (const ligne of fs.readFileSync(fichier, 'utf-8').split(/\r?\n/)) {
    const m = /^([a-z0-9][a-z0-9-]*) \|/.exec(ligne);
    if (m) ids.add(m[1]);
  }
  return ids;
}

// ── Vérification d'un article ───────────────────────────────────────────────

function verifierArticle(a, ids, noms) {
  const lieu = a.lieu + ' (' + a.id + ')';
  if (!a.nom) erreur(lieu, 'pas de « nom: »');
  if (!ID_CATEGORIES.has(a.cat)) erreur(lieu, 'catégorie inconnue « ' + a.cat + ' » (' + CATEGORIES.map((c) => c.id).join(', ') + ')');
  if (!a.def) erreur(lieu, 'pas de « def: »');
  else if (a.def.length < 60) avertir(lieu, 'définition très courte');
  else if (a.def.length > 420) avertir(lieu, 'définition longue (' + a.def.length + ' caractères) : une phrase ou deux');
  if (!a.textes.length) erreur(lieu, 'pas de « texte: »');
  const mots = a.textes.join(' ').split(/\s+/).length;
  if (mots < 80) avertir(lieu, 'texte court (' + mots + ' mots)');
  if (a.fin !== null && a.an === null) erreur(lieu, '« fin: » sans « an: »');
  if (a.fin !== null && a.an !== null && a.fin < a.an) erreur(lieu, '« fin: » avant « an: »');
  if (['orient', 'france', 'europe'].includes(a.cat) && !a.geo && !/^(temple-en|templiers-|larzac)/.test(a.id)) erreur(lieu, 'un lieu porte « geo: »');
  if (a.geo && !a.lo) erreur(lieu, '« geo: » sans « lieu: »');
  const liens = new Set();
  for (const champ of [a.def, a.attention].concat(a.textes)) {
    for (const id of analyser(champ, lieu, ids)) liens.add(id);
  }
  a.reperesLus = lireReperes(a, lieu, ids, liens);
  if (liens.has(a.id)) erreur(lieu, 'l’article se cite lui-même');
  for (const v of a.voir) {
    if (!ids.has(v)) erreur(lieu, 'voir : article inexistant « ' + v + ' »');
    if (v === a.id) erreur(lieu, 'voir : l’article se cite lui-même');
  }
  if (!a.voir.length) avertir(lieu, 'pas de « voir: »');
  if (a.voir.length > 10) avertir(lieu, 'beaucoup de « voir: » (' + a.voir.length + ')');
  a.liensLus = [];
  for (const l of a.liens) {
    const lu = lireLien(l.texte, l.lieu);
    if (lu) a.liensLus.push(lu);
  }
  const adresses = a.liensLus.map((x) => x[2]);
  if (new Set(adresses).size !== adresses.length) erreur(lieu, 'lien en double');
  if (!a.liensLus.length) avertir(lieu, 'pas de « lien: »');
  if (!a.sources) avertir(lieu, 'pas de « sources: »');
  return liens;
}

function afficher(exit) {
  for (const a of avertissements) console.log('  avertissement : ' + a);
  if (erreurs.length) {
    console.error('\n' + erreurs.length + ' erreur(s) :');
    for (const e of erreurs) console.error('  ✗ ' + e);
    if (exit) process.exit(1);
    return false;
  }
  return true;
}

// ── Assemblage ──────────────────────────────────────────────────────────────

function cleTri(nom) {
  return nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/^(le |la |les |l’|l')/, '').replace(/[^a-z0-9 ]+/g, ' ').trim();
}

function main() {
  const k = process.argv.indexOf('--dossier');
  const dossier = k >= 0 ? path.resolve(process.argv[k + 1]) : path.join(ICI, 'articles');
  const fichiers = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter((f) => f.endsWith('.txt')).sort() : [];
  const articles = [];
  for (const f of fichiers) lireFichier(path.join(dossier, f), articles);

  const ids = new Map();
  const noms = new Map();
  for (const a of articles) {
    if (ids.has(a.id)) erreur(a.lieu, 'identifiant « ' + a.id + ' » déjà pris à ' + ids.get(a.id));
    ids.set(a.id, a.lieu);
    noms.set(a.id, a.nom);
  }
  const vedettes = new Map();
  const cites = new Map();
  for (const a of articles) {
    const cle = (a.nom || '').toLowerCase();
    if (vedettes.has(cle)) avertir(a.lieu, 'même vedette que ' + vedettes.get(cle));
    vedettes.set(cle, a.id);
    const liens = verifierArticle(a, ids, noms);
    for (const id of liens) cites.set(id, (cites.get(id) || 0) + 1);
    for (const v of a.voir) cites.set(v, (cites.get(v) || 0) + 1);
  }
  const plan = lirePlan();
  const nonEcrits = Array.from(plan).filter((id) => !ids.has(id));
  if (nonEcrits.length) avertir('plan', nonEcrits.length + ' article(s) prévu(s) non écrit(s) : ' + nonEcrits.slice(0, 12).join(', ') + (nonEcrits.length > 12 ? '…' : ''));
  for (const a of articles) if (!plan.has(a.id)) avertir(a.lieu, 'article hors plan : ' + a.id);
  for (const a of articles) if (!cites.has(a.id) && a.id !== 'ordre-du-temple') avertir(a.lieu, 'aucun article ne cite ' + a.id);

  const illustrations = lireIllustrations(ids);
  const frises = lireFrises(ids);
  if (!afficher(true)) return;

  // Les articles
  const sortie = articles.map((a) => {
    const cat = CATEGORIES.find((c) => c.id === a.cat);
    const o = {
      id: a.id, c: a.cat, n: typographie(a.nom), al: a.al.map(typographie), da: typographie(a.dates),
      def: typographie(a.def), tx: a.textes.map(typographie), re: a.reperesLus,
      vo: a.voir, li: a.liensLus, so: typographie(a.sources), t: cleTri(a.nom),
    };
    if (a.an !== null) o.an = a.an;
    if (a.fin !== null) o.fin = a.fin;
    if (a.attention) o.at = typographie(a.attention);
    if (a.geo) { o.g = a.geo; o.lo = typographie(a.lo); }
    if (cat.commun && !NOMS_PROPRES.has(a.id) && !/^\p{Lu}{2}/u.test(a.nom)) o.mn = 1;
    if (illustrations.parArticle.has(a.id)) o.im = illustrations.parArticle.get(a.id);
    // la définition nue, pour la carte et la recherche
    o.dn = nu(o.def, noms);
    return o;
  }).sort((x, y) => x.t.localeCompare(y.t, 'fr'));

  const mots = articles.reduce((s, a) => s + a.textes.join(' ').split(/\s+/).length, 0);
  const version = new Date().toISOString().slice(0, 10);
  const donnees = { version, categories: CATEGORIES.map(({ id, nom, couleur }) => ({ id, nom, couleur })), articles: sortie };
  fs.mkdirSync(path.join(RACINE, 'data'), { recursive: true });
  fs.writeFileSync(path.join(RACINE, 'data', 'articles.json'), JSON.stringify(donnees), 'utf-8');
  fs.writeFileSync(path.join(RACINE, 'data', 'frises.json'), JSON.stringify(frises), 'utf-8');
  // la liste des images, avec leur empreinte, pour le cache hors ligne
  const precache = {};
  for (const liste of illustrations.parArticle.values()) for (const im of liste) precache[im.f] = im.v;
  fs.writeFileSync(path.join(RACINE, 'data', 'precache.json'), JSON.stringify(precache), 'utf-8');

  console.log('data/articles.json : ' + sortie.length + ' articles, ' + mots.toLocaleString('fr-FR') + ' mots, '
    + sortie.filter((a) => a.g).length + ' lieux, ' + sortie.filter((a) => a.an !== undefined).length + ' datés, '
    + sortie.reduce((s, a) => s + a.re.length, 0) + ' repères, ' + sortie.reduce((s, a) => s + a.li.length, 0) + ' liens, '
    + illustrations.nombre + ' images (' + Math.round(illustrations.octets / 1024) + ' Ko), '
    + sortie.filter((a) => a.im).length + ' articles illustrés');
  console.log('data/frises.json : ' + frises.map((f) => f.id + ' (' + f.mandats.length + ' mandats)').join(', '));
}

function verifier(fichier) {
  const articles = [];
  lireFichier(path.resolve(fichier), articles);
  // les renvois permis : le plan, plus tout ce qui est déjà écrit
  const ids = new Set(lirePlan());
  const dossier = path.join(ICI, 'articles');
  if (fs.existsSync(dossier)) {
    for (const f of fs.readdirSync(dossier).filter((x) => x.endsWith('.txt'))) {
      if (path.resolve(path.join(dossier, f)) === path.resolve(fichier)) continue;
      const autres = [];
      try { lireFichier(path.join(dossier, f), autres); } catch (e) { /* un autre fichier en cours */ }
      for (const a of autres) ids.add(a.id);
    }
  }
  const vus = new Set();
  for (const a of articles) {
    if (vus.has(a.id)) erreur(a.lieu, 'identifiant en double « ' + a.id + ' »');
    vus.add(a.id);
    ids.add(a.id);
  }
  for (const a of articles) verifierArticle(a, ids, null);
  const plan = lirePlan();
  for (const a of articles) if (!plan.has(a.id)) avertir(a.lieu, 'article hors plan : ' + a.id + ' (ajoutez-le au plan si c’est voulu)');
  console.log(articles.length + ' article(s) lu(s) dans ' + path.basename(fichier)
    + ' (' + articles.reduce((s, a) => s + a.textes.join(' ').split(/\s+/).length, 0).toLocaleString('fr-FR') + ' mots)');
  if (afficher(true)) console.log('✓ aucune erreur');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const k = process.argv.indexOf('--verifier');
  if (k >= 0) verifier(process.argv[k + 1]);
  else main();
}
