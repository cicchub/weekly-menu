/* Weekly Menu · app.js
   L'interfaccia. Il piano della settimana arriva da fuori (preparato con Claude) e si importa: piano.js lo legge,
   archivio.js salva tutto sul telefono e, se GitHub è collegato, nel repository privato dei dati. */
(() => {
'use strict';
const P = window.Piano;

/* ---------- costanti ---------- */
const MACROS = [
  { key: 'kcal', name: 'Calorie', short: 'kcal', unit: ' kcal', w: 2, col: 'var(--m-kcal)' },
  { key: 'proteine', name: 'Proteine', short: 'Prot.', unit: ' g', w: 1.6, col: 'var(--m-p)' },
  { key: 'carboidrati', name: 'Carboidrati', short: 'Carb.', unit: ' g', w: 1, col: 'var(--m-c)' },
  { key: 'grassi', name: 'Grassi', short: 'Grassi', unit: ' g', w: 1, col: 'var(--m-g)' },
  { key: 'fibre', name: 'Fibre', short: 'Fibre', unit: ' g', w: 0.3, col: 'var(--m-f)' },
];
const MK = Object.fromEntries(MACROS.map((m) => [m.key, m]));
const ICO_PASTO = { colazione: '☕', spuntino_mattina: '🍏', pranzo: '🍽️', spuntino_pomeriggio: '🥜', cena: '🌙' };
const A_PASTO = { colazione: 'a colazione', spuntino_mattina: 'allo spuntino della mattina', pranzo: 'a pranzo', spuntino_pomeriggio: 'allo spuntino del pomeriggio', cena: 'a cena' };
const ICO_TIPO = { riposo: '🛋️', palestra: '🏋️', apnea: '🤿' };
const EXTRA_MEALS = [
  { name: 'Pre-allenamento', ico: '⚡', time: '17:30' },
  { name: 'Post-allenamento', ico: '💪', time: '19:00' },
  { name: 'Spuntino serale', ico: '🍵', time: '22:00' },
];
const LINK_FORMATO = 'https://github.com/cicchub/weekly-menu/blob/main/FORMATO.md';
const OBIETTIVI_INIZIALI = P.OBIETTIVI_INIZIALI;

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
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', chev: 'M9 6l6 6-6 6', back: 'M15 6l-6 6 6 6', check: 'M5 12.5l4.5 4.5L19 7.5', swap: 'M7 7h11l-3-3M17 17H6l3 3',
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
/* il nome del macro, sempre scritto, con il suo colore accanto */
const macroTag = (m, text) => h('span', { class: 'mt', style: '--mc:' + m.col }, h('i', { 'aria-hidden': 'true' }), text || m.name);

/* ---------- date (sempre locali, mai in UTC) ---------- */
const keyOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const shiftKey = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
const todayKey = () => keyOf(new Date());
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const weekdayName = (k) => cap(new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(dateOf(k)));
const dayMonth = (k) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(dateOf(k));
const giornoBreve = (k) => cap(new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(dateOf(k)));
const giornoCorto = (k) => cap(new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric' }).format(dateOf(k)));
const ddmm = (k) => k.slice(8, 10) + '/' + k.slice(5, 7);
function mondayOf(k) { const d = dateOf(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return keyOf(d); }
const weekOf = (k) => { const mon = mondayOf(k); return Array.from({ length: 7 }, (_, i) => shiftKey(mon, i)); };
function dayTitle(k) { const t = todayKey(); return k === t ? 'Oggi' : k === shiftKey(t, 1) ? 'Domani' : k === shiftKey(t, -1) ? 'Ieri' : weekdayName(k); }
function rangeTxt(a, b) {
  const A = dateOf(a); const B = dateOf(b);
  if (A.getMonth() === B.getMonth()) return A.getDate() + '–' + dayMonth(b);
  return dayMonth(a) + ' – ' + dayMonth(b);
}
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
const db = { alimenti: null, obiettivi: null, mesi: {}, settimane: {}, spesa: null, foto: {} };
const vuoti = {};
let sheetTipo = null, sheetDraw = null, ricaricaDopo = false;

/* regole di unione: un alimento in un pasto, un'alternativa e la stima di un pasto libero si confrontano interi;
   per una giornata che manca nella base si usa la giornata vuota, uguale su ogni telefono */
function regole(path) {
  if (!/^giornate\//.test(path)) return null;
  return {
    atomic: (x) => (x.length === 6 && x[2] === 'pasti' && (x[4] === 'alimenti' || x[4] === 'alternative')) || (x.length === 5 && x[2] === 'pasti' && x[4] === 'stima'),
    baseFor: (x) => (x.length === 2 && x[0] === 'giornate' && /^\d{4}-\d{2}-\d{2}$/.test(x[1]) ? P.giornoVuoto() : undefined),
  };
}
function haDatiUtente() {
  if (Object.values(db.mesi).some((m) => Object.keys(m.giornate).length)) return true;
  if (Object.keys(db.settimane).length || Object.keys(db.spesa.righe).length || Object.keys(db.alimenti.alimenti).length) return true;
  return !Archivio.uguale(db.obiettivi, OBIETTIVI_INIZIALI);
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

/* ---------- dati in uso ---------- */
let ANAG = {}, OB = OBIETTIVI_INIZIALI, TOLL = P.TOLLERANZE, TIPI = [], USO = { conta: {}, pasto: {} };
const SCONOSCIUTO = { nome: 'Alimento sconosciuto', per_100g: {}, porzione_g: 100 };
const cibo = (id) => ANAG[id] || SCONOSCIUTO;
const nomeDi = (id) => (ANAG[id] ? ANAG[id].nome : 'Alimento sconosciuto');
function deriva() {
  ANAG = {};
  for (const [id, r] of Object.entries(db.alimenti.alimenti)) if (isObj(r) && typeof r.nome === 'string') ANAG[id] = r;
  OB = db.obiettivi; TOLL = P.tolleranze(OB);
  const tipi = isObj(OB.tipi) ? OB.tipi : OBIETTIVI_INIZIALI.tipi;
  const ordine = ['riposo', 'palestra', 'apnea'];
  TIPI = Object.keys(tipi).filter((k) => isObj(tipi[k])).sort((a, b) => ((ordine.indexOf(a) + 1) || 99) - ((ordine.indexOf(b) + 1) || 99))
    .map((id) => ({ id, name: String(tipi[id].nome || cap(id)), ico: ICO_TIPO[id] || '📅' }));
  /* quanto usi ogni alimento, e in quale pasto: serve ai consigli e ai «più usati» */
  USO = { conta: {}, pasto: {} };
  for (const m of Object.values(db.mesi)) for (const day of Object.values(m.giornate)) {
    if (!isObj(day) || !isObj(day.pasti)) continue;
    for (const [mid, pasto] of Object.entries(day.pasti)) for (const { e } of P.vociDi(pasto)) {
      USO.conta[e.cibo] = (USO.conta[e.cibo] || 0) + 1;
      const pp = USO.pasto[e.cibo] || (USO.pasto[e.cibo] = {}); pp[mid] = (pp[mid] || 0) + 1;
    }
  }
  for (const k of Object.keys(vuoti)) delete vuoti[k];
}
/* la nuova versione riparte da zero: i file nel formato vecchio si svuotano, dopo una copia di sicurezza */
function migra() {
  const vecchi = arch.elenco().filter((p) => { const v = arch.leggi(p); return isObj(v) && !(v.schema >= 2); });
  if (!vecchi.length) return false;
  arch.copiaDiSicurezza();
  for (const p of vecchi) {
    if (p === 'alimenti.json') salvaFile(p, { schema: 2, alimenti: {} }, 'si riparte da zero');
    else if (p === 'obiettivi.json') salvaFile(p, clona(OBIETTIVI_INIZIALI), 'si riparte da zero');
    else if (/^giornate\//.test(p)) salvaFile(p, { schema: 2, giornate: {} }, 'si riparte da zero');
    else if (p === 'spesa.json') salvaFile(p, { schema: 2, righe: {} }, 'si riparte da zero');
    else { const v = arch.leggi(p); v.schema = 2; salvaFile(p, v); }
  }
  return true;
}
function carica() {
  const migrato = migra();
  let a = arch.leggi('alimenti.json');
  if (!isObj(a) || !isObj(a.alimenti)) { a = { schema: 2, alimenti: {} }; salvaFile('alimenti.json', a, 'alimenti'); }
  db.alimenti = a;
  let o = arch.leggi('obiettivi.json');
  if (!isObj(o) || !isObj(o.tipi)) { o = clona(OBIETTIVI_INIZIALI); salvaFile('obiettivi.json', o, 'obiettivi'); }
  db.obiettivi = o;
  let s = arch.leggi('spesa.json');
  if (!isObj(s) || !isObj(s.righe)) { s = { schema: 2, righe: {} }; salvaFile('spesa.json', s, 'spesa'); }
  db.spesa = s;
  db.mesi = {}; db.settimane = {}; db.foto = {};
  for (const p of arch.elenco()) {
    let m;
    if ((m = p.match(/^giornate\/(\d{4}-\d{2})\.json$/))) { const v = arch.leggi(p); if (isObj(v) && isObj(v.giornate)) db.mesi[m[1]] = v; }
    else if ((m = p.match(/^settimane\/(\d{4}-\d{2}-\d{2})\.json$/))) { const v = arch.leggi(p); if (isObj(v) && v.dal) db.settimane[m[1]] = v; }
    else if ((m = p.match(/^foto\/(.+)\.json$/))) { const v = arch.leggi(p); if (isObj(v) && typeof v.immagine === 'string' && v.immagine.startsWith('data:image/')) db.foto[m[1]] = v.immagine; }
  }
  deriva();
  if (migrato) setTimeout(() => avviso('Nuova versione: si riparte da zero. Una copia dei dati di prima è in Impostazioni.'), 300);
}
const salvaAlimenti = (nota) => salvaFile('alimenti.json', db.alimenti, nota || 'alimenti');
const salvaSpesa = (nota) => salvaFile('spesa.json', db.spesa, nota || 'spesa');

/* ---------- giornate ---------- */
const meseDi = (k) => k.slice(0, 7);
function giornoSalvato(k) { const m = db.mesi[meseDi(k)]; const d = m && m.giornate[k]; return isObj(d) ? d : undefined; }
function getDay(k) { return giornoSalvato(k) || vuoti[k] || (vuoti[k] = P.giornoVuoto()); }
/* l'unica via per salvare una giornata: la prima volta la giornata vuota entra nel file del mese */
function salvaGiorno(k, nota) {
  const mk = meseDi(k);
  const file = db.mesi[mk] || (db.mesi[mk] = { schema: 2, giornate: {} });
  if (!file.giornate[k]) { file.giornate[k] = getDay(k); delete vuoti[k]; }
  salvaFile('giornate/' + mk + '.json', file, nota || 'giornata ' + ddmm(k));
}
function scriviGiorno(k, day) {
  const mk = meseDi(k);
  const file = db.mesi[mk] || (db.mesi[mk] = { schema: 2, giornate: {} });
  file.giornate[k] = day; delete vuoti[k];
}
let timerLento = null, lentoK = null;
function salvaLento(k) { lentoK = k; if (timerLento) return; timerLento = setTimeout(() => { timerLento = null; salvaGiorno(lentoK); }, 400); }
function salvaInSospeso() { if (timerLento) { clearTimeout(timerLento); timerLento = null; salvaGiorno(lentoK); } }

const ORDINE_PASTI = Object.fromEntries(P.ID_PASTI.map((id, i) => [id, i]));
const pastiDi = (day) => Object.entries(isObj(day.pasti) ? day.pasti : {}).filter(([, m]) => isObj(m)).map(([id, m]) => ({ id, m }))
  .sort((a, b) => String(a.m.ora || '').localeCompare(String(b.m.ora || '')) || ((ORDINE_PASTI[a.id] ?? 9) - (ORDINE_PASTI[b.id] ?? 9)) || a.id.localeCompare(b.id));
const voci = P.vociDi;
const allItems = (day) => pastiDi(day).filter(({ m }) => !m.libero).flatMap(({ m }) => voci(m).map(({ e }) => e));
const icoPasto = (mid, m) => (m.extra ? m.ico || '🍴' : ICO_PASTO[mid] || '🍴');
const tipoDi = (day) => TIPI.find((t) => t.id === day.tipo) || TIPI.find((t) => t.id === 'riposo') || TIPI[0];
const alternativeDi = (m) => Object.entries(isObj(m.alternative) ? m.alternative : {}).filter(([, a]) => isObj(a) && isObj(a.alimenti)).sort((x, y) => x[0].localeCompare(y[0]));

/* ---------- calcoli ---------- */
const scale = (id, g) => P.perGrammi(cibo(id), g);
const sumItems = (items) => items.reduce((acc, e) => P.somma(acc, scale(e.cibo, +e.g || 0)), P.zero());
const totPasto = (m) => P.totalePasto(m, ANAG);
const totals = (day) => P.totaleGiorno(day, ANAG);
const targetOf = (day) => P.obiettivoDi(day, OB);
const fuoriDi = (tot, tgt) => P.fuori(tot, tgt, TOLL);
const stepOf = (id) => ((+cibo(id).porzione_g || 100) >= 60 ? 10 : 5);
const roundTo = (g, st) => Math.max(st, Math.round(g / st) * st);
function statusOf(k) {
  const day = getDay(k); const tot = totals(day); const tgt = targetOf(day); const f = fuoriDi(tot, tgt);
  return { day, tot, tgt, fuori: f, ok: !f.length, pieno: P.haContenuto(day) };
}
/* l'errore pesa solo quello che conta: per proteine e fibre stare sopra va bene */
function errorOf(tot, tgt) {
  let e = 0;
  for (const m of MACROS) {
    const t = tgt[m.key] || 1; let r = (tot[m.key] - t) / t; const reg = TOLL[m.key];
    if (reg.regola === 'almeno') r = Math.min(0, r);
    else r = Math.sign(r) * Math.max(0, Math.abs(r) - (reg.percento / 100) * 0.4);
    e += m.w * r * r;
  }
  return e;
}
function categoriaDi(id) {
  const v = P.valori(cibo(id));
  if (v.kcal < 45) return 'verdura';
  const e = { proteine: v.proteine * 4, carboidrati: v.carboidrati * 4, grassi: v.grassi * 9 };
  return Object.keys(e).sort((a, b) => e[b] - e[a])[0];
}
function piuUsati(n) {
  const usati = Object.keys(ANAG).filter((id) => USO.conta[id]).sort((a, b) => USO.conta[b] - USO.conta[a] || nomeDi(a).localeCompare(nomeDi(b), 'it'));
  const altri = Object.keys(ANAG).filter((id) => !USO.conta[id]).sort((a, b) => nomeDi(a).localeCompare(nomeDi(b), 'it'));
  return usati.concat(altri).slice(0, n);
}

/* ---------- foto degli alimenti ---------- */
function iniziale(id) {
  const n = nomeDi(id).trim();
  return h('span', { class: 'th th--ini', 'aria-hidden': 'true', text: (n.match(/[A-Za-zÀ-ÿ0-9]/) || ['?'])[0].toUpperCase() });
}
function thumb(id, extra) {
  const src = db.foto[id] || (ANAG[id] && typeof ANAG[id].foto === 'string' && /^https:\/\//.test(ANAG[id].foto) ? ANAG[id].foto : null);
  if (!src) { const s = iniziale(id); if (extra) s.classList.add(extra); return s; }
  const img = h('img', { class: 'th' + (extra ? ' ' + extra : ''), src, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => { const s = iniziale(id); if (extra) s.classList.add(extra); img.replaceWith(s); });
  return img;
}
/* dalla foto trovata online ricavo una miniatura quadrata di pochi KB, che si salva con i dati e si vede anche offline */
function miniatura(src) {
  return new Promise((ok) => {
    const img = new Image(); let fatto = false;
    const fine = (v) => { if (!fatto) { fatto = true; clearTimeout(t); ok(v); } };
    const t = setTimeout(() => fine(null), 15000);
    img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const L = 160; const c = document.createElement('canvas'); c.width = L; c.height = L;
        const x = c.getContext('2d'); const w = img.naturalWidth; const hh = img.naturalHeight; const s = Math.min(w, hh);
        if (!s) { fine(null); return; }
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, L, L);
        x.drawImage(img, (w - s) / 2, (hh - s) / 2, s, s, 0, 0, L, L);
        fine(c.toDataURL('image/jpeg', 0.82));
      } catch (e) { fine(null); } /* il sito non permette di salvarla */
    };
    img.onerror = () => fine(null);
    img.src = src;
  });
}
function siVede(src) {
  return new Promise((ok) => {
    const img = new Image(); const t = setTimeout(() => ok(false), 15000);
    img.referrerPolicy = 'no-referrer';
    img.onload = () => { clearTimeout(t); ok(true); }; img.onerror = () => { clearTimeout(t); ok(false); };
    img.src = src;
  });
}
async function provaFoto(src) {
  const dati = await miniatura(src);
  if (dati) return { stato: 'salvata', dati };
  if (/^https:/.test(src) && await siVede(src)) return { stato: 'dal-sito' };
  return { stato: 'non-trovata' };
}

/* ---------- consigli: fino a tre mosse per rientrare negli obiettivi ---------- */
function mealFor(day, food) {
  const aperti = pastiDi(day).filter(({ m }) => !m.mangiato && !m.libero);
  if (!aperti.length) return null;
  const pref = USO.pasto[food];
  if (pref) {
    const best = Object.keys(pref).sort((a, b) => pref[b] - pref[a]).find((mid) => aperti.some((x) => x.id === mid));
    if (best) return aperti.find((x) => x.id === best);
  }
  const porz = scale(food, +cibo(food).porzione_g || 100).kcal;
  const pool = porz < 250 ? ['spuntino_mattina', 'spuntino_pomeriggio'] : ['pranzo', 'cena'];
  let list = aperti.filter(({ id, m }) => (m.extra ? porz < 250 : pool.includes(id)));
  if (!list.length) list = aperti;
  let best = null; let low = Infinity;
  for (const x of list) { const kc = totPasto(x.m).kcal; if (kc < low) { low = kc; best = x; } }
  return best;
}
function toMeal(mid, m) { return !m.extra && A_PASTO[mid] ? A_PASTO[mid] : 'a «' + m.nome + '»'; }
function analyze(k) {
  const day = getDay(k); const tgt = targetOf(day); const start = totals(day);
  let tot = start; const moves = []; const touched = new Set(); let adds = 0;
  const present = new Set(allItems(day).map((e) => e.cibo));
  /* aggiunte: prima gli alimenti che usi più spesso */
  const usati = Object.keys(ANAG).filter((id) => USO.conta[id]).sort((a, b) => USO.conta[b] - USO.conta[a]);
  const cands = usati.slice(0, 15).map((id, i) => ({ id, pen: 1 + i * 0.01 }))
    .concat(Object.keys(ANAG).filter((id) => !usati.slice(0, 15).includes(id)).map((id) => ({ id, pen: 1.15 })));
  for (let step = 0; step < 3 && fuoriDi(tot, tgt).length; step++) {
    const cur = errorOf(tot, tgt); let best = null;
    const consider = (mv, delta) => {
      const t = P.somma(tot, delta); const err = errorOf(t, tgt) * (mv.pen || 1);
      if (errorOf(t, tgt) < cur * 0.93 && (!best || err < best.score)) best = Object.assign({}, mv, { score: err, t, delta });
    };
    for (const { id: mid, m } of pastiDi(day)) {
      if (m.mangiato || m.libero) continue;
      for (const { id: eid, e } of voci(m)) {
        if (touched.has(mid + '/' + eid) || !ANAG[e.cibo]) continue;
        const st = stepOf(e.cibo);
        for (const mult of [2, 1.5, 1.25, 0.75, 0.5]) {
          const g = roundTo(e.g * mult, st);
          if (g !== e.g) consider({ kind: g > e.g ? 'inc' : 'dec', meal: mid, entry: eid, food: e.cibo, from: e.g, g }, scale(e.cibo, g - e.g));
        }
      }
    }
    if (adds < 2) for (const c of cands) {
      if (present.has(c.id)) continue;
      const meal = mealFor(day, c.id); if (!meal) continue;
      const porz = +cibo(c.id).porzione_g || 100;
      for (const part of [1, 0.5]) { const g = roundTo(porz * part, stepOf(c.id)); consider({ kind: 'add', meal: meal.id, food: c.id, g, pen: c.pen }, scale(c.id, g)); }
    }
    if (!best) break;
    moves.push(best); tot = best.t;
    if (best.entry) touched.add(best.meal + '/' + best.entry);
    if (best.kind === 'add') { adds++; present.add(best.food); }
  }
  for (const mv of moves) {
    const m = day.pasti[mv.meal]; const fn = lc(nomeDi(mv.food));
    if (mv.kind === 'add') { mv.title = 'Aggiungi ' + fn + ' ' + toMeal(mv.meal, m); mv.detail = fmt0(mv.g) + ' g'; }
    else { mv.title = (mv.kind === 'inc' ? 'Più ' : 'Meno ') + fn + ' ' + toMeal(mv.meal, m); mv.detail = 'da ' + fmt0(mv.from) + ' a ' + fmt0(mv.g) + ' g'; }
  }
  const locked = pastiDi(day).filter(({ m }) => m.mangiato || m.libero).length;
  return { moves, start, after: tot, tgt, fuori: fuoriDi(start, tgt), dopo: fuoriDi(tot, tgt), locked, allLocked: locked === pastiDi(day).length };
}
function applyMove(k, mv) {
  const day = getDay(k); const m = day.pasti[mv.meal];
  if (!isObj(m) || m.mangiato || m.libero) return false;
  if (!isObj(m.alimenti)) m.alimenti = {};
  if (mv.kind === 'add') m.alimenti[nuovoId()] = { cibo: mv.food, g: mv.g };
  else { const e = m.alimenti[mv.entry]; if (!isObj(e)) return false; e.g = mv.g; }
  return true;
}
function effetto(delta) {
  const parti = MACROS.filter((x) => Math.abs(delta[x.key]) >= (x.key === 'kcal' ? 5 : 1)).map((x) =>
    h('span', { class: 'eff' }, macroTag(x, x.key === 'kcal' ? 'kcal' : lc(x.name)), ' ' + signed(delta[x.key]) + (x.key === 'kcal' ? '' : ' g')));
  return parti.length ? h('span', { class: 'effs' }, parti) : null;
}
function testoFuori(f) { return f.map(P.descriviFuori).join(' · '); }
function coachKids(k) {
  const st = statusOf(k);
  if (!st.pieno) return [];
  if (st.ok) return [h('p', { class: 'coach__msg', text: '⭐ Sei dentro le tolleranze di tutti gli obiettivi.' })];
  const a = analyze(k); const kids = [];
  kids.push(h('p', { class: 'coach__msg', text: 'Fuori tolleranza: ' + testoFuori(a.fuori) + '.' }));
  if (a.moves.length) {
    kids.push(h('p', { class: 'coach__sub', text: a.moves.length === 1 ? 'Per rientrare cambierei questo:' : 'Per rientrare cambierei queste cose, in quest’ordine:' }));
    for (const mv of a.moves) {
      kids.push(h('div', { class: 'sugg' }, thumb(mv.food),
        h('div', { class: 'sugg__t' }, h('b', { text: mv.title }), h('span', { class: 'sugg__d', text: mv.detail }), effetto(mv.delta)),
        h('button', { type: 'button', class: 'pill', 'data-k': 'mv-' + mv.meal + '-' + (mv.entry || mv.food), onclick: () => { if (applyMove(k, mv)) { salvaGiorno(k, 'consigli ' + ddmm(k)); render(); } } }, 'Applica')));
    }
    kids.push(h('p', { class: 'coach__after', text: a.dopo.length ? 'Con queste modifiche resterebbe fuori: ' + testoFuori(a.dopo) + '.' : 'Con ' + (a.moves.length === 1 ? 'questa modifica' : 'queste modifiche') + ' rientri in tutte le tolleranze.' }));
    if (a.moves.length > 1) kids.push(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--soft pill--wide', onclick: () => { a.moves.forEach((mv) => applyMove(k, mv)); salvaGiorno(k, 'consigli ' + ddmm(k)); render(); } }, 'Applica tutte')));
  } else kids.push(h('p', { class: 'coach__sub', text: a.allLocked ? 'Tutti i pasti sono già mangiati o liberi: non ho modifiche da proporre.' : 'Non trovo una modifica semplice che aiuti: prova a cambiare un alimento a mano.' }));
  if (a.locked && !a.allLocked) kids.push(h('p', { class: 'coach__sub', text: 'Non tocco i pasti già mangiati e i pasti liberi.' }));
  return kids;
}

/* ---------- capire una frase: «150 g di riso e 2 uova» ---------- */
const NUMW = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, mezzo: 0.5, mezza: 0.5 };
const UNIT = '(kg|chili|chilo|etti|etto|hg|grammi|grammo|gr|g)';
function gramsOf(n, u, f) {
  if (u === 'kg' || u === 'chili' || u === 'chilo') return n * 1000;
  if (u === 'etti' || u === 'etto' || u === 'hg') return n * 100;
  if (u || n >= 20) return n;
  return n * (+f.porzione_g || 100);
}
function paroleChiave() {
  const out = [];
  for (const [id, f] of Object.entries(ANAG)) {
    const kws = new Set([P.chiaveNome(f.nome)]);
    for (const p of Array.isArray(f.parole) ? f.parole : []) kws.add(P.chiaveNome(p));
    const primo = P.chiaveNome(f.nome).split(' ')[0]; if (primo && primo.length >= 4) kws.add(primo);
    for (const kw of kws) if (kw) out.push({ id, kw });
  }
  return out;
}
function parseFoods(text) {
  /* la virgola tra due cifre è un decimale («1,5 etti»), non un separatore */
  const t = norm(text).replace(/['’]/g, ' ').replace(/(\d),(\d)/g, '$1.$2');
  const chunks = (' ' + t + ' ').split(/,|\+|;| e | con | piu /).map((s) => s.trim()).filter(Boolean);
  const kws = paroleChiave(); const out = [];
  for (const ch of chunks) {
    const ck = ' ' + P.chiaveNome(ch) + ' ';
    let best = null;
    for (const x of kws) if (ck.includes(' ' + x.kw + ' ') && (!best || x.kw.length > best.kw.length)) best = x;
    if (!best) continue;
    const f = ANAG[best.id]; let g = +f.porzione_g || 100;
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
  const cat = categoriaDi(e.cibo);
  const key = cat === 'verdura' ? 'kcal' : cat;
  const amount = P.valori(cibo(e.cibo))[key] * e.g / 100;
  const label = { carboidrati: 'Stessi carboidrati', proteine: 'Stesse proteine', grassi: 'Stessi grassi', kcal: 'Stesse calorie' }[key];
  const list = Object.keys(ANAG).filter((id) => id !== e.cibo && categoriaDi(id) === cat && P.valori(ANAG[id])[key] > 0)
    .sort((a, b) => (USO.conta[b] || 0) - (USO.conta[a] || 0))
    .map((id) => ({ id, g: roundTo(amount / P.valori(ANAG[id])[key] * 100, stepOf(id)) })).slice(0, 4);
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
    h('div', { class: 'top__l' }, h('h1', { text: titolo }), sotto ? h('p', { text: sotto }) : null),
    h('div', { class: 'top__r' },
      h('button', { type: 'button', class: 'sync', 'data-sync': '', onclick: apriStato }),
      h('button', { type: 'button', class: 'round', 'aria-label': 'Impostazioni', onclick: apriImpostazioni }, icon('gear'))));
}

/* ---------- navigazione ---------- */
const state = { date: todayKey(), card: 0, settimana: mondayOf(todayKey()), weekTab: 'piano', bdMacro: 'kcal', cerca: '', imp: null };
let oggiVisto = todayKey();
const VIEWS = ['oggi', 'importa', 'settimana', 'alimenti'];
const current = () => { const v = (location.hash || '').replace('#', ''); return VIEWS.includes(v) ? v : 'oggi'; };
function go(v) { if (current() === v) render(); else location.hash = v; }
/* l'app può riaprirsi dopo mezzanotte: ricalcolo «oggi» */
function controllaGiorno() {
  const t = todayKey(); if (t === oggiVisto) return;
  const eraOggi = state.date === oggiVisto; oggiVisto = t;
  if (eraOggi) state.date = t;
  render();
}
let dopoRender = [], osservatore = null;
function render() {
  const v = current();
  document.querySelectorAll('.dock a').forEach((a) => { if (a.dataset.tab === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  /* tengo posizione e fuoco: ridisegnare non deve far saltare lo schermo */
  const y = window.scrollY; const att = document.activeElement; const fk = att && att.getAttribute && att.getAttribute('data-k');
  dopoRender = [];
  const view = $('#view');
  if (v === 'settimana') view.replaceChildren(viewWeek());
  else if (v === 'importa') view.replaceChildren(viewImporta());
  else if (v === 'alimenti') view.replaceChildren(viewAlimenti());
  else view.replaceChildren(viewDay());
  for (const f of dopoRender) f();
  if (y && document.documentElement.scrollHeight > y) window.scrollTo(0, y);
  if (fk) { const n = view.querySelector('[data-k="' + CSS.escape(fk) + '"]'); if (n) try { n.focus({ preventScroll: true }); } catch (e) { /* niente */ } }
  mostraStato(arch.stato());
}

/* ---------- giornata ---------- */
function gaugeSvg(pct, col) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 220 122'); s.setAttribute('aria-hidden', 'true');
  const p = (cls) => { const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('class', cls); e.setAttribute('d', 'M20 110 A90 90 0 0 1 200 110'); e.setAttribute('pathLength', '100'); return e; };
  const bg = p('g-bg'); const fg = p('g-fg');
  fg.setAttribute('stroke-dasharray', Math.min(100, pct) + ' 100'); fg.style.stroke = col; if (pct < 1) fg.style.opacity = '0';
  s.append(bg, fg);
  return s;
}
function schedaMacro(m, tot, tgt, f, pieno) {
  const v = tot[m.key]; const t = tgt[m.key]; const left = t - v; const fm = pieno ? f.find((x) => x.chiave === m.key) : null;
  const unita = m.key === 'kcal' ? 'kcal' : 'g';
  const big = left > 0 ? fmtM(m, left) : fmtM(m, -left);
  const lab = left > 0 ? unita + ' ancora da mangiare' : left < 0 ? unita + ' oltre l’obiettivo' : 'obiettivo centrato';
  const stato = !pieno ? 'Ancora niente nel piano' : fm ? 'Fuori tolleranza: ' + P.descriviFuori(fm).replace(P.NOMI_MACRO[m.key] + ' ', '') : 'Dentro la tolleranza';
  return h('button', { type: 'button', class: 'scheda' + (fm ? ' scheda--fuori' : ''), style: '--mc:' + (fm && fm.verso === 'sopra' ? 'var(--over)' : m.col), 'data-k': 'scheda-' + m.key,
    'aria-label': m.name + ': ' + fmtM(m, v) + ' su ' + fmt0(t) + m.unit + '. ' + stato + '. Apri lo spaccato', onclick: () => openDayBreakdown(m.key) },
    h('span', { class: 'scheda__k' }, macroTag(m)),
    h('span', { class: 'gauge' }, gaugeSvg(t > 0 ? v / t * 100 : 0, 'var(--mc)'),
      h('span', { class: 'gauge__mid' }, h('span', { class: 'gauge__n', text: big }), h('span', { class: 'gauge__l', text: lab }))),
    h('span', { class: 'scheda__row' }, h('span', null, 'Nel piano', h('b', { text: fmtM(m, v) + m.unit })), h('span', null, 'Obiettivo', h('b', { text: fmt0(t) + m.unit }))),
    h('span', { class: 'scheda__stato' + (fm ? ' scheda__stato--fuori' : '') }, (!pieno ? '' : fm ? '⚠️ ' : '✓ ') + stato));
}
function viewDay() {
  const key = state.date; const st = statusOf(key); const { day, tot, tgt, fuori: f } = st; const title = dayTitle(key);
  const root = h('div');
  root.append(testata(title, (title === weekdayName(key) ? '' : weekdayName(key) + ' ') + dayMonth(key)));

  const strip = h('div', { class: 'strip' });
  for (const k of weekOf(key)) {
    const s = statusOf(k);
    strip.append(h('button', { type: 'button', class: 'sd' + (s.pieno ? (s.ok ? ' perfect' : ' partial') : ''), 'data-k': 'sd-' + k, 'aria-pressed': String(k === key),
      'aria-label': weekdayName(k) + ' ' + dayMonth(k) + (s.pieno ? (s.ok ? ', dentro le tolleranze' : ', fuori tolleranza') : ''), onclick: () => { state.date = k; render(); } },
      h('span', { text: weekdayName(k).charAt(0) }), h('span', { class: 'sd__n', text: String(dateOf(k).getDate()) })));
  }
  root.append(strip);

  const tipo = tipoDi(day);
  root.append(h('button', { type: 'button', class: 'actc', 'data-k': 'tipo', onclick: openTipo, 'aria-label': 'Tipo di giornata: ' + tipo.name + (day.serata_impegnata ? ', serata impegnata' : '') + '. Tocca per cambiarlo' },
    h('span', { class: 'actc__ico', 'aria-hidden': 'true' }, h('span', { text: tipo.ico })),
    h('span', null, h('b', { text: tipo.name }), h('small', { text: 'Obiettivo ' + fmt0(tgt.kcal) + ' kcal' + (day.serata_impegnata ? ' · serata impegnata' : '') })),
    icon('chev')));

  /* riepilogo a schede, da scorrere di lato */
  const track = h('div', { class: 'car__track', id: 'car' }, MACROS.map((m) => schedaMacro(m, tot, tgt, f, st.pieno)));
  const dots = h('div', { class: 'dots' }, MACROS.map((m, i) => h('button', { type: 'button', class: 'dot', style: '--mc:' + m.col, 'aria-label': 'Mostra ' + m.name, 'aria-current': String(i === state.card),
    onclick: () => { track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); } })));
  const car = h('section', { class: 'car', 'aria-label': 'Riepilogo della giornata: calorie, proteine, carboidrati, grassi e fibre' }, track, dots);
  let tScroll = null;
  track.addEventListener('scroll', () => {
    clearTimeout(tScroll);
    tScroll = setTimeout(() => {
      const i = Math.max(0, Math.min(MACROS.length - 1, Math.round(track.scrollLeft / (track.clientWidth || 1))));
      state.card = i; dots.querySelectorAll('.dot').forEach((d, j) => d.setAttribute('aria-current', String(i === j)));
    }, 60);
  }, { passive: true });
  dopoRender.push(() => { track.scrollLeft = state.card * track.clientWidth; });
  root.append(car);

  /* riga compatta in alto, quando le schede escono dallo schermo */
  const barra = h('button', { type: 'button', class: 'barra', 'aria-hidden': 'true', tabindex: '-1', onclick: () => openDayBreakdown(MACROS[state.card].key) },
    MACROS.map((m) => h('span', { class: 'barra__c' + (st.pieno && f.some((x) => x.chiave === m.key) ? ' barra__c--fuori' : '') }, macroTag(m, m.short), h('b', { text: fmtM(m, tot[m.key]) }))));
  root.append(barra);
  if ('IntersectionObserver' in window) dopoRender.push(() => {
    if (osservatore) osservatore.disconnect();
    osservatore = new IntersectionObserver(([en]) => { barra.classList.toggle('su', !en.isIntersecting && en.boundingClientRect.top < 0); }, { threshold: 0 });
    osservatore.observe(car);
  });

  if (!st.pieno) root.append(h('div', { class: 'card info vuoto' },
    h('p', { class: 'info__t', text: 'Nessun piano per questo giorno' }),
    h('p', { class: 'hint', text: 'Importa il piano della settimana preparato con Claude, oppure aggiungi gli alimenti a mano.' }),
    h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill', onclick: () => go('importa') }, 'Importa il piano'))));

  for (const { id: mid, m } of pastiDi(day)) root.append(mealNode(key, day, mid, m));
  root.append(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--soft pill--wide', onclick: openAddMeal }, '+ Aggiungi un pasto')));
  const coach = coachKids(key);
  if (coach.length) root.append(h('section', { class: 'sect', id: 'consigli' }, h('div', { class: 'sect__head' }, h('h2', { text: 'Consigli' })), h('div', { class: 'card coach' }, coach)));
  return root;
}
function mealNode(key, day, mid, m) {
  const sm = totPasto(m); const items = voci(m); const alts = alternativeDi(m);
  const check = h('button', { type: 'button', class: 'check', 'data-k': 'check-' + mid, 'aria-pressed': String(!!m.mangiato), 'aria-label': m.nome + ': già mangiato', title: 'Già mangiato',
    onclick: () => { m.mangiato = !m.mangiato; salvaGiorno(key); render(); } }, icon('check'));
  const somma = m.libero ? '≈ ' + fmt0(sm.kcal) + ' kcal · ' + fmt0(sm.proteine) + ' g proteine'
    : items.length ? fmt0(sm.kcal) + ' kcal · ' + fmt0(sm.proteine) + ' g proteine' : 'niente in programma';
  const sec = h('section', { class: 'meal' + (m.mangiato ? ' eaten' : '') + (m.libero ? ' meal--libero' : ''), 'data-meal': mid },
    h('div', { class: 'meal__head' + (m.libero ? ' meal__head--2' : '') },
      h('button', { type: 'button', class: 'meal__open', 'data-k': 'open-' + mid, 'aria-label': m.nome + ', alle ' + m.ora + ': apri il pasto', onclick: () => openMealBreakdown(mid) },
        h('span', { class: 'ico', 'aria-hidden': 'true', text: icoPasto(mid, m) }),
        h('span', null, h('span', { class: 'meal__name', text: m.nome }), h('span', { class: 'meal__sum', text: m.ora + ' · ' + somma }))),
      check,
      m.libero ? null : h('button', { type: 'button', class: 'plus', 'data-k': 'plus-' + mid, 'aria-label': 'Aggiungi ' + toMeal(mid, m), onclick: () => openAdd(mid) }, icon('plus'))));
  if (m.libero) {
    sec.append(h('button', { type: 'button', class: 'libero', onclick: () => openMealBreakdown(mid) },
      h('span', { class: 'tag', text: 'Pasto libero' }), h('span', { class: 'libero__d', text: m.descrizione || 'Senza descrizione' }),
      h('span', { class: 'libero__s', text: 'Stima: ' + MACROS.map((x) => (x.key === 'kcal' ? fmt0(sm.kcal) + ' kcal' : fmt0(sm[x.key]) + ' g ' + lc(x.name))).join(', ') })));
    return sec;
  }
  if (!items.length) sec.append(h('p', { class: 'empty', text: 'Vuoto. Tocca il più per aggiungere.' }));
  for (const { id: eid, e } of items) {
    const st = stepOf(e.cibo); const v = scale(e.cibo, e.g); const nm = nomeDi(e.cibo);
    sec.append(h('div', { class: 'food', 'data-entry': eid },
      h('button', { type: 'button', class: 'food__main', 'data-k': 'food-' + mid + '-' + eid, onclick: () => openEdit(mid, eid) }, thumb(e.cibo),
        h('span', null, h('b', { text: nm }), h('small', { text: fmt0(v.kcal) + ' kcal' }))),
      h('div', { class: 'qty' },
        h('button', { type: 'button', 'data-k': 'meno-' + mid + '-' + eid, 'aria-label': 'Meno ' + nm, onclick: () => { e.g = Math.max(st, e.g - st); salvaGiorno(key); render(); } }, icon('minus')),
        h('button', { type: 'button', class: 'qty__v', 'aria-label': 'Modifica ' + nm + ', ' + fmt0(e.g) + ' grammi', onclick: () => openEdit(mid, eid) }, fmt0(e.g) + ' g'),
        h('button', { type: 'button', 'data-k': 'piu-' + mid + '-' + eid, 'aria-label': 'Più ' + nm, onclick: () => { e.g += st; salvaGiorno(key); render(); } }, icon('plus')))));
  }
  if (alts.length) sec.append(h('div', { class: 'meal__alt' },
    h('span', { text: alts.length === 1 ? '1 alternativa' : alts.length + ' alternative' }),
    h('button', { type: 'button', class: 'pill pill--soft', 'data-k': 'cambia-' + mid, onclick: () => openAlternatives(mid) }, icon('swap'), 'Cambia')));
  return sec;
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

/* tipo di giornata e serata impegnata */
function openTipo() {
  const k = state.date; const day = getDay(k);
  openSheet('Tipo di giornata', (body) => {
    const draw = () => {
      const tgt = targetOf(day);
      body.replaceChildren(
        h('p', { class: 'hint', text: 'Gli obiettivi cambiano con il tipo di giornata.' }),
        h('div', { class: 'acts-grid', role: 'radiogroup', 'aria-label': 'Tipo di giornata' }, TIPI.map((t) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(tipoDi(day).id === t.id),
          onclick: () => { day.tipo = t.id; salvaGiorno(k, 'tipo ' + ddmm(k)); draw(); } }, emo(t.ico), t.name))),
        h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!day.serata_impegnata), onclick: () => { day.serata_impegnata = !day.serata_impegnata; salvaGiorno(k, 'serata ' + ddmm(k)); draw(); } },
          h('span', null, h('b', { text: 'Serata impegnata' }), h('small', { text: 'Per ricordarti che la sera hai poco tempo per cucinare.' })), h('span', { class: 'switch__t', 'aria-hidden': 'true' })),
        h('div', { class: 'impact', role: 'status' },
          h('b', { text: 'Obiettivo: ' + fmt0(tgt.kcal) + ' kcal' }),
          h('div', { class: 'effs' }, MACROS.slice(1).map((m) => h('span', { class: 'eff' }, macroTag(m), ' ' + fmt0(tgt[m.key]) + ' g')))),
        h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: openObiettivi }, 'Cambia gli obiettivi')));
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
      ? [fmtM(m, T), h('small', { text: ' / ' + fmt0(tg) + m.unit })]
      : [fmtM(m, T), h('small', { text: m.unit + (o.dayTot && o.dayTot[m.key] > 0 ? ' · ' + pctTxt(T, o.dayTot[m.key]) + ' della giornata' : '') })];
    overview.append(h('button', { type: 'button', class: 'bo', 'aria-pressed': String(o.macro === m.key), onclick: () => o.onPick(m.key) },
      h('span', { class: 'bo__k' }, macroTag(m)), h('span', { class: 'bo__v' }, val),
      h('span', { class: 'stack', 'aria-hidden': 'true' }, segs, tg ? h('b', { class: 'stack__tgt', style: 'left:' + (tg / max * 100).toFixed(2) + '%' }) : null)));
  }
  const m = MK[o.macro]; const T = tot[m.key];
  const rows = parts.map((p, i) => ({ p, i, v: p.v[m.key] }));
  if (o.scope === 'meal') rows.sort((a, b) => b.v - a.v);
  let cum = 0;
  const list = h('div', { class: 'card' }, rows.map(({ p, i, v }) => {
    cum += v; const share = T > 0 ? v / T : 0;
    const sub = o.scope === 'day' ? p.sub + ' · progressivo ' + fmtM(m, cum) + ' di ' + fmt0(o.tgt[m.key]) + m.unit : p.sub;
    return h('button', { type: 'button', class: 'br', onclick: () => o.onRow(p.key) },
      h('i', { class: 'br__dot', style: 'background:' + col(i), 'aria-hidden': 'true' }), p.vis,
      h('span', { class: 'br__n' }, h('b', { text: p.name }), h('small', { text: sub })),
      h('span', { class: 'br__v' }, h('b', { text: fmtM(m, v) + m.unit }), h('small', { text: Math.round(share * 100) + '%' })),
      h('span', { class: 'br__bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + (share * 100).toFixed(2) + '%;background:' + col(i) })));
  }));
  return h('div', null, overview, h('p', { class: 'sub' }, macroTag(m), o.scope === 'day' ? ', pasto per pasto' : ', alimento per alimento'), list);
}
function openDayBreakdown(mk) {
  if (mk) state.bdMacro = mk;
  const day = getDay(state.date);
  openSheet('Spaccato della giornata', (body) => {
    const draw = () => {
      const tot = totals(day); const tgt = targetOf(day);
      const parts = pastiDi(day).map(({ id, m }) => ({ key: id, vis: h('span', { class: 'th th--emo', 'aria-hidden': 'true', text: icoPasto(id, m) }), name: m.nome + (m.libero ? ' (libero)' : ''), sub: m.ora, v: totPasto(m) }));
      body.replaceChildren(
        h('p', { class: 'hint', text: 'Come si distribuiscono calorie e macro nei pasti, dalla mattina alla sera. La lineetta verticale segna l’obiettivo. Tocca un pasto per aprirlo.' }),
        breakdownNode(parts, tot, { scope: 'day', macro: state.bdMacro, tgt, onPick: (x) => { state.bdMacro = x; draw(); }, onRow: (id) => openMealBreakdown(id) }));
    };
    draw();
  });
}
function numeroField(valore, label, onChange) {
  const i = h('input', { class: 'field field--num', type: 'number', inputmode: 'decimal', min: '0', step: 'any', value: valore == null ? '' : String(valore), 'aria-label': label });
  i.addEventListener('change', () => onChange(i.value === '' ? null : Number(i.value)));
  return i;
}
function openMealBreakdown(mealId) {
  const k = state.date; const day = getDay(k);
  openSheet('', (body) => {
    const draw = () => {
      const m = day.pasti[mealId]; if (!isObj(m)) return;
      $('#sheetTitle').textContent = m.nome;
      const tot = totPasto(m); const dayTot = totals(day);
      const time = h('input', { class: 'field', type: 'time', value: m.ora, 'aria-label': 'Orario del pasto' });
      time.addEventListener('change', () => { if (time.value) { m.ora = time.value; salvaGiorno(k); draw(); } });
      const eaten = h('button', { type: 'button', class: 'pill pill--wide ' + (m.mangiato ? 'pill--soft' : 'pill--plain'), 'aria-pressed': String(!!m.mangiato), onclick: () => { m.mangiato = !m.mangiato; salvaGiorno(k); draw(); } }, m.mangiato ? '✓ Già mangiato' : 'Segna come già mangiato');
      const kids = [];
      if (m.libero) {
        const desc = h('input', { class: 'field', type: 'text', value: m.descrizione || '', autocomplete: 'off', 'aria-label': 'Descrizione del pasto libero' });
        desc.addEventListener('change', () => { m.descrizione = desc.value.trim(); salvaGiorno(k); });
        kids.push(h('p', { class: 'hint', text: 'Pasto libero: conta la stima dei macro, che puoi correggere qui. Il ' + pctTxt(tot.kcal, dayTot.kcal) + ' delle calorie della giornata.' }),
          h('p', { class: 'sub', text: 'Descrizione' }), desc,
          h('p', { class: 'sub', text: 'Stima' }),
          h('div', { class: 'card stima' }, MACROS.map((x) => h('label', { class: 'stima__r' }, macroTag(x), numeroField(m.stima ? m.stima[x.key] : 0, 'Stima: ' + x.name, (v) => { if (!isObj(m.stima)) m.stima = P.zero(); m.stima[x.key] = Math.max(0, v || 0); salvaGiorno(k); }), h('span', { text: x.key === 'kcal' ? 'kcal' : 'g' })))),
          h('div', { class: 'acts' }, eaten));
      } else {
        const items = voci(m);
        const parts = items.map(({ id, e }) => ({ key: id, vis: thumb(e.cibo), name: nomeDi(e.cibo), sub: fmt0(e.g) + ' g', v: scale(e.cibo, e.g) }));
        kids.push(h('p', { class: 'hint', text: items.length ? 'Alle ' + m.ora + ': ' + fmt0(tot.kcal) + ' kcal, il ' + pctTxt(tot.kcal, dayTot.kcal) + ' delle calorie della giornata. Tocca un alimento per modificarlo.' : 'Questo pasto è ancora vuoto.' }),
          parts.length ? breakdownNode(parts, tot, { scope: 'meal', macro: state.bdMacro, dayTot, onPick: (x) => { state.bdMacro = x; draw(); }, onRow: (id) => openEdit(mealId, id) }) : null,
          h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => openAdd(mealId) }, '+ Aggiungi un alimento'),
            alternativeDi(m).length ? h('button', { type: 'button', class: 'pill pill--soft pill--wide', onclick: () => openAlternatives(mealId) }, 'Cambia con un’alternativa') : null, eaten));
      }
      kids.push(h('p', { class: 'sub', text: 'Orario' }), time);
      if (m.extra) kids.push(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: () => { delete day.pasti[mealId]; salvaGiorno(k, 'pasto tolto ' + ddmm(k)); closeSheet(); } }, 'Elimina questo pasto')));
      body.replaceChildren(...kids);
    };
    draw();
  });
}
/* alternative: le mostro con i loro macro e con un tocco le scambio */
function vociNode(alimenti) {
  return h('div', { class: 'alt__voci' }, P.vociDi({ alimenti }).map(({ e }) => h('div', { class: 'alt__v' }, thumb(e.cibo), h('span', { text: nomeDi(e.cibo) }), h('b', { text: fmt0(e.g) + ' g' }))));
}
function macroRiga(t, rif) {
  return h('div', { class: 'effs' }, MACROS.map((x) => h('span', { class: 'eff' }, macroTag(x, x.key === 'kcal' ? 'kcal' : lc(x.name)), ' ' + fmtM(x, t[x.key]) + (x.key === 'kcal' ? '' : ' g') + (rif ? ' (' + signed(t[x.key] - rif[x.key]) + ')' : ''))));
}
function openAlternatives(mealId) {
  const k = state.date; const day = getDay(k);
  openSheet('Cambia il pasto', (body) => {
    const draw = () => {
      const m = day.pasti[mealId]; if (!isObj(m)) return;
      const ora = P.totaleVoci(m.alimenti, ANAG);
      const kids = [h('p', { class: 'hint', text: m.nome + ': scegli cosa mangiare. Il pasto attuale diventa un’alternativa, così puoi sempre tornare indietro.' }),
        h('div', { class: 'card alt alt--ora' }, h('p', { class: 'alt__t', text: 'Adesso' }), vociNode(m.alimenti), macroRiga(ora))];
      alternativeDi(m).forEach(([aid, a], i) => {
        const t = P.totaleVoci(a.alimenti, ANAG);
        kids.push(h('div', { class: 'card alt' }, h('p', { class: 'alt__t', text: 'Alternativa ' + (i + 1) }), vociNode(a.alimenti), macroRiga(t, ora),
          h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => {
            const tmp = m.alimenti; m.alimenti = a.alimenti; a.alimenti = tmp;
            salvaGiorno(k, 'alternativa ' + ddmm(k)); avviso('Fatto: ' + lc(m.nome) + ' cambiato.'); draw();
          } }, 'Scegli questa'))));
      });
      body.replaceChildren(...kids);
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
    body.append(h('p', { class: 'hint', text: 'Per un pasto fuori programma. Vale solo per questa giornata.' }), grid,
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

/* aggiunta di alimenti: una frase, un tocco sui più usati, o l'elenco */
function openAdd(mealId) {
  const k = state.date; const day = getDay(k); const m = day.pasti[mealId]; if (!isObj(m)) return;
  openSheet('Aggiungi ' + toMeal(mealId, m), (body) => {
    if (!Object.keys(ANAG).length) {
      body.append(h('p', { class: 'lead', text: 'L’anagrafica è vuota: gli alimenti arrivano con l’importazione del piano.' }),
        h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => { closeSheet(); go('importa'); } }, 'Importa il piano')));
      return;
    }
    const input = h('input', { class: 'field', type: 'text', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Scrivi o detta: 150 g di riso e 2 uova', 'aria-label': 'Scrivi o detta cosa aggiungere' });
    const parsedBox = h('div'); const listBox = h('div');
    const add = (food, g) => { if (!isObj(m.alimenti)) m.alimenti = {}; m.alimenti[nuovoId()] = { cibo: food, g }; salvaGiorno(k); };
    const draw = () => {
      const q = input.value.trim(); const parsed = q ? parseFoods(q) : [];
      parsedBox.replaceChildren();
      if (parsed.length) {
        const tot = sumItems(parsed.map((p) => ({ cibo: p.food, g: p.g })));
        parsedBox.append(h('p', { class: 'sub', text: 'Ho capito così' }),
          h('div', { class: 'card' }, parsed.map((p) => h('div', { class: 'pick' }, thumb(p.food), h('span', null, nomeDi(p.food), h('small', { text: fmt0(scale(p.food, p.g).kcal) + ' kcal' })), h('span', { text: fmt0(p.g) + ' g' })))),
          h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => { parsed.forEach((p) => add(p.food, p.g)); closeSheet(); } },
            'Aggiungi ' + (parsed.length === 1 ? 'un alimento' : parsed.length + ' alimenti') + ' (' + fmt0(tot.kcal) + ' kcal)')));
      }
      const nq = norm(q);
      const foods = Object.entries(ANAG).filter(([, f]) => !q || parsed.length || norm(f.nome).includes(nq)).sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'it'));
      listBox.replaceChildren(h('p', { class: 'sub', text: 'Tutti gli alimenti' }),
        h('div', { class: 'card' }, foods.length ? foods.map(([id, f]) => {
          const porz = +f.porzione_g || 100;
          const b = h('button', { type: 'button', class: 'pick' }, thumb(id), h('span', null, f.nome, h('small', { text: 'Porzione da ' + fmt0(porz) + ' g, ' + fmt0(scale(id, porz).kcal) + ' kcal' })), h('span', { text: 'Aggiungi' }));
          b.addEventListener('click', () => { add(id, porz); b.lastChild.textContent = 'Aggiunto'; });
          return b;
        }) : h('p', { class: 'empty', text: 'Nessun alimento con questo nome.' })));
    };
    input.addEventListener('input', draw);
    const quick = h('div', { class: 'quick' }, piuUsati(8).map((id) => {
      const f = ANAG[id]; const porz = +f.porzione_g || 100;
      const b = h('button', { type: 'button', 'aria-label': 'Aggiungi ' + f.nome + ', ' + fmt0(porz) + ' grammi' }, thumb(id, 'th--l'), h('span', { class: 'quick__n', text: f.nome }));
      b.addEventListener('click', () => { add(id, porz); b.classList.add('on'); });
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
  openSheet(nomeDi(en.cibo), (body) => {
    const draw = () => {
      const f = cibo(en.cibo); const st = stepOf(en.cibo); const porz = +f.porzione_g || 100; const max = Math.max(porz * 3, en.g);
      $('#sheetTitle').textContent = nomeDi(en.cibo);
      const num = h('div', { class: 'amount__n' });
      const impact = h('div', { class: 'impact', role: 'status' });
      const range = h('input', { type: 'range', min: String(st), max: String(max), step: String(st), value: String(en.g), 'aria-label': 'Quantità in grammi' });
      const paint = () => {
        num.replaceChildren(fmt0(en.g), h('small', { text: ' g' }));
        const v = scale(en.cibo, en.g); const { tot, tgt } = statusOf(k);
        impact.replaceChildren(macroRiga(v), h('div', { class: 'impact__g', text: 'Giornata: ' + fmt0(tot.kcal) + ' di ' + fmt0(tgt.kcal) + ' kcal, proteine ' + fmt0(tot.proteine) + ' di ' + fmt0(tgt.proteine) + ' g' }));
        range.value = String(en.g);
      };
      const set = (g) => { en.g = roundTo(g, st); paint(); salvaLento(k); };
      range.addEventListener('input', () => set(Number(range.value)));
      const sw = swapsFor(en);
      body.replaceChildren(
        h('div', { class: 'edit__head' }, thumb(en.cibo, 'th--xl'), h('p', { class: 'hint', text: 'Porzione da ' + fmt0(porz) + ' g · ' + fmt0(P.valori(f).kcal) + ' kcal per 100 g' })),
        h('div', { class: 'amount' },
          h('button', { type: 'button', 'aria-label': 'Meno', onclick: () => set(en.g - st) }, icon('minus')), num,
          h('button', { type: 'button', 'aria-label': 'Più', onclick: () => set(en.g + st) }, icon('plus'))),
        range,
        h('div', { class: 'acts' }, [['Mezza porzione', 0.5], ['1 porzione', 1], ['1 e mezza', 1.5], ['2 porzioni', 2]].map(([label, x]) =>
          h('button', { type: 'button', class: 'pill pill--plain', onclick: () => set(porz * x) }, label))),
        impact,
        sw.list.length ? h('p', { class: 'sub', text: 'Hai mangiato altro? Sostituisci: ' + lc(sw.label) }) : null,
        sw.list.length ? h('div', { class: 'card' }, sw.list.map((s) => h('button', { type: 'button', class: 'pick', onclick: () => { en.cibo = s.id; en.g = s.g; salvaGiorno(k); draw(); } },
          thumb(s.id), h('span', null, nomeDi(s.id), h('small', { text: fmt0(scale(s.id, s.g).kcal) + ' kcal' })), h('span', { text: fmt0(s.g) + ' g' })))) : null,
        h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: () => { delete m.alimenti[id]; salvaGiorno(k); closeSheet(); } }, 'Togli dal pasto')));
      paint();
    };
    draw();
  });
}

/* ---------- importa ---------- */
function nuovaImportazione() { return { testo: '', A: null, risposte: {}, foto: {}, sostituisci: null, lavoro: false }; }
function analizzaImportazione() {
  const I = state.imp;
  I.A = P.analizza(I.testo, { alimenti: ANAG, tipi: TIPI.map((t) => t.id) }); I.risposte = {}; I.sostituisci = null;
  /* le foto: provo subito a scaricarle, così il riepilogo dice cosa succederà */
  const links = new Set();
  for (const n of I.A.nuovi) if (n.foto) links.add(n.foto);
  for (const src of links) if (!I.foto[src]) {
    I.foto[src] = { stato: 'attesa' };
    I.foto[src].promessa = provaFoto(src).then((r) => { Object.assign(I.foto[src], r); if (current() === 'importa' && state.imp === I) render(); });
  }
}
const giorniPieni = (A) => A.giorni.map((g) => g.data).filter((d) => P.haContenuto(giornoSalvato(d) || {}));
function anteprima(I) {
  const st = P.stato(I.A, I.risposte);
  if (!st.pronto) return null;
  try { return P.costruisci(I.A, I.risposte, { alimenti: ANAG }); } catch (e) { return null; }
}
const STATO_FOTO = { attesa: 'Scarico la foto…', salvata: 'Foto salvata nell’app', 'dal-sito': 'Foto presa dal sito: si vede solo con la rete', 'non-trovata': 'Foto non trovata: resta l’iniziale' };
function fotoAnteprima(src, I) {
  const f = I.foto[src];
  if (f && f.dati) return h('img', { class: 'th', src: f.dati, alt: '' });
  if (f && f.stato === 'dal-sito') return h('img', { class: 'th', src, alt: '', referrerpolicy: 'no-referrer' });
  return null;
}
function viewImporta() {
  if (!state.imp) state.imp = nuovaImportazione();
  const I = state.imp;
  const root = h('div');
  root.append(testata('Importa', 'Il piano della settimana'));
  const area = h('textarea', { class: 'field area', rows: '8', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', placeholder: 'Incolla qui il piano che ti ha dato Claude', 'aria-label': 'Testo del piano', 'data-k': 'imp-testo' });
  area.value = I.testo;
  area.addEventListener('input', () => { I.testo = area.value; });
  const fileIn = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', hidden: true });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files && fileIn.files[0]; fileIn.value = '';
    if (!f) return;
    if (f.size > 2e6) { avviso('Il file è troppo grande per essere un piano.'); return; }
    I.testo = await f.text(); analizzaImportazione(); render();
  });
  root.append(h('section', { class: 'sect' },
    h('p', { class: 'lead lead--top' }, 'Ogni settimana prepari il piano in una chat con Claude, seguendo ', h('a', { href: LINK_FORMATO, target: '_blank', rel: 'noopener' }, 'il formato del piano'), '. Poi incolli qui il testo che ti dà, oppure scegli il file.'),
    area, fileIn,
    h('div', { class: 'acts' },
      h('button', { type: 'button', class: 'pill', 'data-k': 'imp-controlla', onclick: () => { I.testo = area.value; analizzaImportazione(); render(); } }, 'Controlla'),
      h('button', { type: 'button', class: 'pill pill--plain', onclick: () => fileIn.click() }, 'Scegli un file'),
      I.testo ? h('button', { type: 'button', class: 'pill pill--plain', onclick: () => { state.imp = nuovaImportazione(); render(); } }, 'Svuota') : null)));
  if (I.A) root.append(riepilogo(I));
  return root;
}
function riepilogo(I) {
  const A = I.A; const out = h('div', { class: 'riep' });
  const st = P.stato(A, I.risposte);
  const C = anteprima(I);
  out.append(h('h2', { class: 'riep__h', text: 'Riepilogo' }));
  if (A.dal) out.append(h('p', { class: 'lead', text: (A.dal === A.al ? 'Il ' + dayMonth(A.dal) : 'Dal ' + dayMonth(A.dal) + ' al ' + dayMonth(A.al)) + ': ' + A.giorni.length + (A.giorni.length === 1 ? ' giorno' : ' giorni') + ', ' + A.nuovi.length + (A.nuovi.length === 1 ? ' alimento nuovo' : ' alimenti nuovi') + '. Non ho ancora salvato niente.' }));
  if (st.errori.length) out.append(h('div', { class: 'card info info--err', role: 'alert' }, h('p', { class: 'info__t', text: '⚠️ ' + (st.errori.length === 1 ? 'Un errore da correggere' : st.errori.length + ' errori da correggere') }),
    h('ul', { class: 'elenco' }, st.errori.map((e) => h('li', { text: e }))),
    h('p', { class: 'hint', text: 'Chiedi a Claude di correggere il piano e incollalo di nuovo.' })));
  if (A.domande.length) {
    out.append(h('p', { class: 'sub', text: 'Da confermare' }));
    out.append(h('div', { class: 'card' }, A.domande.map((d) => {
      const r = I.risposte[d.chiave];
      return h('div', { class: 'dom' }, h('div', { class: 'dom__t' }, thumb(d.candidato), h('p', null, '«' + d.nome + '» è lo stesso alimento di «' + nomeDi(d.candidato) + '»?')),
        h('div', { class: 'conf__v' },
          h('button', { type: 'button', class: 'pill pill--plain', 'aria-pressed': String(r === true), 'data-k': 'dom-si-' + d.chiave, onclick: () => { I.risposte[d.chiave] = true; render(); } }, 'Sì, è lo stesso'),
          h('button', { type: 'button', class: 'pill pill--plain', 'aria-pressed': String(r === false), 'data-k': 'dom-no-' + d.chiave, onclick: () => { I.risposte[d.chiave] = false; render(); } }, d.haValori ? 'No, è nuovo' : 'No, è diverso')));
    })));
  }
  /* la settimana, giorno per giorno: calorie del piano contro l'obiettivo */
  if (A.giorni.length) {
    const anag = C ? Object.assign({}, ANAG, C.alimentiNuovi) : null;
    out.append(h('p', { class: 'sub', text: 'La settimana' }), h('div', { class: 'card' }, A.giorni.map((g) => {
      const t = TIPI.find((x) => x.id === g.tipo);
      let dett = null;
      if (C && C.giorni[g.data]) {
        const day = C.giorni[g.data]; const tot = P.totaleGiorno(day, anag); const tgt = targetOf(day); const f = fuoriDi(tot, tgt);
        dett = h('span', { class: 'rg__k' + (f.length ? ' rg__k--fuori' : '') }, fmt0(tot.kcal) + ' / ' + fmt0(tgt.kcal) + ' kcal', h('small', { text: f.length ? '⚠️ ' + testoFuori(f) : '✓ dentro le tolleranze' }));
      }
      const liberi = Object.values(g.pasti).filter((m) => m.libero).length; const alt = Object.values(g.pasti).reduce((n, m) => n + (m.alternative ? m.alternative.length : 0), 0);
      return h('div', { class: 'rg' }, h('span', { class: 'ico', 'aria-hidden': 'true', text: t ? t.ico : '❔' }),
        h('span', { class: 'rg__n' }, h('b', { text: giornoBreve(g.data) }), h('small', { text: [t ? t.name : g.tipo, g.serata ? 'serata impegnata' : '', liberi ? (liberi === 1 ? '1 pasto libero' : liberi + ' pasti liberi') : '', alt ? (alt === 1 ? '1 alternativa' : alt + ' alternative') : ''].filter(Boolean).join(' · ') })), dett);
    })));
  }
  if (A.nuovi.length) {
    out.append(h('p', { class: 'sub', text: 'Alimenti nuovi' }), h('div', { class: 'card' }, A.nuovi.map((n) => {
      const d = A.domande.find((x) => x.chiave === 'n' + n.idx);
      const gia = n.esito.tipo === 'codice' || n.esito.tipo === 'nome' || (d && I.risposte[d.chiave] === true);
      const idEs = n.esito.id || (d && n.esito.candidato);
      const vis = fotoAnteprima(n.foto, I) || (gia && idEs ? thumb(idEs) : h('span', { class: 'th th--ini', 'aria-hidden': 'true', text: n.nome.charAt(0).toUpperCase() }));
      const v = n.per_100g;
      return h('div', { class: 'nv' }, vis, h('div', { class: 'nv__t' },
        h('b', { text: n.nome }),
        h('small', { text: gia ? 'Già in anagrafica come «' + nomeDi(idEs) + '»' + (n.esito.tipo === 'codice' ? ' (stesso codice a barre)' : '') + ': completo solo quello che manca.' : 'Per 100 g: ' + fmt0(v.kcal) + ' kcal, proteine ' + fmt1(v.proteine) + ' g, carboidrati ' + fmt1(v.carboidrati) + ' g, grassi ' + fmt1(v.grassi) + ' g, fibre ' + fmt1(v.fibre) + ' g' }),
        gia ? null : h('small', { text: 'Porzione ' + fmt0(n.porzione_g) + ' g' + (n.confezione_g ? ' · confezione ' + fmt0(n.confezione_g) + ' g' : '') + ' · ' + (n.reparto || 'Altro') + (n.codice ? ' · codice ' + n.codice : '') }),
        n.foto ? h('small', { text: STATO_FOTO[(I.foto[n.foto] || {}).stato] || '' }) : null));
    })));
  }
  const ric = A.riferimenti.filter((r) => r.esito.tipo === 'codice' || r.esito.tipo === 'nome');
  if (ric.length) out.append(h('p', { class: 'sub', text: 'Alimenti riconosciuti' }), h('div', { class: 'card' }, ric.map((r) => h('div', { class: 'pick pick--ro' }, thumb(r.esito.id),
    h('span', null, nomeDi(r.esito.id), h('small', { text: r.esito.tipo === 'codice' ? 'dal codice a barre' + (P.chiaveNome(r.nome) !== P.chiaveNome(nomeDi(r.esito.id)) ? ' (nel piano: «' + r.nome + '»)' : '') : 'dal nome' })), h('span', { text: r.usi === 1 ? '1 volta' : r.usi + ' volte' })))));
  const avvisi = A.avvisi.concat(C ? C.avvisi : []);
  if (avvisi.length) out.append(h('p', { class: 'sub', text: 'Avvisi' }), h('div', { class: 'card info' }, h('ul', { class: 'elenco' }, avvisi.map((e) => h('li', { text: e })))));
  if (st.pronto && C) {
    const pieni = giorniPieni(A);
    const btn = h('button', { type: 'button', class: 'pill pill--wide', 'data-k': 'imp-salva', disabled: I.lavoro || (pieni.length && I.sostituisci !== true) ? true : null, onclick: () => salvaPiano(I) }, I.lavoro ? 'Salvo…' : pieni.length ? 'Sostituisci la settimana e salva' : 'Salva il piano');
    if (pieni.length) out.append(h('div', { class: 'card info' },
      h('p', { class: 'info__t', text: (pieni.length === 1 ? 'Un giorno di questa settimana ha' : pieni.length + ' giorni di questa settimana hanno') + ' già dei pasti' }),
      h('p', { class: 'hint', text: 'Vuoi sostituirli con il piano nuovo? I pasti già segnati come mangiati restano com’erano.' }),
      h('div', { class: 'conf__v' },
        h('button', { type: 'button', class: 'pill pill--plain', 'aria-pressed': String(I.sostituisci === true), onclick: () => { I.sostituisci = true; render(); } }, 'Sì, sostituisci'),
        h('button', { type: 'button', class: 'pill pill--plain', 'aria-pressed': String(I.sostituisci === false), onclick: () => { I.sostituisci = false; render(); } }, 'No, lascia stare'))));
    if (I.sostituisci === false) out.append(h('p', { class: 'lead', text: 'Va bene: non salvo niente.' }));
    else out.append(h('div', { class: 'acts' }, btn));
  } else if (!st.errori.length && st.senzaRisposta.length) out.append(h('p', { class: 'lead', text: 'Rispondi alle domande qui sopra per poter salvare.' }));
  return out;
}
async function salvaPiano(I) {
  if (I.lavoro) return;
  I.lavoro = true; render();
  try {
    await Promise.all(Object.values(I.foto).map((f) => f.promessa).filter(Boolean));
    const C = P.costruisci(I.A, I.risposte, { alimenti: ANAG });
    const A = I.A;
    /* alimenti: i nuovi con fonte «importazione», e quello che manca a quelli già presenti */
    for (const [id, rec] of Object.entries(C.alimentiNuovi)) db.alimenti.alimenti[id] = rec;
    for (const [id, c] of Object.entries(C.completamenti)) Object.assign(db.alimenti.alimenti[id], c);
    salvaAlimenti('piano dal ' + ddmm(A.dal) + ': alimenti');
    const conFoto = Object.entries(C.alimentiNuovi).filter(([, r]) => r.foto).concat(Object.entries(C.completamenti).filter(([, c]) => c.foto));
    for (const [id, r] of conFoto) { const f = I.foto[r.foto]; if (f && f.dati) salvaFile('foto/' + id + '.json', { schema: 2, immagine: f.dati, da: r.foto }, 'foto'); }
    /* giornate: sostituisco, ma i pasti già mangiati restano */
    const mesi = new Set();
    for (const [k, day] of Object.entries(C.giorni)) { const vecchio = giornoSalvato(k); scriviGiorno(k, vecchio ? P.sostituisci(vecchio, day) : day); mesi.add(meseDi(k)); }
    for (const mk of mesi) salvaFile('giornate/' + mk + '.json', db.mesi[mk], 'piano dal ' + ddmm(A.dal));
    salvaFile('settimane/' + A.dal + '.json', C.settimana, 'piano dal ' + ddmm(A.dal));
    carica();
    rigeneraSpesa(A.dal, A.al);
    state.imp = null; state.settimana = mondayOf(A.dal); state.weekTab = 'piano';
    avviso('Piano salvato: ' + Object.keys(C.giorni).length + ' giorni' + (Object.keys(C.alimentiNuovi).length ? ', ' + Object.keys(C.alimentiNuovi).length + ' alimenti nuovi' : '') + '. Lista della spesa aggiornata.');
    go('settimana');
  } catch (e) {
    I.lavoro = false; avviso(e.message || 'Non sono riuscito a salvare il piano'); render();
  }
}
function pianoRecente() {
  return Object.values(db.settimane).sort((a, b) => String(b.importato || '').localeCompare(String(a.importato || '')) || b.dal.localeCompare(a.dal))[0] || null;
}
function rigeneraSpesa(dal, al) {
  const giorni = P.dateTra(dal, al).map((k) => giornoSalvato(k)).filter(Boolean);
  db.spesa = P.aggiornaSpesa(db.spesa, P.righeSpesa(giorni, ANAG));
  salvaSpesa('spesa dal piano');
}

/* ---------- settimana ---------- */
function viewWeek() {
  const root = h('div'); const t = todayKey(); const mon = state.settimana; const week = Array.from({ length: 7 }, (_, i) => shiftKey(mon, i));
  const label = mon === mondayOf(t) ? 'Questa settimana' : mon === shiftKey(mondayOf(t), 7) ? 'Settimana prossima' : mon === shiftKey(mondayOf(t), -7) ? 'Settimana scorsa' : '';
  root.append(testata('Settimana', 'Piano, preparazioni e spesa'));
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Cosa vedere' });
  for (const [id, name] of [['piano', 'Piano'], ['spesa', 'Lista della spesa']]) seg.append(h('button', { type: 'button', role: 'radio', 'data-k': 'tab-' + id, 'aria-checked': String(state.weekTab === id), onclick: () => { state.weekTab = id; render(); } }, name));
  root.append(seg);
  if (state.weekTab === 'spesa') { root.append(viewSpesa()); return root; }
  root.append(h('div', { class: 'wnav' },
    h('button', { type: 'button', class: 'round', 'data-k': 'w-prima', 'aria-label': 'Settimana prima', onclick: () => { state.settimana = shiftKey(mon, -7); render(); } }, icon('back')),
    h('div', { class: 'wnav__t' }, h('b', { text: rangeTxt(week[0], week[6]) }), label ? h('small', { text: label }) : null),
    h('button', { type: 'button', class: 'round', 'data-k': 'w-dopo', 'aria-label': 'Settimana dopo', onclick: () => { state.settimana = shiftKey(mon, 7); render(); } }, icon('chev'))));

  const card = h('div', { class: 'card' });
  for (const k of week) {
    const s = statusOf(k); const tipo = tipoDi(s.day);
    const info = [tipo.name, s.day.serata_impegnata ? 'serata impegnata' : ''].filter(Boolean).join(' · ');
    card.append(h('button', { type: 'button', class: 'day' + (s.pieno && !s.ok ? ' day--fuori' : ''), 'data-k': 'day-' + k, onclick: () => { state.date = k; go('oggi'); } },
      h('span', { class: 'ico', 'aria-hidden': 'true', text: tipo.ico }),
      h('span', { class: 'day__n' }, h('span', { class: 'day__name', text: weekdayName(k) + ' ' + dateOf(k).getDate() + (k === t ? ', oggi' : '') }), h('span', { class: 'day__type', text: info })),
      h('span', { class: 'day__kcal' }, s.pieno ? [h('b', { text: fmt0(s.tot.kcal) }), 'di ' + fmt0(s.tgt.kcal) + ' kcal'] : h('span', { text: 'Nessun piano' })),
      s.pieno ? h('span', { class: 'day__st' + (s.ok ? '' : ' day__st--fuori'), text: s.ok ? '✓ Dentro le tolleranze' : '⚠️ Fuori tolleranza: ' + testoFuori(s.fuori) }) : null));
  }
  root.append(h('section', { class: 'sect' }, card), h('p', { class: 'lead', text: 'Tocca un giorno per aprirlo. Tolleranze: calorie ±5%, proteine e fibre almeno l’obiettivo, carboidrati e grassi ±10%.' }));

  /* sessioni di preparazione dei piani di questa settimana */
  const piani = Object.values(db.settimane).filter((s) => s.dal <= week[6] && s.al >= week[0]);
  const sessioni = piani.flatMap((s) => P.calcolaPreparazioni(s, getDay, ANAG)).sort((a, b) => a.data.localeCompare(b.data));
  if (sessioni.length) {
    root.append(h('section', { class: 'sect' }, h('div', { class: 'sect__head' }, h('h2', { text: 'Preparazioni' })),
      sessioni.map((s) => h('div', { class: 'card prep' },
        h('p', { class: 'prep__t' }, h('b', { text: weekdayName(s.data) + ' ' + dayMonth(s.data) }), s.titolo ? ' · ' + s.titolo : ''),
        s.piatti.map((x) => h('div', { class: 'prep__p' },
          h('p', { class: 'prep__n', text: x.nome }),
          h('p', { class: 'sub sub--in', text: 'Da cucinare in tutto' }),
          x.totali.length ? h('div', null, x.totali.map((q) => h('div', { class: 'alt__v' }, thumb(q.cibo), h('span', { text: nomeDi(q.cibo) }), h('b', { text: P.quantita(q.g) })))) : h('p', { class: 'hint', text: 'Niente da cucinare: i pasti sono cambiati.' }),
          h('p', { class: 'sub sub--in', text: x.schiscette.length === 1 ? 'Una schiscetta' : x.schiscette.length + ' schiscette' }),
          h('ul', { class: 'schisc' }, x.schiscette.map((b) => h('li', { class: b.mangiato ? 'fatto' : '' },
            h('b', { text: giornoCorto(b.data) + ', ' + (P.PASTI.find((p) => p.id === b.pasto) || { nome: b.pasto }).nome.toLowerCase() + (b.mangiato ? ' (già mangiato)' : '') }),
            h('span', { text: b.alimenti.length ? b.alimenti.map((a) => nomeDi(a.cibo) + ' ' + P.quantita(a.g)).join(' · ') : 'niente' }))))))))));
  }
  root.append(h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => go('importa') }, 'Importa un piano')));
  return root;
}

