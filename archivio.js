/* Weekly Menu · archivio.js
   Memoria del telefono, unione delle modifiche e sincronizzazione con un repository GitHub privato.
   Il token resta solo nella memoria del telefono: non finisce mai nei file, nei log o nei messaggi. */
(function (root) {
'use strict';

const SCHEMA = 3;
const P = 'wm1:';
const RAMO = 'main';
const ATTESA = 10000;      /* calma dopo l'ultima modifica */
const ATTESA_MAX = 60000;  /* si invia comunque entro un minuto */
const TIMEOUT = 15000;

/* registro dei tipi di file: i tipi nuovi si aggiungono qui */
const TIPI = [
  { tipo: 'alimenti', re: /^alimenti\.json$/ },
  { tipo: 'obiettivi', re: /^obiettivi\.json$/ },
  { tipo: 'giornate', re: /^giornate\/\d{4}-\d{2}\.json$/ },
  { tipo: 'settimane', re: /^settimane\/\d{4}-\d{2}-\d{2}\.json$/ },
  { tipo: 'spesa', re: /^spesa\.json$/ },
  { tipo: 'foto', re: /^foto\/[a-z0-9-]{1,60}\.json$/ },
];
const isDato = (path) => TIPI.some((t) => t.re.test(path));

/* ---------- JSON canonico, confronto, impronte ---------- */
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function ordina(v) {
  if (Array.isArray(v)) return v.map(ordina);
  if (!isObj(v)) return v;
  const o = {};
  for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = ordina(v[k]);
  return o;
}
const canonico = (v) => JSON.stringify(ordina(v), null, 2) + '\n';
function uguale(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!uguale(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!uguale(a[k], b[k])) return false;
  return true;
}
const copia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const utf8 = (s) => new TextEncoder().encode(s);
/* l'impronta di git (SHA-1 del blob): uguale a quella che calcola GitHub */
async function impronta(testo) {
  const corpo = utf8(testo);
  const testa = utf8('blob ' + corpo.length + '\0');
  const tutto = new Uint8Array(testa.length + corpo.length);
  tutto.set(testa); tutto.set(corpo, testa.length);
  const d = new Uint8Array(await root.crypto.subtle.digest('SHA-1', tutto));
  let h = '';
  for (const b of d) h += b.toString(16).padStart(2, '0');
  return h;
}
function base64(testo) {
  const b = utf8(testo); let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return root.btoa(s);
}
function prendi(obj, path) {
  let o = obj;
  for (const k of path) { if (!isObj(o)) return undefined; o = o[k]; }
  return o;
}
function metti(obj, path, val) {
  if (!path.length) return val;
  const radice = isObj(obj) ? obj : {};
  let o = radice;
  for (let i = 0; i < path.length - 1; i++) { if (!isObj(o[path[i]])) o[path[i]] = {}; o = o[path[i]]; }
  const k = path[path.length - 1];
  if (val === undefined) delete o[k]; else o[k] = val;
  return radice;
}

/* ---------- unione a tre vie ----------
   base = ultima versione sincronizzata, local = telefono, remote = GitHub.
   Si scende negli oggetti voce per voce; regole.atomic(path) dice quali voci vanno confrontate intere
   (per esempio un alimento in un pasto, {cibo, g}); regole.baseFor(path) dà una base quando manca
   (per le giornate di prova). C'è conflitto solo se la stessa voce è cambiata in modo diverso sui due lati,
   o è stata cancellata da un lato e modificata dall'altro: in quel caso resta, per ora, la versione del telefono. */
function unisci(base, local, remote, regole, path, conflitti) {
  path = path || []; conflitti = conflitti || [];
  if (uguale(local, remote)) return local;
  if (uguale(local, base)) return remote;
  if (uguale(remote, base)) return local;
  const atomica = regole && regole.atomic && regole.atomic(path);
  if (!atomica && isObj(local) && isObj(remote)) {
    let b = base;
    if (!isObj(b)) b = (regole && regole.baseFor && regole.baseFor(path)) || {};
    const res = {};
    const chiavi = new Set([...Object.keys(b), ...Object.keys(local), ...Object.keys(remote)]);
    for (const k of chiavi) {
      const v = unisci(b[k], local[k], remote[k], regole, path.concat(k), conflitti);
      if (v !== undefined) res[k] = v;
    }
    return res;
  }
  conflitti.push({ path, remote: copia(remote) });
  return local;
}

/* ---------- errori, sempre senza il token ---------- */
class ErroreArchivio extends Error {
  constructor(tipo, messaggio, extra) { super(messaggio); this.tipo = tipo; if (extra) Object.assign(this, extra); }
}
const BREVE = {
  token: 'Token scaduto o non valido', permessi: 'Token senza permesso di scrittura', repo: 'Repository non trovato',
  limite: 'Troppe richieste', rete: 'GitHub non risponde', memoria: 'Memoria del telefono piena',
  conflitto: 'Riprovo tra poco', offline: 'In attesa di connessione', vuoto: 'Repository vuoto',
};

const LEGGIMI = '# Dati di Weekly Menu\n\n'
  + 'Questo repository contiene i dati dell’app Weekly Menu. Li scrive l’app da sola, a ogni salvataggio.\n'
  + 'Il piano della settimana si prepara fuori dall’app e si importa seguendo `FORMATO.md` del repository `weekly-menu`.\n\n'
  + '- `alimenti.json`: l’anagrafica. Per ogni alimento: `nome`, valori `per_100g` (kcal, proteine, carboidrati, grassi, fibre, in grammi),\n'
  + '  `porzione_g`, `confezione_g`, `reparto`, `codice_a_barre`, `fonte` e il link `foto`. Nel piano usa i nomi esattamente come qui.\n'
  + '- `obiettivi.json`: per tipo di giornata (`riposo`, `palestra`, `apnea`) calorie e macro come intervalli `min`–`max`.\n'
  + '  Dentro l’intervallo un valore è in obiettivo; fuori di poco (`vicino`: 5% per le calorie, 10% per i macro) va bene così.\n'
  + '- `giornate/AAAA-MM.json`: le giornate del mese, con tipo, serata impegnata, pasti, alternative e pasti già mangiati.\n'
  + '- `settimane/AAAA-MM-GG.json`: un file per ogni piano importato, con le sessioni di preparazione.\n'
  + '- `spesa.json`: le righe della lista della spesa.\n'
  + '- `foto/<alimento>.json`: la miniatura della foto di un alimento.\n\n'
  + 'Ogni file ha un numero `schema`: è la versione del formato. Puoi modificare questi file anche da qui:\n'
  + 'l’app riceve le modifiche alla riapertura.\n';
let improntaLeggimi = null;
const leggimiAttuale = async () => improntaLeggimi || (improntaLeggimi = await impronta(LEGGIMI));

/* ---------- archivio: un'istanza per dispositivo ---------- */
function crea(o) {
  const st = o.storage;
  const get = (k) => { try { return st.getItem(P + k); } catch (e) { return null; } };
  const set = (k, v) => st.setItem(P + k, v); /* può lanciare se la memoria è piena */
  const del = (k) => { try { st.removeItem(P + k); } catch (e) { /* niente da fare */ } };
  const getJ = (k, d) => { const t = get(k); if (t == null) return d; try { return JSON.parse(t); } catch (e) { return d; } };
  const setJ = (k, v) => set(k, JSON.stringify(v));
  const offline = () => !!(root.navigator && root.navigator.onLine === false);

  const cfg = () => Object.assign({ repo: 'cicchub/weekly-menu-dati', dispositivo: 'Telefono', scadenza: '' }, getJ('cfg', {}));
  const token = () => get('token') || '';
  const repo = () => cfg().repo;
  const nuovoS = () => ({ collegato: false, head: null, tree: null, files: {}, conflitti: {}, forza: [], note: [], ultimo: null, scelta: null, nuovi: [], leggimi: null });
  let S = Object.assign(nuovoS(), getJ('sync:' + repo(), {}));
  S.nuovi = []; /* li ricontrollo al primo giro: magari l'app nel frattempo è stata aggiornata */
  function salvaS() { try { setJ('sync:' + repo(), S); } catch (e) { /* lo stato si ricostruisce al giro successivo */ } }

  /* --- file locali --- */
  function elenco() {
    const out = [];
    for (let i = 0; i < st.length; i++) {
      const k = st.key(i);
      if (k && k.startsWith(P + 'file:')) { const p = k.slice(P.length + 5); if (isDato(p)) out.push(p); }
    }
    return out.sort();
  }
  const leggiTesto = (path) => get('file:' + path);
  function leggi(path) {
    const t = leggiTesto(path);
    if (t == null) return undefined;
    try { return JSON.parse(t); } catch (e) {
      /* file rovinato: lo metto da parte e lo riscarico da GitHub */
      try { set('corrotto:' + path, t); } catch (e2) { /* niente */ }
      del('file:' + path); S.files[path] = 'corrotto'; salvaS();
      return undefined;
    }
  }
  function scriviTesto(path, testo) {
    try { set('file:' + path, testo); } catch (e) { throw new ErroreArchivio('memoria', 'Memoria del telefono piena: non riesco a salvare'); }
  }
  const cancellaLocale = (path) => del('file:' + path);
  function scrivi(path, obj, nota) { scriviTesto(path, canonico(obj)); modificato(nota); }

  /* --- stato visibile --- */
  let inCorso = false, errore = null, sporco = elenco().length > 0;
  function stato() {
    const c = cfg();
    if (!token()) return { stato: 'locale', testo: 'Solo sul telefono' };
    const nConf = Object.values(S.conflitti).reduce((n, l) => n + l.length, 0);
    const base = { ultimo: S.ultimo, scadenza: c.scadenza, repo: c.repo };
    if (S.scelta) return Object.assign(base, { stato: 'scelta', testo: 'Da decidere' });
    if (S.nuovi.length) return Object.assign(base, { stato: 'aggiorna', testo: 'App da aggiornare' });
    if (inCorso) return Object.assign(base, { stato: 'invio', testo: 'Invio…' });
    if (errore && !(errore.tipo === 'offline' && !sporco)) {
      return Object.assign(base, { stato: errore.tipo === 'offline' ? 'offline' : 'errore', testo: BREVE[errore.tipo] || 'Errore', motivo: errore.message, tipo: errore.tipo, quando: errore.quando || null });
    }
    if (nConf) return Object.assign(base, { stato: 'conflitti', testo: 'Da risolvere (' + nConf + ')', n: nConf });
    if (sporco) return Object.assign(base, { stato: 'da-inviare', testo: 'Da inviare' });
    return Object.assign(base, { stato: 'salvato', testo: 'Salvato' });
  }
  const avvisa = () => { if (o.onStato) o.onStato(stato()); };

  /* --- richieste a GitHub --- */
  async function req(ctx, metodo, percorso, corpo, raw) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    let res;
    try {
      const headers = { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', Authorization: 'Bearer ' + ctx.token, 'X-GitHub-Api-Version': '2022-11-28' };
      if (corpo) headers['Content-Type'] = 'application/json';
      res = await root.fetch(o.api + percorso, { method: metodo, cache: 'no-cache', signal: ctrl.signal, headers, body: corpo ? JSON.stringify(corpo) : undefined });
    } catch (e) {
      throw offline() ? new ErroreArchivio('offline', 'Sei senza connessione: invio appena torna la rete') : new ErroreArchivio('rete', 'GitHub non risponde: riprovo tra poco');
    } finally { clearTimeout(t); }
    if (res.ok) return raw ? res.text() : res.json();
    let msg = '';
    try { const j = await res.json(); msg = String((j && j.message) || ''); } catch (e) { /* risposta senza testo */ }
    const resto = res.headers.get('x-ratelimit-remaining');
    const reset = Number(res.headers.get('x-ratelimit-reset')) || 0;
    const dopo = Number(res.headers.get('retry-after')) || 0;
    if (res.status === 401) throw new ErroreArchivio('token', 'Il token non è valido o è scaduto: incollane uno nuovo nelle Impostazioni');
    if (res.status === 429 || (res.status === 403 && (resto === '0' || dopo > 0 || /rate limit/i.test(msg)))) {
      const quando = dopo > 0 ? Date.now() + dopo * 1000 : reset ? reset * 1000 : Date.now() + 60000;
      throw new ErroreArchivio('limite', 'GitHub ha ricevuto troppe richieste: riprovo da solo', { quando });
    }
    if (res.status === 403) throw new ErroreArchivio('permessi', 'Il token non ha il permesso di scrivere su ' + ctx.repo + ': serve "Contents: Read and write"');
    if (res.status === 404) throw new ErroreArchivio('repo', 'Repository ' + ctx.repo + ' non trovato, oppure il token non ha accesso');
    if (res.status === 409 && /empty/i.test(msg)) throw new ErroreArchivio('vuoto', 'Il repository è vuoto');
    if (res.status === 409 || res.status === 422) throw new ErroreArchivio('conflitto', 'Il repository è cambiato nel frattempo', { codice: res.status });
    throw new ErroreArchivio('rete', 'GitHub ha risposto con un errore (' + res.status + '): riprovo tra poco');
  }
  const api = (metodo, percorso, corpo, raw) => req({ token: token(), repo: repo() }, metodo, '/repos/' + repo() + percorso, corpo, raw);
  async function leggiBlob(sha) { return JSON.parse(await api('GET', '/git/blobs/' + sha, null, true)); }
  async function leggiBlobOpz(sha) {
    try { return await leggiBlob(sha); } catch (e) { if (e.tipo === 'repo') return undefined; throw e; }
  }

  /* --- un giro di sincronizzazione --- */
  async function leggiRif() {
    let r;
    try { r = await api('GET', '/git/ref/heads/' + RAMO); } catch (e) { if (e.tipo === 'vuoto') return null; throw e; }
    const head = r.object.sha;
    if (head === S.head && S.tree) return { head, tree: S.tree };
    const c = await api('GET', '/git/commits/' + head);
    return { head, tree: c.tree.sha };
  }
  async function leggiAlbero(rif) {
    const a = await api('GET', '/git/trees/' + rif.tree + '?recursive=1');
    const remoti = {}; let leggimi = null;
    for (const e of a.tree || []) {
      if (e.type !== 'blob') continue;
      if (isDato(e.path)) remoti[e.path] = e.sha;
      if (e.path === 'LEGGIMI.md') leggimi = e.sha;
    }
    return { remoti, leggimi };
  }
  function registraConflitti(path, nuovi, R) {
    const lista = (S.conflitti[path] || []).map((c) => ({ path: c.path, remote: copia(prendi(R, c.path)) }));
    for (const c of nuovi) {
      const i = lista.findIndex((x) => x.path.join('\u0001') === c.path.join('\u0001'));
      if (i >= 0) lista[i] = c; else lista.push(c);
    }
    const L = leggi(path);
    const resto = lista.filter((c) => !uguale(c.path.length ? prendi(L, c.path) : L, c.remote));
    if (resto.length) S.conflitti[path] = resto; else delete S.conflitti[path];
  }
  async function scarica(rif) {
    const { remoti, leggimi } = await leggiAlbero(rif);
    S.leggimi = leggimi; /* l'impronta del LEGGIMI su GitHub: se il testo dell'app cambia, lo riscrivo */
    if (!S.collegato) return primoCollegamento(rif, remoti);
    const cambiati = [];
    for (const path of new Set([...Object.keys(remoti), ...Object.keys(S.files)])) {
      const rSha = remoti[path] || null; const bSha = S.files[path] || null;
      if (rSha === bSha) continue;
      const R = rSha ? await leggiBlob(rSha) : undefined;
      if (R && R.schema > SCHEMA) { if (!S.nuovi.includes(path)) S.nuovi.push(path); continue; }
      const B = bSha && bSha !== 'corrotto' ? await leggiBlobOpz(bSha) : undefined;
      /* da qui è tutto sincrono: nessuna modifica dall'interfaccia può infilarsi a metà */
      if (S.forza.includes(path)) { if (rSha) S.files[path] = rSha; else delete S.files[path]; continue; }
      const L = leggi(path);
      if (L === undefined) {
        if (R !== undefined) { scriviTesto(path, canonico(R)); S.files[path] = rSha; } else delete S.files[path];
        cambiati.push(path); continue;
      }
      const conf = [];
      const M = unisci(B, L, R, o.regole ? o.regole(path) : null, [], conf);
      if (M === undefined) cancellaLocale(path); else scriviTesto(path, canonico(M));
      if (rSha) S.files[path] = rSha; else delete S.files[path];
      registraConflitti(path, conf, R);
      cambiati.push(path);
    }
    S.head = rif.head; S.tree = rif.tree; salvaS();
    if (cambiati.length && o.onCambio) o.onCambio(cambiati);
  }
  async function primoCollegamento(rif, remoti) {
    const n = Object.keys(remoti).length;
    if (!n) {
      /* repository senza dati: invio quelli del telefono */
      Object.assign(S, { collegato: true, files: {}, head: rif.head, tree: rif.tree, note: ['primo salvataggio'] });
      salvaS(); sporco = true; return;
    }
    if (!(o.haDatiUtente && o.haDatiUtente())) {
      /* telefono nuovo: scarico tutto */
      const R = {};
      for (const [path, sha] of Object.entries(remoti)) R[path] = await leggiBlob(sha);
      for (const path of elenco()) if (!remoti[path]) cancellaLocale(path);
      for (const [path, v] of Object.entries(R)) scriviTesto(path, canonico(v));
      Object.assign(S, { collegato: true, files: Object.assign({}, remoti), head: rif.head, tree: rif.tree });
      salvaS();
      if (o.onCambio) o.onCambio(Object.keys(R));
      return;
    }
    S.scelta = { remoti: n, quando: new Date().toISOString() }; salvaS();
  }
  async function invia(rif) {
    const nuove = {};
    for (const path of elenco()) {
      if (S.conflitti[path] || S.nuovi.includes(path)) continue;
      const testo = leggiTesto(path); if (testo == null) continue;
      const sha = await impronta(testo);
      if (sha !== S.files[path]) nuove[path] = { testo, sha };
    }
    const percorsi = Object.keys(nuove);
    if (!percorsi.length) { sporco = false; return 'fatto'; }
    const voci = [];
    for (const path of percorsi) {
      const b = await api('POST', '/git/blobs', { content: base64(nuove[path].testo), encoding: 'base64' });
      voci.push({ path, mode: '100644', type: 'blob', sha: b.sha });
    }
    if (S.leggimi !== (await leggimiAttuale())) {
      const b = await api('POST', '/git/blobs', { content: base64(LEGGIMI), encoding: 'base64' });
      voci.push({ path: 'LEGGIMI.md', mode: '100644', type: 'blob', sha: b.sha });
    }
    const albero = await api('POST', '/git/trees', { base_tree: rif.tree, tree: voci });
    let messaggio = cfg().dispositivo + ': ' + (S.note.length ? S.note.join(', ') : percorsi.join(', '));
    if (messaggio.length > 120) messaggio = messaggio.slice(0, 117) + '…';
    const commit = await api('POST', '/git/commits', { message: messaggio, tree: albero.sha, parents: [rif.head] });
    try { await api('PATCH', '/git/refs/heads/' + RAMO, { sha: commit.sha, force: false }); } catch (e) {
      if (e.tipo === 'conflitto') return 'conflitto';
      throw e;
    }
    for (const path of percorsi) S.files[path] = nuove[path].sha;
    Object.assign(S, { head: commit.sha, tree: albero.sha, note: [], forza: [], leggimi: await leggimiAttuale(), ultimo: new Date().toISOString() });
    salvaS();
    sporco = await daInviare();
    return 'fatto';
  }
  async function daInviare() {
    for (const path of elenco()) {
      if (S.conflitti[path] || S.nuovi.includes(path)) continue;
      const testo = leggiTesto(path);
      if (testo != null && (await impronta(testo)) !== S.files[path]) return true;
    }
    return false;
  }
  async function giro() {
    for (let tentativo = 0; tentativo < 4; tentativo++) {
      let rif = await leggiRif();
      if (!rif) {
        await api('PUT', '/contents/LEGGIMI.md', { message: cfg().dispositivo + ': preparo il repository', content: base64(LEGGIMI) });
        rif = await leggiRif();
        if (!rif) throw new ErroreArchivio('rete', 'Non riesco a preparare il repository: riprovo tra poco');
      }
      if (S.scelta) return;
      const daRiscaricare = Object.values(S.files).includes('corrotto');
      if (rif.head !== S.head || !S.collegato || daRiscaricare) {
        if (occupato) { inAttesa = true; return; } /* un pannello è aperto: scarico quando lo chiudi */
        await scarica(rif);
        if (S.scelta) return;
      }
      if ((await invia(rif)) === 'fatto') return;
    }
    throw new ErroreArchivio('conflitto', 'Il repository continua a cambiare: riprovo tra poco');
  }

  /* --- quando sincronizzare --- */
  let timer = null, prima = 0, ancora = false, occupato = false, inAttesa = false, ritardo = 0, timerRitento = null;
  function modificato(nota) {
    if (nota && !S.note.includes(nota)) { S.note.push(nota); if (S.note.length > 10) S.note = S.note.slice(-10); salvaS(); }
    sporco = true;
    if (token()) {
      const ora = Date.now(); if (!prima) prima = ora;
      clearTimeout(timer);
      timer = setTimeout(() => adesso('modifica'), Math.max(0, Math.min(ATTESA, prima + ATTESA_MAX - ora)));
    }
    avvisa();
  }
  function conBlocco(fn) {
    const L = root.navigator && root.navigator.locks;
    return L && L.request ? L.request('wm1-sync', fn) : fn();
  }
  function pianifica(e) {
    clearTimeout(timerRitento); timerRitento = null;
    let ms = null;
    if (e.tipo === 'limite') ms = Math.max(5000, (e.quando || Date.now() + 60000) - Date.now());
    else if (e.tipo === 'rete' || e.tipo === 'conflitto') { ritardo = Math.min(300000, ritardo ? ritardo * 2 : 30000); ms = ritardo; }
    else if (e.tipo === 'offline') ms = 120000;
    if (ms != null) timerRitento = setTimeout(() => adesso('ritento'), ms);
  }
  async function adesso() {
    clearTimeout(timer); timer = null; prima = 0;
    if (!token()) { avvisa(); return; }
    if (inCorso) { ancora = true; return; }
    if (offline()) { errore = new ErroreArchivio('offline', 'Sei senza connessione: invio appena torna la rete'); avvisa(); return; }
    inCorso = true; avvisa();
    try {
      await conBlocco(giro);
      errore = null; ritardo = 0;
    } catch (e) {
      errore = e instanceof ErroreArchivio ? e : new ErroreArchivio('rete', 'Errore imprevisto durante il salvataggio: riprovo tra poco');
      pianifica(errore);
    } finally {
      inCorso = false; avvisa();
      if (ancora) { ancora = false; adesso(); }
    }
  }

  /* --- collegamento --- */
  async function verifica(repoV, tokenV) {
    const ctx = { repo: repoV, token: tokenV || token() }; /* senza token nuovo uso quello salvato, senza mai mostrarlo */
    await req(ctx, 'GET', '/repos/' + repoV);
    try {
      await req(ctx, 'POST', '/repos/' + repoV + '/git/blobs', { content: 'Prova di scrittura di Weekly Menu', encoding: 'utf-8' });
      return { ok: true, nota: 'Il token è valido, vede il repository e può scriverci.' };
    } catch (e) {
      if (e.tipo === 'vuoto') return { ok: true, nota: 'Il token è valido. Il repository è vuoto: lo preparo al primo salvataggio.' };
      throw e;
    }
  }
  function impostaConfig(c) { const n = Object.assign(cfg(), c); try { setJ('cfg', n); } catch (e) { /* niente */ } avvisa(); return n; }
  function collega(repoV, tokenV, extra) {
    impostaConfig(Object.assign({}, extra || {}, { repo: repoV }));
    try { set('token', tokenV); } catch (e) { throw new ErroreArchivio('memoria', 'Memoria del telefono piena'); }
    S = Object.assign(nuovoS(), getJ('sync:' + repoV, {}));
    errore = null; sporco = true;
    return adesso();
  }
  function scollega() {
    del('token'); del('sync:' + repo());
    S = nuovoS(); errore = null;
    clearTimeout(timer); clearTimeout(timerRitento);
    avvisa();
  }
  async function scegli(cosa) {
    if (!S.scelta) return;
    salvaCopiaAuto();
    const rif = await leggiRif();
    const { remoti } = await leggiAlbero(rif);
    const cambiati = [];
    if (cosa === 'github') {
      const R = {};
      for (const [path, sha] of Object.entries(remoti)) R[path] = await leggiBlob(sha);
      for (const path of elenco()) if (!remoti[path]) { cancellaLocale(path); cambiati.push(path); }
      for (const [path, v] of Object.entries(R)) { scriviTesto(path, canonico(v)); cambiati.push(path); }
      S.files = Object.assign({}, remoti);
    } else if (cosa === 'telefono') {
      S.files = Object.assign({}, remoti); S.forza = elenco();
    } else {
      const R = {};
      for (const [path, sha] of Object.entries(remoti)) R[path] = await leggiBlob(sha);
      for (const path of new Set([...Object.keys(R), ...elenco()])) {
        const L = leggi(path);
        if (L === undefined) { scriviTesto(path, canonico(R[path])); cambiati.push(path); continue; }
        if (R[path] === undefined) continue;
        const conf = [];
        scriviTesto(path, canonico(unisci(undefined, L, R[path], o.regole ? o.regole(path) : null, [], conf)));
        registraConflitti(path, conf, R[path]);
        cambiati.push(path);
      }
      S.files = Object.assign({}, remoti);
    }
    Object.assign(S, { collegato: true, scelta: null, head: rif.head, tree: rif.tree, note: ['primo collegamento'] });
    salvaS(); sporco = true;
    if (cambiati.length && o.onCambio) o.onCambio(cambiati);
    return adesso();
  }

  /* --- conflitti --- */
  function conflitti() {
    const out = [];
    for (const [file, lista] of Object.entries(S.conflitti)) {
      const L = leggi(file);
      lista.forEach((c, i) => out.push({ file, i, path: c.path, local: copia(c.path.length ? prendi(L, c.path) : L), remote: copia(c.remote) }));
    }
    return out;
  }
  function risolvi(file, i, scelta) {
    const lista = S.conflitti[file]; if (!lista || !lista[i]) return;
    const c = lista[i];
    if (scelta === 'github') {
      if (!c.path.length) { if (c.remote === undefined) cancellaLocale(file); else scriviTesto(file, canonico(c.remote)); }
      else scriviTesto(file, canonico(metti(leggi(file), c.path, copia(c.remote))));
    }
    lista.splice(i, 1);
    if (!lista.length) delete S.conflitti[file];
    salvaS();
    if (o.onCambio) o.onCambio([file]);
    modificato('conflitto risolto');
  }

  /* --- copie dei dati --- */
  function creaCopia() {
    const file = {};
    for (const path of elenco()) { const v = leggi(path); if (v !== undefined) file[path] = v; }
    return { app: 'weekly-menu', tipo: 'copia-dati', schema: SCHEMA, creata: new Date().toISOString(), dispositivo: cfg().dispositivo, file };
  }
  function salvaCopiaAuto() { try { setJ('copia-auto', creaCopia()); } catch (e) { /* memoria piena: si va avanti */ } }
  function controllaCopia(c) {
    if (!isObj(c) || c.app !== 'weekly-menu' || c.tipo !== 'copia-dati' || !isObj(c.file)) throw new ErroreArchivio('copia', 'Questo file non è una copia dei dati di Weekly Menu');
    if (c.schema > SCHEMA) throw new ErroreArchivio('copia', 'La copia viene da una versione più nuova dell’app: aggiorna prima l’app');
    const percorsi = Object.keys(c.file).filter(isDato);
    if (!percorsi.length) throw new ErroreArchivio('copia', 'La copia non contiene dati');
    return percorsi;
  }
  function ripristina(c) {
    const percorsi = controllaCopia(c);
    for (const path of percorsi) scriviTesto(path, canonico(c.file[path]));
    S.forza = Array.from(new Set(S.forza.concat(percorsi)));
    for (const path of percorsi) delete S.conflitti[path];
    salvaS();
    if (o.onCambio) o.onCambio(percorsi);
    modificato('ripristino da copia');
    return percorsi.length;
  }

  /* all'avvio: controllo in silenzio se c'è qualcosa da inviare */
  daInviare().then((x) => { sporco = x; avvisa(); }, () => {});

  return {
    leggi, scrivi, elenco,
    config: () => { const c = cfg(); return { repo: c.repo, dispositivo: c.dispositivo, scadenza: c.scadenza, collegato: !!token() }; },
    impostaConfig, haToken: () => !!token(), verifica, collega, scollega,
    modificato, adesso, occupato: (b) => { occupato = !!b; if (!b && inAttesa) { inAttesa = false; adesso(); } },
    stato, conflitti, risolvi, scelta: () => S.scelta, scegli,
    creaCopia, copiaAuto: () => getJ('copia-auto', null), copiaDiSicurezza: salvaCopiaAuto, controllaCopia, ripristina,
    ferma: () => { clearTimeout(timer); clearTimeout(timerRitento); },
  };
}

const Archivio = { SCHEMA, TIPI, isDato, canonico, uguale, impronta, unisci, prendi, metti, crea, ErroreArchivio };
root.Archivio = Archivio;
if (typeof module !== 'undefined' && module.exports) module.exports = Archivio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
