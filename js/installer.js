'use strict';
/*
 * Installer l'application, et la partager.
 *
 * Une application web n'a pas de « version d'Android » : c'est le navigateur
 * qui, au moment de l'installation, fabrique pour elle une petite application
 * Android (un « WebAPK »). Tout dépend donc du navigateur :
 *
 *   Chrome            le WebAPK est fabriqué et signé par Google, pour une
 *                     version d'Android récente : Play Protect l'accepte.
 *   Samsung Internet  le WebAPK est fabriqué par le serveur de Samsung, qui
 *                     déclare une version d'Android ancienne (targetSdk trop
 *                     bas) : depuis Android 14, Play Protect le bloque —
 *                     « Appli non sécurisée bloquée… conçue pour une version
 *                     plus ancienne d'Android ». Défaut connu, non corrigé par
 *                     Samsung (SamsungInternet/support, ticket 123, 2026).
 *   iPhone (Safari)   pas d'APK : « Sur l'écran d'accueil ».
 *
 * D'où la règle : sur Samsung Internet, on ne déclenche JAMAIS l'installation
 * du navigateur ; on propose d'ouvrir T+ dans Chrome (lien d'intention
 * Android), ou, à défaut, un simple raccourci sur l'écran d'accueil.
 * Les autres navigateurs Android gardent leur invite, avec Chrome conseillé.
 *
 * Déjà installée, l'application n'affiche rien de tout cela.
 */
