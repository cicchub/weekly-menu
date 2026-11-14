/* Weekly Menu · app.js
   L'interfaccia. Tutti i dati passano da archivio.js: ogni modifica si salva subito sul telefono
   e, se GitHub è collegato, parte verso il repository privato dei dati. */
(() => {
'use strict';

/* ---------- valori di partenza (dati di esempio, inventati) ---------- */
const MACROS = [
  { key: 'kcal', head: 'kcal', name: 'Calorie', long: 'kcal', w: 2 },
  { key: 'p', head: 'Proteine', name: 'Proteine', long: 'g di proteine', w: 1.6 },
  { key: 'c', head: 'Carbo', name: 'Carboidrati', long: 'g di carboidrati', w: 1 },
  { key: 'f', head: 'Grassi', name: 'Grassi', long: 'g di grassi', w: 1 },
  { key: 'fib', head: 'Fibre', name: 'Fibre', long: 'g di fibre', w: 0.2 },
];
const MK = Object.fromEntries(MACROS.map((m) => [m.key, m]));
const CORE = MACROS.slice(0, 4);

/* obiettivi di una giornata di riposo; le attività aggiungono calorie sotto forma di carboidrati.
   Le calorie orarie sono stime indicative: si possono tarare in obiettivi.json */
const OBIETTIVI_INIZIALI = {
  schema: 1,
  base: { kcal: 2400, proteine: 145, carboidrati: 265, grassi: 80, fibre: 30 },
  tolleranza: { kcal: 0.04, macro: 0.08 },
  attivita: {
    palestra: { nome: 'Palestra', ico: '🏋️', kcalOra: 300, ordine: 1 },
    apnea: { nome: 'Apnea', ico: '🤿', kcalOra: 160, ordine: 2 },
    corsa: { nome: 'Corsa', ico: '🏃', kcalOra: 600, ordine: 3 },
    bici: { nome: 'Bici', ico: '🚴', kcalOra: 450, ordine: 4 },
    nuoto: { nome: 'Nuoto', ico: '🏊', kcalOra: 450, ordine: 5 },
    camminata: { nome: 'Camminata', ico: '🚶', kcalOra: 200, ordine: 6 },
    trekking: { nome: 'Trekking', ico: '🥾', kcalOra: 380, ordine: 7 },
    padel: { nome: 'Padel e tennis', ico: '🎾', kcalOra: 420, ordine: 8 },
    calcetto: { nome: 'Calcetto', ico: '⚽', kcalOra: 500, ordine: 9 },
    funzionale: { nome: 'Funzionale', ico: '🤸', kcalOra: 450, ordine: 10 },
    yoga: { nome: 'Yoga e pilates', ico: '🧘', kcalOra: 150, ordine: 11 },
    surf: { nome: 'Surf e SUP', ico: '🏄', kcalOra: 300, ordine: 12 },
  },
};
const AL = (nome, ico, categoria, momento, kcal, proteine, carboidrati, grassi, fibre, porzione, parole, unita) =>
  Object.assign({ nome, ico, categoria, momento, kcal, proteine, carboidrati, grassi, fibre, porzione, parole }, unita ? { unita } : {});
const ALIMENTI_INIZIALI = {
  schema: 1,
  alimenti: {
    yogurt: AL('Yogurt greco 0%', '🥛', 'proteine', 'spuntino', 57, 10, 4, 0.2, 0, 170, ['yogurt'], 170),
    avena: AL('Fiocchi d’avena', '🥣', 'carboidrati', 'spuntino', 372, 13.5, 58.7, 7, 10, 50, ['avena', 'fiocchi d avena', 'fiocchi di avena']),
    banana: AL('Banana', '🍌', 'frutta', 'spuntino', 89, 1.1, 20, 0.3, 2.6, 120, ['banana', 'banane'], 120),
    mela: AL('Mela', '🍎', 'frutta', 'spuntino', 52, 0.3, 11.4, 0.2, 2.4, 180, ['mela', 'mele'], 180),
    mandorle: AL('Mandorle', '🥜', 'grassi', 'spuntino', 603, 22, 4.6, 55.3, 12.7, 25, ['mandorle', 'mandorla']),
    uova: AL('Uova', '🥚', 'proteine', 'pasto', 140, 12.5, 0.6, 9.7, 0, 120, ['uova', 'uovo'], 60),
    pane: AL('Pane integrale', '🍞', 'carboidrati', 'spuntino', 240, 9, 42, 3, 6.5, 60, ['pane', 'fetta', 'fette'], 40),
    piadina: AL('Piadina integrale', '🫓', 'carboidrati', 'spuntino', 290, 9, 48, 6, 5, 80, ['piadina', 'piadine'], 80),
    fiocchi: AL('Fiocchi di latte', '🧀', 'proteine', 'spuntino', 97, 11, 3, 4.5, 0, 150, ['fiocchi di latte', 'fiocchi']),
    tonno: AL('Tonno al naturale', '🥫', 'proteine', 'pasto', 103, 24, 0, 0.8, 0, 80, ['tonno'], 80),
    riso: AL('Riso basmati', '🍚', 'carboidrati', 'pasto', 350, 8, 77, 0.8, 1.5, 90, ['riso', 'basmati']),
    pasta: AL('Pasta di semola', '🍝', 'carboidrati', 'pasto', 356, 12.5, 72, 1.5, 3, 100, ['pasta', 'spaghetti', 'penne']),
    patate: AL('Patate', '🥔', 'carboidrati', 'pasto', 80, 2, 17, 0.1, 1.8, 300, ['patate', 'patata']),
    pollo: AL('Petto di pollo', '🍗', 'proteine', 'pasto', 108, 23, 0, 1.5, 0, 180, ['pollo']),
    manzo: AL('Macinato di manzo magro', '🥩', 'proteine', 'pasto', 137, 21, 0, 5.5, 0, 150, ['manzo', 'macinato', 'hamburger']),
    salmone: AL('Salmone', '🐟', 'proteine', 'pasto', 185, 20, 0, 12, 0, 150, ['salmone']),
    ceci: AL('Ceci cotti', '🫘', 'proteine', 'pasto', 120, 7, 14, 2.5, 6, 150, ['ceci']),
    zucchine: AL('Zucchine', '🥒', 'verdura', 'pasto', 17, 1.3, 1.4, 0.1, 1.2, 200, ['zucchine', 'zucchina']),
    olio: AL('Olio extravergine d’oliva', '🫒', 'grassi', 'pasto', 899, 0, 0, 99.9, 0, 10, ['olio']),
  },
};
const SHORT = { yogurt: 'Yogurt', avena: 'Avena', pollo: 'Pollo', olio: 'Olio', pane: 'Pane', tonno: 'Tonno', riso: 'Riso', uova: 'Uova', banana: 'Banana' };
const OFTEN = ['uova', 'yogurt', 'riso', 'pollo', 'pane', 'banana', 'tonno', 'olio'];
const DURATIONS = [30, 45, 60, 90, 120];

/* i cinque pasti di sempre, più quelli che aggiungi tu */
const BASE_MEALS = [
  { id: 'colazione', name: 'Colazione', ico: '☕', time: '08:00', a: 'a colazione', da: 'dalla colazione' },
  { id: 'spuntino_mattina', name: 'Spuntino mattina', ico: '🍏', time: '10:30', a: 'allo spuntino del mattino', da: 'dallo spuntino del mattino' },
  { id: 'pranzo', name: 'Pranzo', ico: '🍽️', time: '13:00', a: 'a pranzo', da: 'dal pranzo' },
  { id: 'spuntino_pomeriggio', name: 'Spuntino pomeriggio', ico: '🥜', time: '16:30', a: 'allo spuntino del pomeriggio', da: 'dallo spuntino del pomeriggio' },
  { id: 'cena', name: 'Cena', ico: '🌙', time: '20:00', a: 'a cena', da: 'dalla cena' },
];
const BASE_BY_ID = Object.fromEntries(BASE_MEALS.map((b) => [b.id, b]));
const EXTRA_MEALS = [
  { name: 'Pre-allenamento', ico: '⚡', time: '17:30' },
  { name: 'Post-allenamento', ico: '💪', time: '19:00' },
  { name: 'Spuntino serale', ico: '🍵', time: '22:00' },
];
const SNACK_MEALS = ['spuntino_mattina', 'spuntino_pomeriggio'];
const MAIN_MEALS = ['pranzo', 'cena'];

/* menu di prova: uno per giornate intense, uno per giornate leggere e uno per il riposo, in due varianti */
const TEMPLATES = {
  alto: [
    { colazione: [['yogurt', 250], ['avena', 60], ['banana', 120]], spuntino_mattina: [['mela', 180], ['mandorle', 15]], pranzo: [['riso', 110], ['pollo', 200], ['zucchine', 200], ['olio', 15]], spuntino_pomeriggio: [['pane', 80], ['tonno', 80]], cena: [['pasta', 100], ['salmone', 160], ['olio', 10]] },
    { colazione: [['uova', 120], ['pane', 80], ['banana', 120]], spuntino_mattina: [['yogurt', 170], ['mandorle', 20]], pranzo: [['pasta', 110], ['manzo', 160], ['zucchine', 200], ['olio', 10]], spuntino_pomeriggio: [['piadina', 80], ['fiocchi', 100]], cena: [['patate', 350], ['pollo', 200], ['olio', 15]] },
  ],
  medio: [
    { colazione: [['yogurt', 250], ['avena', 60], ['mela', 180]], spuntino_mattina: [['mandorle', 20]], pranzo: [['riso', 100], ['salmone', 150], ['zucchine', 200], ['olio', 10]], spuntino_pomeriggio: [['piadina', 80], ['fiocchi', 120]], cena: [['pasta', 90], ['ceci', 150], ['tonno', 80], ['olio', 10]] },
    { colazione: [['uova', 120], ['pane', 80], ['mela', 180]], spuntino_mattina: [['yogurt', 170], ['mandorle', 20]], pranzo: [['pasta', 100], ['pollo', 180], ['zucchine', 200], ['olio', 10]], spuntino_pomeriggio: [['banana', 120]], cena: [['riso', 90], ['manzo', 150], ['zucchine', 200], ['olio', 10]] },
  ],
  basso: [
    { colazione: [['uova', 120], ['pane', 60], ['banana', 120]], spuntino_mattina: [['mela', 180]], pranzo: [['pasta', 90], ['tonno', 120], ['zucchine', 200], ['olio', 10]], spuntino_pomeriggio: [['yogurt', 170], ['mandorle', 25]], cena: [['pollo', 180], ['riso', 70], ['zucchine', 200], ['olio', 10]] },
    { colazione: [['yogurt', 250], ['avena', 50], ['mela', 180]], spuntino_mattina: [['mandorle', 20]], pranzo: [['riso', 90], ['manzo', 150], ['zucchine', 200], ['olio', 10]], spuntino_pomeriggio: [['fiocchi', 150], ['pane', 60]], cena: [['salmone', 150], ['patate', 300], ['olio', 10]] },
  ],
};
const DEFAULT_PLAN = [[['palestra', 60]], [['apnea', 60]], [['palestra', 60]], [], [['palestra', 60]], [['camminata', 60]], []];

/* ---------- utilità ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clona = (v) => JSON.parse(JSON.stringify(v));
let seq = 0;
/* id ordinabili nel tempo: le aggiunte restano in coda anche dopo il salvataggio */
const nuovoId = (p) => (p || 'b') + Date.now().toString(36) + (seq++ % 1296).toString(36).padStart(2, '0');
const fmt0 = (n) => Math.round(n).toLocaleString('it-IT');
const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('it-IT', { maximumFractionDigits: 1 });
const fmtG = (n) => (Math.abs(n) < 10 ? fmt1(n) : fmt0(n));
const fmtM = (m, n) => (m.key === 'kcal' ? fmt0(n) : fmtG(n));
const unitOf = (m) => (m.key === 'kcal' ? ' kcal' : ' g');
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt0(Math.abs(n));
const pctTxt = (a, b) => (b > 0 ? Math.round(a / b * 100) : 0) + '%';
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const andJoin = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : a[0]);
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function h(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'value') n.value = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}
const emo = (e) => h('span', { class: 'emo', 'aria-hidden': 'true', text: e });
const ICONS = {
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', chev: 'M9 6l6 6-6 6', check: 'M5 12.5l4.5 4.5L19 7.5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': name === 'gear' ? '2' : '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
  for (const d of ICONS[name].split('|')) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); svg.append(p); }
  return svg;
}
let timerAvviso = null;
function avviso(msg) {
  const a = $('#avviso'); a.textContent = msg; a.hidden = false;
  clearTimeout(timerAvviso); timerAvviso = setTimeout(() => { a.hidden = true; }, 5000);
}

