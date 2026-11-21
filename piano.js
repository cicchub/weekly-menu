/* Weekly Menu · piano.js
   Il piano della settimana preparato con Claude: lettura e controllo del testo, riconoscimento degli alimenti,
   giornate, lista della spesa, preparazioni e tolleranze. Niente interfaccia: si prova anche con Node.
   Il formato è descritto in FORMATO.md. */
(function (root) {
'use strict';

const FORMATO = 'weekly-menu-piano';
const VERSIONE = 1;
const MACRO = ['kcal', 'proteine', 'carboidrati', 'grassi', 'fibre'];
const NOMI_MACRO = { kcal: 'calorie', proteine: 'proteine', carboidrati: 'carboidrati', grassi: 'grassi', fibre: 'fibre' };
const PASTI = [
  { id: 'colazione', nome: 'Colazione', ora: '08:00' },
  { id: 'spuntino_mattina', nome: 'Spuntino della mattina', ora: '10:30' },
  { id: 'pranzo', nome: 'Pranzo', ora: '13:00' },
  { id: 'spuntino_pomeriggio', nome: 'Spuntino del pomeriggio', ora: '16:30' },
  { id: 'cena', nome: 'Cena', ora: '20:00' },
];
const ID_PASTI = PASTI.map((p) => p.id);
const REPARTI = ['Frutta e verdura', 'Pane e forno', 'Carne', 'Pesce', 'Salumi e formaggi', 'Latticini e uova', 'Surgelati', 'Bevande', 'Altro', 'Dispensa'];
/* gli obiettivi sono intervalli: dentro è «in obiettivo»; fuori di poco è «vicino» e va bene così; oltre è «lontano».
   «Di poco» vuol dire fino a VICINO.kcal_percento per le calorie e VICINO.macro_percento per i macro, sul limite superato */
const VICINO = { kcal_percento: 5, macro_percento: 10 };
const R = (min, max) => ({ min, max });
const OBIETTIVI_INIZIALI = {
  schema: 3,
  spiegazione: 'Per ogni tipo di giornata, kcal e grammi di proteine, carboidrati, grassi e fibre come intervallo, con min e max. Dentro l’intervallo un valore è «in obiettivo». Fuori di poco è «vicino» e va bene così: fino a vicino.kcal_percento per cento per le calorie e a vicino.macro_percento per cento per i macro, calcolati sul limite superato. Oltre è «lontano».',
  tipi: {
    riposo: { nome: 'Riposo', kcal: R(2400, 2600), proteine: R(135, 150), carboidrati: R(280, 300), grassi: R(60, 75), fibre: R(25, 35) },
    palestra: { nome: 'Palestra', kcal: R(2600, 2800), proteine: R(135, 150), carboidrati: R(330, 360), grassi: R(60, 75), fibre: R(25, 35) },
    apnea: { nome: 'Apnea', kcal: R(2600, 2800), proteine: R(135, 150), carboidrati: R(330, 360), grassi: R(60, 75), fibre: R(25, 35) },
  },
  vicino: VICINO,
};
/* i valori di partenza inventati della versione 2: se sono ancora questi, si sostituiscono con gli intervalli veri */
const OBIETTIVI_V2_INVENTATI = {
  riposo: { kcal: 2400, proteine: 145, carboidrati: 265, grassi: 80, fibre: 30 },
  palestra: { kcal: 2700, proteine: 150, carboidrati: 335, grassi: 80, fibre: 30 },
  apnea: { kcal: 2550, proteine: 145, carboidrati: 300, grassi: 80, fibre: 30 },
};

/* ---------- utilità ---------- */
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clona = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const numero = (v) => typeof v === 'number' && isFinite(v);
const tondo = (n, d) => { const f = Math.pow(10, d || 0); return Math.round(n * f) / f; };
const virgola = (n) => String(n).replace('.', ',');
function dataValida(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d, 12);
  return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d;
}
const chiaveData = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function spostaData(k, n) { const [y, m, d] = k.split('-').map(Number); const x = new Date(y, m - 1, d, 12); x.setDate(x.getDate() + n); return chiaveData(x); }
function dateTra(dal, al) { const out = []; for (let k = dal; k <= al && out.length < 40; k = spostaData(k, 1)) out.push(k); return out; }
const dataBreve = (k) => k.slice(8, 10) + '/' + k.slice(5, 7);
function quantita(g) {
  if (g >= 1000) return virgola(tondo(g / 1000, g >= 10000 ? 0 : 1)) + ' kg';
  return Math.round(g) + ' g';
}

/* ---------- nomi: uguali, simili ---------- */
const PAROLE_VUOTE = new Set(['di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'al', 'alla', 'allo', 'ai', 'alle', 'con', 'in', 'da', 'per', 'il', 'la', 'lo', 'le', 'gli', 'un', 'una', 'uno']);
const normalizza = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const parole = (s) => normalizza(s).split(' ').filter((w) => w && (w.length > 1 || /\d/.test(w)) && !PAROLE_VUOTE.has(w));
/* due nomi sono «lo stesso nome» se hanno le stesse parole, senza maiuscole, accenti, punteggiatura e articoli */
const chiaveNome = (s) => parole(s).join(' ') || normalizza(s);
function distanza(a, b) {
  const v = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prec = v[0]; v[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = v[j]; v[j] = Math.min(v[j] + 1, v[j - 1] + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1)); prec = t; }
  }
  return v[b.length];
}
/* somiglianza da 0 a 1: parole in comune, un nome contenuto nell'altro, o quasi le stesse lettere (errori di battitura) */
function somiglianza(a, b) {
  const ka = chiaveNome(a); const kb = chiaveNome(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  const pa = new Set(ka.split(' ')); const pb = new Set(kb.split(' '));
  let comuni = 0; for (const w of pa) if (pb.has(w)) comuni++;
  const unione = pa.size + pb.size - comuni;
  let s = unione ? comuni / unione : 0;
  if (comuni && comuni === Math.min(pa.size, pb.size)) s = Math.max(s, 0.8);
  const r = 1 - distanza(ka, kb) / Math.max(ka.length, kb.length);
  if (r >= 0.85) s = Math.max(s, r);
  return s;
}
const SIMILE = 0.6;
function piuSimile(nome, alimenti) {
  let best = null;
  for (const [id, a] of Object.entries(alimenti || {})) {
    if (!isObj(a)) continue;
    const s = somiglianza(nome, a.nome);
    if (s >= SIMILE && (!best || s > best.s)) best = { id, s };
  }
  return best;
}
function idDaNome(nome, usati) {
  const base = normalizza(nome).replace(/ /g, '-').slice(0, 48).replace(/-+$/, '') || 'alimento';
  let id = base; let i = 2;
  while (usati.has(id)) id = base + '-' + i++;
  usati.add(id);
  return id;
}

/* ---------- valori ---------- */
function valori(a) {
  const v = isObj(a) && isObj(a.per_100g) ? a.per_100g : {};
  const o = {}; for (const k of MACRO) o[k] = +v[k] || 0;
  return o;
}
const zero = () => ({ kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0 });
function somma(a, b) { const o = Object.assign({}, a); for (const k of MACRO) o[k] = (o[k] || 0) + (+b[k] || 0); return o; }
function perGrammi(alimento, g) { const v = valori(alimento); const o = zero(); for (const k of MACRO) o[k] = v[k] * (+g || 0) / 100; return o; }
const vociDi = (m) => Object.entries(isObj(m) && isObj(m.alimenti) ? m.alimenti : {}).filter(([, e]) => isObj(e)).map(([id, e]) => ({ id, e })).sort((x, y) => x.id.localeCompare(y.id));
function totaleVoci(alimentiPasto, anagrafica) {
  let t = zero();
  for (const e of Object.values(alimentiPasto || {})) if (isObj(e)) t = somma(t, perGrammi(anagrafica[e.cibo], e.g));
  return t;
}
function totalePasto(m, anagrafica) {
  if (!isObj(m)) return zero();
  if (m.libero) { const s = isObj(m.stima) ? m.stima : {}; const o = zero(); for (const k of MACRO) o[k] = +s[k] || 0; return o; }
  return totaleVoci(m.alimenti, anagrafica);
}
function totaleGiorno(day, anagrafica) {
  let t = zero();
  for (const m of Object.values(isObj(day) && isObj(day.pasti) ? day.pasti : {})) t = somma(t, totalePasto(m, anagrafica));
  return t;
}
/* l'intervallo di ogni valore per il tipo della giornata: {kcal: {min, max}, …} */
function intervallo(x) {
  if (isObj(x) && numero(+x.min) && numero(+x.max) && +x.max >= +x.min && +x.max > 0) return { min: +x.min, max: +x.max };
  if (numero(+x) && +x > 0) return { min: +x, max: +x };
  return null;
}
function intervalliDi(day, obiettivi) {
  const tipi = isObj(obiettivi) && isObj(obiettivi.tipi) ? obiettivi.tipi : OBIETTIVI_INIZIALI.tipi;
  const t = (isObj(day) && isObj(tipi[day.tipo]) && tipi[day.tipo]) || tipi.riposo || OBIETTIVI_INIZIALI.tipi.riposo;
  const base = OBIETTIVI_INIZIALI.tipi[isObj(day) && OBIETTIVI_INIZIALI.tipi[day.tipo] ? day.tipo : 'riposo'];
  const o = {};
  for (const k of MACRO) o[k] = intervallo(t[k]) || clona(base[k]);
  return o;
}
function vicinoDi(obiettivi) {
  const v = isObj(obiettivi) && isObj(obiettivi.vicino) ? obiettivi.vicino : {};
  const p = (x, d) => (numero(+x) && +x >= 0 && +x <= 100 ? +x : d);
  return { kcal_percento: p(v.kcal_percento, VICINO.kcal_percento), macro_percento: p(v.macro_percento, VICINO.macro_percento) };
}
/* lo stato di ogni valore: [{chiave, valore, min, max, stato: 'dentro'|'vicino'|'lontano', verso: 'sotto'|'sopra'|null, diff}] */
function valuta(tot, intervalli, vicino) {
  const V = vicino || VICINO; const out = [];
  for (const k of MACRO) {
    const r = intervalli[k]; const v = Math.round(+tot[k] || 0);
    const pc = (k === 'kcal' ? V.kcal_percento : V.macro_percento) / 100;
    let stato = 'dentro'; let verso = null; let diff = 0;
    if (v < r.min) { verso = 'sotto'; diff = r.min - v; stato = diff <= r.min * pc + 1e-9 ? 'vicino' : 'lontano'; }
    else if (v > r.max) { verso = 'sopra'; diff = v - r.max; stato = diff <= r.max * pc + 1e-9 ? 'vicino' : 'lontano'; }
    out.push({ chiave: k, valore: v, min: r.min, max: r.max, stato, verso, diff });
  }
  return out;
}
const lontani = (val) => val.filter((x) => x.stato === 'lontano');
function descriviStato(x) {
  const u = x.chiave === 'kcal' ? ' kcal' : ' g';
  if (x.stato === 'dentro') return NOMI_MACRO[x.chiave] + ' in obiettivo';
  return NOMI_MACRO[x.chiave] + ' ' + Math.round(x.diff) + u + (x.verso === 'sotto' ? ' sotto il minimo' : ' oltre il massimo');
}
/* obiettivi della versione 2 (un numero per valore) → intervalli. Se sono ancora quelli inventati li sostituisco;
   se sono stati cambiati, li trasformo con le tolleranze di prima, perché non vadano persi */
function migraObiettivi(o) {
  if (!isObj(o) || o.schema >= 3) return { obiettivi: o, come: null };
  const tipi = isObj(o.tipi) ? o.tipi : {};
  const inventati = Object.keys(OBIETTIVI_V2_INVENTATI).every((t) => isObj(tipi[t]) && MACRO.every((k) => +tipi[t][k] === OBIETTIVI_V2_INVENTATI[t][k]))
    && Object.keys(tipi).every((t) => OBIETTIVI_V2_INVENTATI[t]);
  if (inventati) return { obiettivi: clona(OBIETTIVI_INIZIALI), come: 'nuovi' };
  const nuovo = clona(OBIETTIVI_INIZIALI);
  for (const [id, t] of Object.entries(tipi)) {
    if (!isObj(t)) continue;
    const x = { nome: String(t.nome || id) };
    for (const k of MACRO) {
      const n = +t[k];
      if (!numero(n) || n <= 0) { x[k] = clona((OBIETTIVI_INIZIALI.tipi[id] || OBIETTIVI_INIZIALI.tipi.riposo)[k]); continue; }
      if (k === 'kcal') x[k] = R(Math.round(n * 0.95), Math.round(n * 1.05));
      else if (k === 'carboidrati' || k === 'grassi') x[k] = R(Math.round(n * 0.9), Math.round(n * 1.1));
      else x[k] = R(Math.round(n), Math.round(n * 1.1));
    }
    nuovo.tipi[id] = x;
  }
  return { obiettivi: nuovo, come: 'convertiti' };
}

/* ---------- giornate ---------- */
function giornoVuoto(tipo) {
  const pasti = {};
  for (const p of PASTI) pasti[p.id] = { nome: p.nome, ora: p.ora, mangiato: false, alimenti: {} };
  return { tipo: tipo || 'riposo', serata_impegnata: false, pasti };
}
function haContenuto(day) {
  if (!isObj(day) || !isObj(day.pasti)) return false;
  return Object.values(day.pasti).some((m) => isObj(m) && (m.libero || m.mangiato || vociDi(m).length > 0));
}
/* la settimana nuova sostituisce la vecchia, ma i pasti già mangiati restano com'erano */
function sostituisci(vecchio, nuovo) {
  const out = clona(nuovo);
  if (isObj(vecchio) && isObj(vecchio.pasti)) {
    for (const [id, m] of Object.entries(vecchio.pasti)) if (isObj(m) && m.mangiato) out.pasti[id] = clona(m);
  }
  return out;
}

/* ---------- lettura del testo ---------- */
function estrai(testo) {
  let t = String(testo == null ? '' : testo).replace(/^﻿/, '').trim();
  if (!t) return { errore: 'Il testo è vuoto: incolla il piano che ti ha dato Claude.' };
  const blocco = t.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
  if (blocco && blocco[1].includes('{')) t = blocco[1];
  const i = t.indexOf('{'); const k = t.lastIndexOf('}');
  if (i < 0 || k < i) return { errore: 'Non trovo il piano: il testo deve contenere un oggetto JSON, tra { e }.' };
  const j = t.slice(i, k + 1);
  try { return { dati: JSON.parse(j) }; } catch (e) {
    try { return { dati: JSON.parse(j.replace(/[“”„]/g, '"')) }; } catch (e2) { /* spiego il primo errore */ }
    const m = String(e.message).match(/position (\d+)/);
    const riga = m ? j.slice(0, Number(m[1])).split('\n').length : 0;
    return { errore: 'Il JSON non è scritto bene' + (riga ? ', verso la riga ' + riga : '') + '. Chiedi a Claude di ridarti il piano come JSON valido.' };
  }
}
const ALIAS_PASTI = { spuntino_mattino: 'spuntino_mattina', spuntino_della_mattina: 'spuntino_mattina', spuntino_del_pomeriggio: 'spuntino_pomeriggio' };
const idPasto = (k) => { const x = normalizza(k).replace(/ /g, '_'); return ID_PASTI.includes(x) ? x : ALIAS_PASTI[x] || null; };

/* analizza il testo: errori, avvisi, alimenti da riconoscere e domande. ctx = { alimenti, tipi } */
function analizza(testo, ctx) {
  ctx = ctx || {};
  const anag = isObj(ctx.alimenti) ? ctx.alimenti : {};
  const tipi = Array.isArray(ctx.tipi) && ctx.tipi.length ? ctx.tipi : Object.keys(OBIETTIVI_INIZIALI.tipi);
  const A = { ok: false, errori: [], avvisi: [], dal: null, al: null, date: [], giorni: [], nuovi: [], riferimenti: [], domande: [], preparazioni: [] };
  const err = (s) => A.errori.push(s); const avv = (s) => A.avvisi.push(s);
  const { dati, errore } = estrai(testo);
  if (errore) { err(errore); return A; }
  if (!isObj(dati)) { err('Il piano deve essere un oggetto JSON, tra { e }.'); return A; }
  if (dati.formato !== undefined && dati.formato !== FORMATO) { err('Questo testo non è un piano di Weekly Menu: "formato" deve essere "' + FORMATO + '".'); return A; }
  if (dati.formato === undefined) avv('Manca "formato": "' + FORMATO + '". Lo leggo comunque come un piano.');
  if (dati.versione !== undefined && !(numero(dati.versione) && dati.versione >= 1)) err('"versione" deve essere un numero.');
  else if (dati.versione > VERSIONE) { err('Il piano usa la versione ' + dati.versione + ' del formato: aggiorna l’app.'); return A; }

  /* alimenti nuovi */
  const codiceDi = (v, dove) => {
    if (v === undefined || v === null || v === '') return null;
    const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.replace(/\s/g, '') : '';
    if (!/^\d{6,14}$/.test(s)) { avv(dove + ': il codice a barre «' + v + '» non è valido, lo ignoro.'); return null; }
    if (typeof v === 'number') avv(dove + ': scrivi il codice a barre tra virgolette, così non perde gli zeri iniziali.');
    return s;
  };
  const nuovi = Array.isArray(dati.alimenti_nuovi) ? dati.alimenti_nuovi : [];
  if (dati.alimenti_nuovi !== undefined && !Array.isArray(dati.alimenti_nuovi)) err('"alimenti_nuovi" deve essere un elenco, tra [ e ].');
  nuovi.forEach((n, i) => {
    const dove = 'Alimento nuovo ' + (i + 1);
    if (!isObj(n) || typeof n.nome !== 'string' || !n.nome.trim()) { err(dove + ': manca il nome.'); return; }
    const nome = n.nome.trim(); const qui = '«' + nome + '»';
    const v = isObj(n.per_100g) ? n.per_100g : null;
    if (!v) { err(qui + ': mancano i valori "per_100g".'); return; }
    const per = {};
    for (const k of MACRO) {
      if (v[k] === undefined && k === 'fibre') { per[k] = 0; continue; }
      if (!numero(v[k]) || v[k] < 0) { err(qui + ': in "per_100g" manca "' + k + '" o non è un numero.'); return; }
      per[k] = v[k];
    }
    if (per.kcal > 900 || per.proteine > 100 || per.carboidrati > 100 || per.grassi > 100 || per.proteine + per.carboidrati + per.grassi > 102) avv(qui + ': i valori per 100 g sembrano troppo alti, controllali.');
    const stima = 4 * per.proteine + 4 * per.carboidrati + 9 * per.grassi;
    if (per.kcal > 20 && Math.abs(stima - per.kcal) > per.kcal * 0.25 + 15) avv(qui + ': calorie e macro non tornano tra loro (' + per.kcal + ' kcal dichiarate, circa ' + Math.round(stima) + ' dai macro).');
    const pos = (x, campo) => { if (x === undefined || x === null) return null; if (!numero(x) || x <= 0) { avv(qui + ': "' + campo + '" non è valido, lo ignoro.'); return null; } return x; };
    let reparto = typeof n.reparto === 'string' && n.reparto.trim() ? n.reparto.trim() : null;
    if (reparto) { const r = REPARTI.find((x) => normalizza(x) === normalizza(reparto)); if (r) reparto = r; else avv(qui + ': il reparto «' + reparto + '» non è tra quelli previsti: lo metto in «Altro».'); if (!r) reparto = 'Altro'; }
    let foto = null;
    if (n.foto !== undefined && n.foto !== null && n.foto !== '') {
      if (typeof n.foto === 'string' && (/^https:\/\/\S+$/.test(n.foto) || /^data:image\/(jpeg|png|webp);base64,/.test(n.foto))) foto = n.foto;
      else avv(qui + ': il link della foto non è valido (deve iniziare con https://), lo ignoro.');
    }
    A.nuovi.push({ idx: A.nuovi.length, nome, chiave: chiaveNome(nome), codice: codiceDi(n.codice_a_barre, qui), per_100g: per,
      porzione_g: pos(n.porzione_g, 'porzione_g') || 100, confezione_g: pos(n.confezione_g, 'confezione_g'), reparto, foto });
  });
  /* niente doppioni tra gli alimenti nuovi */
  for (let i = 0; i < A.nuovi.length; i++) for (let j = i + 1; j < A.nuovi.length; j++) {
    const a = A.nuovi[i]; const b = A.nuovi[j];
    if (a.chiave === b.chiave || (a.codice && a.codice === b.codice)) err('«' + b.nome + '» compare due volte tra gli alimenti nuovi: tienine uno solo.');
  }
  /* un alimento nuovo potrebbe essere già in anagrafica */
  const perCodice = (c) => Object.keys(anag).find((id) => isObj(anag[id]) && anag[id].codice_a_barre && String(anag[id].codice_a_barre) === c);
  const perNome = (s) => { const k = chiaveNome(s); return Object.keys(anag).find((id) => isObj(anag[id]) && chiaveNome(anag[id].nome) === k); };
  for (const n of A.nuovi) {
    let id;
    if (n.codice && (id = perCodice(n.codice))) n.esito = { tipo: 'codice', id };
    else if ((id = perNome(n.nome))) n.esito = { tipo: 'nome', id };
    else { const s = piuSimile(n.nome, anag); n.esito = s ? { tipo: 'simile', candidato: s.id } : { tipo: 'crea' }; }
    if (n.esito.tipo === 'simile') A.domande.push({ chiave: 'n' + n.idx, nome: n.nome, candidato: n.esito.candidato, haValori: true });
  }

  /* riferimenti agli alimenti nei pasti e nelle preparazioni */
  const refs = new Map();
  const riferimento = (x, dove) => {
    if (!isObj(x) || typeof x.nome !== 'string' || !x.nome.trim()) { err(dove + ': un alimento non ha il nome.'); return null; }
    const nome = x.nome.trim(); const codice = codiceDi(x.codice_a_barre, dove + ', «' + nome + '»');
    const k = codice ? 'c:' + codice : 'n:' + chiaveNome(nome);
    if (!refs.has(k)) refs.set(k, { k, nome, codice, usi: 0 });
    const r = refs.get(k); r.usi++;
    return k;
  };
  const voci = (lista, dove) => {
    if (!Array.isArray(lista)) { err(dove + ': "alimenti" deve essere un elenco, tra [ e ].'); return []; }
    const out = [];
    for (const x of lista) {
      const k = riferimento(x, dove); if (!k) continue;
      if (!numero(x.grammi) || x.grammi <= 0 || x.grammi > 3000) { err(dove + ', «' + x.nome.trim() + '»: "grammi" deve essere un numero tra 1 e 3000.'); continue; }
      out.push({ k, g: Math.round(x.grammi) });
    }
    return out;
  };

  /* settimana e giorni */
  const giorni = Array.isArray(dati.giorni) ? dati.giorni : null;
  if (!giorni || !giorni.length) { err('Manca l’elenco "giorni".'); return A; }
  const s = isObj(dati.settimana) ? dati.settimana : {};
  let dal = s.dal; let al = s.al;
  const dateGiorni = giorni.map((g) => (isObj(g) ? g.data : null)).filter(dataValida).sort();
  if (!dataValida(dal) || !dataValida(al)) {
    if (dati.settimana !== undefined) err('"settimana" deve avere "dal" e "al" nel formato AAAA-MM-GG.');
    else avv('Manca "settimana": uso le date dei giorni.');
    dal = dateGiorni[0]; al = dateGiorni[dateGiorni.length - 1];
  }
  if (!dal || !al) { err('Non trovo le date della settimana.'); return A; }
  if (al < dal) { err('"settimana": "al" viene prima di "dal".'); return A; }
  A.dal = dal; A.al = al; A.date = dateTra(dal, al);
  if (A.date.length > 7) { err('Il piano copre ' + A.date.length + ' giorni: al massimo 7.'); return A; }
  const visti = new Set();
  for (const g of giorni) {
    if (!isObj(g) || !dataValida(g.data)) { err('Un giorno non ha una "data" valida, nel formato AAAA-MM-GG.'); continue; }
    const dove = dataBreve(g.data);
    if (g.data < dal || g.data > al) { err(dove + ': la data è fuori dalla settimana del piano.'); continue; }
    if (visti.has(g.data)) { err(dove + ': il giorno compare due volte.'); continue; }
    visti.add(g.data);
    const tipo = typeof g.tipo === 'string' ? normalizza(g.tipo) : '';
    if (!tipi.includes(tipo)) err(dove + ': "tipo" deve essere uno di questi: ' + tipi.join(', ') + '.');
    if (g.serata_impegnata !== undefined && typeof g.serata_impegnata !== 'boolean') err(dove + ': "serata_impegnata" deve essere true o false.');
    const G = { data: g.data, tipo, serata: g.serata_impegnata === true, pasti: {} };
    if (!isObj(g.pasti)) { err(dove + ': mancano i "pasti".'); A.giorni.push(G); continue; }
    for (const [chiave, m] of Object.entries(g.pasti)) {
      const pid = idPasto(chiave);
      if (!pid) { err(dove + ': il pasto «' + chiave + '» non esiste. I pasti sono: ' + ID_PASTI.join(', ') + '.'); continue; }
      const qui = dove + ', ' + PASTI.find((p) => p.id === pid).nome.toLowerCase();
      if (!isObj(m)) { err(qui + ': il pasto deve essere un oggetto, tra { e }.'); continue; }
      let ora = null;
      if (m.ora !== undefined) { if (typeof m.ora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(m.ora)) ora = m.ora; else avv(qui + ': l’orario «' + m.ora + '» non è valido, uso quello solito.'); }
      if (m.libero === true) {
        const st = isObj(m.stima) ? m.stima : null; const stima = {};
        if (!st) { err(qui + ': un pasto libero ha bisogno della "stima" dei macro.'); continue; }
        let ok = true;
        for (const k of MACRO) {
          if (st[k] === undefined && k === 'fibre') { stima[k] = 0; continue; }
          if (!numero(st[k]) || st[k] < 0) { err(qui + ': nella "stima" manca "' + k + '" o non è un numero.'); ok = false; break; }
          stima[k] = st[k];
        }
        if (!ok) continue;
        if (m.alimenti !== undefined || m.alternative !== undefined) avv(qui + ': è un pasto libero, quindi ignoro alimenti e alternative.');
        G.pasti[pid] = { libero: true, descrizione: typeof m.descrizione === 'string' ? m.descrizione.trim() : '', stima, ora };
        continue;
      }
      if (m.libero !== undefined && m.libero !== false) err(qui + ': "libero" deve essere true o false.');
      const principali = m.alimenti === undefined ? [] : voci(m.alimenti, qui);
      if (!principali.length && m.alimenti !== undefined && Array.isArray(m.alimenti) && !m.alimenti.length) avv(qui + ': il pasto è vuoto.');
      const alternative = [];
      if (m.alternative !== undefined) {
        if (!Array.isArray(m.alternative)) err(qui + ': "alternative" deve essere un elenco, tra [ e ].');
        else {
          if (m.alternative.length > 2) err(qui + ': al massimo 2 alternative.');
          m.alternative.slice(0, 2).forEach((alt, i) => {
            const lista = Array.isArray(alt) ? alt : isObj(alt) ? alt.alimenti : null;
            const v = voci(lista, qui + ', alternativa ' + (i + 1));
            if (v.length) alternative.push(v); else if (Array.isArray(lista)) err(qui + ', alternativa ' + (i + 1) + ': è vuota.');
          });
        }
      }
      G.pasti[pid] = { libero: false, voci: principali, alternative, ora };
    }
    A.giorni.push(G);
  }
  A.giorni.sort((x, y) => x.data.localeCompare(y.data));
  for (const d of A.date) if (!visti.has(d)) avv(dataBreve(d) + ': il piano non ha questo giorno, lo lascio com’è.');

  /* preparazioni */
  if (dati.preparazioni !== undefined && !Array.isArray(dati.preparazioni)) err('"preparazioni" deve essere un elenco, tra [ e ].');
  (Array.isArray(dati.preparazioni) ? dati.preparazioni : []).forEach((p, i) => {
    const dove = 'Preparazione ' + (i + 1);
    if (!isObj(p)) { err(dove + ': deve essere un oggetto, tra { e }.'); return; }
    if (!dataValida(p.data)) { err(dove + ': manca la "data", nel formato AAAA-MM-GG.'); return; }
    const P = { data: p.data, titolo: typeof p.titolo === 'string' ? p.titolo.trim() : '', piatti: [] };
    if (!Array.isArray(p.piatti) || !p.piatti.length) { err(dove + ': mancano i "piatti".'); return; }
    p.piatti.forEach((x, j) => {
      const qui = dove + ', piatto ' + (j + 1);
      if (!isObj(x) || typeof x.nome !== 'string' || !x.nome.trim()) { err(qui + ': manca il nome.'); return; }
      const per = [];
      for (const q of Array.isArray(x.per) ? x.per : []) {
        const pid = isObj(q) ? idPasto(q.pasto || '') : null;
        if (!isObj(q) || !dataValida(q.data) || !pid) { err(qui + ' («' + x.nome.trim() + '»): ogni voce di "per" deve avere "data" e "pasto".'); continue; }
        const G = A.giorni.find((d) => d.data === q.data);
        if (!G || !G.pasti[pid]) avv(qui + ' («' + x.nome.trim() + '»): ' + dataBreve(q.data) + ' ' + pid.replace('_', ' ') + ' non è nel piano.');
        else if (G.pasti[pid].libero) avv(qui + ' («' + x.nome.trim() + '»): ' + dataBreve(q.data) + ' ' + pid.replace('_', ' ') + ' è un pasto libero.');
        per.push({ data: q.data, pasto: pid });
      }
      if (!per.length) { err(qui + ' («' + x.nome.trim() + '»): manca "per", cioè i pasti a cui serve.'); return; }
      if (p.data > per.map((q) => q.data).sort()[0]) avv(qui + ' («' + x.nome.trim() + '»): si prepara dopo il primo pasto a cui serve.');
      let alimenti = null;
      if (x.alimenti !== undefined) {
        if (!Array.isArray(x.alimenti)) err(qui + ': "alimenti" deve essere un elenco di nomi.');
        else alimenti = x.alimenti.map((n) => riferimento(typeof n === 'string' ? { nome: n } : n, qui)).filter(Boolean);
      }
      P.piatti.push({ nome: x.nome.trim(), alimenti, per });
    });
    if (P.piatti.length) A.preparazioni.push(P);
  });

  /* riconoscimento: codice a barre, poi nome identico, poi nome simile (con domanda) */
  const nuovoPerCodice = (c) => A.nuovi.find((n) => n.codice && n.codice === c);
  const nuovoPerNome = (s) => { const k = chiaveNome(s); return A.nuovi.find((n) => n.chiave === k); };
  for (const r of refs.values()) {
    let id; let n;
    if (r.codice && (id = perCodice(r.codice))) r.esito = { tipo: 'codice', id };
    else if (r.codice && (n = nuovoPerCodice(r.codice))) r.esito = { tipo: 'nuovo', idx: n.idx };
    else if ((id = perNome(r.nome))) r.esito = { tipo: 'nome', id };
    else if ((n = nuovoPerNome(r.nome))) r.esito = { tipo: 'nuovo', idx: n.idx };
    else {
      const sim = piuSimile(r.nome, anag);
      if (sim) { r.esito = { tipo: 'simile', candidato: sim.id }; A.domande.push({ chiave: r.k, nome: r.nome, candidato: sim.id, haValori: false }); }
      else {
        r.esito = { tipo: 'mancante' };
        const forse = A.nuovi.map((x) => ({ x, s: somiglianza(r.nome, x.nome) })).filter((y) => y.s >= SIMILE).sort((a, b) => b.s - a.s)[0];
        err('«' + r.nome + '» non è in anagrafica e non è tra gli alimenti nuovi' + (forse ? ': forse intendevi «' + forse.x.nome + '»?' : ': aggiungilo agli alimenti nuovi, con i suoi valori.'));
      }
    }
    A.riferimenti.push(r);
  }
  A.ok = !A.errori.length;
  return A;
}

/* con le risposte alle domande (chiave → true se è lo stesso alimento): cosa manca ancora e cosa non va */
function stato(A, risposte) {
  const R = risposte || {};
  const senzaRisposta = A.domande.filter((d) => R[d.chiave] !== true && R[d.chiave] !== false);
  const errori = A.errori.slice();
  for (const d of A.domande) if (R[d.chiave] === false && !d.haValori) errori.push('«' + d.nome + '» è un alimento diverso, ma non è tra gli alimenti nuovi: aggiungilo con i suoi valori.');
  return { errori, senzaRisposta, pronto: !errori.length && !senzaRisposta.length };
}

/* costruisce quello che va salvato. ctx = { alimenti } (anagrafica attuale) */
function costruisci(A, risposte, ctx) {
  const R = risposte || {}; const anag = isObj(ctx && ctx.alimenti) ? ctx.alimenti : {};
  const st = stato(A, R);
  if (!st.pronto) throw new Error(st.errori[0] || 'Rispondi prima alle domande sugli alimenti.');
  const usati = new Set(Object.keys(anag));
  const alimentiNuovi = {}; const completamenti = {}; const avvisi = [];
  const idNuovo = {};
  for (const n of A.nuovi) {
    let id = null;
    if (n.esito.tipo === 'codice' || n.esito.tipo === 'nome') id = n.esito.id;
    else if (n.esito.tipo === 'simile' && R['n' + n.idx] === true) id = n.esito.candidato;
    if (id) {
      /* già in anagrafica: completo solo quello che manca, i valori restano */
      const a = anag[id]; const c = {};
      if (!a.codice_a_barre && n.codice) c.codice_a_barre = n.codice;
      if (!a.foto && n.foto) c.foto = n.foto;
      if (!a.confezione_g && n.confezione_g) c.confezione_g = n.confezione_g;
      if (!a.reparto && n.reparto) c.reparto = n.reparto;
      if (Object.keys(c).length) completamenti[id] = c;
      const v = valori(a);
      if (MACRO.some((k) => Math.abs(v[k] - n.per_100g[k]) > Math.max(1, v[k] * 0.05))) avvisi.push('«' + a.nome + '»: i valori del piano sono diversi da quelli in anagrafica. Tengo quelli dell’anagrafica.');
      idNuovo[n.idx] = id;
      continue;
    }
    id = idDaNome(n.nome, usati);
    const rec = { nome: n.nome, per_100g: clona(n.per_100g), porzione_g: n.porzione_g, reparto: n.reparto || 'Altro', fonte: 'importazione' };
    if (n.confezione_g) rec.confezione_g = n.confezione_g;
    if (n.codice) rec.codice_a_barre = n.codice;
    if (n.foto) rec.foto = n.foto;
    alimentiNuovi[id] = rec; idNuovo[n.idx] = id;
  }
  const mappa = {};
  for (const r of A.riferimenti) {
    const e = r.esito;
    if (e.tipo === 'codice' || e.tipo === 'nome') mappa[r.k] = e.id;
    else if (e.tipo === 'nuovo') mappa[r.k] = idNuovo[e.idx];
    else if (e.tipo === 'simile') mappa[r.k] = R[r.k] === true ? e.candidato : null;
  }
  const comeAlimenti = (v) => { const o = {}; v.forEach((x, i) => { o['i' + i] = { cibo: mappa[x.k], g: x.g }; }); return o; };
  const giorni = {};
  for (const G of A.giorni) {
    const day = giornoVuoto(G.tipo || 'riposo');
    day.serata_impegnata = G.serata; day.piano = A.dal;
    for (const [pid, m] of Object.entries(G.pasti)) {
      const P = day.pasti[pid];
      if (m.ora) P.ora = m.ora;
      if (m.libero) { Object.assign(P, { libero: true, descrizione: m.descrizione, stima: clona(m.stima), alimenti: {} }); continue; }
      P.alimenti = comeAlimenti(m.voci);
      if (m.alternative.length) { P.alternative = {}; m.alternative.forEach((v, i) => { P.alternative['v' + (i + 1)] = { alimenti: comeAlimenti(v) }; }); }
    }
    giorni[G.data] = day;
  }
  const settimana = {
    schema: 2, dal: A.dal, al: A.al, importato: new Date().toISOString(),
    preparazioni: A.preparazioni.map((p) => ({ data: p.data, titolo: p.titolo, piatti: p.piatti.map((x) => ({ nome: x.nome, alimenti: x.alimenti ? x.alimenti.map((k) => mappa[k]).filter(Boolean) : null, per: clona(x.per) })) })),
  };
  return { alimentiNuovi, completamenti, giorni, settimana, mappa, idNuovo, avvisi };
}

/* ---------- preparazioni: quantità calcolate dai pasti del piano ---------- */
function calcolaPreparazioni(settimana, giornoDi, anagrafica) {
  const out = [];
  for (const p of (isObj(settimana) && Array.isArray(settimana.preparazioni) ? settimana.preparazioni : [])) {
    const piatti = [];
    for (const x of p.piatti || []) {
      const filtro = Array.isArray(x.alimenti) && x.alimenti.length ? new Set(x.alimenti) : null;
      const totali = {}; const schiscette = [];
      for (const q of x.per || []) {
        const day = giornoDi(q.data); const m = isObj(day) && isObj(day.pasti) ? day.pasti[q.pasto] : null;
        const dentro = {};
        if (isObj(m) && !m.libero) for (const { e } of vociDi(m)) {
          if (filtro && !filtro.has(e.cibo)) continue;
          dentro[e.cibo] = (dentro[e.cibo] || 0) + (+e.g || 0);
          totali[e.cibo] = (totali[e.cibo] || 0) + (+e.g || 0);
        }
        schiscette.push({ data: q.data, pasto: q.pasto, mangiato: !!(isObj(m) && m.mangiato), alimenti: Object.entries(dentro).map(([cibo, g]) => ({ cibo, g })) });
      }
      const nome = (id) => (isObj(anagrafica[id]) ? anagrafica[id].nome : id);
      piatti.push({ nome: x.nome, totali: Object.entries(totali).map(([cibo, g]) => ({ cibo, g })).sort((a, b) => b.g - a.g || nome(a.cibo).localeCompare(nome(b.cibo), 'it')), schiscette });
    }
    out.push({ data: p.data, titolo: p.titolo, piatti });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

/* ---------- lista della spesa ---------- */
function repartoDi(r) {
  const i = REPARTI.findIndex((x) => normalizza(x) === normalizza(r || ''));
  return i >= 0 ? REPARTI[i] : 'Altro';
}
/* le righe «dal piano»: totale della settimana per alimento, senza pasti liberi, alternative e pasti già mangiati */
function righeSpesa(giorni, anagrafica) {
  const tot = {};
  for (const day of giorni) {
    for (const m of Object.values(isObj(day) && isObj(day.pasti) ? day.pasti : {})) {
      if (!isObj(m) || m.libero || m.mangiato) continue;
      for (const { e } of vociDi(m)) if (e.cibo && +e.g > 0) tot[e.cibo] = (tot[e.cibo] || 0) + +e.g;
    }
  }
  const righe = Object.entries(tot).map(([cibo, g]) => {
    const a = isObj(anagrafica[cibo]) ? anagrafica[cibo] : {};
    const conf = +a.confezione_g || 0; const n = conf ? Math.ceil(g / conf - 1e-9) : 0;
    const reparto = repartoDi(a.reparto);
    const testo = (a.nome || cibo) + ' · ' + quantita(g) + (n ? ' (' + n + (n === 1 ? ' confezione' : ' confezioni') + ' da ' + quantita(conf) + ')' : '');
    return { cibo, g, confezioni: n, reparto, testo, nome: a.nome || cibo };
  });
  return righe.sort((x, y) => REPARTI.indexOf(x.reparto) - REPARTI.indexOf(y.reparto) || x.nome.localeCompare(y.nome, 'it'));
}
/* sostituisce solo le righe «dal piano»: le righe scritte a mano restano, e le spunte delle righe uguali si conservano */
function aggiornaSpesa(spesa, righe) {
  const vecchie = isObj(spesa) && isObj(spesa.righe) ? spesa.righe : {};
  const fatte = new Set(Object.values(vecchie).filter((r) => isObj(r) && r.dal_piano && r.fatta).map((r) => r.testo));
  const out = {};
  for (const [id, r] of Object.entries(vecchie)) if (isObj(r) && !r.dal_piano) out[id] = r;
  righe.forEach((r, i) => { out['p' + String(i).padStart(3, '0')] = { testo: r.testo, fatta: fatte.has(r.testo), dal_piano: true, cibo: r.cibo, reparto: r.reparto, ordine: i }; });
  return Object.assign({}, isObj(spesa) ? spesa : {}, { schema: 2, righe: out });
}

const Piano = {
  FORMATO, VERSIONE, MACRO, NOMI_MACRO, PASTI, ID_PASTI, REPARTI, VICINO, OBIETTIVI_INIZIALI,
  normalizza, chiaveNome, somiglianza, piuSimile, idDaNome, dataValida, spostaData, dateTra, quantita,
  valori, zero, somma, perGrammi, vociDi, totaleVoci, totalePasto, totaleGiorno, intervalliDi, vicinoDi, valuta, lontani, descriviStato, migraObiettivi,
  giornoVuoto, haContenuto, sostituisci, estrai, analizza, stato, costruisci, calcolaPreparazioni, repartoDi, righeSpesa, aggiornaSpesa,
};
root.Piano = Piano;
if (typeof module !== 'undefined' && module.exports) module.exports = Piano;
})(typeof globalThis !== 'undefined' ? globalThis : this);
