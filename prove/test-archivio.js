/* Prove automatiche di archivio.js: unione a tre vie e sincronizzazione con il finto GitHub.
   Uso, dalla cartella del repository: node prove/test-archivio.js */
'use strict';
const assert = require('assert');
const path = require('path');
const A = require(process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'archivio.js'));
const Finto = require('./finto-github.js');

let ok = 0, ko = 0;
async function prova(nome, fn) {
  try { await fn(); ok++; console.log('  ok   ' + nome); } catch (e) { ko++; console.log('  NO   ' + nome + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n       ') : e)); }
}
const giorno = (alimenti, extra) => Object.assign({ attivita: {}, pasti: { colazione: { nome: 'Colazione', ico: '☕', ora: '08:00', mangiato: false, extra: false, alimenti } } }, extra || {});
const demo = () => giorno({ a0: { cibo: 'yogurt', g: 200 }, a1: { cibo: 'avena', g: 50 } });
const regole = (p) => (/^giornate\//.test(p) ? {
  atomic: (x) => (x.length === 6 && x[2] === 'pasti' && x[4] === 'alimenti') || (x.length === 4 && x[2] === 'attivita'),
  baseFor: (x) => (x.length === 2 && x[0] === 'giornate' ? demo() : undefined),
} : null);
const clona = (v) => JSON.parse(JSON.stringify(v));
const file = (d) => ({ schema: 1, giornate: { '2026-11-14': d } });
const gg = (f) => f.giornate['2026-11-14'].pasti.colazione.alimenti;

function memoria() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
function dispositivo(api, nome) {
  const st = memoria();
  const stati = [];
  const arch = A.crea({
    storage: st, api, regole, onStato: (s) => stati.push(s.stato),
    haDatiUtente: () => arch.elenco().some((p) => p.startsWith('giornate/')),
  });
  arch.impostaConfig({ repo: 'cicchub/weekly-menu-dati', dispositivo: nome });
  return { arch, st, stati };
}
const G = 'giornate/2026-11.json';

(async () => {
  console.log('Unione a tre vie');
  await prova('modifiche su voci diverse: si uniscono', () => {
    const b = demo(); const l = clona(b); const r = clona(b);
    l.pasti.colazione.alimenti.a0.g = 230; r.pasti.colazione.alimenti.a1.g = 60;
    const c = []; const m = A.unisci(b, l, r, regole(G), [], c);
    assert.strictEqual(c.length, 0); assert.strictEqual(m.pasti.colazione.alimenti.a0.g, 230); assert.strictEqual(m.pasti.colazione.alimenti.a1.g, 60);
  });
  await prova('stessa voce cambiata in modo diverso: conflitto, resta il telefono', () => {
    const b = file(demo()); const l = clona(b); const r = clona(b);
    gg(l).a0.g = 230; gg(r).a0.g = 210;
    const c = []; const m = A.unisci(b, l, r, regole(G), [], c);
    assert.strictEqual(c.length, 1); assert.deepStrictEqual(c[0].path, ['giornate', '2026-11-14', 'pasti', 'colazione', 'alimenti', 'a0']);
    assert.strictEqual(gg(m).a0.g, 230); assert.strictEqual(c[0].remote.g, 210);
  });
  await prova('cancellato da un lato e modificato dall\'altro: conflitto', () => {
    const b = demo(); const l = clona(b); const r = clona(b);
    delete l.pasti.colazione.alimenti.a1; r.pasti.colazione.alimenti.a1.g = 70;
    const c = []; A.unisci(b, l, r, regole(G), [], c);
    assert.strictEqual(c.length, 1);
  });
  await prova('cambio alimento contro cambio grammi: conflitto, non un ibrido', () => {
    const b = file(demo()); const l = clona(b); const r = clona(b);
    gg(l).a0 = { cibo: 'pollo', g: 200 }; gg(r).a0.g = 250;
    const c = []; const m = A.unisci(b, l, r, regole(G), [], c);
    assert.strictEqual(c.length, 1); assert.deepStrictEqual(gg(m).a0, { cibo: 'pollo', g: 200 });
  });
  await prova('campi sconosciuti di una versione futura: conservati', () => {
    const b = demo(); const l = clona(b); const r = clona(b);
    l.pasti.colazione.ora = '08:30'; r.pasti.colazione.nota = 'campo nuovo';
    const c = []; const m = A.unisci(b, l, r, regole(G), [], c);
    assert.strictEqual(c.length, 0); assert.strictEqual(m.pasti.colazione.ora, '08:30'); assert.strictEqual(m.pasti.colazione.nota, 'campo nuovo');
  });
  await prova('giornata di prova toccata su due telefoni: niente doppioni', () => {
    const l = demo(); const r = demo();
    l.pasti.colazione.alimenti.a0.g = 230; r.pasti.colazione.alimenti.b1 = { cibo: 'banana', g: 120 };
    const c = []; const m = A.unisci(undefined, { schema: 1, giornate: { '2026-11-14': l } }, { schema: 1, giornate: { '2026-11-14': r } }, regole(G), [], c);
    const al = m.giornate['2026-11-14'].pasti.colazione.alimenti;
    assert.strictEqual(c.length, 0); assert.deepStrictEqual(Object.keys(al).sort(), ['a0', 'a1', 'b1']); assert.strictEqual(al.a0.g, 230);
  });
  await prova('spunte della spesa: mai conflitti', () => {
    const c = []; const m = A.unisci({ riso: false }, { riso: true }, { riso: true, pollo: true }, null, [], c);
    assert.strictEqual(c.length, 0); assert.deepStrictEqual(m, { riso: true, pollo: true });
  });
  await prova('JSON canonico: stesso contenuto, stessa impronta', async () => {
    const x = await A.impronta(A.canonico({ b: 1, a: { d: 2, c: '’🥣' } }));
    const y = await A.impronta(A.canonico({ a: { c: '’🥣', d: 2 }, b: 1 }));
    assert.strictEqual(x, y);
  });

  console.log('Sincronizzazione con il finto GitHub');
  const f = Finto.crea({});
  const porta = await f.ascolta();
  const api = 'http://127.0.0.1:' + porta + '/finto-github';
  const T = 'token-di-prova';
  const datiA = () => ({
    'alimenti.json': { schema: 1, alimenti: { yogurt: { nome: 'Yogurt greco 0%', kcal: 57 }, avena: { nome: 'Fiocchi d’avena', kcal: 372 } } },
    'obiettivi.json': { schema: 1, base: { kcal: 2400 } },
    [G]: { schema: 1, giornate: { '2026-11-14': demo() } },
    'spesa.json': { schema: 1, settimane: { '2026-11-09': { yogurt: true } } },
  });
  const a = dispositivo(api, 'Telefono'); const b = dispositivo(api, 'Tablet');
  const scriviTutto = (d, dati) => { for (const [p, v] of Object.entries(dati)) d.arch.scrivi(p, v); };
  const gA = () => a.arch.leggi(G).giornate['2026-11-14'].pasti.colazione.alimenti;
  const gB = () => b.arch.leggi(G).giornate['2026-11-14'].pasti.colazione.alimenti;
  const remoto = (p) => JSON.parse(f.file()[p]);

  await prova('primo collegamento con repository senza dati: carica quelli del telefono', async () => {
    scriviTutto(a, datiA());
    await a.arch.verifica('cicchub/weekly-menu-dati', T);
    await a.arch.collega('cicchub/weekly-menu-dati', T);
    const files = Object.keys(f.file()).sort();
    assert.deepStrictEqual(files, ['LEGGIMI.md', 'README.md', 'alimenti.json', 'giornate/2026-11.json', 'obiettivi.json', 'spesa.json']);
    assert.strictEqual(a.arch.stato().stato, 'salvato');
    assert.strictEqual(remoto('alimenti.json').alimenti.avena.nome, 'Fiocchi d’avena');
    assert.strictEqual(f.messaggi().length, 2);
  });
  await prova('telefono nuovo: incollato il token, scarica tutto', async () => {
    b.arch.scrivi('alimenti.json', { schema: 1, alimenti: { yogurt: { nome: 'Yogurt', kcal: 1 } } });
    await b.arch.collega('cicchub/weekly-menu-dati', T);
    assert.deepStrictEqual(b.arch.leggi(G), a.arch.leggi(G));
    assert.deepStrictEqual(b.arch.leggi('alimenti.json'), a.arch.leggi('alimenti.json'));
    assert.strictEqual(b.arch.stato().stato, 'salvato');
  });
  await prova('una modifica arriva sull\'altro dispositivo', async () => {
    const d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a0.g = 240;
    a.arch.scrivi(G, d, 'giornata 14/11');
    assert.strictEqual(a.arch.stato().stato, 'da-inviare');
    await a.arch.adesso();
    assert.strictEqual(remoto(G).giornate['2026-11-14'].pasti.colazione.alimenti.a0.g, 240);
    assert.ok(f.messaggi()[0].startsWith('Telefono: giornata 14/11'));
    await b.arch.adesso();
    assert.strictEqual(gB().a0.g, 240);
  });
  await prova('modifiche su voci diverse da due dispositivi: unite senza conflitti', async () => {
    let d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a0.g = 250; a.arch.scrivi(G, d);
    d = b.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a1.g = 55; b.arch.scrivi(G, d);
    await a.arch.adesso(); await b.arch.adesso(); await a.arch.adesso();
    for (const x of [gA(), gB(), remoto(G).giornate['2026-11-14'].pasti.colazione.alimenti]) { assert.strictEqual(x.a0.g, 250); assert.strictEqual(x.a1.g, 55); }
    assert.strictEqual(b.arch.conflitti().length, 0);
  });
  await prova('stessa voce su due dispositivi: «Da risolvere», poi scelgo GitHub', async () => {
    let d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a0.g = 300; a.arch.scrivi(G, d);
    d = b.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a0.g = 310; b.arch.scrivi(G, d);
    await a.arch.adesso(); await b.arch.adesso();
    const c = b.arch.conflitti();
    assert.strictEqual(c.length, 1); assert.strictEqual(c[0].local.g, 310); assert.strictEqual(c[0].remote.g, 300);
    assert.strictEqual(b.arch.stato().stato, 'conflitti');
    assert.strictEqual(remoto(G).giornate['2026-11-14'].pasti.colazione.alimenti.a0.g, 300);
    b.arch.risolvi(G, 0, 'github'); await b.arch.adesso();
    assert.strictEqual(gB().a0.g, 300); assert.strictEqual(b.arch.stato().stato, 'salvato');
  });
  await prova('stessa voce, scelgo il telefono: arriva anche sull\'altro', async () => {
    let d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a1.g = 40; a.arch.scrivi(G, d);
    d = b.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a1.g = 45; b.arch.scrivi(G, d);
    await a.arch.adesso(); await b.arch.adesso();
    b.arch.risolvi(G, 0, 'qui'); await b.arch.adesso(); await a.arch.adesso();
    assert.strictEqual(remoto(G).giornate['2026-11-14'].pasti.colazione.alimenti.a1.g, 45); assert.strictEqual(gA().a1.g, 45);
  });
  await prova('un commit si infila durante l\'invio: riscarica, unisce e riprova', async () => {
    const d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.b9 = { cibo: 'banana', g: 120 }; a.arch.scrivi(G, d);
    f.ctl.rifiutaPatch = 1;
    await a.arch.adesso();
    assert.strictEqual(remoto(G).giornate['2026-11-14'].pasti.colazione.alimenti.b9.g, 120);
    assert.ok(f.file()['nota-esterna.txt']); assert.strictEqual(a.arch.stato().stato, 'salvato');
  });
  await prova('modifica fatta durante un invio: resta «Da inviare» e parte dopo', async () => {
    let d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a0.g = 320; a.arch.scrivi(G, d);
    f.ctl.ritardo = 60;
    const p = a.arch.adesso();
    await new Promise((r) => setTimeout(r, 100));
    d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a0.g = 330; a.arch.scrivi(G, d);
    await p; f.ctl.ritardo = 0;
    assert.strictEqual(a.arch.stato().stato, 'da-inviare');
    await a.arch.adesso();
    assert.strictEqual(remoto(G).giornate['2026-11-14'].pasti.colazione.alimenti.a0.g, 330);
  });
  await prova('token rifiutato: errore chiaro, senza il token nel testo', async () => {
    f.ctl.tokenOk = false;
    const d = a.arch.leggi('spesa.json'); d.settimane['2026-11-09'].avena = true; a.arch.scrivi('spesa.json', d);
    await a.arch.adesso();
    const s = a.arch.stato();
    assert.strictEqual(s.stato, 'errore'); assert.strictEqual(s.tipo, 'token'); assert.ok(!JSON.stringify(s).includes(T));
    f.ctl.tokenOk = true; await a.arch.adesso(); assert.strictEqual(a.arch.stato().stato, 'salvato');
  });
  await prova('troppe richieste: errore con l\'ora del nuovo tentativo', async () => {
    f.ctl.limite = 1;
    const d = a.arch.leggi('spesa.json'); d.settimane['2026-11-09'].pollo = true; a.arch.scrivi('spesa.json', d);
    await a.arch.adesso();
    const s = a.arch.stato(); assert.strictEqual(s.tipo, 'limite'); assert.ok(s.quando > Date.now());
    await a.arch.adesso(); assert.strictEqual(a.arch.stato().stato, 'salvato');
  });
  await prova('ripristino da una copia: la copia vince anche su GitHub', async () => {
    const copiaDati = a.arch.creaCopia();
    assert.ok(!JSON.stringify(copiaDati).includes(T));
    const d = a.arch.leggi(G); d.giornate['2026-11-14'].pasti.colazione.alimenti.a0.g = 999; a.arch.scrivi(G, d);
    await a.arch.adesso(); await b.arch.adesso();
    assert.strictEqual(a.arch.ripristina(copiaDati), 4);
    await a.arch.adesso(); await b.arch.adesso();
    assert.strictEqual(remoto(G).giornate['2026-11-14'].pasti.colazione.alimenti.a0.g, 330); assert.strictEqual(gB().a0.g, 330);
  });
  await prova('file scritto da una versione più nuova: non lo tocco e chiedo di aggiornare', async () => {
    f.scriviDaFuori({ 'obiettivi.json': JSON.stringify({ schema: 2, base: { kcal: 2500 } }) });
    await a.arch.adesso();
    assert.strictEqual(a.arch.stato().stato, 'aggiorna'); assert.strictEqual(a.arch.leggi('obiettivi.json').schema, 1);
    f.scriviDaFuori({ 'obiettivi.json': JSON.stringify({ schema: 1, base: { kcal: 2400 } }) });
  });
  await prova('file rovinato sul telefono: lo riscarico da GitHub', async () => {
    const c = dispositivo(api, 'Prova');
    await c.arch.collega('cicchub/weekly-menu-dati', T);
    c.st.setItem('wm1:file:spesa.json', '{rotto');
    assert.strictEqual(c.arch.leggi('spesa.json'), undefined);
    await c.arch.adesso();
    assert.deepStrictEqual(c.arch.leggi('spesa.json'), remoto('spesa.json'));
    c.arch.ferma();
  });
  await prova('primo collegamento con dati su entrambi i lati: chiede, poi unisce', async () => {
    const c = dispositivo(api, 'Vecchio telefono');
    c.arch.scrivi('giornate/2026-10.json', { schema: 1, giornate: { '2026-10-30': demo() } });
    await c.arch.collega('cicchub/weekly-menu-dati', T);
    assert.strictEqual(c.arch.stato().stato, 'scelta');
    await c.arch.scegli('unisci');
    assert.ok(c.arch.copiaAuto()); assert.ok(remoto('giornate/2026-10.json')); assert.ok(c.arch.leggi(G));
    assert.strictEqual(c.arch.stato().stato, 'salvato');
    c.arch.ferma();
  });
  await prova('repository completamente vuoto: lo prepara e carica i dati', async () => {
    const v = Finto.crea({ conReadme: false }); const pv = await v.ascolta();
    const c = dispositivo('http://127.0.0.1:' + pv + '/finto-github', 'Telefono');
    c.arch.scrivi(G, { schema: 1, giornate: { '2026-11-14': demo() } });
    const r = await c.arch.verifica('cicchub/weekly-menu-dati', T);
    assert.ok(/vuoto/.test(r.nota));
    await c.arch.collega('cicchub/weekly-menu-dati', T);
    assert.deepStrictEqual(Object.keys(v.file()).sort(), ['LEGGIMI.md', G]);
    c.arch.ferma(); await v.chiudi();
  });
  await prova('verifica con token sbagliato: messaggio chiaro', async () => {
    await assert.rejects(a.arch.verifica('cicchub/weekly-menu-dati', 'sbagliato'), (e) => e.tipo === 'token' && !e.message.includes('sbagliato'));
  });

  a.arch.ferma(); b.arch.ferma();
  await f.chiudi();
  console.log('\n' + ok + ' prove riuscite, ' + ko + ' fallite');
  process.exit(ko ? 1 : 0);
})();