/* ---------- date (sempre locali, mai in UTC) ---------- */
const keyOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const shiftKey = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
const todayKey = () => keyOf(new Date());
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const weekdayName = (k) => cap(new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(dateOf(k)));
const dayMonth = (k) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(dateOf(k));
const giornoBreve = (k) => cap(new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(dateOf(k)));
const ddmm = (k) => k.slice(8, 10) + '/' + k.slice(5, 7);
function mondayOf(k) { const d = dateOf(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return keyOf(d); }
function dayTitle(k) { const t = todayKey(); return k === t ? 'Oggi' : k === shiftKey(t, 1) ? 'Domani' : k === shiftKey(t, -1) ? 'Ieri' : weekdayName(k); }
function quandoBreve(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return keyOf(d) === todayKey() ? 'oggi alle ' + ora : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' alle ' + ora;
}

/* ---------- memoria del telefono e archivio ---------- */
function memoriaTelefono() {
  try { const s = window.localStorage; s.setItem('wm1:prova', '1'); s.removeItem('wm1:prova'); return s; } catch (e) {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
  }
}
const memoria = memoriaTelefono();
function apiBase() {
  const h0 = location.hostname;
  if (h0 === 'localhost' || h0 === '127.0.0.1') { const v = memoria.getItem('wm1:api-prova'); if (v) return v; } /* solo per le prove in locale */
  return 'https://api.github.com';
}
const db = { alimenti: null, obiettivi: null, mesi: {}, spesa: null };
const demo = {};
let sheetTipo = null, sheetDraw = null, ricaricaDopo = false;

/* regole di unione per le giornate: un alimento in un pasto e un'attività si confrontano interi;
   per una giornata che manca nella base si usa la giornata di prova, uguale su ogni telefono */
function regole(path) {
  if (!/^giornate\//.test(path)) return null;
  return {
    atomic: (x) => (x.length === 6 && x[2] === 'pasti' && x[4] === 'alimenti') || (x.length === 4 && x[2] === 'attivita'),
    baseFor: (x) => (x.length === 2 && x[0] === 'giornate' && /^\d{4}-\d{2}-\d{2}$/.test(x[1]) ? demoDay(x[1]) : undefined),
  };
}
function haDatiUtente() {
  if (Object.values(db.mesi).some((m) => Object.keys(m.giornate).length)) return true;
  if (Object.values(db.spesa.settimane).some((w) => isObj(w) && Object.values(w).some(Boolean))) return true;
  return !Archivio.uguale(db.alimenti, ALIMENTI_INIZIALI) || !Archivio.uguale(db.obiettivi, OBIETTIVI_INIZIALI);
}
const arch = Archivio.crea({
  storage: memoria, api: apiBase(), regole, haDatiUtente,
  onCambio: () => {
    if (sheetTipo === 'modifica') { ricaricaDopo = true; return; }
    carica(); render(); if (sheetDraw) sheetDraw();
  },
  onStato: (s) => mostraStato(s),
});
function salvaFile(path, obj, nota) {
  try { arch.scrivi(path, obj, nota); return true; } catch (e) { avviso(e.message || 'Non riesco a salvare sul telefono'); return false; }
}

/* dati in uso, ricavati dai file */
let FOODS = {}, BASE_TARGET = {}, TOL = { kcal: 0.04, macro: 0.08 }, ACTIVITIES = [], ACT = {};
const SCONOSCIUTO = { name: 'Alimento sconosciuto', ico: '❔', cat: 'altro', slot: 'pasto', kcal: 0, p: 0, c: 0, f: 0, fib: 0, portion: 100, kw: [], unit: null, attivo: false };
const cibo = (id) => FOODS[id] || SCONOSCIUTO;
function deriva() {
  FOODS = {};
  for (const [id, r] of Object.entries(db.alimenti.alimenti)) {
    if (!isObj(r)) continue;
    FOODS[id] = { name: String(r.nome || id), ico: r.ico || '🍽️', cat: r.categoria || 'altro', slot: r.momento === 'spuntino' ? 'spuntino' : 'pasto', kcal: +r.kcal || 0, p: +r.proteine || 0, c: +r.carboidrati || 0, f: +r.grassi || 0, fib: +r.fibre || 0, portion: +r.porzione || 100, kw: Array.isArray(r.parole) ? r.parole.map(String) : [], unit: +r.unita || null, attivo: r.attivo !== false };
  }
  const ob = db.obiettivi; const b = isObj(ob.base) ? ob.base : {}; const b0 = OBIETTIVI_INIZIALI.base; const t = isObj(ob.tolleranza) ? ob.tolleranza : {};
  BASE_TARGET = { kcal: +b.kcal || b0.kcal, p: +b.proteine || b0.proteine, c: +b.carboidrati || b0.carboidrati, f: +b.grassi || b0.grassi, fib: +b.fibre || b0.fibre };
  TOL = { kcal: +t.kcal || 0.04, macro: +t.macro || 0.08 };
  ACTIVITIES = Object.entries(isObj(ob.attivita) ? ob.attivita : {}).filter(([, a]) => isObj(a))
    .map(([id, a]) => ({ id, name: String(a.nome || id), ico: a.ico || '🏅', kcalH: +a.kcalOra || 0, ordine: +a.ordine || 99 })).sort((x, y) => x.ordine - y.ordine);
  ACT = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));
  for (const k of Object.keys(demo)) delete demo[k];
}
function carica() {
  let a = arch.leggi('alimenti.json');
  if (!isObj(a) || !isObj(a.alimenti)) { a = clona(ALIMENTI_INIZIALI); salvaFile('alimenti.json', a, 'alimenti'); }
  else {
    /* gli alimenti nuovi delle versioni future si aggiungono; nessuno si cancella */
    let nuovi = 0;
    for (const [id, r] of Object.entries(ALIMENTI_INIZIALI.alimenti)) if (!a.alimenti[id]) { a.alimenti[id] = clona(r); nuovi++; }
    if (nuovi) salvaFile('alimenti.json', a, 'alimenti');
  }
  db.alimenti = a;
  let o = arch.leggi('obiettivi.json');
  if (!isObj(o) || !isObj(o.base)) { o = clona(OBIETTIVI_INIZIALI); salvaFile('obiettivi.json', o, 'obiettivi'); }
  db.obiettivi = o;
  db.mesi = {};
  for (const p of arch.elenco()) {
    const m = p.match(/^giornate\/(\d{4}-\d{2})\.json$/); if (!m) continue;
    const v = arch.leggi(p); if (isObj(v) && isObj(v.giornate)) db.mesi[m[1]] = v;
  }
  const s = arch.leggi('spesa.json');
  if (isObj(s) && isObj(s.settimane)) db.spesa = s;
  else { db.spesa = { schema: 1, settimane: {} }; salvaFile('spesa.json', db.spesa, 'spesa'); }
  deriva();
}

/* ---------- giornate ---------- */
const meseDi = (k) => k.slice(0, 7);
function giornoSalvato(k) { const m = db.mesi[meseDi(k)]; const d = m && m.giornate[k]; return isObj(d) ? d : undefined; }
function getDay(k) { return giornoSalvato(k) || demo[k] || (demo[k] = demoDay(k)); }
/* l'unica via per salvare una giornata: la prima volta la giornata di prova entra nel file del mese */
function salvaGiorno(k, nota) {
  const mk = meseDi(k);
  const file = db.mesi[mk] || (db.mesi[mk] = { schema: 1, giornate: {} });
  if (!file.giornate[k]) { file.giornate[k] = getDay(k); delete demo[k]; }
  salvaFile('giornate/' + mk + '.json', file, nota || 'giornata ' + ddmm(k));
}
let timerLento = null, lentoK = null;
function salvaLento(k) { lentoK = k; if (timerLento) return; timerLento = setTimeout(() => { timerLento = null; salvaGiorno(lentoK); }, 400); }
function salvaInSospeso() { if (timerLento) { clearTimeout(timerLento); timerLento = null; salvaGiorno(lentoK); } }
function salvaSpesa(sett) {
  const lun = state.week[0];
  db.spesa.settimane[lun] = sett;
  salvaFile('spesa.json', db.spesa, 'spesa');
}

const pastiDi = (day) => Object.entries(isObj(day.pasti) ? day.pasti : {}).filter(([, m]) => isObj(m)).map(([id, m]) => ({ id, m }))
  .sort((a, b) => String(a.m.ora || '').localeCompare(String(b.m.ora || '')) || a.id.localeCompare(b.id));
const voci = (m) => Object.entries(isObj(m.alimenti) ? m.alimenti : {}).filter(([, e]) => isObj(e)).map(([id, e]) => ({ id, e })).sort((a, b) => a.id.localeCompare(b.id));
const attivitaDi = (day) => Object.entries(isObj(day.attivita) ? day.attivita : {}).filter(([id, a]) => isObj(a) && ACT[id])
  .map(([id, a]) => ({ id, min: +a.minuti || 0, pos: +a.pos || 0 })).sort((a, b) => a.pos - b.pos);
const allItems = (day) => pastiDi(day).flatMap(({ m }) => voci(m).map(({ e }) => e));