/* ---------- lista della spesa: righe di testo libere ---------- */
function viewSpesa() {
  const out = h('section', { class: 'sect' });
  const righe = Object.entries(db.spesa.righe).filter(([, r]) => isObj(r) && typeof r.testo === 'string');
  const input = h('input', { class: 'field', type: 'text', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Aggiungi una riga: detersivo, caffè…', 'aria-label': 'Nuova riga della lista della spesa', 'data-k': 'spesa-nuova' });
  const aggiungi = () => { const v = input.value.trim(); if (!v) return; db.spesa.righe[nuovoId('m')] = { testo: v, fatta: false, dal_piano: false }; salvaSpesa(); render(); };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aggiungi(); } });
  out.append(h('div', { class: 'addrow' }, input, h('button', { type: 'button', class: 'pill', onclick: aggiungi }, 'Aggiungi')));
  const riga = ([id, r]) => {
    const box = h('input', { type: 'checkbox', checked: !!r.fatta, 'data-k': 'sp-' + id, 'aria-label': r.testo });
    box.addEventListener('change', () => { r.fatta = box.checked; salvaSpesa(); render(); });
    return h('div', { class: 'buy' + (r.fatta ? ' buy--fatta' : '') }, box,
      h('button', { type: 'button', class: 'buy__t', 'aria-label': 'Modifica: ' + r.testo, onclick: () => openRiga(id) }, h('span', { text: r.testo }), r.dal_piano ? h('small', { text: 'dal piano' }) : null));
  };
  const mie = righe.filter(([, r]) => !r.dal_piano).sort((a, b) => a[0].localeCompare(b[0]));
  const piano = righe.filter(([, r]) => r.dal_piano).sort((a, b) => (+a[1].ordine || 0) - (+b[1].ordine || 0));
  if (!righe.length) out.append(h('p', { class: 'lead', text: 'La lista è vuota. Quando importi un piano, qui compaiono gli alimenti della settimana; puoi aggiungere anche righe tue.' }));
  if (mie.length) out.append(h('p', { class: 'sub', text: 'Aggiunte da te' }), h('div', { class: 'card' }, mie.map(riga)));
  const reparti = [];
  for (const x of piano) { const rep = P.repartoDi(x[1].reparto); let g = reparti.find((y) => y.rep === rep); if (!g) reparti.push(g = { rep, righe: [] }); g.righe.push(x); }
  for (const g of reparti) out.append(h('p', { class: 'sub', text: g.rep }), h('div', { class: 'card' }, g.righe.map(riga)));
  const fatte = righe.filter(([, r]) => r.fatta).length; const ultimo = pianoRecente();
  out.append(h('div', { class: 'acts' },
    fatte ? h('button', { type: 'button', class: 'pill pill--plain', onclick: () => { for (const [id, r] of righe) if (r.fatta) delete db.spesa.righe[id]; salvaSpesa('spesa: tolte le righe spuntate'); render(); } }, 'Togli le righe spuntate (' + fatte + ')') : null,
    ultimo ? h('button', { type: 'button', class: 'pill pill--plain', onclick: () => { rigeneraSpesa(ultimo.dal, ultimo.al); avviso('Righe dal piano rigenerate. Le tue sono rimaste.'); render(); } }, 'Rigenera dal piano') : null));
  if (ultimo) out.append(h('p', { class: 'lead', text: 'Le righe «dal piano» vengono dal piano dal ' + dayMonth(ultimo.dal) + ' al ' + dayMonth(ultimo.al) + ': totale della settimana, senza pasti liberi, alternative e pasti già mangiati. Rigenerando cambiano solo quelle.' }));
  return out;
}
function openRiga(id) {
  const r = db.spesa.righe[id]; if (!isObj(r)) return;
  openSheet('Riga della spesa', (body) => {
    const input = h('input', { class: 'field', type: 'text', value: r.testo, autocomplete: 'off', 'aria-label': 'Testo della riga' });
    body.append(input,
      r.dal_piano ? h('p', { class: 'hint', text: 'Se la modifichi diventa una riga tua: rigenerando dal piano non cambia più.' }) : null,
      h('div', { class: 'acts' },
        h('button', { type: 'button', class: 'pill', onclick: () => { const v = input.value.trim(); if (!v) return; if (v !== r.testo) { r.testo = v; if (r.dal_piano) { r.dal_piano = false; delete r.ordine; } salvaSpesa(); } closeSheet(); } }, 'Salva'),
        h('button', { type: 'button', class: 'pill pill--plain', onclick: () => { delete db.spesa.righe[id]; salvaSpesa(); closeSheet(); } }, 'Elimina la riga')));
  });
}

