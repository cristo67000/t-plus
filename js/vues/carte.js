'use strict';
/* L'onglet Carte : la carte SVG hors ligne (js/carte.js) et sa liste de lieux. */
(function (racine) {

  const { h } = Outils;

  function dessiner(zone, params) {
    const page = h('div', { class: 'page' });
    page.appendChild(h('p', { class: 'discret intro-carte' }, 'Les commanderies, les châteaux et les champs de bataille du Temple, de la Champagne à la Terre sainte. Touchez un point pour le nommer, puis lisez son article. La carte fonctionne hors ligne.'));
    page.appendChild(h('div', { id: 'carte-cadre', class: 'carte-cadre' }));
    // la légende : les couleurs des points, par catégorie présente sur la carte
    const presentes = new Set(Donnees.lieux().map((a) => a.c));
    const legende = h('ul', { class: 'legende-carte liste-nue', 'aria-label': 'Couleurs des points' });
    for (const c of Donnees.categories) {
      if (!presentes.has(c.id)) continue;
      legende.appendChild(h('li', { class: 'cat-' + c.id }, h('span', { class: 'point-cat' }), c.nom));
    }
    page.appendChild(legende);
    page.appendChild(h('div', { id: 'carte-parcours', class: 'carte-parcours' }));
    page.appendChild(h('div', { id: 'carte-choix', hidden: true }));
    page.appendChild(h('div', { id: 'carte-position' }));
    page.appendChild(h('div', { class: 'rubrique-ligne carte-tete-liste' }, h('p', { id: 'carte-compte', class: 'discret' })));
    page.appendChild(h('div', { id: 'carte-tri', class: 'segments segments-tri', role: 'group', 'aria-label': 'Ranger les lieux' }));
    page.appendChild(h('div', { id: 'carte-liste' }));
    zone.appendChild(page);
    Carte.brancher();
    Carte.reinitialiser();
    if (params.lieu) Carte.choixInitial(params.lieu);
    Carte.montrer();
    return { titre: 'Carte', sous: Outils.pluriel(Donnees.lieux().length, 'lieu', 'lieux') + ' du Temple' };
  }

  racine.VueCarte = { dessiner };

})(window);