/* ---------- calcoli ---------- */
const ZERO = () => ({ kcal: 0, p: 0, c: 0, f: 0, fib: 0 });
const scale = (food, g) => { const f = cibo(food); const o = ZERO(); for (const m of MACROS) o[m.key] = f[m.key] * g / 100; return o; };
const addTo = (a, b) => { const o = { ...a }; for (const m of MACROS) o[m.key] += b[m.key]; return o; };
const sum = (items) => items.reduce((acc, e) => addTo(acc, scale(e.cibo, +e.g || 0)), ZERO());
const totals = (day) => sum(allItems(day));
const extraKcal = (day) => attivitaDi(day).reduce((s, a) => s + ACT[a.id].kcalH * a.min / 60, 0);
function targetOf(day) {
  const x = extraKcal(day);
  return { ...BASE_TARGET, kcal: Math.round((BASE_TARGET.kcal + x) / 10) * 10, c: Math.round((BASE_TARGET.c + x / 4) / 5) * 5 };
}
const tolOf = (m, tgt) => tgt[m.key] * (m.key === 'kcal' ? TOL.kcal : TOL.macro);
const okCount = (tot, tgt) => CORE.filter((m) => Math.abs(tot[m.key] - tgt[m.key]) <= tolOf(m, tgt)).length;
function errorOf(tot, tgt) { let e = 0; for (const m of MACROS) { const r = (tot[m.key] - tgt[m.key]) / (tgt[m.key] || 1); e += m.w * r * r; } return e; }
const stepOf = (food) => (cibo(food).portion >= 60 ? 10 : 5);
const roundTo = (g, st) => Math.max(st, Math.round(g / st) * st);
function balance(day) {
  const tgt = targetOf(day); const items = allItems(day);
  const base = new Map(items.map((e) => [e, e.g]));
  for (let i = 0; i < 80; i++) {
    const tot = totals(day); const cur = errorOf(tot, tgt); let best = null;
    for (const e of items) for (const dir of [1, -1]) {
      const g = e.g + dir * stepOf(e.cibo); const b = base.get(e);
      if (g < b * 0.5 || g > b * 2 || g <= 0) continue;
      const err = errorOf(addTo(tot, scale(e.cibo, g - e.g)), tgt);
      if (err < cur - 1e-6 && (!best || err < best.err)) best = { e, g, err };
    }
    if (!best) break;
    best.e.g = best.g;
  }
  return day;
}
const tierOf = (day) => { const x = extraKcal(day); return x >= 250 ? 'alto' : x > 0 ? 'medio' : 'basso'; };
/* la giornata di prova di una data: sempre uguale, con id fissi (a0, a1, …) su ogni telefono */
function demoDay(k) {
  const idx = (dateOf(k).getDay() + 6) % 7;
  const day = { attivita: {}, pasti: {} };
  (DEFAULT_PLAN[idx] || []).forEach(([id, min], pos) => { day.attivita[id] = { minuti: min, pos }; });
  const tpl = TEMPLATES[tierOf(day)][idx % 2];
  for (const b of BASE_MEALS) {
    const alimenti = {};
    (tpl[b.id] || []).forEach(([food, g], i) => { alimenti['a' + i] = { cibo: food, g }; });
    day.pasti[b.id] = { nome: b.name, ico: b.ico, ora: b.time, mangiato: false, extra: false, alimenti };
  }
  return balance(day);
}
const toMeal = (mid, m) => (!m.extra && BASE_BY_ID[mid] ? BASE_BY_ID[mid].a : 'a «' + m.nome + '»');
const fromMeal = (mid, m) => (!m.extra && BASE_BY_ID[mid] ? BASE_BY_ID[mid].da : 'da «' + m.nome + '»');
const durLabel = (min) => (min < 60 ? min + '′' : min % 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + '′' : min / 60 + ' h');
const actsLabel = (day) => { const a = attivitaDi(day); return a.length ? a.map((x) => ACT[x.id].name + ' ' + durLabel(x.min)).join(' · ') : 'Riposo'; };
const sigOf = (day) => Archivio.canonico(day);

/* ---------- stato dell'interfaccia (solo in memoria) ---------- */
const state = { date: todayKey(), week: [], weekTab: 'piano', analysis: {}, seen: {}, bdMacro: 'kcal' };
let oggiVisto = todayKey();
function costruisciSettimana() {
  const mon = mondayOf(todayKey());
  state.week = Array.from({ length: 7 }, (_, i) => shiftKey(mon, i));
  if (!state.week.includes(state.date)) state.date = todayKey();
}
/* l'app può riaprirsi dopo mezzanotte: ricalcolo «oggi» e la settimana */
function controllaGiorno() {
  const t = todayKey(); if (t === oggiVisto) return;
  const eraOggi = state.date === oggiVisto; oggiVisto = t;
  if (eraOggi) state.date = t;
  costruisciSettimana(); render();
}
function statusOf(k) {
  const day = getDay(k); const tot = totals(day); const tgt = targetOf(day); const ok = okCount(tot, tgt);
  return { day, tot, tgt, ok, perfect: ok === 4 };
}

/* ---------- analisi: cosa manca, cosa togliere (regole semplici, senza AI) ---------- */
function gapText(tot, tgt) {
  const under = []; const over = [];
  for (const m of CORE) {
    const d = tot[m.key] - tgt[m.key];
    if (d < -tolOf(m, tgt)) under.push(fmt0(-d) + ' ' + m.long); else if (d > tolOf(m, tgt)) over.push(fmt0(d) + ' ' + m.long);
  }
  if (!under.length && !over.length) return '';
  return [under.length ? 'Ti mancano ' + andJoin(under) : '', over.length ? (under.length ? 'e sei oltre di ' : 'Sei oltre di ') + andJoin(over) : ''].filter(Boolean).join(' ') + '.';
}
function mealFor(day, food) {
  const snack = cibo(food).slot === 'spuntino'; const pool = snack ? SNACK_MEALS : MAIN_MEALS;
  const open = pastiDi(day).filter(({ m }) => !m.mangiato);
  let list = open.filter(({ id, m }) => (m.extra ? snack : pool.includes(id)));
  if (!list.length) list = open;
  let best = null; let low = Infinity;
  for (const x of list) { const kc = sum(voci(x.m).map(({ e }) => e)).kcal; if (kc < low) { low = kc; best = x; } }
  return best;
}
function analyze(k) {
  const day = getDay(k); const tgt = targetOf(day); const start = totals(day);
  let tot = start; const moves = []; const touched = new Set(); let adds = 0;
  const present = new Set(allItems(day).map((e) => e.cibo));
  for (let step = 0; step < 3 && okCount(tot, tgt) < 4; step++) {
    const cur = errorOf(tot, tgt); let best = null;
    const consider = (mv, delta) => {
      const t = addTo(tot, delta); const err = errorOf(t, tgt);
      if (err < cur * 0.93 && (!best || err < best.err)) best = { ...mv, err, t, delta };
    };
    for (const { id: mid, m } of pastiDi(day)) {
      if (m.mangiato) continue;
      for (const { id: eid, e } of voci(m)) {
        if (touched.has(mid + '/' + eid) || !FOODS[e.cibo]) continue;
        const st = stepOf(e.cibo);
        for (const mult of [2, 1.5, 1.25, 0.75, 0.5]) {
          const g = roundTo(e.g * mult, st);
          if (g !== e.g) consider({ kind: g > e.g ? 'inc' : 'dec', meal: mid, entry: eid, food: e.cibo, from: e.g, g }, scale(e.cibo, g - e.g));
        }
        consider({ kind: 'remove', meal: mid, entry: eid, food: e.cibo, from: e.g, g: 0 }, scale(e.cibo, -e.g));
      }
    }
    if (adds < 2) for (const [id, f] of Object.entries(FOODS)) {
      if (present.has(id) || !f.attivo) continue;
      const meal = mealFor(day, id); if (!meal) continue;
      for (const part of [1, 0.5]) { const g = roundTo(f.portion * part, stepOf(id)); consider({ kind: 'add', meal: meal.id, food: id, g }, scale(id, g)); }
    }
    if (!best) break;
    moves.push(best); tot = best.t;
    if (best.entry) touched.add(best.meal + '/' + best.entry);
    if (best.kind === 'add') { adds++; present.add(best.food); }
  }
  for (const mv of moves) {
    const m = day.pasti[mv.meal]; const fn = lc(cibo(mv.food).name);
    if (mv.kind === 'add') { mv.title = 'Aggiungi ' + fn + ' ' + toMeal(mv.meal, m); mv.detail = fmt0(mv.g) + ' g'; }
    else if (mv.kind === 'remove') { mv.title = 'Togli ' + fn + ' ' + fromMeal(mv.meal, m); mv.detail = fmt0(mv.from) + ' g in meno'; }
    else { mv.title = (mv.kind === 'inc' ? 'Più ' : 'Meno ') + fn + ' ' + toMeal(mv.meal, m); mv.detail = 'da ' + fmt0(mv.from) + ' a ' + fmt0(mv.g) + ' g'; }
    mv.effect = CORE.filter((x) => Math.abs(mv.delta[x.key]) >= (x.key === 'kcal' ? 5 : 1)).slice(0, 3)
      .map((x) => signed(mv.delta[x.key]) + (x.key === 'kcal' ? ' kcal' : ' ' + x.long.replace('g di ', 'g '))).join(', ');
  }
  const fibGap = tgt.fib - start.fib;
  const locked = pastiDi(day).filter(({ m }) => m.mangiato).length;
  return { at: new Date(), sig: sigOf(day), after: tot, gap: gapText(start, tgt), moves, okAfter: okCount(tot, tgt), fibLow: fibGap > tolOf(MK.fib, tgt) ? fibGap : 0, locked, allLocked: locked === pastiDi(day).length };
}
function applyMove(k, mv) {
  const day = getDay(k); const m = day.pasti[mv.meal];
  if (!isObj(m) || mv.done) return false;
  if (!isObj(m.alimenti)) m.alimenti = {};
  if (mv.kind === 'add') m.alimenti[nuovoId()] = { cibo: mv.food, g: mv.g };
  else {
    const e = m.alimenti[mv.entry]; if (!isObj(e)) return false;
    if (mv.kind === 'remove') delete m.alimenti[mv.entry]; else e.g = mv.g;
  }
  mv.done = true;
  return true;
}
function runAnalysis() { const k = state.date; state.analysis[k] = analyze(k); refresh(); }
function moveNode(k, mv) {
  const btn = h('button', { type: 'button', class: 'pill', disabled: !!mv.done }, mv.done ? 'Fatto' : 'Applica');
  btn.addEventListener('click', () => { if (applyMove(k, mv)) { salvaGiorno(k, 'consigli ' + ddmm(k)); state.analysis[k].sig = sigOf(getDay(k)); render(); } });
  return h('div', { class: 'sugg' + (mv.done ? ' done' : '') }, h('div', null, h('b', { text: cibo(mv.food).ico + ' ' + mv.title }), h('small', { text: mv.detail + (mv.effect ? ' (' + mv.effect + ')' : '') })), btn);
}
function coachKids() {
  const k = state.date; const day = getDay(k); const a = state.analysis[k];
  const run = (label) => h('button', { type: 'button', class: 'pill pill--wide', onclick: runAnalysis }, label);
  if (!a) return [h('p', { class: 'coach__msg', text: 'Quando hai sistemato la giornata, chiedimi cosa manca o cosa togliere per arrivare all’obiettivo.' }),
    h('p', { class: 'coach__sub', text: 'Segna con la spunta ✓ i pasti già mangiati: quelli non li tocco.' }), h('div', { class: 'acts' }, run('✨ Analizza la giornata'))];
  if (a.sig !== sigOf(day)) return [h('p', { class: 'coach__msg', text: '✏️ Hai cambiato la giornata dopo l’ultima analisi.' }), h('p', { class: 'coach__sub', text: 'Rilanciala per sapere cosa manca o cosa togliere adesso.' }), h('div', { class: 'acts' }, run('✨ Analizza di nuovo'))];
  const kids = [];
  const allDone = a.moves.length > 0 && a.moves.every((mv) => mv.done);
  if (!a.gap) kids.push(h('p', { class: 'coach__msg', text: '⭐ Sei in linea con tutti gli obiettivi: non serve cambiare niente.' }));
  else if (allDone) {
    const now = statusOf(k);
    kids.push(h('p', { class: 'coach__msg', text: '✅ Fatto: ' + (now.perfect ? 'ora sei in linea con tutti gli obiettivi.' : 'ora hai ' + now.ok + ' macro su 4 a segno.') }), ...a.moves.map((mv) => moveNode(k, mv)));
  } else {
    kids.push(h('p', { class: 'coach__msg', text: '💡 ' + a.gap }));
    if (a.moves.length) {
      kids.push(h('p', { class: 'coach__sub', text: a.moves.length === 1 ? 'Ecco cosa cambierei:' : 'Ecco cosa cambierei, in quest’ordine:' }), ...a.moves.map((mv) => moveNode(k, mv)));
      kids.push(h('p', { class: 'coach__after', text: 'Con ' + (a.moves.length === 1 ? 'questa modifica' : 'queste modifiche') + ' arrivi a ' + fmt0(a.after.kcal) + ' kcal e ' + (a.okAfter === 4 ? 'a tutti e 4 i macro a segno.' : a.okAfter + ' macro su 4 a segno.') }));
      const todo = a.moves.filter((mv) => !mv.done);
      if (todo.length > 1) kids.push(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--soft pill--wide', onclick: () => { todo.forEach((mv) => applyMove(k, mv)); salvaGiorno(k, 'consigli ' + ddmm(k)); a.sig = sigOf(day); render(); } }, 'Applica tutte')));
    } else kids.push(h('p', { class: 'coach__sub', text: a.allLocked ? 'Hai segnato tutti i pasti come già mangiati, quindi per questa giornata non ho modifiche da proporre.' : 'Non trovo una modifica semplice che migliori la giornata: prova ad aggiungere o togliere un alimento a mano.' }));
    if (a.locked && !a.allLocked) kids.push(h('p', { class: 'coach__sub', text: '✓ Non ho toccato ' + (a.locked === 1 ? 'il pasto che hai segnato come già mangiato.' : 'i ' + a.locked + ' pasti che hai segnato come già mangiati.') }));
  }
  if (a.fibLow) kids.push(h('p', { class: 'coach__sub', text: '🥦 Fibre: ne mancano ' + fmt0(a.fibLow) + ' g. Un po’ di verdura o frutta in più le sistema.' }));
  kids.push(h('div', { class: 'coach__foot' }, h('span', { text: 'Analisi delle ' + a.at.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }),
    h('button', { type: 'button', class: 'textbtn textbtn--sm', onclick: runAnalysis }, 'Analizza di nuovo')));
  return kids;
}

/* ---------- capire una frase: «150 g di riso e 2 uova» ---------- */
const NUMW = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, mezzo: 0.5, mezza: 0.5 };
const UNIT = '(kg|chili|chilo|etti|etto|hg|grammi|grammo|gr|g)';
function gramsOf(n, u, f) {
  if (u === 'kg' || u === 'chili' || u === 'chilo') return n * 1000;
  if (u === 'etti' || u === 'etto' || u === 'hg') return n * 100;
  if (u || n >= 20) return n;
  return n * (f.unit || f.portion);
}
function parseFoods(text) {
  /* la virgola tra due cifre è un decimale («1,5 etti»), non un separatore */
  const t = norm(text).replace(/['’]/g, ' ').replace(/(\d),(\d)/g, '$1.$2');
  const chunks = (' ' + t + ' ').split(/,|\+|;| e | con | piu /).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const ch of chunks) {
    let best = null;
    for (const [id, f] of Object.entries(FOODS)) {
      if (!f.attivo) continue;
      for (const kw of f.kw) if (new RegExp('\\b' + kw + '\\b').test(ch) && (!best || kw.length > best.kw.length)) best = { id, kw };
    }
    if (!best) continue;
    const f = FOODS[best.id]; let g = f.portion;
    const m = ch.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UNIT + '?\\b'));
    if (m) g = gramsOf(parseFloat(m[1]), m[2], f);
    else {
      const w = ch.split(/\s+/).find((x) => NUMW[x] != null);
      if (w) { const um = ch.match(new RegExp('\\b' + UNIT + '\\b')); g = gramsOf(NUMW[w], um && um[1], f); }
    }
    if (g > 0) out.push({ food: best.id, g: Math.round(g) });
  }
  return out;
}
function swapsFor(e) {
  const f = cibo(e.cibo);
  const key = f.cat === 'carboidrati' || f.cat === 'frutta' ? 'c' : f.cat === 'proteine' ? 'p' : f.cat === 'grassi' ? 'f' : 'kcal';
  const amount = f[key] * e.g / 100;
  const label = { c: 'Stessi carboidrati', p: 'Stesse proteine', f: 'Stessi grassi', kcal: 'Stesse calorie' }[key];
  const list = Object.entries(FOODS).filter(([id, x]) => id !== e.cibo && x.attivo && x.cat === f.cat && x[key] > 0)
    .map(([id, x]) => { const st = stepOf(id); return { id, g: roundTo(amount / x[key] * 100, st) }; }).slice(0, 4);
  return { label, list };
}

