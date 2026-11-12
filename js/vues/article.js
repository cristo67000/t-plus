'use strict';
/*
 * Un article : illustrations, définition, texte, repères, attention, carte de
 * situation, mandats sur la frise, « pour aller plus loin », sources, voisins.
 */
(function (racine) {

  const { h, icone } = Outils;
  const { carteArticle, titre, majuscule, annees } = Communs;

  function reperes(a) {
    const ul = h('ul', { class: 'reperes' });
    for (const [d, f] of a.re) {
      ul.appendChild(h('li', null, h('div', { class: 'quand' }, d), h('div', { class: 'quoi' }, Rendu.fragment(f))));
    }
    return ul;
  }

  function mandats(a) {
    const liste = Donnees.mandatsDe(a.id);
    if (!liste.length) return null;
    const sec = h('section');
    sec.appendChild(titre('Sur la frise', null, 'h3'));
    for (const m of liste) {
      const f = Donnees.frise(m.frise), per = Donnees.periode(m);
      const d = Dates.duree(m.debut, m.fin, { finInclusive: true });
      const lien = (x, sens) => {
        if (!x) return h('span', { style: { flex: 1 } });
        return h(x.a !== '-' ? 'a' : 'div', { class: sens, href: x.a !== '-' ? '#/a/' + x.a : null },
          sens === 'precedent' ? icone('gauche') : null,
          h('div', { class: 'texte' }, h('div', { class: 'sens' }, sens === 'precedent' ? 'Avant' : 'Après'), h('div', { class: 'qui' }, x.nom), h('div', { class: 'petit discret' }, annees(x))),
          sens === 'suivant' ? icone('droite') : null);
      };
      sec.appendChild(h('div', { class: 'mandat-ligne', style: { '--teinte': Communs.teinte(m) } }, h('span', { class: 'pastille' }),
        h('div', { class: 'texte' },
          h('div', { class: 'fonction' }, majuscule(m.titre)),
          h('div', { class: 'cadre' }, f.nom + ' · ' + per.nom),
          h('div', { class: 'petit' }, majuscule(Communs.datesCompletes(m)) + (d ? ' — ' + d : '')),
          m.note ? h('div', { class: 'petit discret' }, m.note) : null),
        h('a', { class: 'bouton-icone', href: '#/frise?date=' + m.debut, 'aria-label': 'Voir sur la frise', title: 'Voir sur la frise' }, icone('frise'))));
      sec.appendChild(h('div', { class: 'voisins' }, lien(m.precedent, 'precedent'), lien(m.suivant, 'suivant')));
    }
    return sec;
  }

  /* Les boutons « Écouter » : lecture, pause, arrêt ; le passage lu est mis
   * en valeur et ramené à l'écran. */
  function barreEcoute(aLire) {
    if (!racine.Voix || !Voix.possible) return null;
    let courant = null;
    const principal = h('button', { type: 'button', class: 'bouton-discret' });
    const stop = h('button', { type: 'button', class: 'bouton-discret', hidden: true, onclick: () => Voix.arreter() }, icone('stop'), 'Arrêter');
    const habiller = (etat) => {
      principal.textContent = '';
      const [ic, texte] = { arret: ['voix', 'Écouter'], lecture: ['pause', 'Pause'], pause: ['lecture', 'Reprendre'] }[etat];
      principal.append(icone(ic), texte);
      principal.classList.toggle('actif', etat === 'lecture');
      stop.hidden = etat === 'arret';
    };
    const marquer = (el) => {
      if (courant) courant.classList.remove('lu');
      courant = el;
      if (!el) return;
      el.classList.add('lu');
      const r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > racine.innerHeight - 90) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    principal.addEventListener('click', () => {
      if (Voix.etat === 'lecture') { Voix.pause(); return; }
      if (Voix.etat === 'pause') { Voix.reprendre(); return; }
      if (!Voix.voix().length) { Communs.toast('Aucune voix française n’est installée sur cet appareil.'); return; }
      Voix.lire(aLire.map((x) => x[1]), {
        surEtat: habiller,
        surMorceau: (i) => marquer(aLire[i][0]),
        surFin: (erreur) => { marquer(null); if (erreur) Communs.toast('La lecture s’est interrompue.'); },
      });
    });
    habiller('arret');
    return h('div', { class: 'ecoute' }, principal, stop);
  }

  function dessiner(zone, params) {
    const a = Donnees.article(params.id);
    if (!a) {
      zone.appendChild(h('div', { class: 'page' }, h('p', null, 'Cet article n’existe pas.'), h('a', { class: 'bouton-discret', href: '#/articles' }, 'Tous les articles')));
      return { titre: 'T+' };
    }
    const cat = Donnees.categorie(a.c);
    const page = h('article', { class: 'page article cat-' + a.c, style: { '--teinte': cat.couleur } });

    // En-tête
    const tete = h('header', { class: 'article-tete' });
    tete.appendChild(h('a', { class: 'puce puce-claire', href: '#/articles?cat=' + a.c, style: { '--teinte': cat.couleur } }, cat.nom));
    tete.appendChild(h('h2', null, a.n));
    if (a.da) tete.appendChild(h('p', { class: 'article-dates' }, a.da));
    if (a.lo) tete.appendChild(h('p', { class: 'article-lieu discret' }, icone('epingle', 'petite'), a.lo));
    page.appendChild(tete);

    // Ce qui se lit à voix haute : [élément mis en valeur, texte dit]
    const aLire = [[tete, a.n + '.' + (a.da ? ' ' + a.da + '.' : '')]];

    // Illustrations
    const bloc = Illustrations.bloc(a);
    if (bloc) page.appendChild(bloc);

    // Définition et texte
    const def = Rendu.paragraphe(a.def, 'article-def');
    page.appendChild(def);
    aLire.push([def, def.textContent]);
    const corps = h('div', { class: 'article-texte' });
    for (const p of a.tx) {
      const par = corps.appendChild(Rendu.paragraphe(p));
      aLire.push([par, par.textContent]);
    }
    page.appendChild(corps);

    // Attention
    if (a.at) {
      const garde = h('aside', { class: 'attention' }, h('p', { class: 'attention-titre' }, icone('info'), 'À ne pas confondre, ou à ne pas croire'), Rendu.paragraphe(a.at));
      page.appendChild(garde);
      aLire.push([garde, 'À ne pas confondre, ou à ne pas croire. ' + garde.lastChild.textContent]);
    }

    // Repères
    if (a.re.length) {
      const sec = h('section', { class: 'section-reperes' });
      sec.appendChild(titre('Repères', Outils.pluriel(a.re.length, 'date'), 'h3'));
      const liste = sec.appendChild(reperes(a));
      page.appendChild(sec);
      Array.from(liste.children).forEach((li, i) => {
        aLire.push([li, (i ? '' : 'Repères. ') + li.firstChild.textContent + ' : ' + li.lastChild.textContent]);
      });
    }

    // Sur la frise
    const m = mandats(a);
    if (m) page.appendChild(m);

    // Sur la carte
    const carte = Carte.blocFiche(a);
    if (carte) page.appendChild(carte);

    // Voir aussi
    const voisins = a.vo.map((id) => Donnees.article(id)).filter(Boolean);
    if (voisins.length) {
      const sec = h('section');
      sec.appendChild(titre('Voir aussi', null, 'h3'));
      const ul = h('div', { class: 'voisins-articles' });
      for (const v of voisins) ul.appendChild(carteArticle(v, { sansDef: true }));
      sec.appendChild(ul);
      page.appendChild(sec);
    }

    // Pour aller plus loin
    if (a.li.length) {
      const sec = h('section');
      sec.appendChild(titre('Pour aller plus loin', 'sites extérieurs', 'h3'));
      const ul = h('ul', { class: 'liens-ext liste-nue' });
      for (const [source, libelle, adresse] of a.li) {
        ul.appendChild(h('li', null, h('a', { class: 'lien-ext', href: adresse, target: '_blank', rel: 'noopener noreferrer' },
          icone('externe'), h('span', { class: 'texte' }, h('span', { class: 'source' }, source), h('span', { class: 'libelle' }, libelle)))));
      }
      sec.appendChild(ul);
      page.appendChild(sec);
    }

    // Sources et crédits
    const pied = h('footer', { class: 'article-pied' });
    if (a.so) pied.appendChild(h('p', { class: 'sources' }, h('strong', null, 'Sources. '), a.so));
    if (a.im && a.im.length) {
      pied.appendChild(h('p', { class: 'credit' }, 'Images : Wikimedia Commons — ' + a.im.map((im) => Donnees.nu(im.cr) + ' (' + im.li + ')').join(' ; ') + '.'));
    }
    const cites = Donnees.citations(a.id);
    if (cites.length) {
      pied.appendChild(h('p', { class: 'petit discret cites' }, 'Cité par : ', cites.slice(0, 12).map((c, i) => [i ? ', ' : '', h('a', { class: 'renvoi', href: '#/a/' + c.id }, c.n)])));
    }
    pied.appendChild(h('div', { class: 'bas-fiche' },
      h('button', { type: 'button', class: 'bouton-discret', onclick: async () => {
        const url = Installer.ADRESSE + '#/a/' + a.id;
        if (racine.navigator.share) { try { await racine.navigator.share({ title: a.n + ' — T+', text: a.dn, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        Communs.toast((await Outils.copier(url)) ? 'Adresse copiée.' : url);
      } }, icone('partager'), 'Partager'),
      h('button', { type: 'button', class: 'bouton-discret', onclick: () => App.aller('#/a/' + Donnees.auHasard(a.c).id) }, icone('hasard'), 'Au hasard')));
    page.appendChild(pied);

    const ecoute = barreEcoute(aLire);
    if (ecoute) tete.appendChild(ecoute);

    zone.appendChild(page);
    return { titre: a.n, sous: cat.nom + (a.da ? ' · ' + a.da : ''), quitter: () => { if (racine.Voix) Voix.arreter(); } };
  }

  racine.VueArticle = { dessiner };

})(window);
