/* Un finto GitHub per le prove: imita le chiamate che usa archivio.js, con gli stessi errori.
   Serve anche i file dell'app, così nel browser app e finto GitHub hanno la stessa origine. */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sha1 = (x) => crypto.createHash('sha1').update(x).digest('hex');
const shaBlob = (buf) => sha1(Buffer.concat([Buffer.from('blob ' + buf.length + '\0'), buf]));
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.md': 'text/markdown' };

function crea({ token = 'token-di-prova', statico = null, prefisso = '/finto-github', conReadme = true } = {}) {
  const R = { blobs: new Map(), trees: new Map(), commits: new Map(), ref: null };
  const ctl = { tokenOk: true, limite: 0, rifiutaPatch: 0, ritardo: 0, giu: false, richieste: [] };
  let n = 0;

  const blob = (buf) => { const s = shaBlob(buf); R.blobs.set(s, buf); return s; };
  const albero = (voci) => { const v = [...voci].sort((a, b) => a.path.localeCompare(b.path)); const s = sha1('tree ' + JSON.stringify(v)); R.trees.set(s, v); return s; };
  const commit = (tree, parents, message) => { const s = sha1('commit ' + JSON.stringify([tree, parents, message, ++n])); R.commits.set(s, { tree, parents, message }); return s; };
  function antenato(da, cerca) {
    const visti = new Set(); const pila = [da];
    while (pila.length) { const s = pila.pop(); if (s === cerca) return true; if (visti.has(s)) continue; visti.add(s); const c = R.commits.get(s); if (c) pila.push(...c.parents); }
    return false;
  }
  function file() {
    if (!R.ref) return {};
    const out = {};
    for (const e of R.trees.get(R.commits.get(R.ref).tree)) out[e.path] = R.blobs.get(e.sha).toString('utf8');
    return out;
  }
  function scriviDaFuori(files, message) {
    const base = R.ref ? R.trees.get(R.commits.get(R.ref).tree) : [];
    const m = new Map(base.map((e) => [e.path, e]));
    for (const [p, testo] of Object.entries(files)) {
      if (testo === null) m.delete(p); else m.set(p, { path: p, mode: '100644', type: 'blob', sha: blob(Buffer.from(testo, 'utf8')) });
    }
    R.ref = commit(albero([...m.values()]), R.ref ? [R.ref] : [], message || 'modifica da un altro dispositivo');
  }
  function messaggi() {
    const out = []; let s = R.ref;
    while (s) { const c = R.commits.get(s); out.push(c.message); s = c.parents[0]; }
    return out;
  }
  function reset(readme) {
    R.blobs.clear(); R.trees.clear(); R.commits.clear(); R.ref = null;
    Object.assign(ctl, { tokenOk: true, limite: 0, rifiutaPatch: 0, ritardo: 0, giu: false, richieste: [] });
    if (readme) scriviDaFuori({ 'README.md': '# weekly-menu-dati\n' }, 'Initial commit');
  }
  reset(conReadme);

  const json = (res, code, obj, h) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, h || {})); res.end(JSON.stringify(obj)); };
  const nonTrovato = (res) => json(res, 404, { message: 'Not Found' });

  function api(req, res, p, corpo) {
    ctl.richieste.push(req.method + ' ' + p);
    if (!ctl.tokenOk || req.headers.authorization !== 'Bearer ' + token) return json(res, 401, { message: 'Bad credentials' });
    if (ctl.limite > 0) { ctl.limite--; return json(res, 403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600) }); }
    const vuoto = () => json(res, 409, { message: 'Git Repository is empty.' });
    const d = corpo ? JSON.parse(corpo) : null;
    let m;
    if (req.method === 'GET' && (m = p.match(/^\/repos\/([^/]+)\/([^/]+)$/))) return json(res, 200, { full_name: m[1] + '/' + m[2], private: true, default_branch: 'main' });
    if (req.method === 'GET' && /\/git\/ref\/heads\/main$/.test(p)) return R.ref ? json(res, 200, { ref: 'refs/heads/main', object: { sha: R.ref, type: 'commit' } }) : vuoto();
    if (req.method === 'GET' && (m = p.match(/\/git\/commits\/([0-9a-f]{40})$/))) {
      const c = R.commits.get(m[1]); return c ? json(res, 200, { sha: m[1], tree: { sha: c.tree }, parents: c.parents.map((s) => ({ sha: s })), message: c.message }) : nonTrovato(res);
    }
    if (req.method === 'GET' && (m = p.match(/\/git\/trees\/([0-9a-f]{40})$/))) {
      const t = R.trees.get(m[1]); return t ? json(res, 200, { sha: m[1], tree: t, truncated: false }) : nonTrovato(res);
    }
    if (req.method === 'GET' && (m = p.match(/\/git\/blobs\/([0-9a-f]{40})$/))) {
      const b = R.blobs.get(m[1]); if (!b) return nonTrovato(res);
      if (/raw/.test(req.headers.accept || '')) { res.writeHead(200, { 'Content-Type': 'application/vnd.github.raw' }); return res.end(b); }
      return json(res, 200, { sha: m[1], content: b.toString('base64'), encoding: 'base64', size: b.length });
    }
    if (req.method === 'POST' && /\/git\/blobs$/.test(p)) {
      if (!R.ref) return vuoto();
      return json(res, 201, { sha: blob(d.encoding === 'base64' ? Buffer.from(d.content, 'base64') : Buffer.from(d.content, 'utf8')) });
    }
    if (req.method === 'POST' && /\/git\/trees$/.test(p)) {
      if (!R.ref) return vuoto();
      const base = d.base_tree ? R.trees.get(d.base_tree) : [];
      if (!base) return json(res, 422, { message: 'Invalid base_tree' });
      const mm = new Map(base.map((e) => [e.path, e]));
      for (const e of d.tree) {
        if (e.sha === null) { if (!mm.has(e.path)) return json(res, 422, { message: 'GitRPC::BadObjectState' }); mm.delete(e.path); continue; }
        const s = e.content !== undefined ? blob(Buffer.from(e.content, 'utf8')) : e.sha;
        if (!R.blobs.has(s)) return json(res, 422, { message: 'tree.sha is not a valid blob' });
        mm.set(e.path, { path: e.path, mode: e.mode, type: 'blob', sha: s });
      }
      return json(res, 201, { sha: albero([...mm.values()]) });
    }
    if (req.method === 'POST' && /\/git\/commits$/.test(p)) {
      if (!R.trees.has(d.tree) || !d.parents.every((s) => R.commits.has(s))) return json(res, 422, { message: 'Invalid commit' });
      const s = commit(d.tree, d.parents, d.message); return json(res, 201, { sha: s, tree: { sha: d.tree } });
    }
    if (req.method === 'PATCH' && /\/git\/refs\/heads\/main$/.test(p)) {
      if (!R.commits.has(d.sha)) return json(res, 422, { message: 'Object does not exist' });
      if (ctl.rifiutaPatch > 0) { ctl.rifiutaPatch--; scriviDaFuori({ 'nota-esterna.txt': 'x' + Date.now() }, 'commit infilato nel mezzo'); }
      if (!d.force && R.ref && !antenato(d.sha, R.ref)) return json(res, 422, { message: 'Update is not a fast forward' });
      R.ref = d.sha; return json(res, 200, { ref: 'refs/heads/main', object: { sha: d.sha } });
    }
    if (req.method === 'PUT' && (m = p.match(/\/contents\/(.+)$/))) {
      scriviDaFuori({ [decodeURIComponent(m[1])]: Buffer.from(d.content, 'base64').toString('utf8') }, d.message);
      return json(res, 201, { commit: { sha: R.ref } });
    }
    return nonTrovato(res);
  }

  function prova(req, res, p, corpo, q) {
    if (p === '/reset') { reset(q.get('readme') !== '0'); return json(res, 200, { ok: true }); }
    if (p === '/token') { ctl.tokenOk = q.get('ok') !== '0'; return json(res, 200, { ok: true }); }
    if (p === '/limite') { ctl.limite = Number(q.get('n') || 1); return json(res, 200, { ok: true }); }
    if (p === '/giu') { ctl.giu = q.get('on') === '1'; return json(res, 200, { ok: true }); }
    if (p === '/scrivi') { const d = JSON.parse(corpo); scriviDaFuori(d.files, d.message); return json(res, 200, { ok: true }); }
    if (p === '/stato') return json(res, 200, { head: R.ref, file: file(), commit: messaggi() });
    return nonTrovato(res);
  }

  function serviStatico(req, res, p) {
    if (!statico) return nonTrovato(res);
    const rel = decodeURIComponent(p === '/' ? '/index.html' : p).replace(/\.\.+/g, '');
    const f = path.join(statico, rel);
    fs.readFile(f, (err, buf) => {
      if (err) return nonTrovato(res);
      res.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  }

  const server = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (c) => { corpo += c; });
    req.on('end', () => {
      const u = new URL(req.url, 'http://localhost');
      if (u.pathname.startsWith(prefisso + '/_prova')) return prova(req, res, u.pathname.slice((prefisso + '/_prova').length), corpo, u.searchParams);
      if (!u.pathname.startsWith(prefisso + '/')) return serviStatico(req, res, u.pathname);
      if (ctl.giu) { res.destroy(); return; }
      const vai = () => api(req, res, u.pathname.slice(prefisso.length), corpo);
      if (ctl.ritardo) setTimeout(vai, ctl.ritardo); else vai();
    });
  });
  return {
    server, R, ctl, file, scriviDaFuori, messaggi, reset,
    ascolta: (porta) => new Promise((ok) => server.listen(porta || 0, '127.0.0.1', () => ok(server.address().port))),
    chiudi: () => new Promise((ok) => server.close(() => ok())),
  };
}

module.exports = { crea };

if (require.main === module) {
  const porta = Number(process.argv[2] || 8766);
  const statico = process.argv[3] || path.join(__dirname, '..');
  const f = crea({ statico });
  f.ascolta(porta).then((p) => console.log('finto GitHub su http://127.0.0.1:' + p + ' (statico: ' + statico + ')'));
}
