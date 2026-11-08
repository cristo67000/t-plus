'use strict';
/* La liste des articles : recherche, filtre par catégorie, tri. */
(function (racine) {

  const { h, icone } = Outils;
  const { carteArticle, titre } = Communs;

  function dessiner(zone, params) {
    const page = h('div', { class: 'page' });
    let cat = params.cat || '';
    let q = params.q || '';
    let tri = Reglages.lire('tri.articles', 'nom');

    const champ = h('input', { type: 'search', placeholder: 'Chercher un nom, un lieu, un mot…', 'aria-label': 'Chercher', autocomplete: 'off', value: q });
    const vider = h('button', { type: 'button', class: 'bouton-icone', 'aria-label': 'Effacer', hidden: !q, onclick: () => { champ.value = ''; q = ''; maj(); champ.focus(); } }, icone('fermer'));
    page.appendChild(h('div', { class: 'champ-recherche' }, icone('recherche', 'discret'), champ, vider));

    const filtres = h('div', { class: 'filtres', role: 'group', 'aria-label': 'Filtrer par thème' });
    const liste = h('div', { class: 'liste-articles' });
    const compte = h('p', { class: 'discret petit compte' });
    const barre = h('div', { class: 'ligne-compte' });
    const segments = h('div', { class: 'segments' });
    for (const [v, l] of [['nom', 'A → Z'], ['date', 'Chronologique']]) {
      segments.appendChild(h('button', { type: 'button', class: tri === v ? 'actif' : '', onclick: () => { tri = v; Reglages.ecrire('tri.articles', v); maj(); } }, l));
    }
    barre.appendChild(compte);
    barre.appendChild(segments);
    page.appendChild(filtres);
    page.appendChild(barre);
    page.appendChild(liste);

    function dessinerFiltres() {
      filtres.textContent = '';
      const tous = h('button', { type: 'button', class: 'filtre' + (cat ? '' : ' actif'), 'aria-pressed': cat ? 'false' : 'true', onclick: () => { cat = ''; maj(); } }, 'Tout');
      filtres.appendChild(tous);
      for (const c of Donnees.categories) {
        if (!Donnees.parCat(c.id).length) continue;
        filtres.appendChild(h('button', { type: 'button', class: 'filtre' + (cat === c.id ? ' actif' : ''), 'aria-pressed': cat === c.id ? 'true' : 'false',
          style: { '--teinte': c.couleur }, onclick: () => { cat = cat === c.id ? '' : c.id; maj(); } }, h('span', { class: 'point-cat' }), c.nom));
      }
      for (const b of segments.children) b.classList.toggle('actif', b.textContent === (tri === 'nom' ? 'A → Z' : 'Chronologique'));
    }

    function maj() {
      dessinerFiltres();
      vider.hidden = !q;
      App.remplacer('#/articles' + (cat || q ? '?' + new URLSearchParams(Object.assign({}, cat ? { cat } : {}, q ? { q } : {})).toString() : ''));
      liste.textContent = '';
      let articles;
      if (q.trim().length >= 2) {
        const res = Donnees.rechercher(q, { cat: cat || null, limite: 80 });
        articles = res.map((r) => r.a);
        if (tri === 'date') articles.sort((x, y) => (x.an === undefined) - (y.an === undefined) || (x.an || 0) - (y.an || 0));
        compte.textContent = res.length ? Outils.pluriel(res.length, 'article') + ' pour « ' + q + ' »' : 'Aucun article pour « ' + q + ' »';
        if (!res.length) liste.appendChild(h('p', { class: 'discret', style: { marginTop: '12px' } }, 'Essayez une autre orthographe, ou un mot du texte : la recherche ignore les accents et cherche aussi dans les articles.'));
      } else {
        articles = (cat ? Donnees.parCat(cat) : Donnees.articles).slice();
        if (tri === 'date') articles.sort((x, y) => (x.an === undefined) - (y.an === undefined) || (x.an || 0) - (y.an || 0) || x.t.localeCompare(y.t, 'fr'));
        else articles.sort((x, y) => x.t.localeCompare(y.t, 'fr'));
        compte.textContent = Outils.pluriel(articles.length, 'article') + (cat ? ' · ' + Donnees.categorie(cat).nom : '');
      }
      if (tri === 'date' && q.trim().length < 2) {
        let siecle = null;
        for (const a of articles) {
          const s = a.an === undefined ? 'Sans date' : Dates.siecle(a.an);
          if (s !== siecle) { siecle = s; liste.appendChild(h('h3', { class: 'entete-lettre' }, s)); }
          liste.appendChild(carteArticle(a, { cadre: a.an !== undefined ? String(a.an) + (a.fin ? ' – ' + a.fin : '') + ' · ' + Donnees.categorie(a.c).nom : undefined }));
        }
      } else {
        let lettre = null;
        for (const a of articles) {
          if (tri === 'nom' && q.trim().length < 2) {
            const l = a.t.charAt(0).toUpperCase();
            if (l !== lettre) { lettre = l; liste.appendChild(h('h3', { class: 'entete-lettre' }, l)); }
          }
          liste.appendChild(carteArticle(a, { surligne: q.trim().length >= 2 ? q : null }));
        }
      }
    }

    let minuteur = 0;
    champ.addEventListener('input', () => { clearTimeout(minuteur); minuteur = setTimeout(() => { q = champ.value; maj(); }, 120); });
    maj();
    zone.appendChild(page);
    if (params.q !== undefined && !params.q) setTimeout(() => champ.focus(), 50);
    return { titre: 'Articles', sous: cat ? Donnees.categorie(cat).nom : Outils.pluriel(Donnees.articles.length, 'article') };
  }

  racine.VueArticles = { dessiner };

})(window);
