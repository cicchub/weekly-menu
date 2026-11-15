/* Prove automatiche di piano.js: lettura del piano, riconoscimento degli alimenti, giornate, spesa, preparazioni.
   Uso, dalla cartella del repository: node prove/test-piano.js */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, '..', 'piano.js'));

let ok = 0, ko = 0;
function prova(nome, fn) {
  try { fn(); ok++; console.log('  ok   ' + nome); } catch (e) { ko++; console.log('  NO   ' + nome + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n       ') : e)); }
}
const clona = (v) => JSON.parse(JSON.stringify(v));
const doc = fs.readFileSync(path.join(__dirname, '..', 'FORMATO.md'), 'utf8');
const esempioTesto = doc.split('## Esempio completo')[1].match(/```json\n([\s\S]*?)```/)[1];
const esempio = () => JSON.parse(esempioTesto);
const piano = (giorni, extra) => JSON.stringify(Object.assign({ formato: 'weekly-menu-piano', versione: 1, settimana: { dal: '2026-11-16', al: '2026-11-16' }, giorni }, extra || {}));
const giorno = (pasti, extra) => Object.assign({ data: '2026-11-16', tipo: 'riposo', serata_impegnata: false, pasti }, extra || {});
const anag = () => ({
  'yogurt-greco-0': { nome: 'Yogurt greco 0%', per_100g: { kcal: 57, proteine: 10, carboidrati: 3.6, grassi: 0.2, fibre: 0 }, porzione_g: 170, reparto: 'Latticini e uova', codice_a_barre: '2000000000015', fonte: 'importazione' },
  'petto-di-pollo': { nome: 'Petto di pollo', per_100g: { kcal: 108, proteine: 23, carboidrati: 0, grassi: 1.5, fibre: 0 }, porzione_g: 150, reparto: 'Carne', fonte: 'importazione' },
  'riso-basmati': { nome: 'Riso basmati', per_100g: { kcal: 350, proteine: 8, carboidrati: 77, grassi: 0.8, fibre: 1.5 }, porzione_g: 80, confezione_g: 1000, reparto: 'Dispensa', fonte: 'importazione' },
});
const nuovo = (nome, extra) => Object.assign({ nome, per_100g: { kcal: 100, proteine: 10, carboidrati: 10, grassi: 2, fibre: 1 }, porzione_g: 100 }, extra || {});

console.log('L’esempio di FORMATO.md');
prova('si legge senza errori né avvisi', () => {
  const A = P.analizza(esempioTesto, { alimenti: {} });
  assert.deepStrictEqual(A.errori, []); assert.deepStrictEqual(A.avvisi, []); assert.strictEqual(A.domande.length, 0);
  assert.strictEqual(A.giorni.length, 7); assert.strictEqual(A.nuovi.length, esempio().alimenti_nuovi.length);
});
prova('ogni giornata dell’esempio è dentro le tolleranze', () => {
  const A = P.analizza(esempioTesto, { alimenti: {} });
  const C = P.costruisci(A, {}, { alimenti: {} });
  for (const [d, day] of Object.entries(C.giorni)) {
    const f = P.fuori(P.totaleGiorno(day, C.alimentiNuovi), P.obiettivoDi(day, P.OBIETTIVI_INIZIALI));
    assert.deepStrictEqual(f.map(P.descriviFuori), [], d);
  }
});
prova('costruisce giornate, alternative, pasto libero e alimenti con fonte «importazione»', () => {
  const C = P.costruisci(P.analizza(esempioTesto, { alimenti: {} }), {}, { alimenti: {} });
  const lun = C.giorni['2026-11-16'];
  assert.strictEqual(lun.tipo, 'palestra'); assert.strictEqual(lun.piano, '2026-11-16');
  assert.deepStrictEqual(Object.keys(lun.pasti), P.ID_PASTI);
  assert.ok(lun.pasti.colazione.alternative.v1);
  const sab = C.giorni['2026-11-21'];
  assert.strictEqual(sab.serata_impegnata, true); assert.strictEqual(sab.pasti.cena.libero, true); assert.strictEqual(sab.pasti.cena.stima.kcal, 900);
  assert.strictEqual(C.alimentiNuovi.banana.fonte, 'importazione');
  assert.ok(/^https:\/\/upload\.wikimedia\.org\//.test(C.alimentiNuovi.banana.foto));
  assert.strictEqual(C.alimentiNuovi['yogurt-greco-0'].codice_a_barre, '2000000000015');
});
prova('lista della spesa dell’esempio: confezioni, reparti, dispensa in fondo', () => {
  const C = P.costruisci(P.analizza(esempioTesto, { alimenti: {} }), {}, { alimenti: {} });
  const r = P.righeSpesa(Object.values(C.giorni), C.alimentiNuovi);
  assert.strictEqual(r.length, 17);
  assert.strictEqual(r[0].reparto, 'Frutta e verdura'); assert.strictEqual(r[r.length - 1].reparto, 'Dispensa');
  const pollo = r.find((x) => x.cibo === 'petto-di-pollo');
  assert.strictEqual(pollo.testo, 'Petto di pollo · 990 g (3 confezioni da 400 g)');
  assert.ok(r.find((x) => x.cibo === 'zucchine').testo === 'Zucchine · 1,4 kg');
});
prova('preparazioni: totali e schiscette calcolati dai pasti', () => {
  const C = P.costruisci(P.analizza(esempioTesto, { alimenti: {} }), {}, { alimenti: {} });
  const prep = P.calcolaPreparazioni(C.settimana, (d) => C.giorni[d], C.alimentiNuovi);
  assert.strictEqual(prep.length, 2);
  const pollo = prep[0].piatti[0];
  assert.strictEqual(pollo.schiscette.length, 3);
  assert.strictEqual(pollo.totali.find((x) => x.cibo === 'petto-di-pollo').g, 150 + 180 + 150);
  assert.deepStrictEqual(pollo.schiscette[0].alimenti.map((x) => x.cibo).sort(), ['petto-di-pollo', 'riso-basmati', 'zucchine']);
});

console.log('Lettura del testo');
prova('accetta il JSON dentro ``` e con frasi intorno', () => {
  const t = 'Ecco il piano:\n```json\n' + piano([giorno({ pranzo: { alimenti: [{ nome: 'Riso basmati', grammi: 90 }] } })]) + '\n```\nBuon appetito!';
  const A = P.analizza(t, { alimenti: anag() });
  assert.deepStrictEqual(A.errori, []);
});
prova('JSON rotto: errore chiaro con la riga', () => {
  const A = P.analizza('{\n  "formato": "weekly-menu-piano",\n  "giorni": [\n    { "data": "2026-11-16", }\n  ]\n}', {});
  assert.strictEqual(A.errori.length, 1); assert.ok(/non è scritto bene/.test(A.errori[0]));
});
prova('testo che non è un piano', () => {
  assert.ok(/non è un piano/.test(P.analizza('{"formato":"altro"}', {}).errori[0]));
  assert.ok(/aggiorna l’app/.test(P.analizza('{"formato":"weekly-menu-piano","versione":2}', {}).errori[0]));
  assert.ok(/vuoto/.test(P.analizza('   ', {}).errori[0]));
});
prova('errori sui giorni e sui pasti', () => {
  const A = P.analizza(piano([giorno({
    merenda: { alimenti: [] },
    pranzo: { alimenti: [{ nome: 'Riso basmati', grammi: 0 }], alternative: [[{ nome: 'Riso basmati', grammi: 80 }], [{ nome: 'Riso basmati', grammi: 80 }], [{ nome: 'Riso basmati', grammi: 80 }]] },
    cena: { libero: true },
  }, { tipo: 'corsa', serata_impegnata: 'sì' }), { data: '2026-11-20', tipo: 'riposo', pasti: {} }]), { alimenti: anag() });
  const t = A.errori.join('\n');
  for (const atteso of ['"tipo" deve essere', 'serata_impegnata', 'merenda', '"grammi"', 'al massimo 2 alternative', 'stima', 'fuori dalla settimana']) assert.ok(t.includes(atteso), atteso + '\n' + t);
});
prova('più di 7 giorni: errore', () => {
  const A = P.analizza(piano([giorno({})], { settimana: { dal: '2026-11-16', al: '2026-11-23' } }), {});
  assert.ok(/al massimo 7/.test(A.errori.join()));
});
prova('un giorno mancante è un avviso, non un errore', () => {
  const A = P.analizza(piano([giorno({ pranzo: { alimenti: [{ nome: 'Riso basmati', grammi: 90 }] } })], { settimana: { dal: '2026-11-16', al: '2026-11-17' } }), { alimenti: anag() });
  assert.deepStrictEqual(A.errori, []); assert.ok(/17\/11/.test(A.avvisi.join()));
});

console.log('Riconoscimento degli alimenti');
prova('prima il codice a barre, poi il nome identico (maiuscole e accenti non contano)', () => {
  const A = P.analizza(piano([giorno({ colazione: { alimenti: [{ nome: 'Yogurt bianco', codice_a_barre: '2000000000015', grammi: 200 }, { nome: 'PETTO di pollo', grammi: 150 }] } })]), { alimenti: anag() });
  assert.deepStrictEqual(A.errori, []);
  const C = P.costruisci(A, {}, { alimenti: anag() });
  assert.deepStrictEqual(Object.values(C.giorni['2026-11-16'].pasti.colazione.alimenti).map((e) => e.cibo), ['yogurt-greco-0', 'petto-di-pollo']);
  assert.deepStrictEqual(A.riferimenti.map((r) => r.esito.tipo).sort(), ['codice', 'nome']);
});
prova('nome solo simile: chiede; sì → lo stesso alimento', () => {
  const A = P.analizza(piano([giorno({ cena: { alimenti: [{ nome: 'Pollo', grammi: 150 }] } })]), { alimenti: anag() });
  assert.strictEqual(A.domande.length, 1); assert.strictEqual(A.domande[0].candidato, 'petto-di-pollo');
  assert.strictEqual(P.stato(A, {}).pronto, false);
  assert.throws(() => P.costruisci(A, {}, { alimenti: anag() }));
  const R = { [A.domande[0].chiave]: true };
  assert.strictEqual(P.stato(A, R).pronto, true);
  assert.strictEqual(P.costruisci(A, R, { alimenti: anag() }).giorni['2026-11-16'].pasti.cena.alimenti.i0.cibo, 'petto-di-pollo');
});
prova('nome simile, risposta no e niente valori: errore', () => {
  const A = P.analizza(piano([giorno({ cena: { alimenti: [{ nome: 'Pollo', grammi: 150 }] } })]), { alimenti: anag() });
  const st = P.stato(A, { [A.domande[0].chiave]: false });
  assert.strictEqual(st.pronto, false); assert.ok(/alimenti nuovi/.test(st.errori[0]));
});
prova('alimento nuovo simile a uno esistente: chiede; no → lo crea, sì → completa senza toccare i valori', () => {
  const testo = piano([giorno({ colazione: { alimenti: [{ nome: 'Yogurt greco 0% Fage', grammi: 170 }] } })],
    { alimenti_nuovi: [nuovo('Yogurt greco 0% Fage', { confezione_g: 500, foto: 'https://images.openfoodfacts.org/x.jpg' })] });
  const A = P.analizza(testo, { alimenti: anag() });
  assert.deepStrictEqual(A.errori, []); assert.strictEqual(A.domande.length, 1); assert.strictEqual(A.domande[0].haValori, true);
  const no = P.costruisci(A, { [A.domande[0].chiave]: false }, { alimenti: anag() });
  assert.ok(no.alimentiNuovi['yogurt-greco-0-fage']);
  assert.strictEqual(no.giorni['2026-11-16'].pasti.colazione.alimenti.i0.cibo, 'yogurt-greco-0-fage');
  const si = P.costruisci(A, { [A.domande[0].chiave]: true }, { alimenti: anag() });
  assert.deepStrictEqual(si.alimentiNuovi, {});
  assert.deepStrictEqual(si.completamenti['yogurt-greco-0'], { foto: 'https://images.openfoodfacts.org/x.jpg', confezione_g: 500 });
  assert.strictEqual(si.giorni['2026-11-16'].pasti.colazione.alimenti.i0.cibo, 'yogurt-greco-0');
  assert.ok(/valori del piano sono diversi/.test(si.avvisi.join()));
});
prova('alimento «nuovo» con un codice a barre già in anagrafica: nessun doppione', () => {
  const A = P.analizza(piano([giorno({ colazione: { alimenti: [{ nome: 'Skyr', codice_a_barre: '2000000000015', grammi: 170 }] } })],
    { alimenti_nuovi: [nuovo('Skyr', { codice_a_barre: '2000000000015', per_100g: { kcal: 57, proteine: 10, carboidrati: 3.6, grassi: 0.2, fibre: 0 } })] }), { alimenti: anag() });
  assert.deepStrictEqual(A.errori, []); assert.strictEqual(A.domande.length, 0);
  const C = P.costruisci(A, {}, { alimenti: anag() });
  assert.deepStrictEqual(C.alimentiNuovi, {}); assert.strictEqual(C.giorni['2026-11-16'].pasti.colazione.alimenti.i0.cibo, 'yogurt-greco-0');
});
prova('lo stesso alimento nuovo due volte: errore', () => {
  const A = P.analizza(piano([giorno({})], { alimenti_nuovi: [nuovo('Feta'), nuovo('feta')] }), {});
  assert.ok(/due volte/.test(A.errori.join()));
});
prova('alimento sconosciuto senza valori: errore, con un suggerimento se c’è un nome vicino', () => {
  const A = P.analizza(piano([giorno({ pranzo: { alimenti: [{ nome: 'Quinoa', grammi: 80 }, { nome: 'Fetta light', grammi: 50 }] } })], { alimenti_nuovi: [nuovo('Feta light')] }), { alimenti: anag() });
  const t = A.errori.join('\n');
  assert.ok(/«Quinoa» non è in anagrafica/.test(t)); assert.ok(/forse intendevi «Feta light»/.test(t));
});
prova('un id già usato non viene riusato', () => {
  const a = anag(); a.feta = { nome: 'Formaggio greco', per_100g: {}, fonte: 'importazione' };
  const A = P.analizza(piano([giorno({ pranzo: { alimenti: [{ nome: 'Feta', grammi: 50 }] } })], { alimenti_nuovi: [nuovo('Feta')] }), { alimenti: a });
  const C = P.costruisci(A, {}, { alimenti: a });
  assert.ok(C.alimentiNuovi['feta-2']); assert.strictEqual(C.giorni['2026-11-16'].pasti.pranzo.alimenti.i0.cibo, 'feta-2');
});
prova('valori impossibili e link della foto non valido: avvisi', () => {
  const A = P.analizza(piano([giorno({})], { alimenti_nuovi: [nuovo('Strano', { per_100g: { kcal: 50, proteine: 60, carboidrati: 60, grassi: 0, fibre: 0 }, foto: 'www.esempio.it/x.jpg' })] }), {});
  const t = A.avvisi.join('\n');
  assert.ok(/troppo alti/.test(t)); assert.ok(/non tornano/.test(t)); assert.ok(/foto non è valido/.test(t));
});

console.log('Settimana già presente');
prova('sostituendo, i pasti già mangiati restano com’erano', () => {
  const vecchio = P.giornoVuoto('palestra');
  vecchio.pasti.colazione = { nome: 'Colazione', ora: '07:30', mangiato: true, alimenti: { b1: { cibo: 'yogurt-greco-0', g: 250 } } };
  vecchio.pasti.pranzo.alimenti = { b2: { cibo: 'riso-basmati', g: 100 } };
  vecchio.pasti.xextra = { nome: 'Spuntino serale', ora: '22:00', mangiato: false, extra: true, alimenti: {} };
  assert.strictEqual(P.haContenuto(vecchio), true); assert.strictEqual(P.haContenuto(P.giornoVuoto()), false);
  const nuovoG = P.giornoVuoto('riposo'); nuovoG.pasti.colazione.alimenti = { i0: { cibo: 'petto-di-pollo', g: 100 } }; nuovoG.pasti.pranzo.alimenti = { i0: { cibo: 'petto-di-pollo', g: 150 } };
  const r = P.sostituisci(vecchio, nuovoG);
  assert.strictEqual(r.tipo, 'riposo');
  assert.deepStrictEqual(r.pasti.colazione, vecchio.pasti.colazione);
  assert.strictEqual(r.pasti.pranzo.alimenti.i0.cibo, 'petto-di-pollo'); assert.ok(!r.pasti.pranzo.alimenti.b2);
  assert.ok(!r.pasti.xextra);
});

console.log('Lista della spesa');
const giornataSpesa = () => {
  const d = P.giornoVuoto();
  d.pasti.colazione.alimenti = { i0: { cibo: 'yogurt-greco-0', g: 250 } };
  d.pasti.pranzo.alimenti = { i0: { cibo: 'riso-basmati', g: 1200 }, i1: { cibo: 'sconosciuto', g: 30 } };
  d.pasti.pranzo.alternative = { v1: { alimenti: { i0: { cibo: 'petto-di-pollo', g: 500 } } } };
  d.pasti.spuntino_mattina.alimenti = { i0: { cibo: 'petto-di-pollo', g: 100 } }; d.pasti.spuntino_mattina.mangiato = true;
  d.pasti.cena = { nome: 'Cena', ora: '20:00', mangiato: false, libero: true, stima: { kcal: 900 }, alimenti: {} };
  return d;
};
prova('senza pasti liberi, alternative e pasti già mangiati; confezioni arrotondate per eccesso', () => {
  const r = P.righeSpesa([giornataSpesa()], anag());
  assert.deepStrictEqual(r.map((x) => x.testo), ['Yogurt greco 0% · 250 g', 'sconosciuto · 30 g', 'Riso basmati · 1,2 kg (2 confezioni da 1 kg)']);
  assert.deepStrictEqual(r.map((x) => x.reparto), ['Latticini e uova', 'Altro', 'Dispensa']);
});
prova('rigenerare sostituisce solo le righe «dal piano» e conserva le spunte uguali', () => {
  let s = { schema: 2, righe: { m1: { testo: 'Detersivo', fatta: false, dal_piano: false } } };
  s = P.aggiornaSpesa(s, P.righeSpesa([giornataSpesa()], anag()));
  assert.strictEqual(Object.keys(s.righe).length, 4);
  const riso = Object.values(s.righe).find((r) => r.cibo === 'riso-basmati'); riso.fatta = true;
  const yog = Object.values(s.righe).find((r) => r.cibo === 'yogurt-greco-0'); yog.fatta = true;
  const d = giornataSpesa(); d.pasti.colazione.alimenti.i0.g = 300;
  s = P.aggiornaSpesa(s, P.righeSpesa([d], anag()));
  assert.strictEqual(s.righe.m1.testo, 'Detersivo');
  assert.strictEqual(Object.values(s.righe).find((r) => r.cibo === 'riso-basmati').fatta, true);
  assert.strictEqual(Object.values(s.righe).find((r) => r.cibo === 'yogurt-greco-0').fatta, false);
  assert.strictEqual(Object.values(s.righe).filter((r) => r.dal_piano).length, 3);
});

console.log('Tolleranze');
prova('calorie ±5%, proteine e fibre almeno l’obiettivo, carboidrati e grassi ±10%', () => {
  const tgt = { kcal: 2000, proteine: 150, carboidrati: 200, grassi: 70, fibre: 30 };
  assert.deepStrictEqual(P.fuori({ kcal: 2100, proteine: 149.6, carboidrati: 220, grassi: 63, fibre: 40 }, tgt), []);
  const f = P.fuori({ kcal: 2101, proteine: 138, carboidrati: 221, grassi: 62, fibre: 29 }, tgt);
  assert.deepStrictEqual(f.map(P.descriviFuori), ['calorie +5%', 'proteine sotto di 12 g', 'carboidrati +11%', 'grassi −11%', 'fibre sotto di 1 g']);
});
prova('tolleranze lette da obiettivi.json, con i valori di partenza se mancano', () => {
  const t = P.tolleranze({ tolleranze: { kcal: { regola: 'piu_o_meno', percento: 3 }, grassi: { regola: 'boh' } } });
  assert.deepStrictEqual(t.kcal, { regola: 'piu_o_meno', percento: 3 }); assert.deepStrictEqual(t.grassi, P.TOLLERANZE.grassi);
  assert.deepStrictEqual(P.obiettivoDi({ tipo: 'apnea' }, P.OBIETTIVI_INIZIALI).kcal, 2550);
  assert.deepStrictEqual(P.obiettivoDi({ tipo: 'boh' }, P.OBIETTIVI_INIZIALI).kcal, 2400);
});

console.log('\n' + ok + ' prove riuscite, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