/* ---------- stato del salvataggio, in alto in ogni sezione ---------- */
const ICO_STATO = { locale: '📱', 'da-inviare': '●', invio: '↻', salvato: '✓', offline: '⏸', errore: '⚠️', conflitti: '⚠️', scelta: '❔', aggiorna: '⬆️' };
function scadenzaVicina(s) { if (!s) return false; const d = dateOf(s) - new Date(); return d < 7 * 864e5; }
function mostraStato(s) {
  let testo = s.testo; let classe = s.stato;
  if (s.stato === 'salvato' && scadenzaVicina(s.scadenza)) { testo = 'Token in scadenza'; classe = 'errore'; }
  document.querySelectorAll('[data-sync]').forEach((b) => {
    b.className = 'sync sync--' + classe;
    b.replaceChildren(h('span', { class: 'sync__i', 'aria-hidden': 'true', text: ICO_STATO[s.stato] || '•' }), h('span', { class: 'sync__t', text: testo }));
    b.setAttribute('aria-label', 'Salvataggio: ' + testo + '. Dettagli');
  });
  const riga = (ICO_STATO[s.stato] || '') + ' ' + s.testo + (s.motivo ? '. ' + s.motivo : '') + (s.ultimo ? '. Ultimo invio a GitHub ' + quandoBreve(s.ultimo) + '.' : '');
  document.querySelectorAll('[data-sync-riga]').forEach((p) => { p.textContent = riga; });
  if (sheetTipo === 'stato' && sheetDraw) sheetDraw();
}
function testata(titolo, sotto) {
  return h('header', { class: 'top' },
    h('div', { class: 'top__l' }, h('h1', { text: titolo }), h('p', { text: sotto })),
    h('div', { class: 'top__r' },
      h('button', { type: 'button', class: 'sync', 'data-sync': '', onclick: apriStato }),
      h('button', { type: 'button', class: 'round', 'aria-label': 'Impostazioni', onclick: apriImpostazioni }, icon('gear'))));
}

