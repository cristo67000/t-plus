'use strict';
/*
 * L'application : routes (#/…), barre de titre, navigation, démarrage.
 *
 *   #/                    accueil
 *   #/articles?cat=&q=    la liste des articles, filtrée, cherchée
 *   #/a/<id>              un article
 *   #/frise               la frise des maîtres (et la chronologie)
 *   #/carte?lieu=<id>     la carte des lieux
 *   #/date/<AAAA[-MM[-JJ]]> qui est en place à cette date
 *   #/reglages            réglages, installation, à propos
 */
(function (racine) {

  const VUES = {
    '': () => VueAccueil, articles: () => VueArticles, a: () => VueArticle, frise: () => VueFrise,
    carte: () => VueCarte, date: () => VueDate, reglages: () => VueReglages,
  };
  const defilements = new Map();
  let routeCourante = null;
  let vueCourante = null;
  let profondeur = 0;
  let retourAttendu = false;

  function analyser(hash) {
    const brut = (hash || '').replace(/^#\/?/, '');
    const [chemin, requete] = brut.split('?');
    const parts = chemin.split('/').filter(Boolean);
    const params = {};
    if (requete) for (const [k, v] of new URLSearchParams(requete)) params[k] = v;
    return { nom: parts[0] || '', id: parts[1] ? decodeURIComponent(parts[1]) : null, params, cle: brut };
  }

  function rendre() {
    const route = analyser(location.hash);
    if (routeCourante) defilements.set(routeCourante.cle, window.scrollY);
    if (vueCourante && vueCourante.quitter) vueCourante.quitter();
    App.surRetour = null;
    if (racine.Illustrations && Illustrations.ouverte) Illustrations.fermerSansHistorique();
    const zone = document.getElementById('vue');
    zone.textContent = '';
    const fabrique = VUES[route.nom] || VUES[''];
    const vue = fabrique();
    const infos = vue.dessiner(zone, Object.assign({ id: route.id }, route.params)) || {};
    vueCourante = infos;
    routeCourante = route;
    document.getElementById('titre-texte').textContent = infos.titre || 'T+';
    document.getElementById('sous-titre').textContent = infos.sous || '';
    document.getElementById('b-retour').hidden = route.nom === '';
    document.getElementById('logo-barre').hidden = route.nom !== '';
    document.title = (infos.titre && infos.titre !== 'T+' ? infos.titre + ' — ' : '') + 'T+ · les Templiers';
    const onglet = { a: 'articles' }[route.nom] || route.nom;
    for (const a of document.querySelectorAll('#nav a')) a.classList.toggle('actif', a.dataset.route === onglet);
    const y = retourAttendu ? defilements.get(route.cle) : undefined;
    retourAttendu = false;
    window.scrollTo({ top: y || 0 });
  }

  function aller(hash) {
    if (location.hash === hash) { rendre(); return; }
    profondeur++;
    location.hash = hash;
  }

  function remplacer(hash) {
    history.replaceState(null, '', hash);
    if (routeCourante) routeCourante.cle = analyser(hash).cle;
  }

  function retour() {
    if (App.surRetour) { App.surRetour(); return; }
    if (racine.Illustrations && Illustrations.ouverte) { Illustrations.fermer(); return; }
    if (profondeur > 0) { profondeur--; retourAttendu = true; history.back(); }
    else aller('#/');
  }

  racine.addEventListener('hashchange', () => {
    if (App.surRetour) App.surRetour();
    rendre();
  });
  /* La visionneuse pose un état d'historique sans changer l'adresse : le geste
   * « retour » du téléphone la referme sans quitter l'article. */
  racine.addEventListener('popstate', () => {
    if (racine.Illustrations && Illustrations.ouverte) Illustrations.fermerSansHistorique();
  });

  /* Les renvois des textes sont de vrais liens « #/a/id » : rien à intercepter.
   * Les boutons marqués data-ref ouvrent aussi un article. */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ref]');
    if (b && b.tagName !== 'A') aller('#/a/' + b.getAttribute('data-ref'));
  });

  async function demarrer() {
    Reglages.appliquerTheme();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', Reglages.appliquerTheme);
    document.getElementById('b-retour').addEventListener('click', retour);
    try {
      await Donnees.charger();
    } catch (e) {
      document.querySelector('#demarrage p').textContent = 'Les données n’ont pas pu être chargées. Vérifiez le réseau, puis rouvrez l’application.';
      return;
    }
    if (racine.Illustrations) Illustrations.brancher();
    document.getElementById('demarrage').classList.add('cache');
    rendre();
    if ('serviceWorker' in navigator && !/[?&]sans-sw/.test(location.search)) {
      try {
        const inscription = await navigator.serviceWorker.register('sw.js');
        MiseAJour.surveiller(inscription);
      } catch (e) { /* hors ligne au premier lancement, ou protocole file: */ }
    }
    try {
      await Images.inventaire();
      Images.completer();
    } catch (e) { /* pas de cache */ }
  }

  racine.App = { aller, remplacer, retour, rendre, surRetour: null };
  racine.addEventListener('DOMContentLoaded', demarrer);

})(window);
