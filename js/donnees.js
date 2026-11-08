'use strict';
/*
 * Les données : les articles (data/articles.json), les frises (data/frises.json)
 * et la liste des images (data/precache.json), chargées une fois, indexées,
 * interrogées par les vues.
 *
 * Un article : { id, c (catégorie), n (nom), al (alias), da (dates affichées),
 * an, fin, def, dn (définition nue), tx (paragraphes), re (repères [date, fait]),
 * at (attention), g [lat, lon], lo (lieu), li (liens [source, libellé, adresse]),
 * so (sources), vo (voir), im (images), mn (minuscule en cours de phrase), t (clé de tri) }.
 *
 * Un mandat de frise : { a (identifiant d'article ou '-'), debut, fin, nom, titre,
 * note, periode, voie }.
 */
(function (racine) {

  const { cle } = Dates;

  let donnees = { version: '', categories: [], articles: [] };
  let parId = {};
  let parCategorie = {};
  let frises = [];
  let parFrise = {};
  let precache = {};
  let index = [];           // [{ a, nom, alias, def, texte }] normalisés, pour la recherche
  let citePar = {};         // id → articles qui le citent

  async function charger() {
    const [a, f, pc] = await Promise.all([
      fetch('data/articles.json').then((r) => { if (!r.ok) throw new Error('articles : ' + r.status); return r.json(); }),
      fetch('data/frises.json').then((r) => r.json()).catch(() => []),
      fetch('data/precache.json').then((r) => r.json()).catch(() => ({})),
    ]);
    donnees = a;
    frises = f;
    precache = pc;
    indexer();
  }

  const MOTIF = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\*([^*]+)\*/g;

  /* Le texte nu : renvois remplacés par leur libellé ou le nom de la cible. */
  function nu(texte) {
    return String(texte || '').replace(MOTIF, (tout, id, libelle, ital) => {
      if (ital !== undefined) return ital;
      if (libelle) return libelle;
      const c = parId[id];
      return c ? (c.mn ? c.n.charAt(0).toLocaleLowerCase('fr') + c.n.slice(1) : c.n) : id;
    });
  }

  function indexer() {
    parId = {};
    parCategorie = {};
    citePar = {};
    for (const a of donnees.articles) {
      parId[a.id] = a;
      (parCategorie[a.c] = parCategorie[a.c] || []).push(a);
    }
    index = donnees.articles.map((a) => ({
      a,
      nom: Outils.normaliser(a.n),
      alias: a.al.map(Outils.normaliser),
      def: Outils.normaliser(nu(a.def)),
      texte: Outils.normaliser(nu(a.tx.join(' ')) + ' ' + a.re.map((r) => r[1]).join(' ') + ' ' + (a.lo || '')),
    }));
    for (const a of donnees.articles) {
      const ids = new Set();
      const regarder = (t) => { for (const m of String(t || '').matchAll(/\[\[([^\]|]+)/g)) ids.add(m[1]); };
      regarder(a.def); regarder(a.at); a.tx.forEach(regarder); a.re.forEach((r) => regarder(r[1]));
      for (const v of a.vo) ids.add(v);
      for (const id of ids) if (id !== a.id) (citePar[id] = citePar[id] || []).push(a.id);
    }
    parFrise = {};
    for (const f of frises) {
      parFrise[f.id] = f;
      f.parPeriode = {};
      for (const p of f.periodes) f.parPeriode[p.id] = p;
      f.parVoie = {};
      for (const v of f.voies) f.parVoie[v.id] = v;
      f.mandats.forEach((m, i) => {
        m.frise = f.id;
        m.index = i;
        m.id = f.id + ':' + i;
        m.cleDebut = cle(m.debut);
        m.cleFin = m.fin ? cle(m.fin, true) : '9999-99-99';
      });
      for (const v of f.voies) {
        const liste = f.mandats.filter((m) => m.voie === v.id);
        liste.forEach((m, i) => { m.precedent = liste[i - 1] || null; m.suivant = liste[i + 1] || null; m.rang = i; });
      }
    }
  }

  // ── Articles ──────────────────────────────────────────────────────────────

  function article(id) { return parId[id] || null; }
  function nom(id) { const a = parId[id]; return a ? a.n : null; }
  function categorie(id) { return donnees.categories.find((c) => c.id === id) || { id, nom: id, couleur: '#888' }; }
  function parCat(id) { return parCategorie[id] || []; }
  function mandatsDe(id) {
    const r = [];
    for (const f of frises) for (const m of f.mandats) if (m.a === id) r.push(m);
    return r;
  }
  function lieux() { return donnees.articles.filter((a) => a.g); }
  function dates() { return donnees.articles.filter((a) => a.an !== undefined).sort((x, y) => x.an - y.an || x.t.localeCompare(y.t, 'fr')); }
  function citations(id) { return (citePar[id] || []).map((x) => parId[x]).filter(Boolean); }

  function auHasard(cat) {
    const liste = cat ? parCat(cat) : donnees.articles;
    return liste[Math.floor(Math.random() * liste.length)];
  }

  /* « L'article du jour » : le même pour tous, toute la journée. */
  function duJour() {
    const t = new Date();
    const n = t.getFullYear() * 400 + t.getMonth() * 31 + t.getDate();
    const liste = donnees.articles.filter((a) => a.im && a.im.length);
    const source = liste.length ? liste : donnees.articles;
    return source[n % source.length];
  }

  /* Les articles dont un repère ou l'année tombe à cette date du calendrier (jour et mois). */
  function anniversaires(jour, mois) {
    const motif = new RegExp('(^|\\s)' + jour + '(er)?\\s+' + Dates.MOIS[mois - 1] + '\\s+(\\d{3,4})');
    const r = [];
    for (const a of donnees.articles) {
      for (const [d, f] of a.re) {
        const m = motif.exec(d);
        if (m) r.push({ a, an: parseInt(m[3], 10), fait: f });
      }
    }
    return r.sort((x, y) => x.an - y.an);
  }

  function rechercher(texte, options) {
    const o = options || {};
    const q = Outils.normaliser(texte);
    if (q.length < 2) return [];
    const mots = q.split(' ').filter(Boolean);
    const res = [];
    for (const e of index) {
      if (o.cat && e.a.c !== o.cat) continue;
      let score = 0;
      if (e.nom === q) score = 100;
      else if (e.nom.startsWith(q)) score = 60;
      else if (e.alias.some((al) => al === q || al.startsWith(q))) score = 50;
      else if (e.nom.split(' ').some((w) => w.startsWith(q))) score = 40;
      else if (mots.every((m) => e.nom.includes(m) || e.alias.some((al) => al.includes(m)))) score = 30;
      else if (mots.every((m) => e.def.includes(m))) score = 20;
      else if (mots.every((m) => e.texte.includes(m))) score = 10;
      if (score) res.push({ a: e.a, score, ou: score >= 30 ? 'nom' : score >= 20 ? 'def' : 'texte' });
    }
    res.sort((x, y) => y.score - x.score || x.a.t.localeCompare(y.a.t, 'fr'));
    return res.slice(0, o.limite || 60);
  }

  // ── Frises ────────────────────────────────────────────────────────────────

  function frise(id) { return parFrise[id] || null; }
  function periode(m) { return parFrise[m.frise].parPeriode[m.periode]; }
  function voie(m) { return parFrise[m.frise].parVoie[m.voie]; }

  function enPlace(friseId, dateCle, voieId) {
    const f = parFrise[friseId];
    if (!f) return [];
    return f.mandats.filter((m) => (!voieId || m.voie === voieId) && m.cleDebut <= dateCle && m.cleFin >= dateCle);
  }

  /* Pour chaque frise et chaque voie, qui est en place à cette date. */
  function tableau(dateCle) {
    const lignes = [];
    for (const f of frises) {
      for (const v of f.voies) {
        const liste = f.mandats.filter((m) => m.voie === v.id);
        const actifs = liste.filter((m) => m.cleDebut <= dateCle && m.cleFin >= dateCle);
        const avant = liste.filter((m) => m.cleFin < dateCle).pop() || null;
        const apres = liste.find((m) => m.cleDebut > dateCle) || null;
        if (!actifs.length && !avant) continue;
        if (!actifs.length && !apres && parseInt(dateCle, 10) - parseInt(avant.cleFin, 10) > 30) continue;
        lignes.push({ frise: f, voie: v, mandats: actifs, avant, apres });
      }
    }
    return lignes;
  }

  function bornes(liste) {
    let min = Infinity, max = -Infinity;
    for (const f of liste || frises) {
      for (const m of f.mandats) {
        const a = Dates.annee(m.debut), b = m.fin ? Dates.annee(m.fin) : new Date().getFullYear();
        if (a < min) min = a;
        if (b > max) max = b;
      }
    }
    return { min, max };
  }

  /* Les articles datés en place dans l'année : événements de l'année et
   * personnes vivantes (an ≤ année ≤ fin). */
  function cetteAnnee(an) {
    const evenements = [], presents = [];
    for (const a of donnees.articles) {
      if (a.an === undefined) continue;
      if (a.an === an) evenements.push(a);
      else if (a.fin !== undefined && a.an < an && a.fin >= an) presents.push(a);
    }
    return { evenements, presents };
  }

  // ── Images ────────────────────────────────────────────────────────────────

  function urlImage(im) { return im.f + '?v=' + im.v; }

  racine.Donnees = {
    charger, nu, article, nom, categorie, parCat, mandatsDe, lieux, dates, citations, auHasard, duJour, anniversaires, rechercher,
    frise, periode, voie, enPlace, tableau, bornes, cetteAnnee, urlImage,
    get articles() { return donnees.articles; },
    get categories() { return donnees.categories; },
    get version() { return donnees.version; },
    get frises() { return frises; },
    get precache() { return precache; },
  };

})(window);