/* ---------- navigazione ---------- */
const VIEWS = ['oggi', 'genera', 'settimana'];
const current = () => { const v = (location.hash || '').replace('#', ''); return VIEWS.includes(v) ? v : 'oggi'; };
function go(v) { if (current() === v) render(); else location.hash = v; }
function render() {
  const v = current();
  document.querySelectorAll('.dock a').forEach((a) => { if (a.dataset.tab === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#fab').hidden = true;
  const view = $('#view');
  if (v === 'settimana') view.replaceChildren(viewWeek());
  else if (v === 'genera') view.replaceChildren(viewGenera());
  else { view.replaceChildren(viewDay()); refresh(); }
  mostraStato(arch.stato());
}

/* ---------- giornata ---------- */
function viewDay() {
  const key = state.date; const day = getDay(key); const title = dayTitle(key);
  const root = h('div');
  root.append(testata(title, (title === weekdayName(key) ? '' : weekdayName(key) + ' ') + dayMonth(key)));

  const strip = h('div', { class: 'strip' });
  for (const k of state.week) {
    strip.append(h('button', { type: 'button', class: 'sd', 'data-day': k, 'aria-pressed': String(k === key), 'aria-label': weekdayName(k) + ' ' + dayMonth(k), onclick: () => { state.date = k; render(); } },
      h('span', { text: weekdayName(k).charAt(0) }), h('span', { class: 'sd__n', text: String(dateOf(k).getDate()) })));
  }
  root.append(strip, h('button', { type: 'button', class: 'actc', id: 'actc', onclick: openActivities }));

  const gauge = h('div', { class: 'gauge', id: 'gauge' });
  gauge.innerHTML = '<svg viewBox="0 0 220 122" aria-hidden="true"><path class="g-bg" d="M20 110 A90 90 0 0 1 200 110" pathLength="100"/><path class="g-fg" id="gfg" d="M20 110 A90 90 0 0 1 200 110" pathLength="100" stroke-dasharray="0 100"/></svg>';
  gauge.append(h('div', { class: 'gauge__mid' }, h('div', { class: 'gauge__n', id: 'gn' }), h('div', { class: 'gauge__l', id: 'gl' })));
  root.append(h('section', { class: 'hero' }, gauge,
    h('div', { class: 'hero__row' }, h('div', null, 'Nel piano', h('b', { id: 'eaten' })), h('div', null, 'Obiettivo', h('b', { id: 'goal' }))),
    h('div', { class: 'state', id: 'state', role: 'status' })));

  const mrow = h('div', { class: 'mrow' });
  for (const m of MACROS) mrow.append(h('button', { type: 'button', class: 'mc', 'data-mk': m.key, onclick: () => openDayBreakdown(m.key) },
    h('span', { class: 'mc__k', text: m.head }), h('span', { class: 'mc__v', 'data-mv': m.key }), h('span', { class: 'mc__b' }, h('i', { 'data-mb': m.key }))));
  mrow.append(icon('chev'));
  root.append(h('section', { class: 'macro', 'aria-label': 'Macro della giornata' }, mrow));

  for (const { id: mid, m } of pastiDi(day)) {
    const check = h('button', { type: 'button', class: 'check', 'aria-pressed': String(!!m.mangiato), 'aria-label': m.nome + ': già mangiato', title: 'Già mangiato' }, icon('check'));
    const sec = h('section', { class: 'meal' + (m.mangiato ? ' eaten' : ''), 'data-meal': mid },
      h('div', { class: 'meal__head' },
        h('button', { type: 'button', class: 'meal__open', 'aria-label': m.nome + ', alle ' + m.ora + ': apri lo spaccato del pasto', onclick: () => openMealBreakdown(mid) },
          h('span', { class: 'ico', 'aria-hidden': 'true', text: m.ico || '🍴' }),
          h('span', null, h('span', { class: 'meal__name', text: m.nome }), h('span', { class: 'meal__sum', 'data-sum': '' }))),
        check,
        h('button', { type: 'button', class: 'plus', 'aria-label': 'Aggiungi ' + toMeal(mid, m), onclick: () => openAdd(mid) }, icon('plus'))));
    /* la spunta dice all'analisi che questo pasto è già andato: non lo tocca più */
    check.addEventListener('click', () => {
      m.mangiato = !m.mangiato; check.setAttribute('aria-pressed', String(m.mangiato)); sec.classList.toggle('eaten', m.mangiato);
      salvaGiorno(key); refresh();
    });
    const items = voci(m);
    if (!items.length) sec.append(h('p', { class: 'empty', text: 'Vuoto. Tocca il più per aggiungere.' }));
    for (const { id: eid, e } of items) {
      const f = cibo(e.cibo); const st = stepOf(e.cibo);
      sec.append(h('div', { class: 'food', 'data-entry': eid },
        h('button', { type: 'button', class: 'food__main', onclick: () => openEdit(mid, eid) }, emo(f.ico), h('span', null, h('b', { text: f.name }), h('small', { 'data-info': '' }))),
        h('div', { class: 'qty' },
          h('button', { type: 'button', 'aria-label': 'Meno ' + f.name, onclick: () => { e.g = Math.max(st, e.g - st); salvaGiorno(key); refresh(); } }, icon('minus')),
          h('button', { type: 'button', class: 'qty__v', 'data-g': '', 'aria-label': 'Modifica ' + f.name, onclick: () => openEdit(mid, eid) }),
          h('button', { type: 'button', 'aria-label': 'Più ' + f.name, onclick: () => { e.g += st; salvaGiorno(key); refresh(); } }, icon('plus')))));
    }
    root.append(sec);
  }
  root.append(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--soft pill--wide', onclick: openAddMeal }, '+ Aggiungi un pasto')));
  root.append(h('section', { class: 'sect', id: 'consigli' }, h('div', { class: 'sect__head' }, h('h2', { text: 'Consigli' })), h('div', { class: 'card coach', id: 'coach' })));
  return root;
}
function refresh() {
  if (current() !== 'oggi') return;
  const k = state.date;
  const { day, tot, tgt, ok, perfect } = statusOf(k);
  const fg = $('#gfg'); if (!fg) return;

  const x = tgt.kcal - BASE_TARGET.kcal; const acts = attivitaDi(day);
  $('#actc').replaceChildren(
    h('span', { class: 'actc__ico', 'aria-hidden': 'true' }, (acts.length ? acts.slice(0, 3).map((a) => ACT[a.id].ico) : ['🛋️']).map((e) => h('span', { text: e }))),
    h('span', null, h('b', { text: actsLabel(day) }), h('small', { text: acts.length ? 'Obiettivo ' + signed(x) + ' kcal rispetto al riposo' : 'Giornata di riposo. Tocca per indicare un’attività.' })),
    icon('chev'));
  $('#actc').setAttribute('aria-label', 'Attività: ' + actsLabel(day) + '. Tocca per cambiarla');

  const left = tgt.kcal - tot.kcal; const pct = Math.min(100, tot.kcal / tgt.kcal * 100);
  fg.setAttribute('stroke-dasharray', pct + ' 100'); fg.style.opacity = pct < 1 ? '0' : '1';
  $('#gauge').classList.toggle('over', left < -tolOf(MK.kcal, tgt));
  $('#gn').textContent = fmt0(Math.abs(left)); $('#gl').textContent = left >= 0 ? 'kcal ancora disponibili' : 'kcal oltre l’obiettivo';
  $('#eaten').textContent = fmt0(tot.kcal) + ' kcal'; $('#goal').textContent = fmt0(tgt.kcal) + ' kcal';
  const st = $('#state'); st.classList.toggle('win', perfect);
  st.textContent = perfect ? '⭐ Giornata perfetta' : ok + ' macro su 4 a segno';

  for (const m of MACROS) {
    $('[data-mv="' + m.key + '"]').replaceChildren(fmt0(tot[m.key]), h('small', { text: '/' + fmt0(tgt[m.key]) }));
    const bar = $('[data-mb="' + m.key + '"]');
    bar.style.width = Math.min(100, tot[m.key] / (tgt[m.key] || 1) * 100) + '%';
    bar.classList.toggle('over', m.key !== 'fib' && tot[m.key] - tgt[m.key] > tolOf(m, tgt));
    $('[data-mk="' + m.key + '"]').setAttribute('aria-label', m.name + ': ' + fmt0(tot[m.key]) + ' su ' + fmt0(tgt[m.key]) + unitOf(m) + '. Apri lo spaccato della giornata');
  }

  const t = todayKey();
  document.querySelectorAll('.sd').forEach((b) => {
    const dk = b.dataset.day; const p = statusOf(dk).perfect;
    b.classList.toggle('perfect', dk <= t && p); b.classList.toggle('partial', dk <= t && !p);
  });

  for (const { id: mid, m } of pastiDi(day)) {
    const sec = $('[data-meal="' + mid + '"]'); if (!sec) continue;
    const items = voci(m); const sm = sum(items.map(({ e }) => e));
    $('[data-sum]', sec).textContent = m.ora + ' · ' + (items.length ? fmt0(sm.kcal) + ' kcal · ' + fmt0(sm.p) + ' g proteine' : 'niente in programma');
    for (const { id: eid, e } of items) {
      const r = $('[data-entry="' + eid + '"]', sec); if (!r) continue;
      const v = scale(e.cibo, e.g);
      $('[data-info]', r).textContent = fmt0(v.kcal) + ' kcal, ' + fmt1(v.p) + ' g proteine';
      $('[data-g]', r).textContent = fmt0(e.g) + ' g';
    }
  }

  /* il pulsante «Analizza» compare appena cambi qualcosa rispetto all'ultima analisi */
  const sig = sigOf(day);
  if (state.seen[k] == null) state.seen[k] = sig;
  const a = state.analysis[k];
  $('#fab').hidden = sig === (a ? a.sig : state.seen[k]);
  $('#coach').replaceChildren(...coachKids());
}

/* ---------- pannello dal basso ---------- */
const sheet = $('#sheet');
function dopoChiusura() {
  salvaInSospeso();
  sheetTipo = null; sheetDraw = null;
  arch.occupato(false);
  if (ricaricaDopo) { ricaricaDopo = false; carica(); }
  render();
}
function closeSheet() { if (typeof sheet.close === 'function') { try { sheet.close(); return; } catch (e) { /* chiusura manuale */ } } sheet.removeAttribute('open'); dopoChiusura(); }
sheet.addEventListener('close', dopoChiusura);
$('#sheetClose').addEventListener('click', closeSheet);
sheet.addEventListener('click', (ev) => { if (ev.target === sheet) closeSheet(); });
/* tipo «modifica»: finché il pannello è aperto non applico dati arrivati da GitHub, per non perdere quello che stai cambiando */
function openSheet(title, build, tipo) {
  salvaInSospeso();
  sheetTipo = tipo || 'modifica'; sheetDraw = null;
  arch.occupato(sheetTipo === 'modifica');
  $('#sheetTitle').textContent = title;
  const body = $('#sheetBody'); body.replaceChildren(); build(body);
  if (!sheet.open) { if (typeof sheet.showModal === 'function') { try { sheet.showModal(); } catch (e) { sheet.setAttribute('open', ''); } } else sheet.setAttribute('open', ''); }
  sheet.scrollTop = 0;
  try { $('#sheetTitle').focus({ preventScroll: true }); } catch (e) { /* senza focus */ }
}

/* attività: più di tre scelte, anche insieme, con la durata */
function openActivities() {
  const k = state.date; const day = getDay(k);
  openSheet('Attività', (body) => {
    const draw = () => {
      if (!isObj(day.attivita)) day.attivita = {};
      const tgt = targetOf(day); const x = tgt.kcal - BASE_TARGET.kcal; const acts = attivitaDi(day);
      const cambia = () => { salvaGiorno(k, 'attività ' + ddmm(k)); draw(); };
      body.replaceChildren(
        h('p', { class: 'hint', text: 'Cosa hai fatto ' + (k === todayKey() ? 'oggi' : 'in questa giornata') + '? Puoi sceglierne più di una: l’obiettivo si aggiorna da solo.' }),
        h('div', { class: 'acts-grid' }, ACTIVITIES.map((a) => {
          const on = isObj(day.attivita[a.id]);
          return h('button', { type: 'button', 'aria-pressed': String(on), onclick: () => {
            if (on) delete day.attivita[a.id];
            else day.attivita[a.id] = { minuti: 60, pos: Math.max(-1, ...Object.values(day.attivita).map((y) => +y.pos || 0)) + 1 };
            cambia();
          } }, emo(a.ico), a.name);
        })),
        acts.length ? h('p', { class: 'sub', text: 'Quanto è durata' }) : null,
        acts.length ? h('div', { class: 'card' }, acts.map((y) => h('div', { class: 'dur' },
          h('span', { class: 'dur__n' }, emo(ACT[y.id].ico), ACT[y.id].name),
          h('div', { class: 'seg seg--sm', role: 'radiogroup', 'aria-label': 'Durata: ' + ACT[y.id].name },
            DURATIONS.map((d) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(y.min === d), onclick: () => { day.attivita[y.id].minuti = d; cambia(); } }, durLabel(d))))))) : null,
        h('div', { class: 'impact', role: 'status' },
          h('b', { text: 'Obiettivo: ' + fmt0(tgt.kcal) + ' kcal' + (x ? ' (' + signed(x) + ' rispetto al riposo)' : ', giornata di riposo') }),
          h('div', { text: 'Carboidrati ' + fmt0(tgt.c) + ' g, proteine ' + fmt0(tgt.p) + ' g, grassi ' + fmt0(tgt.f) + ' g, fibre ' + fmt0(tgt.fib) + ' g' })),
        acts.length ? h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: () => { day.attivita = {}; cambia(); } }, '🛋️ Nessuna attività: riposo')) : null,
        h('p', { class: 'hint', text: 'Le calorie delle attività sono stime indicative: le tariamo sui tuoi dati più avanti.' }));
    };
    draw();
  });
}

