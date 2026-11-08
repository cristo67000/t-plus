'use strict';
/* L'accueil : l'article du jour, les portes d'entrée, les sections. */
(function (racine) {

  const { h, icone } = Outils;
  const { carteArticle, vignette, titre } = Communs;

  /* Par où commencer : les grands articles, dans l'ordre d'une première lecture. */
  const PORTES = ['ordre-du-temple', 'fondation-de-l-ordre', 'regle-du-temple', 'commanderie', 'bataille-de-hattin',
    'chute-d-acre', 'jacques-de-molay', 'proces-des-templiers', 'tresor-des-templiers', 'hospitaliers'];
  const EXEMPLES = [['1129', 'Concile de Troyes'], ['1187', 'Hattin'], ['1291', 'Chute d’Acre'], ['1307-10-13', 'L’arrestation'], ['1314-03-11', 'Le bûcher']];

  function carteSection(nom, sous, href, teinte, ico) {
    return h('a', { class: 'carte carte-lien carte-section', href, style: { '--teinte': teinte } },
      h('span', { class: 'pastille-section' }, icone(ico)),
      h('div', { class: 'corps' }, h('p', { class: 'carte-titre' }, nom), h('p', { class: 'discret petit' }, sous)),
      icone('droite', 'fleche discret'));
  }

  function dessiner(zone) {
    const page = h('div', { class: 'page' });
    const n = Donnees.articles.length;

    // Le bandeau
    const champ = h('input', { type: 'search', placeholder: 'Chercher : Molay, Hattin, commanderie…', 'aria-label': 'Chercher un article', autocomplete: 'off' });
    const chercher = () => { const v = champ.value.trim(); App.aller('#/articles?q=' + encodeURIComponent(v)); };
    champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') chercher(); });
    page.appendChild(h('section', { class: 'heros' },
      h('h2', null, 'Les Templiers, sans légende'),
      h('p', null, 'L’ordre du Temple de 1119 à 1314 : ' + Outils.pluriel(n, 'article', 'articles') + ' vérifiés et illustrés, la frise des maîtres, les cartes des commanderies et des châteaux, et ce que valent les mythes.'),
      h('div', { class: 'saisie-date' }, champ, h('button', { type: 'button', onclick: chercher }, 'Chercher'))));

    const carteInstallation = Installer.carteAccueil();
    if (carteInstallation) page.appendChild(carteInstallation);

    // L'article du jour
    const jour = Donnees.duJour();
    if (jour) {
      page.appendChild(titre('Aujourd’hui', 'un article au hasard du calendrier'));
      page.appendChild(carteArticle(jour));
    }

    // Les anniversaires
    const t = new Date();
    const anniv = Donnees.anniversaires(t.getDate(), t.getMonth() + 1);
    if (anniv.length) {
      page.appendChild(titre('Un ' + (t.getDate() === 1 ? '1ᵉʳ' : t.getDate()) + ' ' + Dates.MOIS[t.getMonth()], 'il y a des siècles'));
      const ul = h('ul', { class: 'reperes anniversaires' });
      for (const x of anniv.slice(0, 5)) {
        ul.appendChild(h('li', null, h('div', { class: 'quand' }, String(x.an)),
          h('div', { class: 'quoi' }, Rendu.fragment(x.fait), ' ', h('a', { class: 'renvoi', href: '#/a/' + x.a.id }, x.a.n))));
      }
      page.appendChild(ul);
    }

    // Les sections
    page.appendChild(titre('Explorer'));
    const grille = h('div', { class: 'grille-sections' });
    grille.appendChild(carteSection('Articles', Outils.pluriel(n, 'article') + ' par thème', '#/articles', '#a7322f', 'livre'));
    grille.appendChild(carteSection('Frise des maîtres', 'les vingt-trois maîtres, papes et rois de leur temps', '#/frise', '#8d2a28', 'frise'));
    grille.appendChild(carteSection('Carte', Outils.pluriel(Donnees.lieux().length, 'lieu', 'lieux') + ' : commanderies, châteaux, batailles', '#/carte', '#2f5fa3', 'carte'));
    grille.appendChild(carteSection('À cette date', 'qui était maître, pape, roi ?', '#/date/1307-10-13', '#9c7c2b', 'calendrier'));
    page.appendChild(grille);

    const dates = h('div', { class: 'exemples exemples-clairs' });
    for (const [d, nom] of EXEMPLES) dates.appendChild(h('button', { type: 'button', onclick: () => App.aller('#/date/' + d) }, Dates.anneeTexte(d) + ' · ' + nom));
    page.appendChild(dates);

    // Par où commencer
    page.appendChild(titre('Par où commencer', 'dix articles, dans l’ordre'));
    const portes = h('ol', { class: 'portes' });
    PORTES.map((id) => Donnees.article(id)).filter(Boolean).forEach((a) => {
      portes.appendChild(h('li', null, h('a', { class: 'porte', href: '#/a/' + a.id }, vignette(a, 'petite'), h('span', { class: 'texte' }, h('span', { class: 'nom' }, a.n), h('span', { class: 'petit discret' }, a.da || Donnees.categorie(a.c).nom)))));
    });
    page.appendChild(portes);

    // Les catégories
    page.appendChild(titre('Par thème'));
    const cats = h('div', { class: 'grille-categories' });
    for (const c of Donnees.categories) {
      const nb = Donnees.parCat(c.id).length;
      if (!nb) continue;
      cats.appendChild(h('a', { class: 'carte carte-lien carte-categorie', href: '#/articles?cat=' + c.id, style: { '--teinte': c.couleur } },
        h('span', { class: 'bande' }), h('span', { class: 'nom' }, c.nom), h('span', { class: 'petit discret' }, Outils.pluriel(nb, 'article'))));
    }
    page.appendChild(cats);

    page.appendChild(h('div', { class: 'outils-accueil' },
      h('button', { type: 'button', class: 'bouton-discret', onclick: () => App.aller('#/a/' + Donnees.auHasard().id) }, icone('hasard'), 'Un article au hasard')));

    page.appendChild(h('p', { class: 'discret petit', style: { marginTop: '18px' } },
      'Textes originaux, écrits d’après les travaux des historiens et vérifiés source par source ; images de Wikimedia Commons, créditées sur chaque article. ',
      h('a', { class: 'renvoi', href: '#/reglages' }, 'À propos')));
    zone.appendChild(page);
    return { titre: 'T+', sous: 'les Templiers' };
  }

  racine.VueAccueil = { dessiner };

})(window);
