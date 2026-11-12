'use strict';
/*
 * La lecture à voix haute des articles, par la synthèse vocale de l'appareil
 * (speechSynthesis) : rien à télécharger, et cela marche hors ligne avec les
 * voix installées.
 *
 * La voix : un homme, en français de France. Le navigateur ne dit pas si une
 * voix est masculine ; on la reconnaît donc à son nom (Paul et Henri chez
 * Microsoft, Thomas chez Apple, les variantes « frb » et « frd » de Google sur
 * Android…). Les voix de l'appareil passent avant les voix « en ligne », qui
 * envoient le texte à leur éditeur. S'il n'y a aucune voix d'homme reconnue,
 * on prend une voix fr-FR et on la baisse d'un ton — et les réglages le
 * disent ; la personne peut alors choisir elle-même dans la liste.
 *
 * Le texte est lu morceau par morceau (un paragraphe, coupé en phrases s'il
 * est long) : les longues tirades s'interrompent toutes seules sur certains
 * navigateurs, et cela permet de suivre la lecture à l'écran. La pause est un
 * arrêt dont on se souvient : pause() et resume() ne marchent pas partout.
 */
(function (racine) {

  const synthese = racine.speechSynthesis || null;
  const possible = !!(synthese && racine.SpeechSynthesisUtterance);

  const HOMMES = /(^|[^a-zà-ÿ])(paul|henri|thomas|jacques|daniel|eddy|reed|rocko|grandpa|papy|alain|j[ée]r[ôo]me|r[ée]my|lucien|maurice|yves|mathieu|nicolas|guillaume|antoine|bernard|s[ée]bastien|olivier|pierre|claude|fabrice|homme|male|masculin|masculine)([^a-zà-ÿ]|$)|fr-fr-x-fr[bd]\b/i;
  const SOIGNEES = /natural|neural|premium|enhanced|am[ée]lior[ée]e|sup[ée]rieure/i;
  const DEBITS = { lent: 0.85, normal: 1, rapide: 1.2 };
  const GRAVE = 0.7;

  // ── Les voix ──────────────────────────────────────────────────────────────

  const langue = (v) => String(v.lang || '').replace('_', '-').toLowerCase();
  const estMasculine = (v) => HOMMES.test(v.name + ' ' + (v.voiceURI || ''));
  const enLigne = (v) => v.localService === false;

  /* Les voix françaises de France (à défaut, les autres voix françaises),
   * les voix d'homme d'abord, celles de l'appareil avant celles en ligne. */
  function voix() {
    if (!possible) return [];
    const toutes = synthese.getVoices() || [];
    let liste = toutes.filter((v) => langue(v) === 'fr-fr');
    if (!liste.length) liste = toutes.filter((v) => langue(v).startsWith('fr'));
    const rang = (v) => (estMasculine(v) ? 0 : 4) + (enLigne(v) ? 2 : 0) + (SOIGNEES.test(v.name) ? 0 : 1);
    return liste.slice().sort((a, b) => rang(a) - rang(b));
  }

  /* La voix retenue : celle des réglages si elle existe encore, sinon la
   * meilleure voix d'homme ; `grave` : voix baissée faute de voix d'homme. */
  function choisie() {
    const liste = voix();
    if (!liste.length) return { voix: null, masculine: false, grave: true, choix: false };
    const voulue = Reglages.lire('voix', '');
    const trouvee = voulue ? liste.find((v) => v.voiceURI === voulue) : null;
    if (trouvee) return { voix: trouvee, masculine: estMasculine(trouvee), grave: false, choix: true };
    const v = liste[0];
    return { voix: v, masculine: estMasculine(v), grave: !estMasculine(v), choix: false };
  }

  function surVoix(rappel) {
    if (possible && synthese.addEventListener) synthese.addEventListener('voiceschanged', rappel);
  }

  // ── Le texte ──────────────────────────────────────────────────────────────

  const ROMAINS = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  function arabe(r) {
    let n = 0;
    for (let i = 0; i < r.length; i++) {
      const a = ROMAINS[r[i]], b = ROMAINS[r[i + 1]] || 0;
      n += a < b ? -a : a;
    }
    return n;
  }

  /* Ce que l'œil lit sans peine et qu'une voix écorche : « v. 1129 », les
   * siècles et les rois en chiffres romains, « 1191 – 1291 ». */
  function preparer(texte) {
    return String(texte || '')
      .replace(/\b[I1]ᵉʳ/g, ' premier')
      .replace(/\b[I1]ʳᵉ/g, ' première')
      .replace(/\b([IVXLCDM]+)ᵉ/g, (m, r) => arabe(r) + 'e')
      .replace(/(\d)ᵉ/g, '$1e')
      .replace(/(\p{Lu}\p{Ll}+) ([IVX]{1,5})(?![\p{L}\d])/gu, (m, nom, r) => nom + ' ' + arabe(r))
      .replace(/\b[Vv]\. ?(?=\d)/g, 'vers ')
      .replace(/(\d)\s*[–—-]\s*(\d)/g, '$1 à $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Un texte en phrases, regroupées tant qu'elles tiennent dans la limite. */
  function phrases(texte, limite) {
    const max = limite || 220;
    if (texte.length <= max) return texte ? [texte] : [];
    const bouts = texte.match(/[^.!?…;:]+[.!?…;:]+["»”)\]]*\s*|[^.!?…;:]+$/g) || [texte];
    const sortie = [];
    let courant = '';
    for (const b of bouts) {
      if (courant && (courant + b).length > max) { sortie.push(courant.trim()); courant = ''; }
      courant += b;
    }
    if (courant.trim()) sortie.push(courant.trim());
    return sortie;
  }

  // ── La lecture ────────────────────────────────────────────────────────────

  let file = [];          // { texte, morceau } : les phrases, et l'indice du morceau d'où elles viennent
  let position = 0;
  let etat = 'arret';     // 'arret' | 'lecture' | 'pause'
  let tour = 0;           // change à chaque arrêt : les rappels des paroles annulées sont ignorés
  let rappels = {};
  let parole = null;      // gardée ici : certains navigateurs oublient une parole sans référence

  function changer(e) {
    etat = e;
    if (rappels.surEtat) rappels.surEtat(e);
  }

  function dire() {
    if (position >= file.length) { finir(); return; }
    const { voix: v, grave } = choisie();
    const element = file[position];
    const u = new racine.SpeechSynthesisUtterance(element.texte);
    u.lang = 'fr-FR';
    if (v) u.voice = v;
    u.rate = DEBITS[Reglages.lire('debit', 'normal')] || 1;
    u.pitch = grave ? GRAVE : 1;
    const mien = tour;
    u.onend = () => { if (mien !== tour) return; position++; dire(); };
    u.onerror = (e) => {
      if (mien !== tour) return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      finir(e && e.error ? e.error : 'erreur');
    };
    parole = u;
    if (rappels.surMorceau) rappels.surMorceau(element.morceau);
    synthese.speak(u);
  }

  function finir(erreur) {
    tour++;
    file = []; position = 0; parole = null;
    const r = rappels;
    changer('arret');
    rappels = {};
    if (r.surFin) r.surFin(erreur || null);
  }

  /* Lit une suite de textes. `options` : surMorceau(i), surEtat(etat), surFin(erreur). */
  function lire(morceaux, options) {
    if (!possible) return false;
    arreter();
    rappels = options || {};
    file = [];
    morceaux.forEach((t, i) => { for (const p of phrases(preparer(t))) file.push({ texte: p, morceau: i }); });
    position = 0;
    if (!file.length) { finir(); return false; }
    changer('lecture');
    // un souffle après cancel() : sans lui, la première parole se perd parfois
    const mien = tour;
    setTimeout(() => { if (mien === tour && etat === 'lecture') dire(); }, 80);
    return true;
  }

  function pause() {
    if (etat !== 'lecture') return;
    tour++;
    synthese.cancel();
    changer('pause');
  }

  function reprendre() {
    if (etat !== 'pause') return;
    changer('lecture');
    const mien = tour;
    setTimeout(() => { if (mien === tour && etat === 'lecture') dire(); }, 80);
  }

  function arreter() {
    if (!possible) return;
    const actif = etat !== 'arret';
    tour++;
    synthese.cancel();
    if (actif) finir();
  }

  /* Une phrase d'essai, pour les réglages. */
  function essayer() {
    return lire(['Le 13 octobre 1307, Philippe IV le Bel fait arrêter les Templiers du royaume de France.']);
  }

  if (possible) {
    synthese.cancel();          // une lecture restée en suspens après un rechargement
    synthese.getVoices();       // certains navigateurs ne chargent les voix qu'à la demande
    racine.addEventListener('pagehide', () => { tour++; synthese.cancel(); });
  }

  racine.Voix = {
    possible, voix, choisie, estMasculine, enLigne, surVoix,
    preparer, phrases, lire, pause, reprendre, arreter, essayer,
    get etat() { return etat; },
  };

})(window);