/* spaccati: la giornata pasto per pasto, il pasto alimento per alimento */
function breakdownNode(parts, tot, o) {
  const n = parts.length;
  const col = (i) => 'var(--r' + (n <= 1 ? 0 : Math.round(i * 9 / (n - 1))) + ')';
  const overview = h('div', { class: 'card bo-list' });
  for (const m of MACROS) {
    const T = tot[m.key]; const tg = o.tgt ? o.tgt[m.key] : 0; const max = Math.max(T, tg) || 1;
    const segs = parts.map((p, i) => (p.v[m.key] > 0 ? h('i', { style: 'width:' + (p.v[m.key] / max * 100).toFixed(2) + '%;background:' + col(i) }) : null));
    const val = o.tgt
      ? [fmtM(m, T), h('small', { text: ' / ' + fmt0(tg) + unitOf(m) })]
      : [fmtM(m, T), h('small', { text: unitOf(m) + (o.dayTot && o.dayTot[m.key] > 0 ? ' · ' + pctTxt(T, o.dayTot[m.key]) + ' della giornata' : '') })];
    overview.append(h('button', { type: 'button', class: 'bo', 'aria-pressed': String(o.macro === m.key), onclick: () => o.onPick(m.key) },
      h('span', { class: 'bo__k', text: m.name }), h('span', { class: 'bo__v' }, val),
      h('span', { class: 'stack', 'aria-hidden': 'true' }, segs, tg ? h('b', { class: 'stack__tgt', style: 'left:' + (tg / max * 100).toFixed(2) + '%' }) : null)));
  }
  const m = MK[o.macro]; const T = tot[m.key];
  const rows = parts.map((p, i) => ({ p, i, v: p.v[m.key] }));
  if (o.scope === 'meal') rows.sort((a, b) => b.v - a.v);
  let cum = 0;
  const list = h('div', { class: 'card' }, rows.map(({ p, i, v }) => {
    cum += v; const share = T > 0 ? v / T : 0;
    const sub = o.scope === 'day' ? p.sub + ' · progressivo ' + fmtM(m, cum) + ' di ' + fmt0(o.tgt[m.key]) + unitOf(m) : p.sub;
    return h('button', { type: 'button', class: 'br', onclick: () => o.onRow(p.key) },
      h('i', { class: 'br__dot', style: 'background:' + col(i), 'aria-hidden': 'true' }), emo(p.ico),
      h('span', { class: 'br__n' }, h('b', { text: p.name }), h('small', { text: sub })),
      h('span', { class: 'br__v' }, h('b', { text: fmtM(m, v) + unitOf(m) }), h('small', { text: Math.round(share * 100) + '%' })),
      h('span', { class: 'br__bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + (share * 100).toFixed(2) + '%;background:' + col(i) })));
  }));
  return h('div', null, overview, h('p', { class: 'sub', text: m.name + (o.scope === 'day' ? ', pasto per pasto' : ', alimento per alimento') }), list);
}
function openDayBreakdown(mk) {
  if (mk) state.bdMacro = mk;
  const day = getDay(state.date);
  openSheet('Spaccato della giornata', (body) => {
    const draw = () => {
      const tot = totals(day); const tgt = targetOf(day);
      const parts = pastiDi(day).map(({ id, m }) => ({ key: id, ico: m.ico || '🍴', name: m.nome, sub: m.ora, v: sum(voci(m).map(({ e }) => e)) }));
      body.replaceChildren(
        h('p', { class: 'hint', text: 'Come si distribuiscono calorie e macro nei pasti, dalla mattina alla sera. La lineetta verticale segna l’obiettivo. Tocca un pasto per aprirlo.' }),
        breakdownNode(parts, tot, { scope: 'day', macro: state.bdMacro, tgt, onPick: (x) => { state.bdMacro = x; draw(); }, onRow: (id) => openMealBreakdown(id) }));
    };
    draw();
  });
}
function openMealBreakdown(mealId) {
  const k = state.date; const day = getDay(k);
  openSheet('', (body) => {
    const draw = () => {
      const m = day.pasti[mealId]; if (!isObj(m)) return;
      $('#sheetTitle').textContent = (m.ico || '🍴') + ' ' + m.nome;
      const items = voci(m); const tot = sum(items.map(({ e }) => e)); const dayTot = totals(day);
      const parts = items.map(({ id, e }) => ({ key: id, ico: cibo(e.cibo).ico, name: cibo(e.cibo).name, sub: fmt0(e.g) + ' g', v: scale(e.cibo, e.g) }));
      const time = h('input', { class: 'field', type: 'time', value: m.ora, 'aria-label': 'Orario del pasto' });
      time.addEventListener('change', () => { if (time.value) { m.ora = time.value; salvaGiorno(k); draw(); } });
      body.replaceChildren(
        h('p', { class: 'hint', text: items.length ? 'Alle ' + m.ora + ': ' + fmt0(tot.kcal) + ' kcal, il ' + pctTxt(tot.kcal, dayTot.kcal) + ' delle calorie della giornata. Ecco quanto pesa ogni alimento sui valori del pasto. Tocca un alimento per modificarlo.' : 'Questo pasto è ancora vuoto.' }),
        parts.length ? breakdownNode(parts, tot, { scope: 'meal', macro: state.bdMacro, dayTot, onPick: (x) => { state.bdMacro = x; draw(); }, onRow: (id) => openEdit(mealId, id) }) : null,
        h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => openAdd(mealId) }, '+ Aggiungi un alimento'),
          h('button', { type: 'button', class: 'pill pill--wide ' + (m.mangiato ? 'pill--soft' : 'pill--plain'), 'aria-pressed': String(!!m.mangiato), onclick: () => { m.mangiato = !m.mangiato; salvaGiorno(k); draw(); } }, m.mangiato ? '✓ Già mangiato' : 'Segna come già mangiato')),
        h('p', { class: 'sub', text: 'Orario' }), time,
        m.extra ? h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: () => { delete day.pasti[mealId]; salvaGiorno(k, 'pasto tolto ' + ddmm(k)); closeSheet(); } }, 'Elimina questo pasto')) : null);
    };
    draw();
  });
}

/* un pasto in più, solo per questa giornata */
function openAddMeal() {
  const k = state.date; const day = getDay(k);
  openSheet('Aggiungi un pasto', (body) => {
    let pick = EXTRA_MEALS[0];
    const name = h('input', { class: 'field', type: 'text', value: pick.name, autocomplete: 'off', 'aria-label': 'Nome del pasto' });
    const time = h('input', { class: 'field', type: 'time', value: pick.time, 'aria-label': 'Orario del pasto' });
    const grid = h('div', { class: 'quick quick--3' });
    const drawGrid = () => grid.replaceChildren(...EXTRA_MEALS.map((x) => h('button', { type: 'button', class: x === pick ? 'on' : '', onclick: () => { pick = x; name.value = x.name; time.value = x.time; drawGrid(); } }, emo(x.ico), x.name)));
    name.addEventListener('input', () => { pick = EXTRA_MEALS.find((x) => norm(x.name) === norm(name.value.trim())) || null; drawGrid(); });
    drawGrid();
    body.append(h('p', { class: 'hint', text: 'Per i pasti fuori dai cinque di sempre. Vale solo per questa giornata.' }), grid,
      h('p', { class: 'sub', text: 'Nome' }), name, h('p', { class: 'sub', text: 'Orario' }), time,
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => {
        const nm = name.value.trim() || 'Altro pasto'; const id = nuovoId('x');
        if (!isObj(day.pasti)) day.pasti = {};
        day.pasti[id] = { nome: nm, ico: pick ? pick.ico : '🍴', ora: time.value || '12:00', mangiato: false, extra: true, alimenti: {} };
        salvaGiorno(k, 'pasto ' + nm + ' ' + ddmm(k));
        openAdd(id);
      } }, 'Aggiungi e scegli gli alimenti')));
  });
}

/* aggiunta di alimenti: una frase, un tocco sui più usati, o l’elenco */
function openAdd(mealId) {
  const k = state.date; const day = getDay(k); const m = day.pasti[mealId]; if (!isObj(m)) return;
  openSheet('Aggiungi ' + toMeal(mealId, m), (body) => {
    const input = h('input', { class: 'field', type: 'text', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Scrivi o detta: 150 g di riso e 2 uova', 'aria-label': 'Scrivi o detta cosa aggiungere' });
    const parsedBox = h('div'); const listBox = h('div');
    const add = (food, g) => { if (!isObj(m.alimenti)) m.alimenti = {}; m.alimenti[nuovoId()] = { cibo: food, g }; salvaGiorno(k); };
    const draw = () => {
      const q = input.value.trim(); const parsed = q ? parseFoods(q) : [];
      parsedBox.replaceChildren();
      if (parsed.length) {
        const tot = sum(parsed.map((p) => ({ cibo: p.food, g: p.g })));
        parsedBox.append(h('p', { class: 'sub', text: 'Ho capito così' }),
          h('div', { class: 'card' }, parsed.map((p) => h('div', { class: 'pick' }, emo(FOODS[p.food].ico), h('span', null, FOODS[p.food].name, h('small', { text: fmt0(scale(p.food, p.g).kcal) + ' kcal' })), h('span', { text: fmt0(p.g) + ' g' })))),
          h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => { parsed.forEach((p) => add(p.food, p.g)); closeSheet(); } },
            'Aggiungi ' + (parsed.length === 1 ? 'un alimento' : parsed.length + ' alimenti') + ' (' + fmt0(tot.kcal) + ' kcal)')));
      }
      const nq = norm(q);
      const foods = Object.entries(FOODS).filter(([, f]) => f.attivo && (!q || parsed.length || norm(f.name).includes(nq))).sort((a, b) => a[1].name.localeCompare(b[1].name, 'it'));
      listBox.replaceChildren(h('p', { class: 'sub', text: 'Tutti gli alimenti' }),
        h('div', { class: 'card' }, foods.length ? foods.map(([id, f]) => {
          const b = h('button', { type: 'button', class: 'pick' }, emo(f.ico), h('span', null, f.name, h('small', { text: 'Porzione da ' + fmt0(f.portion) + ' g, ' + fmt0(f.kcal * f.portion / 100) + ' kcal' })), h('span', { text: 'Aggiungi' }));
          b.addEventListener('click', () => { add(id, f.portion); b.lastChild.textContent = 'Aggiunto'; });
          return b;
        }) : h('p', { class: 'empty', text: 'Nessun alimento con questo nome. Più avanti qui potrai crearlo, anche dalla foto dell’etichetta.' })));
    };
    input.addEventListener('input', draw);
    const quick = h('div', { class: 'quick' }, OFTEN.filter((id) => FOODS[id]).map((id) => {
      const f = FOODS[id];
      const b = h('button', { type: 'button', 'aria-label': 'Aggiungi ' + f.name + ', ' + fmt0(f.portion) + ' grammi' }, emo(f.ico), SHORT[id] || f.name.split(' ')[0]);
      b.addEventListener('click', () => { add(id, f.portion); b.classList.add('on'); });
      return b;
    }));
    body.append(input, h('p', { class: 'hint', text: 'Puoi scrivere più alimenti in una frase. Le quantità le sistemi dopo con un tocco.' }),
      parsedBox, h('p', { class: 'sub', text: 'I più usati: un tocco e sono nel pasto' }), quick, listBox);
    draw();
  });
}

