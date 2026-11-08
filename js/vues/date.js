'use strict';
/* Une date : qui est en place (maître, pape, roi de France, roi de Jérusalem), et ce qui se passe cette année-là. */
(function (racine) {

  const { h, icone } = Outils;
  const { carteArticle, titre } = Communs;

  const MIN_AN = 1090;
  const MAX_AN = 1330;

  function dessiner(zone, params) {
    const page = h('div', { class: 'page' });
    let cle = params.id || '1307-10-13';

    const champAn = h('input', { type: 'number', min: MIN_AN, max: MAX_AN, inputmode: 'numeric', 'aria-label': 'Année' });
    const champMois = h('select', { 'aria-label': 'Mois' }, h('option', { value: '' }, '— mois —'));
    Dates.MOIS.forEach((m, i) => champMois.appendChild(h('option', { value: String(i + 1).padStart(2, '0') }, m)));
    const champJour = h('select', { 'aria-label': 'Jour' }, h('option', { value: '' }, '— jour —'));
    for (let j = 1; j <= 31; j++) champJour.appendChild(h('option', { value: String(j).padStart(2, '0') }, j));

    const resultats = h('div');
    const lue = h('h2', { class: 'date-lue' });
    const sousLue = h('p', { class: 'discret' });

    function depuisChamps() {
      let an = parseInt(champAn.value, 10);
      if (isNaN(an)) return;
      an = Math.min(MAX_AN, Math.max(MIN_AN, an));
      let c = String(an).padStart(4, '0');
      if (champMois.value) { c += '-' + champMois.value; if (champJour.value) c += '-' + champJour.value; } else champJour.value = '';
      cle = c;
      App.remplacer('#/date/' + cle);
      afficher();
    }
    for (const el of [champMois, champJour]) el.addEventListener('change', depuisChamps);
    champAn.addEventListener('change', depuisChamps);
    champAn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { depuisChamps(); champAn.blur(); } });

    function decaler(ans) {
      const p = Dates.analyser(cle);
      const an = Math.min(MAX_AN, Math.max(MIN_AN, p.annee + ans));
      cle = String(an).padStart(4, '0') + (p.mois ? '-' + String(p.mois).padStart(2, '0') : '') + (p.jour ? '-' + String(p.jour).padStart(2, '0') : '');
      App.remplacer('#/date/' + cle);
      afficher();
    }

    function afficher() {
      const p = Dates.analyser(cle);
      champAn.value = p.annee;
      champMois.value = p.mois ? String(p.mois).padStart(2, '0') : '';
      champJour.value = p.jour ? String(p.jour).padStart(2, '0') : '';
      const precis = Dates.cle(cle);
      lue.textContent = (p.jour ? 'Le ' : 'En ') + Dates.lire(cle);
      sousLue.textContent = Dates.siecle(p.annee) + (p.jour ? '' : ' — à l’année près : plusieurs titulaires peuvent se succéder dans l’année');
      resultats.textContent = '';
      const lignes = Donnees.tableau(precis);
      if (lignes.length) {
        resultats.appendChild(titre('En place', null, 'h3'));
        for (const l of lignes) {
          if (l.mandats.length) for (const m of l.mandats) resultats.appendChild(Communs.carteTitulaire(m, { date: precis }));
          else resultats.appendChild(Communs.vacance(l));
        }
      }
      const { evenements, presents } = Donnees.cetteAnnee(p.annee);
      if (evenements.length) {
        resultats.appendChild(titre('Cette année-là', Outils.pluriel(evenements.length, 'article'), 'h3'));
        for (const a of evenements) resultats.appendChild(carteArticle(a));
      }
      const vivants = presents.filter((a) => a.c === 'figures' || a.c === 'maitres');
      const lieuxActifs = presents.filter((a) => a.c === 'orient' || a.c === 'france' || a.c === 'europe');
      if (vivants.length) {
        resultats.appendChild(titre('Contemporains', 'personnages en vie', 'h3'));
        const grille = h('div', { class: 'grille-puces' });
        for (const a of vivants) grille.appendChild(h('a', { class: 'puce puce-claire', href: '#/a/' + a.id, style: { '--teinte': Donnees.categorie(a.c).couleur } }, a.n));
        resultats.appendChild(grille);
      }
      if (lieuxActifs.length) {
        resultats.appendChild(titre('Lieux tenus par l’ordre', null, 'h3'));
        const grille = h('div', { class: 'grille-puces' });
        for (const a of lieuxActifs) grille.appendChild(h('a', { class: 'puce puce-claire', href: '#/a/' + a.id, style: { '--teinte': Donnees.categorie(a.c).couleur } }, a.n));
        resultats.appendChild(grille);
      }
      resultats.appendChild(h('div', { class: 'outils-accueil', style: { marginTop: '16px' } },
        h('a', { class: 'bouton-discret', href: '#/frise?date=' + cle }, icone('frise'), 'Voir sur la frise')));
    }

    page.appendChild(h('div', { class: 'formulaire-date' },
      h('label', null, 'Année', champAn), h('label', null, 'Mois', champMois), h('label', null, 'Jour', champJour)));
    page.appendChild(h('div', { class: 'pas-date' },
      h('button', { type: 'button', onclick: () => decaler(-10) }, '−10'),
      h('button', { type: 'button', onclick: () => decaler(-1) }, '−1'),
      h('button', { type: 'button', onclick: () => decaler(1) }, '+1'),
      h('button', { type: 'button', onclick: () => decaler(10) }, '+10')));
    page.appendChild(lue);
    page.appendChild(sousLue);
    page.appendChild(resultats);
    afficher();
    zone.appendChild(page);
    return { titre: 'À cette date', sous: 'qui est en place, que se passe-t-il ?' };
  }

  racine.VueDate = { dessiner };

})(window);
