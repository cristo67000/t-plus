'use strict';
/*
 * La frise : les maîtres de l'ordre sur l'échelle de temps (voir echelle.js),
 * avec, côte à côte si on le demande, les papes, les rois de France et les
 * rois de Jérusalem du même siècle ; ou la chronologie, tous les articles
 * datés, de 1095 à nos jours.
 */
(function (racine) {

  const { h, icone } = Outils;
  const { vignette, annees, teinte, majuscule, carteArticle, titre } = Communs;

  const ZOOMS = [3, 6, 12];
  const MINIMUM = 54;

  /* Les intervalles en années décimales. Dans une même voie, deux mandats
   * connus à l'année qui se recouvrent d'un an au plus (« 1149 – 1152 » puis
   * « 1152 – 1153 ») se succèdent : le premier s'arrête où le second commence.
   * Un recouvrement plus long est une vraie cohabitation, laissée telle quelle. */
  function intervalles(mandats) {
    const maintenant = new Date().getFullYear() + 0.85;
    const liste = mandats.map((m) => ({ m, debut: Dates.nombre(m.debut), fin: m.fin ? Dates.nombre(m.fin, true) : maintenant }));
    const parVoie = new Map();
    for (const it of liste) {
      const k = it.m.frise + '|' + it.m.voie;
      if (!parVoie.has(k)) parVoie.set(k, []);
      parVoie.get(k).push(it);
    }
    for (const suite of parVoie.values()) {
      suite.sort((a, b) => a.debut - b.debut);
      for (let i = 0; i + 1 < suite.length; i++) {
        const a = suite[i], b = suite[i + 1];
        if (a.fin > b.debut && a.fin - b.debut <= 1.01 && b.debut > a.debut) a.fin = b.debut;
      }
    }
    for (const it of liste) if (it.fin < it.debut + 0.03) it.fin = it.debut + 0.03;
    return liste;
  }

  function ouvrir(m) {
    if (m.a !== '-') App.aller('#/a/' + m.a);
    else Communs.toast(m.nom + ' — ' + majuscule(m.titre) + ', ' + annees(m) + (m.note ? '. ' + m.note : ''));
  }

  /* Dessine des voies sur une échelle commune ; `borne` limite le temps dessiné. */
  function dessinerZone(frises, options) {
    const o = Object.assign({ pxParAn: 6, minimum: MINIMUM, dateMarquee: null, bornes: null }, options || {});
    /* Dans les bornes, un règne qui déborde (Philippe Ier, 1060 – 1108) est
     * coupé à la borne : l'échelle ne remonte pas pour lui seul. */
    const borner = (liste) => (o.bornes ? liste.filter((it) => it.fin >= o.bornes[0] && it.debut <= o.bornes[1])
      .map((it) => Object.assign(it, { debut: Math.max(it.debut, o.bornes[0]), fin: Math.min(it.fin, o.bornes[1]) })) : liste);
    const tous = [];
    for (const f of frises) tous.push(...borner(intervalles(f.mandats)));
    const echelle = Echelle.construire(tous, { pxParAn: o.pxParAn, minimum: o.minimum });
    const zone = h('div', { class: 'zone-frise' + (frises.length > 1 ? ' comparer' : ''), style: { height: echelle.hauteur + 'px' } });

    const regle = h('div', { class: 'regle' });
    for (const g of Echelle.graduations(echelle, 44)) {
      regle.appendChild(h('span', { class: 'grad' + (g.siecle ? ' siecle' : ''), style: { top: g.y + 'px' } }, String(g.annee)));
    }
    regle.addEventListener('click', (e) => {
      const r = regle.getBoundingClientRect();
      const an = Math.round(echelle.t(e.clientY - r.top));
      App.aller('#/date/' + String(Math.max(1, an)).padStart(4, '0'));
    });
    zone.appendChild(regle);

    if (frises.length === 1) {
      const rail = h('div', { class: 'rail-periodes' });
      const f = frises[0];
      for (const p of f.periodes) {
        const y1 = echelle.y(Dates.nombre(p.debut));
        const y2 = p.fin ? echelle.y(Dates.nombre(p.fin, true)) : echelle.hauteur;
        const hauteur = Math.max(10, y2 - y1 - 3);
        const libelle = p.nom + ' · ' + Dates.anneeTexte(p.debut) + (p.fin ? ' – ' + Dates.anneeTexte(p.fin) : '');
        rail.appendChild(h('button', { type: 'button', class: 'periode' + (hauteur < 90 ? ' courte' : ''), title: libelle, 'aria-label': libelle,
          style: { top: y1 + 'px', height: hauteur + 'px', '--teinte': p.couleur }, onclick: () => Communs.toast(libelle) }, p.nom));
      }
      zone.appendChild(rail);
    }

    const voies = h('div', { class: 'voies' });
    for (const f of frises) {
      for (const v of f.voies) {
        const col = h('div', { class: 'voie', style: { '--teinte-frise': f.couleur } });
        col.appendChild(h('div', { class: 'voie-titre', title: f.nom + ' · ' + v.nom }, frises.length > 1 || f.voies.length > 1 ? v.nom : ''));
        const liste = Echelle.colonnes(borner(intervalles(f.mandats.filter((m) => m.voie === v.id))));
        for (const it of liste) {
          const m = it.m;
          const y1 = echelle.y(it.debut), y2 = echelle.y(it.fin);
          const hauteur = y2 - y1 - 3;
          const largeur = 100 / it.nb;
          const classes = ['bloc'];
          if (frises.length > 1 || it.nb > 1) classes.push('compact');
          if (hauteur < 46) classes.push('court');
          if (frises.length > 1 && hauteur < 34) classes.push('minuscule');
          if (it.nb > 2 && hauteur >= 44) classes.push('etroit');
          else if (it.nb > 2) classes.push('minuscule');
          const a = m.a !== '-' ? Donnees.article(m.a) : null;
          const corps = h('div', { class: 'texte' }, h('div', { class: 'nom' }, m.nom), h('div', { class: 'dates' }, annees(m)));
          // la note demande la place de deux lignes sous le nom et les dates
          if (frises.length === 1 && m.note && hauteur >= (m.nom.length > 18 ? 118 : 96)) {
            corps.appendChild(h('div', { class: 'note' }, m.note));
          }
          col.appendChild(h('button', {
            type: 'button', class: classes.join(' '), 'data-mandat': m.id,
            style: { top: y1 + 'px', height: hauteur + 'px', left: (it.col * largeur) + '%', width: 'calc(' + largeur + '% - ' + (it.nb > 1 ? 3 : 0) + 'px)', '--teinte': teinte(m) },
            onclick: () => ouvrir(m),
          }, (frises.length === 1 && hauteur >= 60 && it.nb <= 2 && a) ? vignette(a) : null, corps));
        }
        voies.appendChild(col);
      }
    }
    zone.appendChild(voies);

    if (o.dateMarquee) {
      const y = echelle.y(Dates.nombre(o.dateMarquee));
      zone.appendChild(h('div', { class: 'ligne-date', style: { top: y + 'px' } }, h('span', null, Dates.lire(o.dateMarquee))));
      zone._yMarque = y;
    }
    zone._echelle = echelle;
    return zone;
  }

  function dessinerListe(f) {
    const liste = h('div', { class: 'liste-frise' });
    for (const p of f.periodes) {
      const mandats = f.mandats.filter((m) => m.periode === p.id);
      if (!mandats.length) continue;
      liste.appendChild(h('div', { class: 'entete-periode', style: { '--teinte': p.couleur } }, h('span', { class: 'pastille' }),
        h('h3', null, p.nom), h('span', { class: 'discret' }, Dates.anneeTexte(p.debut) + ' – ' + (p.fin ? Dates.anneeTexte(p.fin) : 'aujourd’hui'))));
      for (const m of mandats) {
        const d = Dates.duree(m.debut, m.fin, { finInclusive: true });
        const a = m.a !== '-' ? Donnees.article(m.a) : null;
        liste.appendChild(h('button', { type: 'button', class: 'rangee', style: { '--teinte': teinte(m) }, onclick: () => ouvrir(m) },
          a ? vignette(a) : h('span', { class: 'vignette-article vignette-vide' }, icone('personne')),
          h('div', { class: 'texte' }, h('div', { class: 'nom' }, m.nom), h('div', { class: 'dates' }, annees(m) + (f.voies.length > 1 ? ' · ' + Donnees.voie(m).nom : '')),
            h('div', { class: 'fonction' }, majuscule(m.titre) + (m.note ? ' — ' + m.note : ''))),
          h('div', { class: 'duree' }, d)));
      }
    }
    return liste;
  }

  /* La chronologie : tous les articles datés, par siècle. */
  function dessinerChronologie(cat) {
    const bloc = h('div', { class: 'chronologie' });
    let liste = Donnees.dates();
    if (cat) liste = liste.filter((a) => a.c === cat);
    let siecle = null;
    let ol = null;
    for (const a of liste) {
      const s = Dates.siecle(a.an);
      if (s !== siecle) {
        siecle = s;
        bloc.appendChild(h('h3', { class: 'epoque-titre' }, s));
        ol = h('ol', { class: 'frise-liste' });
        bloc.appendChild(ol);
      }
      const cat2 = Donnees.categorie(a.c);
      ol.appendChild(h('li', { class: 'frise-point', style: { '--teinte': cat2.couleur } },
        h('a', { class: 'frise-ligne', href: '#/a/' + a.id },
          h('span', { class: 'frise-an' }, String(a.an) + (a.fin ? ' – ' + a.fin : '')),
          h('span', { class: 'frise-corps' }, h('span', { class: 'frise-nom' }, a.n), h('span', { class: 'frise-sous' }, (a.da ? a.da + ' · ' : '') + cat2.nom)))));
    }
    if (!liste.length) bloc.appendChild(h('p', { class: 'discret' }, 'Aucun article daté dans ce thème.'));
    return bloc;
  }

  function sauts(echelle, conteneur) {
    const bloc = h('nav', { class: 'sauts', 'aria-label': 'Aller à une décennie' });
    const pas = echelle.fin - echelle.debut > 400 ? 100 : echelle.fin - echelle.debut > 120 ? 20 : 10;
    const premier = Math.ceil(echelle.debut / pas) * pas;
    const boutons = [];
    for (let a = premier; a < echelle.fin; a += pas) {
      const b = h('button', { type: 'button', onclick: () => {
        const y = conteneur.getBoundingClientRect().top + window.scrollY + echelle.y(a) - 130;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } }, String(a));
      b._annee = a; b._pas = pas;
      boutons.push(b);
      bloc.appendChild(b);
    }
    if (boutons.length > 18) boutons.forEach((b, i) => { if (i % 2 === 1) b.hidden = true; });
    bloc._boutons = boutons;
    return bloc;
  }

  function surligner(nav, echelle, conteneur) {
    const haut = window.scrollY + 140 - (conteneur.getBoundingClientRect().top + window.scrollY);
    const an = echelle.t(Math.max(0, haut));
    for (const b of nav._boutons) b.classList.toggle('actif', an >= b._annee && an < b._annee + b._pas);
  }

  function dessiner(zone, params) {
    const maitres = Donnees.frise('maitres');
    const contexte = Donnees.frise('contexte');
    if (!maitres) { zone.appendChild(h('p', { class: 'page' }, 'La frise n’est pas disponible.')); return { titre: 'Frise' }; }
    const page = h('div', { class: 'page-large' });
    let mode = params.mode || Reglages.lire('frise.mode', 'frise');   // frise | liste | chrono
    let zoom = Reglages.lire('frise.zoom', 1);
    let avecContexte = Reglages.lire('frise.contexte', false);
    let catChrono = params.cat || '';
    const date = params.date || null;

    const barre = h('div', { class: 'barre-frise' });
    const corps = h('div');
    let nav = null;
    let surScroll = null;

    function redessiner() {
      corps.textContent = '';
      if (nav) { nav.remove(); nav = null; }
      if (surScroll) { window.removeEventListener('scroll', surScroll); surScroll = null; }
      barre.textContent = '';
      Reglages.ecrire('frise.mode', mode);
      const seg = h('div', { class: 'segments segments-frise' });
      for (const [v, l] of [['frise', 'Frise'], ['liste', 'Liste'], ['chrono', 'Chronologie']]) {
        seg.appendChild(h('button', { type: 'button', class: mode === v ? 'actif' : '', onclick: () => { mode = v; redessiner(); } }, l));
      }
      barre.appendChild(seg);
      if (mode === 'frise') {
        barre.appendChild(h('button', { type: 'button', class: 'puce puce-claire' + (avecContexte ? ' actif' : ''), 'aria-pressed': avecContexte ? 'true' : 'false',
          onclick: () => { avecContexte = !avecContexte; Reglages.ecrire('frise.contexte', avecContexte); redessiner(); } }, 'Papes et rois'));
        barre.appendChild(h('span', { class: 'espace' }));
        barre.appendChild(h('button', { type: 'button', class: 'bouton-icone', 'aria-label': 'Resserrer', disabled: zoom === 0, onclick: () => { zoom = Math.max(0, zoom - 1); Reglages.ecrire('frise.zoom', zoom); redessiner(); } }, icone('moins')));
        barre.appendChild(h('button', { type: 'button', class: 'bouton-icone', 'aria-label': 'Étirer', disabled: zoom === ZOOMS.length - 1, onclick: () => { zoom = Math.min(ZOOMS.length - 1, zoom + 1); Reglages.ecrire('frise.zoom', zoom); redessiner(); } }, icone('plus')));
        const frises = avecContexte && contexte ? [maitres, contexte] : [maitres];
        const z = dessinerZone(frises, { pxParAn: ZOOMS[zoom] * (avecContexte ? 1.6 : 1), dateMarquee: date, bornes: avecContexte ? [1090, 1330] : null });
        corps.appendChild(h('p', { class: 'discret petit intro-frise' }, avecContexte
          ? 'Les maîtres du Temple, et à côté les papes, les rois de France et les rois de Jérusalem de 1090 à 1330. Touchez un nom pour lire son article ; la règle des années mène à « À cette date ».'
          : 'Les vingt-trois maîtres de l’ordre, de la fondation à Jérusalem au bûcher de Paris. Les mandats courts sont étirés pour rester lisibles. Touchez un maître pour lire son article.'));
        corps.appendChild(z);
        nav = sauts(z._echelle, z);
        document.body.appendChild(nav);
        surScroll = () => surligner(nav, z._echelle, z);
        window.addEventListener('scroll', surScroll, { passive: true });
        requestAnimationFrame(() => {
          if (z._yMarque != null) window.scrollTo({ top: z.getBoundingClientRect().top + window.scrollY + z._yMarque - 200 });
          surScroll();
        });
      } else if (mode === 'liste') {
        barre.appendChild(h('span', { class: 'espace' }));
        corps.appendChild(dessinerListe(maitres));
      } else {
        const sel = h('select', { class: 'choix-cat', 'aria-label': 'Thème' }, h('option', { value: '' }, 'Tous les thèmes'));
        for (const c of Donnees.categories) sel.appendChild(h('option', { value: c.id, selected: catChrono === c.id }, c.nom));
        sel.addEventListener('change', () => { catChrono = sel.value; redessiner(); });
        barre.appendChild(sel);
        barre.appendChild(h('span', { class: 'espace' }));
        corps.appendChild(h('div', { class: 'page' }, h('p', { class: 'discret petit' }, 'Tous les articles qui portent une année, de la première croisade à nos jours.'), dessinerChronologie(catChrono)));
      }
    }

    redessiner();
    page.appendChild(barre);
    page.appendChild(corps);
    zone.appendChild(page);
    return {
      titre: 'Frise', sous: 'les maîtres du Temple, 1119 – 1314',
      quitter: () => { if (nav) nav.remove(); if (surScroll) window.removeEventListener('scroll', surScroll); },
    };
  }

  racine.VueFrise = { dessiner, dessinerZone };

})(window);
