'use strict';
/*
 * Petits outils partagés : construction du DOM, icônes, dates, texte.
 *
 * Les dates des frises sont des chaînes « AAAA », « AAAA-MM » ou « AAAA-MM-JJ »,
 * précédées de « ~ » quand elles sont approximatives. Elles se comparent par
 * leur clé (Dates.cle), se lisent en français (Dates.lire) et se placent sur
 * une échelle par leur valeur décimale en années (Dates.nombre).
 */
(function (racine) {

  // ── DOM ───────────────────────────────────────────────────────────────────

  function h(balise, attributs, ...enfants) {
    const n = document.createElement(balise);
    if (attributs) {
      for (const [k, v] of Object.entries(attributs)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') {
          for (const [prop, val] of Object.entries(v)) {
            if (val == null) continue;
            if (prop.startsWith('--')) n.style.setProperty(prop, val); else n.style[prop] = val;
          }
        }
        else if (k === 'dataset') Object.assign(n.dataset, v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    ajouter(n, enfants);
    return n;
  }

  function ajouter(n, enfants) {
    for (const e of enfants) {
      if (e == null || e === false) continue;
      if (Array.isArray(e)) ajouter(n, e);
      else n.appendChild(e.nodeType ? e : document.createTextNode(String(e)));
    }
  }

  /* La forme courte des modules repris d'Arcanes : element(balise, classe, texte). */
  function element(balise, classe, texte) {
    const n = document.createElement(balise);
    if (classe) n.className = classe;
    if (texte !== undefined && texte !== null) n.textContent = texte;
    return n;
  }

  function bouton(classe, texte, action) {
    const b = element('button', classe, texte);
    b.type = 'button';
    if (action) b.addEventListener('click', action);
    return b;
  }

  const NS = 'http://www.w3.org/2000/svg';
  function s(balise, attributs, ...enfants) {
    const n = document.createElementNS(NS, balise);
    if (attributs) {
      for (const [k, v] of Object.entries(attributs)) {
        if (v == null || v === false) continue;
        n.setAttribute(k, v);
      }
    }
    for (const e of enfants) {
      if (e == null || e === false) continue;
      n.appendChild(e.nodeType ? e : document.createTextNode(String(e)));
    }
    return n;
  }

  // ── Icônes (traits, 24 × 24) ──────────────────────────────────────────────

  const ICONES = {
    retour: 'M15 18l-6-6 6-6',
    fermer: 'M6 6l12 12M18 6L6 18',
    recherche: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
    calendrier: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    frise: 'M6 3v18M6 6h8v4H6M6 13h11v4H6',
    comparer: 'M4 4h6v16H4zM14 4h6v16h-6z',
    accueil: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    reglages: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
    gauche: 'M14 6l-6 6 6 6',
    droite: 'M10 6l6 6-6 6',
    haut: 'M6 14l6-6 6 6',
    bas: 'M6 10l6 6 6-6',
    externe: 'M14 4h6v6M20 4l-9 9M18 13v6H5V6h6',
    partager: 'M12 3v12M8 7l4-4 4 4M5 13v7h14v-7',
    telecharger: 'M12 3v12M8 11l4 4 4-4M5 19h14',
    info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v6M12 7v1',
    liste: 'M8 6h12M8 12h12M8 18h12M4 6h1M4 12h1M4 18h1',
    plus: 'M12 5v14M5 12h14',
    moins: 'M5 12h14',
    hasard: 'M4 4h16v16H4zM8 8h1M15 8h1M12 12h1M8 16h1M15 16h1',
    personne: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0',
    reperes: 'M12 3v18M12 7h6M12 12h-5M12 17h7',
    horloge: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
    soleil: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
    lune: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
    coche: 'M5 12l4 4L19 7',
    lien: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    livre: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM5 17a3 3 0 0 1 3-3h11',
    carte: 'M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5zM9 4v13.5M15 6.5V20',
    epingle: 'M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21zM12 7.5a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z',
    croix: 'M12 3v18M3 12h18M8 5l4 2 4-2M8 19l4-2 4 2M5 8l2 4-2 4M19 8l-2 4 2 4',
    etoile: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
    image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01',
    voix: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10',
    lecture: 'M8 5l11 7-11 7z',
    pause: 'M8 5v14M16 5v14',
    stop: 'M6 6h12v12H6z',
  };

  function icone(nom, classe) {
    return s('svg', { viewBox: '0 0 24 24', class: 'icone' + (classe ? ' ' + classe : ''), 'aria-hidden': 'true', focusable: 'false' },
      s('path', { d: ICONES[nom] || '', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }

  // ── Dates ─────────────────────────────────────────────────────────────────

  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const RE = /^(~?)(-?\d{1,4})(?:-(\d\d))?(?:-(\d\d))?$/;

  function analyser(d) {
    if (!d) return null;
    const m = RE.exec(String(d));
    if (!m) return null;
    return { approx: m[1] === '~', annee: parseInt(m[2], 10), mois: m[3] ? parseInt(m[3], 10) : null, jour: m[4] ? parseInt(m[4], 10) : null };
  }

  function cle(d, fin) {
    const p = analyser(d);
    if (!p) return fin ? '9999-99-99' : '0000-00-00';
    const an = String(p.annee).padStart(4, '0');
    const mois = p.mois ? String(p.mois).padStart(2, '0') : (fin ? '12' : '01');
    const jour = p.jour ? String(p.jour).padStart(2, '0') : (fin ? '31' : '01');
    return an + '-' + mois + '-' + jour;
  }

  function nombre(d, fin) {
    const p = analyser(d);
    if (!p) return null;
    const mois = p.mois ? p.mois : (fin ? 12 : 1);
    const jour = p.jour ? p.jour : (fin ? 30 : 1);
    return p.annee + (mois - 1) / 12 + (jour - 1) / 365;
  }

  function annee(d) { const p = analyser(d); return p ? p.annee : null; }

  function anneeTexte(d) {
    const p = analyser(d);
    if (!p) return '';
    return (p.approx ? 'v. ' : '') + String(p.annee);
  }

  function lire(d, options) {
    const p = analyser(d);
    if (!p) return '';
    const o = options || {};
    const an = String(p.annee);
    if (p.approx || !p.mois) return (p.approx ? 'vers ' : '') + an;
    if (!p.jour || o.mois) return MOIS[p.mois - 1] + ' ' + an;
    const j = p.jour === 1 ? '1ᵉʳ' : String(p.jour);
    return j + ' ' + MOIS[p.mois - 1] + ' ' + an;
  }

  function lireAvecPreposition(d) {
    const p = analyser(d);
    if (!p) return '';
    if (p.approx) return lire(d);
    if (p.jour) return 'le ' + lire(d);
    return 'en ' + lire(d);
  }

  function aujourdhui() {
    const t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }

  function jours(c1, c2) {
    const a = c1.split('-').map(Number), b = c2.split('-').map(Number);
    const j = (y, m, d) => y * 365.2425 + (m - 1) * 30.436875 + (d - 1);
    return Math.round(j(b[0], b[1], b[2]) - j(a[0], a[1], a[2]));
  }

  function duree(d1, d2, options) {
    const o = options || {};
    const c1 = cle(d1), c2 = d2 ? cle(d2, o.finInclusive) : aujourdhui();
    const n = jours(c1, c2);
    if (n < 0) return '';
    const p1 = analyser(d1), p2 = d2 ? analyser(d2) : null;
    const precis = p1 && p1.jour && (!d2 || (p2 && p2.jour));
    const ans = Math.floor(n / 365.2425);
    if (ans >= 2) return ans + ' ans';
    if (ans === 1) {
      const mois = Math.floor((n - 365.2425) / 30.44);
      return mois >= 1 && precis ? '1 an et ' + mois + ' mois' : '1 an';
    }
    if (!precis) return 'moins d’un an';
    const mois = Math.floor(n / 30.44);
    if (mois >= 1) return mois + ' mois';
    if (n === 1) return '1 jour';
    return n + ' jours';
  }

  const ROMAINS = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  function romain(n) {
    let r = '';
    for (const [v, l] of ROMAINS) while (n >= v) { r += l; n -= v; }
    return r;
  }

  function siecle(an) {
    const n = Math.floor((an - 1) / 100) + 1;
    return romain(n) + (n === 1 ? 'ᵉʳ' : 'ᵉ') + ' siècle';
  }

  // ── Texte ─────────────────────────────────────────────────────────────────

  function normaliser(texte) {
    return String(texte || '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/Æ/g, 'AE').replace(/æ/g, 'ae').replace(/Œ/g, 'OE').replace(/œ/g, 'oe').replace(/ß/g, 'ss')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pluriel(n, un, plusieurs) {
    return n.toLocaleString('fr-FR') + ' ' + (n > 1 ? (plusieurs || un + 's') : un);
  }

  /* Le texte avec les occurrences de la requête mises en valeur (<mark>). */
  function surligner(texte, requete) {
    const frag = document.createDocumentFragment();
    const q = normaliser(requete);
    if (!q) { frag.appendChild(document.createTextNode(texte)); return frag; }
    // on cherche dans la version normalisée, qui garde la même longueur lettre à lettre
    // quand on ne retire que les accents : on travaille donc caractère par caractère
    const plat = String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (plat.length !== String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').length) {
      frag.appendChild(document.createTextNode(texte)); return frag;
    }
    const nfd = String(texte).normalize('NFD');
    // table : indice dans plat → indice dans texte d'origine
    const indices = [];
    let i0 = 0;
    for (let i = 0; i < nfd.length; i++) {
      if (/[̀-ͯ]/.test(nfd[i])) continue;
      indices.push(i0);
      i0 += 1;
    }
    // i0 compte les caractères de base ; l'original NFC peut être plus court, on
    // se contente ici d'un surlignage approché sur la chaîne d'origine
    let pos = 0;
    const src = String(texte);
    const srcPlat = src.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    let k;
    let garde = 0;
    while ((k = srcPlat.indexOf(q, pos)) !== -1 && garde++ < 50) {
      frag.appendChild(document.createTextNode(src.slice(pos, k)));
      const m = document.createElement('mark');
      m.textContent = src.slice(k, k + q.length);
      frag.appendChild(m);
      pos = k + q.length;
    }
    frag.appendChild(document.createTextNode(src.slice(pos)));
    return frag;
  }

  async function copier(texte) {
    try { await navigator.clipboard.writeText(texte); return true; } catch (e) { return false; }
  }

  function annoncer(texte) {
    let t = document.getElementById('toast');
    if (!t) {
      t = h('div', { id: 'toast', role: 'status' });
      document.body.appendChild(t);
    }
    t.textContent = texte;
    t.classList.add('visible');
    clearTimeout(t._minuteur);
    t._minuteur = setTimeout(() => t.classList.remove('visible'), 2600);
  }

  function reculer(n) { try { racine.history.go(-(n || 1)); } catch (e) { /* rien */ } }

  racine.Outils = { h, s, svg: s, element, bouton, icone, normaliser, pluriel, surligner, copier, annoncer, reculer };
  racine.Dates = { analyser, cle, nombre, annee, anneeTexte, lire, lireAvecPreposition, aujourdhui, duree, romain, siecle, MOIS };

})(window);
