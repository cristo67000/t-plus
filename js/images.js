'use strict';
/*
 * Les portraits hors ligne.
 *
 * Les images ne font pas partie de la coquille versionnée (elles pèsent
 * plus que tout le reste) : elles vont dans un cache à part,
 * « tplus-images », que le service worker remplit au passage et que ce
 * module complète en arrière-plan, trois à la fois, quand le réseau le permet
 * et que l'on n'a pas demandé d'économiser les données. Au démarrage, ce qui
 * ne sert plus (une image remplacée) est retiré.
 */
(function (racine) {

  const CACHE = 'tplus-images';
  const PARALLELE = 3;
  let enCours = false;
  let fait = 0;
  let total = 0;
  let manquantes = [];
  const ecouteurs = new Set();

  function prevenir() { for (const f of ecouteurs) f(etat()); }

  function etat() {
    return { enCours, fait, total, restantes: manquantes.length, possible: 'caches' in racine };
  }

  function adresses() {
    return Object.entries(Donnees.precache).map(([chemin, v]) => chemin + '?v=' + v);
  }

  async function inventaire() {
    if (!('caches' in racine)) return;
    const cache = await caches.open(CACHE);
    const voulues = new Set(adresses().map((a) => new URL(a, location.href).href));
    const presentes = new Set();
    for (const req of await cache.keys()) {
      if (voulues.has(req.url)) presentes.add(req.url);
      else await cache.delete(req);
    }
    manquantes = Array.from(voulues).filter((u) => !presentes.has(u));
    total = voulues.size;
    fait = presentes.size;
    prevenir();
  }

  function economie() {
    const c = racine.navigator.connection;
    return !!(c && c.saveData);
  }

  /* Télécharge ce qui manque. `force` : même en économie de données. */
  async function completer(force) {
    if (enCours || !('caches' in racine)) return;
    if (!force && (economie() || racine.navigator.onLine === false)) return;
    if (Reglages.lire('imagesHorsLigne', 'auto') === 'non' && !force) return;
    enCours = true;
    prevenir();
    const cache = await caches.open(CACHE);
    const file = manquantes.slice();
    async function ouvrier() {
      while (file.length && enCours) {
        const url = file.shift();
        try {
          const r = await fetch(url, { cache: 'no-cache' });
          if (r.ok) {
            await cache.put(url, r);
            fait++;
            manquantes = manquantes.filter((u) => u !== url);
          }
        } catch (e) {
          if (racine.navigator.onLine === false) { enCours = false; break; }
        }
        if (fait % 10 === 0) prevenir();
      }
    }
    await Promise.all(Array.from({ length: PARALLELE }, ouvrier));
    enCours = false;
    prevenir();
  }

  function arreter() { enCours = false; }

  racine.Images = { inventaire, completer, arreter, etat, surChangement: (f) => ecouteurs.add(f), CACHE };

})(window);
