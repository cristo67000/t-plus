'use strict';
/* Morceaux d'interface partagés par les vues. */
(function (racine) {

  const { h, icone } = Outils;

  /* La vignette d'un article : sa première image, sinon une pastille de catégorie. */
  function vignette(a, classe) {
    const im = a && a.im && a.im[0];
    if (im) {
      return h('img', { class: 'vignette-article ' + (classe || ''), src: Donnees.urlImage(im), alt: '', loading: 'lazy', decoding: 'async', width: 56, height: 56 });
    }
    return h('span', { class: 'vignette-article vignette-vide cat-' + (a ? a.c : '') + ' ' + (classe || ''), 'aria-hidden': 'true' },
      icone(a && a.c === 'maitres' || a && a.c === 'figures' ? 'personne' : a && a.g ? 'epingle' : 'livre'));
  }

  /* « 1119 – 1136 », « 1307 ». */
  function annees(m) {
    const a = Dates.anneeTexte(m.debut);
    if (!m.fin) return 'depuis ' + a;
    const b = Dates.anneeTexte(m.fin);
    return a === b ? a : a + ' – ' + b;
  }

  function datesCompletes(m) {
    const a = Dates.lire(m.debut);
    if (!m.fin) return 'depuis ' + Dates.lireAvecPreposition(m.debut).replace(/^(le|en) /, '$1 ');
    return 'du ' + a + ' au ' + Dates.lire(m.fin);
  }

  function teinte(m) {
    const p = Donnees.periode(m);
    return p ? p.couleur : Donnees.frise(m.frise).couleur;
  }

  function majuscule(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }

  function cadre(m) {
    const f = Donnees.frise(m.frise);
    const v = Donnees.voie(m);
    return f.voies.length > 1 ? v.nom : f.nom;
  }

  /* La carte d'un article dans une liste : vignette, nom, catégorie, définition. */
  function carteArticle(a, options) {
    const o = options || {};
    const cat = Donnees.categorie(a.c);
    const corps = h('div', { class: 'corps' });
    corps.appendChild(h('div', { class: 'cadre', style: { color: cat.couleur } }, o.cadre || cat.nom));
    corps.appendChild(h('div', { class: 'nom' }, o.surligne ? Outils.surligner(a.n, o.surligne) : a.n));
    const sous = [a.da, a.lo].filter(Boolean).join(' · ');
    if (sous && !o.sansDates) corps.appendChild(h('div', { class: 'dates' }, sous));
    if (!o.sansDef) corps.appendChild(h('div', { class: 'def' }, o.surligne ? Outils.surligner(a.dn, o.surligne) : a.dn));
    return h('a', { class: 'carte carte-lien carte-article cat-' + a.c, href: '#/a/' + a.id, style: { '--teinte': cat.couleur } },
      vignette(a), corps, icone('droite', 'fleche discret'));
  }

  /* La carte d'un mandat (vue Date). */
  function carteTitulaire(m, options) {
    const o = options || {};
    const a = m.a !== '-' ? Donnees.article(m.a) : null;
    const per = Donnees.periode(m);
    const f = Donnees.frise(m.frise);
    const corps = h('div', { class: 'corps' });
    corps.appendChild(h('div', { class: 'cadre' }, o.cadre || cadre(m)));
    corps.appendChild(h('div', { class: 'nom' }, m.nom));
    corps.appendChild(h('div', { class: 'fonction' }, majuscule(m.titre) + (per ? ' · ' + per.nom : '')));
    const morceaux = [];
    if (o.date) {
      morceaux.push('depuis ' + Dates.lireAvecPreposition(m.debut).replace(/^(le|en) /, '$1 '));
      const d = Dates.duree(m.debut, o.date);
      if (d && !/jours?$/.test(d)) morceaux.push(d + ' en fonction');
    } else morceaux.push(annees(m));
    if (m.note) morceaux.push(m.note);
    corps.appendChild(h('div', { class: 'depuis' }, morceaux.join(' · ')));
    return h(a ? 'a' : 'div', {
      class: 'carte carte-lien carte-titulaire' + (a ? '' : ' sans-article'),
      href: a ? '#/a/' + a.id : null, style: { '--teinte': teinte(m), '--teinte-frise': f.couleur },
    }, a ? vignette(a) : h('span', { class: 'vignette-article vignette-vide', 'aria-hidden': 'true' }, icone('personne')), corps, a ? icone('droite', 'fleche discret') : null);
  }

  function vacance(ligne) {
    const corps = h('div', { class: 'corps' });
    corps.appendChild(h('div', { class: 'cadre' }, ligne.frise.voies.length > 1 ? ligne.voie.nom : ligne.frise.nom));
    corps.appendChild(h('div', { class: 'nom' }, ligne.apres ? 'Vacance' : 'Fin de la série'));
    const details = [];
    if (ligne.avant) details.push('après ' + ligne.avant.nom + ' (' + Dates.anneeTexte(ligne.avant.fin) + ')');
    if (ligne.apres) details.push('avant ' + ligne.apres.nom + ' (' + Dates.anneeTexte(ligne.apres.debut) + ')');
    corps.appendChild(h('div', { class: 'fonction discret' }, details.join(', ')));
    return h('div', { class: 'carte carte-titulaire vacance', style: { '--teinte': ligne.frise.couleur } },
      h('span', { class: 'vignette-article vignette-vide', 'aria-hidden': 'true' }, icone('personne')), corps);
  }

  function toast(texte) { Outils.annoncer(texte); }

  /* Un titre de section avec, à droite, un mot discret. */
  function titre(texte, note, niveau) {
    return h(niveau || 'h2', { class: 'titre-section' }, texte, note ? h('span', { class: 'discret' }, note) : null);
  }

  racine.Communs = { vignette, annees, datesCompletes, teinte, cadre, carteArticle, carteTitulaire, vacance, majuscule, toast, titre };

})(window);