/* ---------- alimenti ---------- */
function viewAlimenti() {
  const root = h('div'); const ids = Object.keys(ANAG);
  root.append(testata('Alimenti', ids.length ? (ids.length === 1 ? '1 alimento' : ids.length + ' alimenti') + ' in anagrafica' : 'Anagrafica vuota'));
  if (!ids.length) {
    root.append(h('div', { class: 'card info vuoto' }, h('p', { class: 'info__t', text: 'Nessun alimento' }),
      h('p', { class: 'hint', text: 'Gli alimenti arrivano con il piano: l’importazione crea quelli che mancano, con i valori, la porzione e la foto.' }),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill', onclick: () => go('importa') }, 'Importa il piano'))));
    return root;
  }
  const cerca = h('input', { class: 'field', type: 'search', value: state.cerca, autocomplete: 'off', placeholder: 'Cerca un alimento', 'aria-label': 'Cerca un alimento', 'data-k': 'cerca' });
  const lista = h('div', { class: 'card' });
  const draw = () => {
    const q = norm(cerca.value.trim());
    const vis = ids.filter((id) => !q || norm(ANAG[id].nome).includes(q) || String(ANAG[id].codice_a_barre || '').includes(q)).sort((a, b) => nomeDi(a).localeCompare(nomeDi(b), 'it'));
    lista.replaceChildren(...(vis.length ? vis.map((id) => {
      const v = P.valori(ANAG[id]);
      return h('button', { type: 'button', class: 'pick alim', onclick: () => openAlimento(id) }, thumb(id),
        h('span', null, ANAG[id].nome, h('small', { text: fmt0(v.kcal) + ' kcal · proteine ' + fmt1(v.proteine) + ' g · carboidrati ' + fmt1(v.carboidrati) + ' g · grassi ' + fmt1(v.grassi) + ' g, per 100 g' })),
        h('span', { class: 'alim__r', text: P.repartoDi(ANAG[id].reparto) }));
    }) : [h('p', { class: 'empty', text: 'Nessun alimento con questo nome.' })]));
  };
  cerca.addEventListener('input', () => { state.cerca = cerca.value; draw(); });
  draw();
  root.append(h('section', { class: 'sect' }, cerca), h('section', { class: 'sect sect--s' }, lista));
  return root;
}
function openAlimento(id) {
  const a = ANAG[id]; if (!a) return;
  openSheet(a.nome, (body) => {
    const bozza = clona(a); if (!isObj(bozza.per_100g)) bozza.per_100g = {};
    const nome = h('input', { class: 'field', type: 'text', value: bozza.nome, autocomplete: 'off', 'aria-label': 'Nome' });
    nome.addEventListener('input', () => { bozza.nome = nome.value; });
    const campo = (label, val, set, unit) => h('label', { class: 'stima__r' }, h('span', { text: label }), numeroField(val, label, set), h('span', { text: unit }));
    const rep = h('select', { class: 'field', 'aria-label': 'Reparto' }, P.REPARTI.map((r) => h('option', { value: r, selected: P.repartoDi(bozza.reparto) === r ? true : null }, r)));
    rep.addEventListener('change', () => { bozza.reparto = rep.value; });
    const cod = h('input', { class: 'field', type: 'text', inputmode: 'numeric', value: bozza.codice_a_barre || '', autocomplete: 'off', 'aria-label': 'Codice a barre' });
    cod.addEventListener('input', () => { bozza.codice_a_barre = cod.value.replace(/\D/g, ''); });
    const esito = h('p', { class: 'hint', role: 'status' });
    const usi = USO.conta[id] || 0;
    body.append(
      h('div', { class: 'edit__head' }, thumb(id, 'th--xl'), h('p', { class: 'hint', text: (bozza.fonte === 'importazione' ? 'Arrivato con un piano importato. ' : '') + (usi ? 'Usato in ' + (usi === 1 ? '1 pasto' : usi + ' pasti') + '.' : 'Non ancora usato.') })),
      h('p', { class: 'sub', text: 'Nome' }), nome,
      h('p', { class: 'sub', text: 'Valori per 100 g' }),
      h('div', { class: 'card stima' }, MACROS.map((x) => h('label', { class: 'stima__r' }, macroTag(x), numeroField(bozza.per_100g[x.key], x.name + ' per 100 g', (v) => { bozza.per_100g[x.key] = v == null ? 0 : Math.max(0, v); }), h('span', { text: x.key === 'kcal' ? 'kcal' : 'g' })))),
      h('p', { class: 'sub', text: 'Porzione e confezione' }),
      h('div', { class: 'card stima' },
        campo('Porzione', bozza.porzione_g, (v) => { bozza.porzione_g = v && v > 0 ? v : 100; }, 'g'),
        campo('Confezione', bozza.confezione_g, (v) => { if (v && v > 0) bozza.confezione_g = v; else delete bozza.confezione_g; }, 'g')),
      h('p', { class: 'sub', text: 'Reparto' }), rep,
      h('p', { class: 'sub', text: 'Codice a barre' }), cod,
      bozza.foto ? h('p', { class: 'hint' }, 'Foto da: ', h('a', { href: bozza.foto, target: '_blank', rel: 'noopener noreferrer', text: bozza.foto.length > 60 ? bozza.foto.slice(0, 57) + '…' : bozza.foto })) : null,
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => {
        const n = bozza.nome.trim();
        if (!n) { esito.textContent = '⚠️ Il nome non può essere vuoto.'; return; }
        const doppio = Object.keys(ANAG).find((x) => x !== id && P.chiaveNome(ANAG[x].nome) === P.chiaveNome(n));
        if (doppio) { esito.textContent = '⚠️ Esiste già un alimento con questo nome.'; return; }
        if (bozza.codice_a_barre && Object.keys(ANAG).some((x) => x !== id && String(ANAG[x].codice_a_barre || '') === bozza.codice_a_barre)) { esito.textContent = '⚠️ Questo codice a barre è già di un altro alimento.'; return; }
        if (!bozza.codice_a_barre) delete bozza.codice_a_barre;
        bozza.nome = n; db.alimenti.alimenti[id] = bozza; salvaAlimenti('alimento ' + n); deriva(); closeSheet();
      } }, 'Salva')), esito);
  });
}

