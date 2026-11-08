'use strict';
/*
 * L'échelle de temps des frises.
 *
 * Une frise à l'échelle stricte (tant de pixels par an) rend illisibles les
 * règnes courts : cinq jours de Jean Ier, trente-trois jours de Jean-Paul Ier.
 * Une simple liste, elle, ne montre plus les durées. L'échelle d'ici est
 * entre les deux : proportionnelle partout où c'est possible, étirée juste ce
 * qu'il faut pour qu'aucun mandat ne descende sous une hauteur minimale. Elle
 * reste monotone — on descend, le temps avance — et les durées longues
 * restent longues.
 *
 * Construction : les bornes de tous les mandats découpent le temps en
 * segments ; chaque segment reçoit sa hauteur proportionnelle ; puis chaque
 * mandat trop court étire les segments qu'il couvre, du plus court au plus
 * long. Un segment ne fait que grandir, donc tous les minimums tiennent.
 */
(function (racine) {

  /* intervalles : [{debut: nombre, fin: nombre}] en années décimales.
   * options : { pxParAn, minimum, marge }. */
  function construire(intervalles, options) {
    const o = Object.assign({ pxParAn: 3, minimum: 48, marge: 0.5 }, options || {});
    const bornes = new Set();
    for (const it of intervalles) { bornes.add(it.debut); bornes.add(it.fin); }
    const points = Array.from(bornes).sort((a, b) => a - b);
    if (points.length < 2) points.push((points[0] || 0) + 1);
    // marges, pour que le premier et le dernier bloc ne touchent pas les bords
    points.unshift(points[0] - o.marge);
    points.push(points[points.length - 1] + o.marge);
    const n = points.length - 1;
    const px = new Array(n);
    for (let i = 0; i < n; i++) px[i] = (points[i + 1] - points[i]) * o.pxParAn;

    const index = new Map(points.map((p, i) => [p, i]));
    const tries = intervalles.slice().sort((a, b) => (a.fin - a.debut) - (b.fin - b.debut));
    for (const it of tries) {
      const a = index.get(it.debut), b = index.get(it.fin);
      let total = 0;
      for (let i = a; i < b; i++) total += px[i];
      if (total < o.minimum) {
        if (total <= 0) { px[a] += o.minimum; continue; }
        const facteur = o.minimum / total;
        for (let i = a; i < b; i++) px[i] *= facteur;
      }
    }
    const cumul = new Array(n + 1);
    cumul[0] = 0;
    for (let i = 0; i < n; i++) cumul[i + 1] = cumul[i] + px[i];

    function y(t) {
      if (t <= points[0]) return 0;
      if (t >= points[n]) return cumul[n];
      let lo = 0, hi = n;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (points[mid] <= t) lo = mid; else hi = mid;
      }
      const part = (t - points[lo]) / (points[lo + 1] - points[lo] || 1);
      return cumul[lo] + part * px[lo];
    }

    /* L'inverse : l'année (décimale) à une hauteur donnée. */
    function t(yy) {
      if (yy <= 0) return points[0];
      if (yy >= cumul[n]) return points[n];
      let lo = 0, hi = n;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cumul[mid] <= yy) lo = mid; else hi = mid;
      }
      const part = (yy - cumul[lo]) / (px[lo] || 1);
      return points[lo] + part * (points[lo + 1] - points[lo]);
    }

    return { y, t, hauteur: cumul[n], debut: points[0], fin: points[n], pxParAn: o.pxParAn };
  }

  /* Les graduations : des siècles d'abord, affinées là où l'échelle est
   * étirée, tant que deux repères restent à plus de `ecart` pixels. */
  function graduations(echelle, ecart) {
    const e = ecart || 44;
    const sortie = [];
    const premier = Math.ceil(echelle.debut / 100) * 100;
    const annees = [];
    for (let a = premier; a <= echelle.fin; a += 100) annees.push(a);
    if (!annees.length || annees[0] > echelle.debut + 1) annees.unshift(Math.ceil(echelle.debut));
    if (annees[annees.length - 1] < echelle.fin - 1) annees.push(Math.floor(echelle.fin));

    function affiner(a, b, pas) {
      // entre deux repères a < b, ajoute les multiples de `pas` si la place le permet
      const suivant = { 100: 50, 50: 10, 10: 5, 5: 1 }[pas];
      let prev = a;
      const ajoutes = [];
      for (let t = Math.ceil(a / pas) * pas; t < b; t += pas) {
        if (t <= a) continue;
        if (echelle.y(t) - echelle.y(prev) >= e && echelle.y(b) - echelle.y(t) >= e) {
          ajoutes.push(t);
          prev = t;
        }
      }
      const tous = [a, ...ajoutes, b];
      if (!suivant) return tous;
      let resultat = [tous[0]];
      for (let i = 0; i < tous.length - 1; i++) {
        const fins = affiner(tous[i], tous[i + 1], suivant);
        resultat = resultat.concat(fins.slice(1));
      }
      return resultat;
    }

    let liste = [annees[0]];
    for (let i = 0; i < annees.length - 1; i++) {
      liste = liste.concat(affiner(annees[i], annees[i + 1], 50).slice(1));
    }
    let dernierY = -Infinity;
    for (const a of liste) {
      const yy = echelle.y(a);
      if (yy - dernierY < e * 0.6) continue;
      dernierY = yy;
      sortie.push({ annee: a, y: yy, siecle: a % 100 === 0, demi: a % 50 === 0 });
    }
    return sortie;
  }

  /* Répartit des intervalles qui se chevauchent en colonnes : chaque
   * intervalle reçoit `col` et `nb` (le nombre de colonnes de son groupe).
   * Les intervalles doivent porter debut et fin (nombres) ; ils sont modifiés. */
  const TOLERANCE = 0.1;
  function colonnes(intervalles) {
    const tries = intervalles.slice().sort((a, b) => a.debut - b.debut || b.fin - a.fin);
    let groupe = [];
    let finsColonnes = [];
    let finGroupe = -Infinity;
    function clore() {
      const nb = finsColonnes.length || 1;
      for (const it of groupe) it.nb = nb;
      groupe = [];
      finsColonnes = [];
    }
    for (const it of tries) {
      // deux mandats qui se touchent à moins d'un dixième d'année (dates
      // connues à l'année) ne se chevauchent pas vraiment
      if (it.debut >= finGroupe - TOLERANCE) { clore(); finGroupe = it.fin; }
      else if (it.fin > finGroupe) finGroupe = it.fin;
      let col = finsColonnes.findIndex((f) => f <= it.debut + TOLERANCE);
      if (col === -1) { col = finsColonnes.length; finsColonnes.push(it.fin); }
      else finsColonnes[col] = it.fin;
      it.col = col;
      groupe.push(it);
    }
    clore();
    return intervalles;
  }

  racine.Echelle = { construire, graduations, colonnes };

})(window);
