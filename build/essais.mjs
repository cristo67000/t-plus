/*
 * Épreuves de T+, sans navigateur.
 *
 *   node build/essais.mjs
 *
 * 1. La coquille : sw.js liste exactement ce que index.html charge (plus les
 *    données et les icônes), tout existe, les versions concordent, aucun
 *    caractère de contrôle dans les scripts.
 * 2. Les articles : le plan est couvert, chaque renvoi et chaque « voir » mène
 *    à un article, chaque lieu porte des coordonnées plausibles, les images
 *    annoncées existent, aucune licence d'image n'est hors de la liste permise.
 * 3. La frise : les maîtres se suivent sans se chevaucher, chacun a son article.
 * 4. Le rendu des textes, les requêtes par date, la recherche, dans un bac à
 *    sable qui charge les vrais modules de l'application.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let reussites = 0, echecs = 0;
function ok(cond, message) {
  if (cond) reussites++; else { echecs++; console.log('  ÉCHEC', message); }
}
function lire(f) { return fs.readFileSync(path.join(RACINE, f), 'utf8'); }

// ── 1. Coquille ───────────────────────────────────────────────────────────
console.log('coquille');
const index = lire('index.html');
const sw = lire('sw.js');
const charges = [...index.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((m) => m[1]).filter((u) => !/^https?:|^mailto:/.test(u));
const listes = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]);
for (const u of charges) ok(listes.includes(u), 'sw.js n’annonce pas ' + u);
for (const u of listes) {
  if (u === './') continue;
  ok(fs.existsSync(path.join(RACINE, u)), 'fichier annoncé absent : ' + u);
}
const vIndex = /application-version" content="([^"]+)"/.exec(index)[1];
const vSw = /const VERSION = '([^']+)'/.exec(sw)[1];
ok(vIndex === vSw, 'versions : index ' + vIndex + ' / sw ' + vSw);
for (const f of ['data/articles.json', 'data/frises.json', 'data/precache.json', 'data/carte.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apercu-1200x630.png', 'confidentialite.html', '.nojekyll', 'README.md']) {
  ok(fs.existsSync(path.join(RACINE, f)), 'manque ' + f);
}
for (const f of listes.filter((u) => /\.(js|css|html)$/.test(u)).concat(['js/vues/frise.js'])) {
  const t = lire(f);
  ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(t), 'caractère de contrôle dans ' + f);
}
// une seule adresse électronique publiée : celle de contact
{
  const publies = listes.filter((u) => /\.(js|css|html|json|webmanifest)$/.test(u)).concat(['confidentialite.html', 'README.md']);
  const adresses = new Set();
  for (const f of publies) for (const m of lire(f).matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) adresses.add(m[0].toLowerCase());
  adresses.delete('cristo67apps@gmail.com');
  ok(adresses.size === 0, 'adresse électronique inattendue : ' + Array.from(adresses).join(', '));
}

// ── 2. Articles ───────────────────────────────────────────────────────────
console.log('articles');
const donnees = JSON.parse(lire('data/articles.json'));
const articles = donnees.articles;
const ids = new Set(articles.map((a) => a.id));
const plan = [...lire('build/PLAN-ARTICLES.txt').matchAll(/^([a-z0-9][a-z0-9-]*) \|/gm)].map((m) => m[1]);
for (const id of plan) ok(ids.has(id), 'article prévu absent : ' + id);
ok(articles.length >= 230, 'au moins 230 articles (' + articles.length + ')');
const cats = new Set(donnees.categories.map((c) => c.id));
let mots = 0;
for (const a of articles) {
  ok(cats.has(a.c), a.id + ' : catégorie ' + a.c);
  ok(a.n && a.def && a.tx.length, a.id + ' : nom, définition ou texte vide');
  mots += a.tx.join(' ').split(/\s+/).length;
  const textes = [a.def, a.at || ''].concat(a.tx, a.re.map((r) => r[1]));
  for (const t of textes) {
    for (const m of t.matchAll(/\[\[([^\]|]+)/g)) ok(ids.has(m[1]), a.id + ' : renvoi vers ' + m[1]);
    ok(!/\[\[[^\]]*$|\*\*|<\/?[a-z]/.test(t), a.id + ' : balisage suspect « ' + t.slice(0, 40) + ' »');
  }
  for (const v of a.vo) ok(ids.has(v), a.id + ' : voir ' + v);
  if (a.g) {
    // la France, l'Europe, le Levant : rien ne tombe en Afrique australe ni en Amérique
    ok(a.g[0] > 28 && a.g[0] < 60 && a.g[1] > -11 && a.g[1] < 40, a.id + ' : coordonnées hors zone ' + a.g);
    ok(/, [A-ZÉ][^,]+$/.test(a.lo) || !a.lo.includes(','), a.id + ' : « lieu » sans pays en dernier : ' + a.lo);
  }
  if (['france', 'orient', 'europe'].includes(a.c) && !/^(temple-en|templiers-|larzac)/.test(a.id)) ok(a.g, a.id + ' : lieu sans coordonnées');
  for (const im of a.im || []) {
    ok(fs.existsSync(path.join(RACINE, im.f)), a.id + ' : image absente ' + im.f);
    ok(/^(domaine public|CC0|CC BY( \d\.\d)?|CC BY-SA( \d\.\d)?)$/.test(im.li), a.id + ' : licence ' + im.li);
    ok(im.cr && im.l, a.id + ' : image sans légende ou sans crédit');
  }
  for (const [, , adresse] of a.li) ok(/^https:\/\//.test(adresse), a.id + ' : lien non https ' + adresse);
}
ok(mots > 90000, 'plus de 90 000 mots (' + mots + ')');
const precache = JSON.parse(lire('data/precache.json'));
for (const f of Object.keys(precache)) ok(fs.existsSync(path.join(RACINE, f)), 'precache : ' + f + ' absent');
const imgs = fs.existsSync(path.join(RACINE, 'img')) ? fs.readdirSync(path.join(RACINE, 'img')) : [];
for (const f of imgs) ok(precache['img/' + f], 'image orpheline img/' + f);

// ── 3. Frise ──────────────────────────────────────────────────────────────
console.log('frise');
const frises = JSON.parse(lire('data/frises.json'));
const maitres = frises.find((f) => f.id === 'maitres');
ok(maitres && maitres.mandats.length === 23, 'vingt-trois maîtres');
for (const m of maitres.mandats) ok(ids.has(m.a), 'maître sans article : ' + m.nom);
ok(maitres.mandats[0].a === 'hugues-de-payns' && maitres.mandats[22].a === 'jacques-de-molay', 'de Hugues de Payns à Jacques de Molay');
for (const f of frises) for (const m of f.mandats) if (m.a !== '-') ok(ids.has(m.a), f.id + ' : ' + m.a);

// ── 4. Bac à sable ────────────────────────────────────────────────────────
console.log('modules');
const noeud = () => ({ appendChild(e) { (this.enfants = this.enfants || []).push(e); return e; }, setAttribute() {}, addEventListener() {}, classList: { add() {}, toggle() {} }, style: { setProperty() {} }, dataset: {} });
const bac = {
  console, matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {} },
  navigator: {},
  document: {
    addEventListener() {},
    createElement: (b) => Object.assign(noeud(), { tagName: b.toUpperCase() }),
    createElementNS: (ns, b) => Object.assign(noeud(), { tagName: b }),
    createTextNode: (t) => ({ textContent: t, nodeType: 3 }),
    createDocumentFragment: () => noeud(),
    documentElement: { setAttribute() {}, removeAttribute() {} },
    querySelector: () => null,
  },
  fetch: async (u) => ({ ok: true, json: async () => JSON.parse(lire(u)) }),
};
bac.window = bac;
vm.createContext(bac);
for (const f of ['js/outils.js', 'js/reglages.js', 'js/donnees.js', 'js/echelle.js', 'js/voix.js']) vm.runInContext(lire(f), bac, { filename: f });
await bac.Donnees.charger();
const { Dates, Donnees } = bac;

// requêtes par date : qui était maître ?
const maitreA = (d) => Donnees.enPlace('maitres', Dates.cle(d)).map((m) => m.a).join(',');
ok(maitreA('1129-01-13') === 'hugues-de-payns', 'concile de Troyes : Hugues de Payns (' + maitreA('1129-01-13') + ')');
ok(maitreA('1187-07-04') === 'gerard-de-ridefort', 'Hattin : Gérard de Ridefort (' + maitreA('1187-07-04') + ')');
ok(maitreA('1250-02-08') === 'guillaume-de-sonnac', 'Mansourah : Guillaume de Sonnac (' + maitreA('1250-02-08') + ')');
ok(maitreA('1291-05-01') === 'guillaume-de-beaujeu', 'siège d’Acre : Guillaume de Beaujeu (' + maitreA('1291-05-01') + ')');
ok(maitreA('1307-10-13') === 'jacques-de-molay', '13 octobre 1307 : Jacques de Molay (' + maitreA('1307-10-13') + ')');
ok(maitreA('1186-01-01') === 'gerard-de-ridefort', '1186 : Ridefort');
ok(Donnees.enPlace('maitres', '1180-06-01').length === 0, 'vacance de 1180 entre Eudes et Arnaud');
const pape = (d) => Donnees.enPlace('contexte', Dates.cle(d), 'papes').map((m) => m.nom).join(',');
ok(pape('1312-03-22') === 'Clément V', 'Vox in excelso sous Clément V (' + pape('1312-03-22') + ')');
ok(pape('1139-03-29') === 'Innocent II', 'Omne datum optimum sous Innocent II');
const roi = (d) => Donnees.enPlace('contexte', Dates.cle(d), 'france').map((m) => m.nom).join(',');
ok(roi('1307-10-13') === 'Philippe IV le Bel', 'Philippe le Bel en 1307');
const tableau = Donnees.tableau('1250-02-08');
ok(tableau.length === 4, 'quatre voies en place en 1250 (' + tableau.length + ')');

// recherche
const premier = (q) => (Donnees.rechercher(q)[0] || { a: {} }).a.id;
ok(premier('molay') === 'jacques-de-molay' || premier('molay') === 'molay', 'recherche « molay »');
ok(premier('Hattin') === 'bataille-de-hattin', 'recherche « Hattin » (' + premier('Hattin') + ')');
ok(premier('baphomet') === 'baphomet', 'recherche « baphomet »');
ok(premier('eulalie') === 'sainte-eulalie-de-cernon', 'recherche « eulalie »');
ok(Donnees.rechercher('larmenius').length > 0, 'recherche dans le texte : « larmenius »');

// la lecture à voix haute : le texte préparé pour la voix, le choix de la voix
const { Voix } = bac;
const dit = (t, attendu) => ok(Voix.preparer(t) === attendu, 'voix : « ' + t + ' » → « ' + Voix.preparer(t) + ' »');
dit('v. 1103 – 17 janvier 1156', 'vers 1103 à 17 janvier 1156');
dit('1191 – 1291', '1191 à 1291');
dit('la guerre de Saint-Sabas (1256-1258)', 'la guerre de Saint-Sabas (1256 à 1258)');
dit('Baudouin Iᵉʳ prend Acre', 'Baudouin premier prend Acre');
dit('dès le XIIᵉ siècle', 'dès le 12e siècle');
dit('à la fin du XVIIIᵉ siècle', 'à la fin du 18e siècle');
dit('Philippe IV le Bel et Clément V', 'Philippe 4 le Bel et Clément 5');
dit('Bohémond VI se soumet', 'Bohémond 6 se soumet');
dit('le 1ᵉʳ mai', 'le premier mai');
dit('Il part. Vite.', 'Il part. Vite.');
const long = 'Une phrase assez longue pour compter. '.repeat(12).trim();
ok(Voix.phrases(long).length > 1 && Voix.phrases(long).every((p) => p.length <= 220), 'voix : un long paragraphe est coupé en phrases');
ok(Voix.phrases(long).join(' ') === long, 'voix : rien ne se perd à la coupe');
ok(Voix.possible === false && Voix.lire(['x']) === false, 'voix : sans synthèse vocale, rien ne se passe');
for (const [nom, homme] of [['Microsoft Paul - French (France)', true], ['Microsoft Henri Online (Natural) - French (France)', true], ['Thomas', true], ['Microsoft Hortense - French (France)', false], ['Microsoft Julie - French (France)', false], ['Google français', false], ['Amélie', false], ['Microsoft Denise Online (Natural) - French (France)', false], ['French Female', false], ['French Male', true]]) {
  ok(Voix.estMasculine({ name: nom }) === homme, 'voix : ' + nom + (homme ? ' est un homme' : ' n’est pas un homme'));
}
ok(Voix.estMasculine({ name: 'français France', voiceURI: 'fr-fr-x-frd-local' }), 'voix : la variante frd de Google est un homme');
for (const a of Donnees.articles) {
  const t = Voix.preparer([a.n, a.da, Donnees.nu(a.def)].concat(a.tx.map(Donnees.nu), a.re.map((r) => r[0] + ' : ' + Donnees.nu(r[1]))).join(' '));
  ok(!/[ᵉʳ]|\bv\. ?\d/.test(t), a.id + ' : il reste des signes qu’une voix écorche — ' + (t.match(/.{0,20}(?:[ᵉʳ]|\bv\. ?\d).{0,10}/) || [''])[0]);
}

// le texte nu : pas de crochets
for (const a of Donnees.articles) ok(!/\[\[|\]\]|\*/.test(Donnees.nu(a.def)), a.id + ' : définition nue avec balisage');

// la chronologie et l'année
ok(Donnees.dates().length > 150, 'plus de 150 articles datés');
const an1307 = Donnees.cetteAnnee(1307);
ok(an1307.evenements.some((a) => a.id === 'arrestation-du-13-octobre-1307'), '1307 : l’arrestation');

console.log('\n' + reussites + ' épreuves réussies, ' + echecs + ' échec(s)');
process.exit(echecs ? 1 : 0);