/* modifica: quantità, porzioni, sostituzioni equivalenti */
function openEdit(mealId, id) {
  const k = state.date; const day = getDay(k); const m = day.pasti[mealId]; if (!isObj(m) || !isObj(m.alimenti)) return;
  const en = m.alimenti[id]; if (!isObj(en)) return;
  openSheet(cibo(en.cibo).ico + ' ' + cibo(en.cibo).name, (body) => {
    const draw = () => {
      const f = cibo(en.cibo); const st = stepOf(en.cibo); const max = Math.max(f.portion * 3, en.g);
      $('#sheetTitle').textContent = f.ico + ' ' + f.name;
      const num = h('div', { class: 'amount__n' });
      const impact = h('div', { class: 'impact', role: 'status' });
      const range = h('input', { type: 'range', min: String(st), max: String(max), step: String(st), value: String(en.g), 'aria-label': 'Quantità in grammi' });
      const paint = () => {
        num.replaceChildren(fmt0(en.g), h('small', { text: ' g' }));
        const v = scale(en.cibo, en.g); const { tot, tgt } = statusOf(k);
        impact.replaceChildren(h('b', { text: fmt0(v.kcal) + ' kcal, ' + fmt1(v.p) + ' g proteine, ' + fmt1(v.c) + ' g carboidrati, ' + fmt1(v.f) + ' g grassi' }),
          h('div', { text: 'Giornata: ' + fmt0(tot.kcal) + ' di ' + fmt0(tgt.kcal) + ' kcal, proteine ' + fmt0(tot.p) + ' di ' + fmt0(tgt.p) + ' g' }));
        range.value = String(en.g);
      };
      const set = (g) => { en.g = roundTo(g, st); paint(); salvaLento(k); };
      range.addEventListener('input', () => set(Number(range.value)));
      const sw = swapsFor(en);
      body.replaceChildren(
        h('div', { class: 'amount' },
          h('button', { type: 'button', 'aria-label': 'Meno', onclick: () => set(en.g - st) }, icon('minus')), num,
          h('button', { type: 'button', 'aria-label': 'Più', onclick: () => set(en.g + st) }, icon('plus'))),
        range,
        h('div', { class: 'acts' }, [['Mezza porzione', 0.5], ['1 porzione', 1], ['1 e mezza', 1.5], ['2 porzioni', 2]].map(([label, x]) =>
          h('button', { type: 'button', class: 'pill pill--plain', onclick: () => set(f.portion * x) }, label))),
        impact,
        sw.list.length ? h('p', { class: 'sub', text: 'Hai mangiato altro? Sostituisci: ' + lc(sw.label) }) : null,
        sw.list.length ? h('div', { class: 'card' }, sw.list.map((s) => h('button', { type: 'button', class: 'pick', onclick: () => { en.cibo = s.id; en.g = s.g; salvaGiorno(k); draw(); } },
          emo(FOODS[s.id].ico), h('span', null, FOODS[s.id].name, h('small', { text: fmt0(scale(s.id, s.g).kcal) + ' kcal' })), h('span', { text: fmt0(s.g) + ' g' })))) : null,
        h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: () => { delete m.alimenti[id]; salvaGiorno(k); closeSheet(); } }, 'Togli dal pasto')));
      paint();
    };
    draw();
  });
}

/* ---------- dettagli del salvataggio e modifiche da risolvere ---------- */
function valoreBreve(v) {
  if (v === undefined) return 'eliminato';
  if (v === true) return 'sì';
  if (v === false) return 'no';
  if (isObj(v) || Array.isArray(v)) return 'modificato';
  return String(v);
}
function descrivi(c) {
  const p = c.path; const L = c.local; const R = c.remote;
  if (/^giornate\//.test(c.file) && p[0] === 'giornate' && p[1]) {
    const quando = /^\d{4}-\d{2}-\d{2}$/.test(p[1]) ? giornoBreve(p[1]) : p[1];
    if (p.length === 2) return [quando, L === undefined ? 'giornata eliminata' : 'giornata modificata', R === undefined ? 'giornata eliminata' : 'giornata modificata'];
    if (p[2] === 'attivita') { const a = ACT[p[3]]; const d = (v) => (isObj(v) ? durLabel(+v.minuti || 0) : 'tolta'); return [quando + ': ' + (a ? a.name : p[3]), d(L), d(R)]; }
    if (p[2] === 'pasti' && p[3]) {
      const day = getDay(p[1]); const mm = isObj(day.pasti) && isObj(day.pasti[p[3]]) ? day.pasti[p[3]] : isObj(L) ? L : isObj(R) ? R : null;
      const nome = mm && mm.nome ? mm.nome : p[3];
      if (p.length === 4) return [quando + ': ' + nome, L === undefined ? 'pasto eliminato' : 'pasto modificato', R === undefined ? 'pasto eliminato' : 'pasto modificato'];
      if (p[4] === 'alimenti' && p.length === 6) { const d = (v) => (isObj(v) ? cibo(v.cibo).name + ', ' + fmt0(+v.g || 0) + ' g' : 'tolto'); return [quando + ': ' + nome, d(L), d(R)]; }
      if (p[4] === 'ora') return [quando + ': orario di ' + lc(nome), valoreBreve(L), valoreBreve(R)];
      if (p[4] === 'mangiato') { const d = (v) => (v ? 'già mangiato' : 'da mangiare'); return [quando + ': ' + nome, d(L), d(R)]; }
      return [quando + ': ' + nome + ' (' + p.slice(4).join(' › ') + ')', valoreBreve(L), valoreBreve(R)];
    }
  }
  if (c.file === 'alimenti.json' && p[0] === 'alimenti' && p[1]) return ['Alimento «' + cibo(p[1]).name + '»' + (p[2] ? ': ' + p.slice(2).join(' › ') : ''), valoreBreve(L), valoreBreve(R)];
  if (c.file === 'obiettivi.json') return ['Obiettivi' + (p.length ? ': ' + p.join(' › ') : ''), valoreBreve(L), valoreBreve(R)];
  return [c.file + (p.length ? ': ' + p.join(' › ') : ''), valoreBreve(L), valoreBreve(R)];
}
function conflittoNode(c) {
  const [titolo, qui, la] = descrivi(c);
  return h('div', { class: 'conf' }, h('b', { text: titolo }), h('div', { class: 'conf__v' },
    h('button', { type: 'button', class: 'pill pill--plain', onclick: () => arch.risolvi(c.file, c.i, 'qui') }, h('small', { text: 'Tieni questo telefono' }), qui),
    h('button', { type: 'button', class: 'pill pill--plain', onclick: () => arch.risolvi(c.file, c.i, 'github') }, h('small', { text: 'Tieni GitHub' }), la)));
}
function apriStato() {
  openSheet('Salvataggio', (body) => {
    const draw = () => {
      const s = arch.stato(); const kids = [];
      kids.push(h('div', { class: 'card info' },
        h('p', { class: 'info__t', text: (ICO_STATO[s.stato] || '') + ' ' + s.testo }),
        s.motivo ? h('p', { class: 'hint', text: s.motivo }) : null,
        s.quando ? h('p', { class: 'hint', text: 'Riprovo da solo alle ' + new Date(s.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '.' }) : null,
        s.ultimo ? h('p', { class: 'hint', text: 'Ultimo invio a GitHub: ' + quandoBreve(s.ultimo) + '.' }) : null,
        scadenzaVicina(s.scadenza) ? h('p', { class: 'hint', text: '⚠️ Il token scade il ' + dateOf(s.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ': creane uno nuovo e incollalo nelle Impostazioni.' }) : null));
      if (s.stato === 'locale') kids.push(h('p', { class: 'lead', text: 'I dati sono salvati su questo telefono. Collega GitHub nelle Impostazioni per averne una copia nel repository privato e ritrovarli su altri dispositivi.' }));
      if (s.stato === 'scelta') {
        const vai = (cosa) => async (ev) => { ev.currentTarget.disabled = true; try { await arch.scegli(cosa); } catch (e) { avviso(e.message || 'Non ci sono riuscito: riprova'); } };
        kids.push(h('p', { class: 'lead', text: 'Su GitHub ci sono già dei dati, e ce ne sono anche su questo telefono. Prima salvo in automatico una copia dei dati del telefono, poi faccio come scegli.' }),
          h('div', { class: 'acts' },
            h('button', { type: 'button', class: 'pill pill--wide', onclick: vai('unisci') }, 'Unisci i dati (consigliato)'),
            h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: vai('github') }, 'Tieni solo quelli di GitHub'),
            h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: vai('telefono') }, 'Tieni solo quelli del telefono')));
      }
      if (s.stato === 'aggiorna') kids.push(h('p', { class: 'lead', text: 'Un altro dispositivo ha salvato dei dati con una versione più nuova dell’app. Finché non aggiorni, quei file non li tocco.' }),
        h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => location.reload() }, 'Aggiorna l’app')));
      const conf = arch.conflitti();
      if (conf.length) kids.push(h('p', { class: 'sub', text: 'Da risolvere' }), h('p', { class: 'hint', text: 'La stessa voce è stata cambiata qui e su un altro dispositivo. Scegli quale versione tenere: finché non scegli, quel file resta solo su questo telefono.' }),
        h('div', { class: 'card' }, conf.map(conflittoNode)));
      const az = [];
      if (arch.haToken()) az.push(h('button', { type: 'button', class: 'pill', onclick: () => arch.adesso() }, 'Sincronizza ora'));
      az.push(h('button', { type: 'button', class: 'pill pill--plain', onclick: apriImpostazioni }, 'Impostazioni'));
      kids.push(h('div', { class: 'acts' }, az));
      body.replaceChildren(...kids);
    };
    sheetDraw = draw; draw();
  }, 'stato');
}

