'use strict';
/* Réglages, installation, à propos. */
(function (racine) {

  const { h, icone } = Outils;

  function segments(valeurs, actuel, surChoix) {
    const bloc = h('div', { class: 'segments' });
    for (const [v, libelle] of valeurs) {
      bloc.appendChild(h('button', { type: 'button', class: v === actuel ? 'actif' : '', onclick: () => {
        surChoix(v);
        bloc.querySelectorAll('button').forEach((b, i) => b.classList.toggle('actif', valeurs[i][0] === v));
      } }, libelle));
    }
    return bloc;
  }

  /* La lecture à voix haute : la voix (un homme, en français de France, sauf
   * autre choix), le débit, un essai. */
  function carteVoix() {
    const carte = h('div', { class: 'carte' });
    carte.appendChild(h('p', { class: 'carte-titre' }, 'Lecture à voix haute'));
    const etat = h('div', { class: 'explication' });
    const liste = h('select', { class: 'choix-voix', 'aria-label': 'Voix', onchange: () => { Reglages.ecrire('voix', liste.value); montrer(); } });
    function montrer() {
      const voix = Voix.voix();
      const c = Voix.choisie();
      liste.textContent = '';
      liste.appendChild(h('option', { value: '' }, 'Automatique (voix d’homme)'));
      for (const v of voix) {
        liste.appendChild(h('option', { value: v.voiceURI }, v.name.replace(/\s*-\s*French \(France\)/i, '') + (Voix.estMasculine(v) ? ' · homme' : '') + (Voix.enLigne(v) ? ' · en ligne' : '')));
      }
      liste.value = c.choix ? c.voix.voiceURI : '';
      liste.disabled = !voix.length;
      if (!c.voix) etat.textContent = 'Aucune voix française n’est installée sur cet appareil : ajoutez-en une dans les réglages de synthèse vocale du système.';
      else if (c.choix) etat.textContent = 'Voix choisie : ' + c.voix.name + '.';
      else if (c.masculine) etat.textContent = 'Voix d’homme, en français de France : ' + c.voix.name + '.';
      else etat.textContent = 'Aucune voix d’homme reconnue sur cet appareil : ' + c.voix.name + ' est lue d’un ton plus grave. Si la liste contient une voix masculine, choisissez-la.';
    }
    Voix.surVoix(montrer);
    montrer();
    carte.appendChild(h('div', { class: 'option' }, h('div', { style: { flex: 1 } }, h('div', { class: 'libelle' }, 'Voix'), etat), liste));
    carte.appendChild(h('div', { class: 'option' }, h('div', null, h('div', { class: 'libelle' }, 'Débit'), h('div', { class: 'explication' }, 'La vitesse de la lecture.')),
      segments([['lent', 'Lent'], ['normal', 'Normal'], ['rapide', 'Rapide']], Reglages.lire('debit', 'normal'), (v) => Reglages.ecrire('debit', v))));
    carte.appendChild(h('div', { style: { marginTop: '8px' } },
      h('button', { type: 'button', class: 'bouton-discret', onclick: () => { if (!Voix.essayer()) Communs.toast('La lecture n’a pas pu démarrer.'); } }, icone('voix'), 'Essayer')));
    return carte;
  }

  function dessiner(zone) {
    const page = h('div', { class: 'page' });

    const carte = h('div', { class: 'carte' });
    carte.appendChild(h('p', { class: 'carte-titre' }, 'Apparence'));
    carte.appendChild(h('div', { class: 'option' }, h('div', null, h('div', { class: 'libelle' }, 'Thème'), h('div', { class: 'explication' }, 'Clair, sombre, ou comme le système.')),
      segments([['auto', 'Auto'], ['clair', 'Clair'], ['sombre', 'Sombre']], Reglages.lire('theme', 'auto'), (v) => { Reglages.ecrire('theme', v); Reglages.appliquerTheme(); })));
    carte.appendChild(h('div', { class: 'option' }, h('div', null, h('div', { class: 'libelle' }, 'Taille du texte'), h('div', { class: 'explication' }, 'Pour les articles.')),
      segments([['normal', 'Normale'], ['grand', 'Grande'], ['tres-grand', 'Très grande']], Reglages.lire('taille', 'normal'), (v) => { Reglages.ecrire('taille', v); Reglages.appliquerTheme(); })));
    page.appendChild(carte);

    if (Voix.possible) page.appendChild(carteVoix());

    const img = h('div', { class: 'carte' });
    img.appendChild(h('p', { class: 'carte-titre' }, 'Images hors ligne'));
    const etat = h('div', { class: 'explication' });
    const jauge = h('div', { class: 'jauge' }, h('div'));
    const bouton = h('button', { type: 'button', class: 'bouton-discret', onclick: () => Images.completer(true) }, icone('telecharger'), 'Tout télécharger');
    function montrer(e) {
      if (!e.possible) { etat.textContent = 'Ce navigateur ne garde pas d’images hors ligne.'; bouton.hidden = true; return; }
      etat.textContent = e.enCours ? 'Téléchargement : ' + e.fait + ' sur ' + e.total + '…' : (e.restantes ? e.fait + ' images sur ' + e.total + ' sont gardées hors ligne.' : 'Les ' + e.total + ' images sont gardées hors ligne.');
      jauge.firstChild.style.width = (e.total ? Math.round(100 * e.fait / e.total) : 0) + '%';
      bouton.hidden = e.enCours || !e.restantes;
    }
    Images.surChangement(montrer);
    montrer(Images.etat());
    img.appendChild(h('div', { class: 'option' }, h('div', { style: { flex: 1 } }, h('div', { class: 'libelle' }, 'Les images se rangent en arrière-plan'), etat, jauge)));
    img.appendChild(h('div', { class: 'option' }, h('div', null, h('div', { class: 'libelle' }, 'En arrière-plan'), h('div', { class: 'explication' }, 'Sans Wi-Fi, les images pèsent quelques dizaines de mégaoctets.')),
      segments([['auto', 'Oui'], ['non', 'Non']], Reglages.lire('imagesHorsLigne', 'auto'), (v) => { Reglages.ecrire('imagesHorsLigne', v); if (v === 'auto') Images.completer(); else Images.arreter(); })));
    img.appendChild(h('div', { style: { marginTop: '8px' } }, bouton));
    page.appendChild(img);

    const inst = h('div', { class: 'carte' });
    inst.appendChild(h('p', { class: 'carte-titre' }, 'Installer T+'));
    const zoneInst = h('div');
    Installer.dessinerInstallation(inst, zoneInst);
    inst.appendChild(zoneInst);
    page.appendChild(inst);

    const part = h('div', { class: 'carte' });
    part.appendChild(h('p', { class: 'carte-titre' }, 'Partager'));
    const zonePart = h('div');
    Installer.dessinerPartage(zonePart);
    part.appendChild(zonePart);
    page.appendChild(part);

    const ver = h('div', { class: 'carte' });
    ver.appendChild(h('p', { class: 'carte-titre' }, 'Version'));
    const texteVer = h('div', { class: 'explication' }, 'Version ' + (MiseAJour.version || document.querySelector('meta[name="application-version"]').content) + ' · données du ' + Donnees.version + ' · ' + Outils.pluriel(Donnees.articles.length, 'article') + '.');
    const bVer = h('button', { type: 'button', class: 'bouton-discret', onclick: async () => {
      bVer.disabled = true;
      const r = await MiseAJour.verifier(true);
      const messages = { prete: 'Une mise à jour est prête : touchez « Mettre à jour ».', 'en-cours': 'Une nouvelle version arrive…', 'a-jour': 'Vous avez la dernière version.', echec: 'Impossible de vérifier (pas de réseau ?).', 'sans-service-worker': 'Pas de service worker ici.' };
      Communs.toast(messages[r] || r);
      bVer.disabled = false;
    } }, 'Vérifier les mises à jour');
    ver.appendChild(h('div', { class: 'option' }, h('div', null, h('div', { class: 'libelle' }, 'T+'), texteVer), bVer));
    page.appendChild(ver);

    const apropos = h('div', { class: 'carte' });
    apropos.appendChild(h('p', { class: 'carte-titre' }, 'À propos'));
    apropos.appendChild(h('p', null, 'T+ raconte l’ordre du Temple, de sa fondation à Jérusalem vers 1119 à sa suppression en 1312 et au bûcher de 1314, puis ce que les siècles en ont fait : des articles sur les événements, les maîtres, les personnages, la règle et la vie des frères, les lieux d’Orient, de France et d’Europe, les autres ordres, les légendes et leurs sources ; une frise des maîtres avec les papes et les rois de leur temps ; une carte des commanderies, des châteaux et des batailles.'));
    apropos.appendChild(h('p', null, h('strong', null, 'Méthode.'), ' Les textes sont originaux. Ils ont été écrits d’après les travaux des historiens — Alain Demurger, Malcolm Barber, Helen Nicholson, Damien Carraz, Barbara Frale, Julien Théry, Xavier Hélary — et les sources médiévales éditées (la règle, les chroniques, les actes du procès), puis vérifiés date par date dans Wikipédia et dans les ouvrages accessibles en ligne. Chaque article dit ses sources ; quand les historiens hésitent, l’article le dit aussi. Les légendes sont racontées pour ce qu’elles sont : on dit d’où elles viennent et ce qu’elles valent.'));
    apropos.appendChild(h('p', null, h('strong', null, 'Images.'), ' Toutes viennent de Wikimedia Commons : œuvres du domaine public (sceaux, miniatures, gravures) ou photographies sous licence libre avec attribution (CC BY, CC BY-SA) ; l’auteur et la licence sont donnés sous chaque image et au bas de l’article. Le fond de carte vient de Natural Earth (domaine public).'));
    apropos.appendChild(h('p', null, h('strong', null, 'Limites.'), ' Les dates médiévales sont souvent approximatives ; les coordonnées des lieux disparus sont celles de la commune. Une erreur ? Écrivez à ', h('a', { class: 'renvoi', href: 'mailto:cristo67apps@gmail.com' }, 'cristo67apps@gmail.com'), '.'));
    apropos.appendChild(h('p', null, h('strong', null, 'Vie privée.'), ' L’application fonctionne hors ligne, sans compte, sans publicité ni mesure d’audience ; elle ne contacte aucun serveur en dehors de ses propres fichiers. La position, si vous la demandez sur la carte, reste dans l’appareil. La lecture à voix haute se sert des voix de l’appareil ; une voix marquée « en ligne », si elle est la seule voix d’homme ou si vous la choisissez, envoie le texte lu à l’éditeur du navigateur. ', h('a', { class: 'renvoi', href: 'confidentialite.html' }, 'Politique de confidentialité'), '.'));
    page.appendChild(apropos);

    zone.appendChild(page);
    return { titre: 'Réglages', sous: 'apparence, hors ligne, à propos', quitter: () => Voix.arreter() };
  }

  racine.VueReglages = { dessiner };

})(window);