/* ---------- obiettivi per tipo di giornata ---------- */
function openObiettivi() {
  openSheet('Obiettivi', (body) => {
    const bozza = clona(db.obiettivi);
    const esito = h('p', { class: 'hint', role: 'status' });
    body.append(h('p', { class: 'hint', text: 'Calorie e grammi per ogni tipo di giornata. Claude li legge dal repository dei dati quando prepara il piano.' }));
    for (const t of TIPI) {
      const o = bozza.tipi[t.id];
      body.append(h('p', { class: 'sub', text: t.ico + ' ' + t.name }),
        h('div', { class: 'card stima' }, MACROS.map((x) => h('label', { class: 'stima__r' }, macroTag(x), numeroField(o[x.key], t.name + ': ' + x.name, (v) => { o[x.key] = v == null ? 0 : Math.max(0, Math.round(v)); }), h('span', { text: x.key === 'kcal' ? 'kcal' : 'g' })))));
    }
    body.append(h('p', { class: 'hint', text: 'Tolleranze: calorie ±' + TOLL.kcal.percento + '%, carboidrati ±' + TOLL.carboidrati.percento + '%, grassi ±' + TOLL.grassi.percento + '%, proteine e fibre almeno l’obiettivo. Si cambiano in obiettivi.json.' }),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'pill pill--wide', onclick: () => {
        delete bozza.nota; db.obiettivi = bozza; salvaFile('obiettivi.json', bozza, 'obiettivi'); deriva(); esito.textContent = '✓ Obiettivi salvati.'; closeSheet();
      } }, 'Salva')), esito);
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
    if (p[2] === 'tipo') return [quando + ': tipo di giornata', valoreBreve(L), valoreBreve(R)];
    if (p[2] === 'serata_impegnata') return [quando + ': serata impegnata', valoreBreve(L), valoreBreve(R)];
    if (p[2] === 'pasti' && p[3]) {
      const day = getDay(p[1]); const mm = isObj(day.pasti) && isObj(day.pasti[p[3]]) ? day.pasti[p[3]] : isObj(L) ? L : isObj(R) ? R : null;
      const nome = mm && mm.nome ? mm.nome : p[3];
      if (p.length === 4) return [quando + ': ' + nome, L === undefined ? 'pasto eliminato' : 'pasto modificato', R === undefined ? 'pasto eliminato' : 'pasto modificato'];
      if (p[4] === 'alimenti' && p.length === 6) { const d = (v) => (isObj(v) ? nomeDi(v.cibo) + ', ' + fmt0(+v.g || 0) + ' g' : 'tolto'); return [quando + ': ' + nome, d(L), d(R)]; }
      if (p[4] === 'alternative') return [quando + ': ' + nome + ', alternativa', isObj(L) ? 'modificata' : 'tolta', isObj(R) ? 'modificata' : 'tolta'];
      if (p[4] === 'stima') { const d = (v) => (isObj(v) ? fmt0(+v.kcal || 0) + ' kcal' : 'tolta'); return [quando + ': ' + nome + ', stima', d(L), d(R)]; }
      if (p[4] === 'ora') return [quando + ': orario di ' + lc(nome), valoreBreve(L), valoreBreve(R)];
      if (p[4] === 'mangiato') { const d = (v) => (v ? 'già mangiato' : 'da mangiare'); return [quando + ': ' + nome, d(L), d(R)]; }
      return [quando + ': ' + nome + ' (' + p.slice(4).join(' › ') + ')', valoreBreve(L), valoreBreve(R)];
    }
  }
  if (c.file === 'spesa.json' && p[0] === 'righe' && p[1]) {
    const r = db.spesa.righe[p[1]] || (isObj(L) ? L : isObj(R) ? R : {});
    const d = (v) => (isObj(v) ? v.testo : p[2] === 'fatta' ? (v ? 'spuntata' : 'da prendere') : valoreBreve(v));
    return ['Spesa: «' + (r.testo || p[1]) + '»', d(L), d(R)];
  }
  if (/^foto\//.test(c.file)) return ['Foto di «' + nomeDi(c.file.slice(5, -5)) + '»', L === undefined ? 'tolta' : 'modificata', R === undefined ? 'tolta' : 'modificata'];
  if (/^settimane\//.test(c.file)) return ['Piano dal ' + c.file.slice(10, 20) + (p.length ? ': ' + p.join(' › ') : ''), valoreBreve(L), valoreBreve(R)];
  if (c.file === 'alimenti.json' && p[0] === 'alimenti' && p[1]) return ['Alimento «' + nomeDi(p[1]) + '»' + (p[2] ? ': ' + p.slice(2).join(' › ') : ''), valoreBreve(L), valoreBreve(R)];
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

/* ---------- impostazioni: GitHub, obiettivi e copie dei dati ---------- */
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
      const vecchia = Object.values(cp.file).some((v) => isObj(v) && !(v.schema >= 2));
      ripr.replaceChildren(h('div', { class: 'card info' },
        h('p', { class: 'info__t', text: 'Copia del ' + quando + (cp.dispositivo ? ' da «' + cp.dispositivo + '»' : '') + ', con ' + n + (n === 1 ? ' giornata.' : ' giornate.') }),
        vecchia ? h('p', { class: 'hint', text: '⚠️ È una copia del formato di prima: ripristinandola, l’app la riporterebbe a zero. Tienila solo come archivio.' }) : null,
        h('p', { class: 'hint', text: 'Sostituisce i dati di questo telefono' + (arch.haToken() ? ' e, con GitHub collegato, anche quelli su GitHub e sugli altri dispositivi.' : '.') }),
        h('div', { class: 'acts' },
          vecchia ? null : h('button', { type: 'button', class: 'pill', onclick: () => { try { arch.ripristina(cp); ripr.replaceChildren(h('p', { class: 'hint', text: '✓ Dati ripristinati.' })); } catch (e) { ripr.replaceChildren(h('p', { class: 'hint', text: '⚠️ ' + e.message })); } } }, 'Ripristina'),
          h('button', { type: 'button', class: 'pill pill--plain', onclick: () => ripr.replaceChildren() }, 'Annulla'))));
    });
    const auto = arch.copiaAuto();

    body.append(
      h('p', { class: 'sub', text: 'Obiettivi' }),
      h('div', { class: 'acts acts--0' }, h('button', { type: 'button', class: 'pill pill--plain pill--wide', onclick: openObiettivi }, 'Obiettivi per tipo di giornata')),
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
      h('div', { class: 'acts acts--0' },
        h('button', { type: 'button', class: 'pill', onclick: () => scaricaJSON(arch.creaCopia(), 'weekly-menu-dati-' + todayKey() + '.json') }, 'Scarica una copia'),
        h('button', { type: 'button', class: 'pill pill--plain', onclick: () => fileIn.click() }, 'Ripristina da file')),
      fileIn, ripr,
      auto ? h('button', { type: 'button', class: 'textbtn textbtn--sm', onclick: () => scaricaJSON(auto, 'weekly-menu-copia-automatica.json') }, 'Scarica la copia automatica del ' + new Date(auto.creata).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })) : null,
      h('p', { class: 'hint', text: 'La copia contiene tutti i dati ma non il token. Il token resta solo su questo telefono: non finisce nel codice, nel repository, nelle copie o nei messaggi.' }),
      h('p', { class: 'sub', text: 'Formato del piano' }),
      h('p', { class: 'hint' }, 'Le regole che Claude segue per preparare il piano sono in ', h('a', { href: LINK_FORMATO, target: '_blank', rel: 'noopener' }, 'FORMATO.md'), '.'));
    mostraStato(arch.stato());
  }, 'info');
}

/* ---------- avvio ---------- */
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
render();
arch.adesso();
setInterval(controllaGiorno, 60000); /* se l'app resta aperta a mezzanotte, «Oggi» passa al giorno nuovo */
})();