/* ---------- impostazioni: GitHub e copie dei dati ---------- */
function scaricaJSON(obj, nome) {
  const file = new File([JSON.stringify(obj, null, 2)], nome, { type: 'application/json' });
  const tocco = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (tocco && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Copia dei dati di Weekly Menu' }).catch(() => {}); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = nome;
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
function aiutoToken() {
  return h('details', { class: 'aiuto' }, h('summary', { text: 'Come creare il token' }), h('ol', null,
    h('li', { text: 'Su GitHub apri la foto del profilo → Settings → Developer settings → Personal access tokens → Fine-grained tokens, e premi «Generate new token».' }),
    h('li', { text: 'Dagli un nome, per esempio «Weekly Menu telefono», e una scadenza. Poi scrivi la stessa scadenza qui sotto.' }),
    h('li', { text: 'In «Repository access» scegli «Only select repositories» e seleziona weekly-menu-dati.' }),
    h('li', { text: 'Nei permessi del repository dai a «Contents» l’accesso «Read and write». Non serve altro.' }),
    h('li', { text: 'Premi «Generate token», copialo e incollalo qui sopra.' })));
}
function apriImpostazioni() {
  openSheet('Impostazioni', (body) => {
    const c = arch.config();
    const repo = h('input', { class: 'field', type: 'text', value: c.repo, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Repository dei dati' });
    const disp = h('input', { class: 'field', type: 'text', value: c.dispositivo, autocomplete: 'off', 'aria-label': 'Nome di questo dispositivo' });
    const scad = h('input', { class: 'field', type: 'date', value: c.scadenza || '', 'aria-label': 'Scadenza del token' });
    disp.addEventListener('change', () => arch.impostaConfig({ dispositivo: disp.value.trim() || 'Telefono' }));
    scad.addEventListener('change', () => arch.impostaConfig({ scadenza: scad.value }));
    const esito = h('p', { class: 'hint', role: 'status' });
    const tokenBox = h('div');
    async function verifica(t) {
      const r = repo.value.trim();
      if (!/^[\w.-]+\/[\w.-]+$/.test(r)) { esito.textContent = '⚠️ Scrivi il repository come proprietario/nome, per esempio cicchub/weekly-menu-dati.'; return; }
      esito.textContent = 'Verifico…';
      try {
        const v = await arch.verifica(r, t);
        esito.textContent = '✓ ' + v.nota;
        if (t) { await arch.collega(r, t, { dispositivo: disp.value.trim() || 'Telefono', scadenza: scad.value }); esito.textContent = '✓ ' + v.nota + ' Collegato: da ora i dati si salvano anche su GitHub.'; }
      } catch (e) { esito.textContent = '⚠️ ' + (e.message || 'Verifica non riuscita'); }
    }
    const disegnaToken = (nuovo) => {
      repo.disabled = arch.haToken() && !nuovo;
      if (arch.haToken() && !nuovo) {
        tokenBox.replaceChildren(h('div', { class: 'card info' }, h('p', { class: 'info__t', text: '✓ Token salvato su questo telefono' }),
          h('p', { class: 'hint', text: 'Per cambiare repository scollega prima il token.' }),
          h('div', { class: 'acts' },
            h('button', { type: 'button', class: 'pill', onclick: () => verifica() }, 'Verifica'),
            h('button', { type: 'button', class: 'pill pill--plain', onclick: () => disegnaToken(true) }, 'Sostituisci'),
            h('button', { type: 'button', class: 'pill pill--plain', onclick: () => { arch.scollega(); esito.textContent = 'Scollegato: il token è stato cancellato da questo telefono. I dati restano qui.'; disegnaToken(); } }, 'Scollega'))));
      } else {
        const tok = h('input', { class: 'field', type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Incolla qui il token', 'aria-label': 'Token di GitHub' });
        tokenBox.replaceChildren(tok, h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: async () => {
          const t = tok.value.trim();
          if (!t) { esito.textContent = 'Incolla prima il token.'; return; }
          await verifica(t);
          if (arch.haToken()) { tok.value = ''; disegnaToken(); }
        } }, 'Verifica e collega')));
      }
    };
    disegnaToken();

    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    const ripr = h('div');
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files && fileIn.files[0]; fileIn.value = '';
      if (!f) return;
      let cp;
      try { cp = JSON.parse(await f.text()); arch.controllaCopia(cp); } catch (e) { ripr.replaceChildren(h('p', { class: 'hint', text: '⚠️ ' + (e instanceof SyntaxError ? 'Il file non è leggibile.' : e.message) })); return; }
      const quando = cp.creata ? new Date(cp.creata).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : 'data sconosciuta';
      const n = Object.keys(cp.file).filter((p) => /^giornate\//.test(p)).reduce((s, p) => s + Object.keys((isObj(cp.file[p]) && isObj(cp.file[p].giornate) && cp.file[p].giornate) || {}).length, 0);
      ripr.replaceChildren(h('div', { class: 'card info' },
        h('p', { class: 'info__t', text: 'Copia del ' + quando + (cp.dispositivo ? ' da «' + cp.dispositivo + '»' : '') + ', con ' + n + (n === 1 ? ' giornata.' : ' giornate.') }),
        h('p', { class: 'hint', text: 'Sostituisce i dati di questo telefono' + (arch.haToken() ? ' e, con GitHub collegato, anche quelli su GitHub e sugli altri dispositivi.' : '.') }),
        h('div', { class: 'acts' },
          h('button', { type: 'button', class: 'pill', onclick: () => { try { arch.ripristina(cp); ripr.replaceChildren(h('p', { class: 'hint', text: '✓ Dati ripristinati.' })); } catch (e) { ripr.replaceChildren(h('p', { class: 'hint', text: '⚠️ ' + e.message })); } } }, 'Ripristina'),
          h('button', { type: 'button', class: 'pill pill--plain', onclick: () => ripr.replaceChildren() }, 'Annulla'))));
    });
    const auto = arch.copiaAuto();

    body.append(
      h('p', { class: 'sub', text: 'Salvataggio su GitHub' }),
      h('div', { class: 'card info' }, h('p', { 'data-sync-riga': '' })),
      h('p', { class: 'sub', text: 'Repository dei dati' }), repo,
      h('p', { class: 'sub', text: 'Token' }), tokenBox, esito,
      aiutoToken(),
      h('p', { class: 'sub', text: 'Scadenza del token (facoltativa)' }), scad,
      h('p', { class: 'hint', text: 'GitHub non la comunica all’app: se la scrivi qui, ti avviso una settimana prima.' }),
      h('p', { class: 'sub', text: 'Nome di questo dispositivo' }), disp,
      h('p', { class: 'hint', text: 'Compare nei commit e quando la stessa voce cambia su due dispositivi.' }),
      h('p', { class: 'sub', text: 'Copia dei dati' }),
      h('div', { class: 'acts' },
        h('button', { type: 'button', class: 'pill', onclick: () => scaricaJSON(arch.creaCopia(), 'weekly-menu-dati-' + todayKey() + '.json') }, 'Scarica una copia'),
        h('button', { type: 'button', class: 'pill pill--plain', onclick: () => fileIn.click() }, 'Ripristina da file')),
      fileIn, ripr,
      auto ? h('button', { type: 'button', class: 'textbtn textbtn--sm', onclick: () => scaricaJSON(auto, 'weekly-menu-copia-automatica.json') }, 'Scarica la copia automatica del ' + new Date(auto.creata).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })) : null,
      h('p', { class: 'hint', text: 'La copia contiene tutti i dati ma non il token. Il token resta solo su questo telefono: non finisce nel codice, nel repository, nelle copie o nei messaggi.' }));
    mostraStato(arch.stato());
  }, 'info');
}

/* ---------- genera: qui arriverà il menu fatto dall'AI ---------- */
function viewGenera() {
  return h('div', null,
    testata('Genera', 'Il menu della settimana'),
    h('section', { class: 'hero gen' },
      h('img', { class: 'gen__img', src: 'icon.png', alt: '', width: '88', height: '88' }),
      h('h2', { text: 'Qui nascerà il tuo menu' }),
      h('p', { text: 'Racconterai all’app impegni, attività e gusti della settimana, e l’AI preparerà i pasti giorno per giorno, già in linea con i tuoi obiettivi.' }),
      h('span', { class: 'tag', text: 'In arrivo' })),
    h('p', { class: 'lead', text: 'Intanto trovi un menu di prova nella Giornata e nella Settimana.' }));
}

/* ---------- settimana ---------- */
function viewWeek() {
  const root = h('div'); const t = todayKey();
  root.append(testata('Settimana', 'Dal ' + dayMonth(state.week[0]) + ' al ' + dayMonth(state.week[6])));
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Cosa vedere' });
  for (const [id, name] of [['piano', 'Piano'], ['spesa', 'Lista della spesa']]) seg.append(h('button', { type: 'button', role: 'radio', 'aria-checked': String(state.weekTab === id), onclick: () => { state.weekTab = id; render(); } }, name));
  root.append(seg);
  if (state.weekTab === 'piano') {
    const card = h('div', { class: 'card' });
    for (const k of state.week) {
      const { day, tot, tgt, perfect } = statusOf(k); const acts = attivitaDi(day);
      const names = (id) => { const m = isObj(day.pasti) && day.pasti[id]; const it = isObj(m) ? voci(m) : []; return it.length ? it.slice(0, 2).map(({ e }) => lc(cibo(e.cibo).name)).join(', ') : 'vuoto'; };
      card.append(h('button', { type: 'button', class: 'day', onclick: () => { state.date = k; go('oggi'); } },
        h('span', { class: 'ico', 'aria-hidden': 'true', text: acts.length ? ACT[acts[0].id].ico : '🛋️' }),
        h('span', null, h('span', { class: 'day__name', text: weekdayName(k) + ' ' + dateOf(k).getDate() + (k === t ? ', oggi' : '') }), ' ',
          h('span', { class: 'day__type', text: actsLabel(day) })),
        h('span', { class: 'day__kcal' }, h('b', { text: (perfect ? '⭐ ' : '') + fmt0(tot.kcal) }), 'di ' + fmt0(tgt.kcal)),
        h('span', { class: 'day__prev', text: 'Pranzo: ' + names('pranzo') + '. Cena: ' + names('cena') + '.' })));
    }
    root.append(h('section', { class: 'sect' }, card),
      h('p', { class: 'lead', text: 'Tocca un giorno per aprirlo.' }),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill', onclick: () => go('genera') }, '✨ Genera un nuovo menu')));
  } else {
    const tot = {};
    for (const k of state.week) for (const e of allItems(getDay(k))) tot[e.cibo] = (tot[e.cibo] || 0) + (+e.g || 0);
    const lun = state.week[0];
    const sett = isObj(db.spesa.settimane[lun]) ? db.spesa.settimane[lun] : {};
    const card = h('div', { class: 'card' });
    for (const [id, g] of Object.entries(tot).sort((a, b) => cibo(a[0]).name.localeCompare(cibo(b[0]).name, 'it'))) {
      const box = h('input', { type: 'checkbox', checked: !!sett[id] });
      box.addEventListener('change', () => { sett[id] = box.checked; salvaSpesa(sett); });
      card.append(h('label', { class: 'buy' }, box, emo(cibo(id).ico), h('span', { text: cibo(id).name }), h('span', { text: g >= 1000 ? fmt1(g / 1000) + ' kg' : fmt0(g) + ' g' })));
    }
    root.append(h('section', { class: 'sect' }, card), h('p', { class: 'lead', text: 'Le quantità sono la somma dei sette giorni del piano. Le spunte si salvano settimana per settimana.' }));
  }
  return root;
}

/* ---------- avvio ---------- */
$('#fab').addEventListener('click', () => {
  runAnalysis();
  const c = $('#consigli'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
/* quando l'app va in secondo piano provo a inviare subito; quando torna, controllo GitHub */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { salvaInSospeso(); arch.adesso(); }
  else { controllaGiorno(); arch.adesso(); }
});
window.addEventListener('pagehide', () => { salvaInSospeso(); arch.adesso(); });
window.addEventListener('online', () => arch.adesso());
window.addEventListener('offline', () => mostraStato(arch.stato()));
/* su Android la scheda del browser e l'app installata condividono la memoria: mi allineo */
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith('wm1:file:')) return;
  if (sheetTipo === 'modifica') { ricaricaDopo = true; return; }
  carica(); render();
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

carica();
costruisciSettimana();
render();
arch.adesso();
setInterval(controllaGiorno, 60000); /* se l'app resta aperta a mezzanotte, «Oggi» passa al giorno nuovo */
})();