(function (racine) {

  const { h, icone } = Outils;
  const ADRESSE = 'https://cristo67000.github.io/t-plus/';
  const PLAY_CHROME = 'https://play.google.com/store/apps/details?id=com.android.chrome';

  let invite = null;
  const ecouteurs = new Set();   // { f, el } : el retiré de la page = écouteur oublié

  function estInstallee() {
    return racine.matchMedia('(display-mode: standalone)').matches
      || racine.matchMedia('(display-mode: fullscreen)').matches
      || racine.matchMedia('(display-mode: minimal-ui)').matches
      || racine.navigator.standalone === true;
  }

  function estApple() {
    const ua = racine.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && racine.navigator.maxTouchPoints > 1);
  }

  /* Le navigateur, pour l'installation : 'chrome', 'samsung', 'android' (un
   * autre navigateur Android), 'apple' ou 'autre' (ordinateur). */
  function navigateur() {
    const ua = racine.navigator.userAgent;
    if (estApple()) return 'apple';
    if (!/Android/i.test(ua)) return 'autre';
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/MiuiBrowser|HuaweiBrowser|HeyTapBrowser|OppoBrowser|VivoBrowser|UCBrowser|YaBrowser|OPR\/|Opera|EdgA|Firefox|DuckDuckGo|Brave|; wv\)/i.test(ua)) return 'android';
    return /Chrome\/\d/.test(ua) ? 'chrome' : 'android';
  }

  /* Un lien qui rouvre la page dans Chrome (intention Android) ; sans Chrome,
   * le Play Store propose de l'installer. */
  function lienChrome() {
    const schema = racine.location.protocol.replace(':', '');
    return 'intent://' + racine.location.host + racine.location.pathname
      + '#Intent;scheme=' + schema + ';package=com.android.chrome;S.browser_fallback_url='
      + encodeURIComponent(PLAY_CHROME) + ';end';
  }

  function prevenir() {
    for (const e of Array.from(ecouteurs)) {
      if (e.el && !e.el.isConnected) ecouteurs.delete(e); else e.f();
    }
  }

  racine.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // Samsung Internet : son installation est bloquée par Play Protect.
    if (navigateur() === 'samsung') { invite = null; return; }
    invite = e;
    prevenir();
  });
  racine.addEventListener('appinstalled', () => { invite = null; prevenir(); });

  function etapes(liste) {
    const ol = h('ol', { class: 'marche-a-suivre' });
    for (const t of liste) ol.appendChild(h('li', null, t));
    return ol;
  }

  /* Le contenu du bloc d'installation, selon le navigateur. Renvoie null s'il
   * n'y a rien à proposer. `compact` : pour la carte de l'accueil. */
  function contenu(compact) {
    if (estInstallee()) return null;
    const nav = navigateur();
    const boite = h('div', { class: 'installation' });
    if (nav === 'samsung') {
      boite.appendChild(h('p', null, h('strong', null, 'Installez T+ avec Chrome.'),
        ' Samsung Internet fabrique une version de l’appli prévue pour un Android ancien, que Google Play Protect bloque (« Appli non sécurisée bloquée »). Celle de Chrome est conforme.'));
      boite.appendChild(h('a', { class: 'bouton-principal', href: lienChrome() }, 'Ouvrir dans Chrome'));
      if (!compact) {
        boite.appendChild(h('p', { class: 'discret petit' }, 'Puis, dans Chrome : menu ⋮ › « Ajouter à l’écran d’accueil » › « Installer ».'));
        boite.appendChild(h('p', { class: 'discret petit' }, 'Sans Chrome : menu ≡ de Samsung Internet › « Ajouter la page à » › « Écran d’accueil ». Vous obtenez un simple raccourci, qui ouvre T+ dans le navigateur, sans installation ni blocage.'));
      }
      return boite;
    }
    if (invite) {
      if (!compact) boite.appendChild(h('p', { class: 'discret' }, 'Installée, l’application s’ouvre comme les autres depuis l’écran d’accueil et fonctionne sans réseau.'));
      const b = h('button', { type: 'button', class: 'bouton-principal', onclick: async () => {
        b.disabled = true;
        try {
          invite.prompt();
          const choix = await invite.userChoice;
          if (choix && choix.outcome === 'accepted') invite = null;
        } catch (e) {
          invite = null;
        }
        prevenir();
      } }, icone('telecharger'), 'Installer T+');
      boite.appendChild(b);
      if (nav === 'android' && !compact) boite.appendChild(h('p', { class: 'discret petit' }, 'Si Google Play Protect bloquait l’installation, ouvrez plutôt T+ dans Chrome : ', h('a', { class: 'renvoi', href: lienChrome() }, 'ouvrir dans Chrome'), '.'));
      return boite;
    }
    if (nav === 'apple') {
      boite.appendChild(etapes(['Touchez le bouton Partager de Safari (le carré et sa flèche).', 'Choisissez « Sur l’écran d’accueil ».', 'Confirmez avec « Ajouter ».']));
      return boite;
    }
    if (nav === 'chrome') {
      boite.appendChild(etapes(['Touchez le menu ⋮ de Chrome, en haut à droite.', 'Choisissez « Ajouter à l’écran d’accueil », puis « Installer ».']));
      return boite;
    }
    if (nav === 'android') {
      boite.appendChild(h('p', null, 'Pour installer T+, Chrome est conseillé : l’application qu’il fabrique est signée par Google et acceptée par Play Protect.'));
      boite.appendChild(h('a', { class: 'bouton-principal', href: lienChrome() }, 'Ouvrir dans Chrome'));
      return boite;
    }
    return null;
  }

  /* Pour les Réglages : `bloc` est masqué s'il n'y a rien à proposer. */
  function dessinerInstallation(bloc, zone) {
    zone.textContent = '';
    const c = contenu(false);
    bloc.hidden = !c;
    if (c) zone.appendChild(c);
  }

  /* La carte de l'accueil : seulement sur téléphone, refermable (elle revient
   * au bout d'un mois). */
  function carteAccueil() {
    const nav = navigateur();
    if (nav === 'autre' || estInstallee()) return null;
    const masquee = Reglages.lire('carteInstallation');
    if (masquee && Date.now() - masquee < 30 * 86400000) return null;
    const carte = h('div', { class: 'carte carte-installation' });
    function dessiner() {
      carte.textContent = '';
      const c = contenu(true);
      if (!c) { carte.hidden = true; return; }
      carte.hidden = false;
      carte.appendChild(h('div', { class: 'entete-installation' },
        h('span', { class: 'cachet' }, 'T+'),
        h('div', null, h('p', { class: 'carte-titre' }, 'Installer T+'), h('p', { class: 'discret petit' }, 'Sur l’écran d’accueil, hors ligne, comme une appli.')),
        h('button', { type: 'button', class: 'bouton-icone', 'aria-label': 'Masquer', onclick: () => { Reglages.ecrire('carteInstallation', Date.now()); carte.remove(); } }, icone('fermer'))));
      carte.appendChild(c);
    }
    dessiner();
    ecouteurs.add({ f: dessiner, el: carte });
    return carte;
  }

  function dessinerPartage(zone) {
    zone.textContent = '';
    const retour = h('p', { class: 'discret retour-partage', hidden: true });
    zone.appendChild(h('button', { type: 'button', class: 'bouton-discret', onclick: async () => {
      const donnees = { title: 'T+', text: 'T+ : l’histoire des Templiers en articles illustrés, la frise des maîtres, les cartes des commanderies et des châteaux, hors ligne et sans publicité.', url: ADRESSE };
      if (racine.navigator.share) {
        try { await racine.navigator.share(donnees); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const ok = await Outils.copier(ADRESSE);
      retour.textContent = ok ? 'Adresse copiée.' : ADRESSE;
      retour.hidden = false;
    } }, icone('partager'), 'Partager l’application'));
    zone.appendChild(h('p', { class: 'adresse-partage discret petit' }, ADRESSE));
    zone.appendChild(retour);
  }

  racine.Installer = {
    dessinerInstallation, dessinerPartage, carteAccueil, estInstallee, estApple, navigateur, lienChrome, ADRESSE,
    surChangement: (f, el) => { ecouteurs.add({ f, el }); },
  };

})(window);
