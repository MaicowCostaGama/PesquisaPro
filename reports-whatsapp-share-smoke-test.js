#!/usr/bin/env node
/* PesquisaPro v179 — smoke/unit harness portátil, sem Supabase/WhatsApp/rede real.
   Executa reports-whatsapp.js em Node VM com DOM, Storage, popup, clipboard e share falsos. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const { File } = require('buffer');
const moduleSource = fs.readFileSync(__dirname + '/reports-whatsapp.js', 'utf8');

class FakeElement {
  constructor(tag, doc) {
    this.tagName = String(tag || 'div').toUpperCase(); this.ownerDocument = doc;
    this.id = ''; this.className = ''; this.type = ''; this.value = ''; this.textContent = '';
    this.innerHTML = ''; this.hidden = false; this.disabled = false; this.readOnly = false;
    this.options = []; this.children = []; this.parentNode = null; this.isConnected = false;
    this.style = {}; this.attributes = {}; this.onclick = null; this.onchange = null;
    this._listeners = {}; this._rect = { x: 20, y: 20, width: 400, height: 40, right: 420, bottom: 60 };
  }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'id') { this.id = String(v); this.ownerDocument._register(this); } }
  getAttribute(k) { return this.attributes[k] ?? null; }
  appendChild(child) { child.parentNode = this; child.isConnected = this.isConnected; this.children.push(child); if (child.id) this.ownerDocument._register(child); return child; }
  removeChild(child) { this.children = this.children.filter(x => x !== child); const drop = x => { if (x.id) this.ownerDocument._byId.delete(x.id); x.children.forEach(drop); x.parentNode = null; x.isConnected = false; }; drop(child); return child; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); else this.isConnected = false; }
  replaceChildren(...items) { this.children.forEach(x => { x.parentNode = null; x.isConnected = false; }); this.children = []; items.forEach(x => this.appendChild(x)); }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
  dispatchEvent(event) { (this._listeners[event.type] || []).forEach(fn => fn.call(this, event)); if (event.type === 'click' && this.onclick) this.onclick(event); if (event.type === 'change' && this.onchange) this.onchange(event); return true; }
  click() { this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} }); }
  focus() { this.ownerDocument.activeElement = this; this.focused = true; }
  select() { this.selected = true; }
  getClientRects() { let x = this; while (x) { if (x.hidden) return []; x = x.parentNode; } return [this._rect]; }
  querySelectorAll(selector) {
    const all = []; const walk = x => { x.children.forEach(c => { all.push(c); walk(c); }); };
    if (this.id === 'rw-dialog') this.ownerDocument._byId.forEach(x => all.push(x)); else walk(this);
    if (selector.includes('button') || selector.includes('select') || selector.includes('textarea')) return all.filter(x => ['BUTTON','SELECT','TEXTAREA'].includes(x.tagName) && !x.hidden && !x.disabled && x.getClientRects().length);
    return all;
  }
  set innerHTML(value) {
    this._innerHTML = String(value ?? '');
    if (!this.ownerDocument || !this._innerHTML.includes('rw-dialog')) return;
    // The production modal is one known template. Register its controls without an HTML parser.
    const ids = ['rw-dialog','rw-close','rw-client','rw-prepare','rw-message','rw-actions','rw-whatsapp','rw-download','rw-copy','rw-native','rw-feedback'];
    ids.forEach(id => { if (!this.ownerDocument.getElementById(id)) { const tag = id === 'rw-client' ? 'select' : id === 'rw-message' ? 'textarea' : id === 'rw-dialog' || id === 'rw-actions' ? 'div' : id === 'rw-feedback' ? 'p' : 'button'; const e = new FakeElement(tag, this.ownerDocument); e.id = id; e.isConnected = true; const parent = ['rw-whatsapp','rw-download','rw-copy','rw-native'].includes(id) ? this.ownerDocument.getElementById('rw-actions') : this; e.parentNode = parent || this; e.hidden = id === 'rw-actions' || id === 'rw-native'; e.disabled = id === 'rw-client' || id === 'rw-prepare'; e._rect = { x: 20, y: 20 + this.children.length * 45, width: 400, height: 38, right: 420, bottom: 58 + this.children.length * 45 }; (parent || this).children.push(e); this.ownerDocument._register(e); } });
  }
  get innerHTML() { return this._innerHTML || ''; }
}

class FakeDocument {
  constructor() { this._byId = new Map(); this._listeners = {}; this.body = new FakeElement('body', this); this.body.isConnected = true; this.body.style.overflow = ''; this.activeElement = this.body; this.documentElement = { scrollWidth: 500 }; }
  _register(e) { if (e.id) this._byId.set(e.id, e); }
  getElementById(id) { return this._byId.get(id) || null; }
  createElement(tag) { return new FakeElement(tag, this); }
  addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this._listeners[type] = (this._listeners[type] || []).filter(x => x !== fn); }
  dispatchKey(key, opts = {}) { const e = { type: 'keydown', key, shiftKey: !!opts.shiftKey, preventDefault() { this.defaultPrevented = true; } }; (this._listeners.keydown || []).forEach(fn => fn(e)); return e; }
}

const wait = ms => new Promise(r => setTimeout(r, ms));
function deferred() { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; }

function makeEnv() {
  const document = new FakeDocument();
  const popups = [], navigations = [], revokedUrls = [], createdUrls = [], clipboard = { text: '' };
  let shareMode = 'ok', shareCalls = [];
  const db = {
    report: { id: 'doc-123', survey_id: 'survey-1', client_id: 'client-a', title: 'Relatório final — Pesquisa X <script>', status: 'published', pdf_path: 'reports/doc-123/2026-10-20T120000.pdf', published_at: '2026-10-20T12:00:00Z' },
    survey: { id: 'survey-1', name: 'Pesquisa <XSS>', archived_at: null },
    links: [ { client_id: 'client-a', results_released: true }, { client_id: 'client-global', results_released: false } ],
    staff: { id: 'staff-1', role: 'admin', status: 'ativo' },
    people: [
      { id: 'client-a', name: 'Cliente A', phone: '+55 (34) 99999-1111', role: 'cliente', status: 'ativo', results_released: false },
      { id: 'client-global', name: 'Global', phone: '34999992222', role: 'cliente', status: 'ativo', results_released: true },
      { id: 'client-inactive', name: 'Inativo', phone: '34999993333', role: 'cliente', status: 'inativo', results_released: true },
      { id: 'person-staff', name: 'Não cliente', phone: '34999994444', role: 'admin', status: 'ativo', results_released: true },
      { id: 'client-unlinked', name: 'Sem vínculo', phone: '34999995555', role: 'cliente', status: 'ativo', results_released: true }
    ],
    blob: new Blob(['%PDF-1.7\nconteudo ficticio'], { type: 'application/pdf' }),
    mode: 'ok', calls: [], deferredTable: null
  };
  const query = table => {
    const q = { table, filters: [], selected: '', then(resolve, reject) {
      db.calls.push({ table, filters: [...q.filters] });
      const finish = () => {
        if (db.mode === 'sdk-error') return { data: null, error: { message: 'falha SDK simulada' } };
        let data = null;
        if (table === 'report_documents') { data = db.report && (!q.filters.some(x => x[0] === 'id' && x[1] !== db.report.id) && !q.filters.some(x => x[0] === 'survey_id' && x[1] !== db.report.survey_id)) ? db.report : null; }
        else if (table === 'surveys') data = db.survey && (!q.filters.some(x => x[0] === 'id' && x[1] !== db.survey.id) ? db.survey : null);
        else if (table === 'survey_clients') data = db.links;
        else if (table === 'profiles') {
          const id = q.filters.find(x => x[0] === 'id' && !Array.isArray(x[1]));
          const ids = q.filters.find(x => x[0] === 'id' && Array.isArray(x[1]));
          data = id ? (db.staff.id === id[1] ? db.staff : null) : (db.people.filter(p => !ids || ids[1].includes(p.id)));
        }
        return { data, error: null };
      };
      const result = db.deferredTable ? db.deferredTable.promise.then(finish) : Promise.resolve(finish());
      return result.then(resolve, reject);
    } };
    q.select = x => { q.selected = x; return q; }; q.eq = (a, b) => { q.filters.push([a, b]); return q; }; q.maybeSingle = () => q; q.in = (a, b) => { q.filters.push([a, b]); return q; }; return q;
  };
  const sb = { from: table => query(table), storage: { from: bucket => ({ download: async path => { db.calls.push({ storage: bucket, path }); if (db.mode === 'sdk-error') return { data: null, error: { message: 'storage falha' } }; return { data: db.blob, error: null }; } }) } };
  const URLMock = { createObjectURL: x => { const u = 'blob:fake-' + (createdUrls.length + 1); createdUrls.push({ u, file: x }); return u; }, revokeObjectURL: u => revokedUrls.push(u) };
  const navigator = { canShare: x => shareMode !== 'none' && !!x?.files?.length, share: async x => { shareCalls.push(x); if (shareMode === 'abort') { const e = new Error('cancelled'); e.name = 'AbortError'; throw e; } if (shareMode === 'error') throw new Error('share falha'); }, clipboard: { writeText: async t => { if (shareMode === 'clip-error') throw new Error('clipboard'); clipboard.text = t; } } };
  const window = { open: (url, target) => { const p = { url, target, closed: false, opener: 'unsafe', close() { this.closed = true; }, location: { replace(u) { if (!this.closed) { this.url = u; navigations.push(u); } } } }; popups.push(p); return p; } };
  const context = { console, document, window, navigator, URL: URLMock, Blob, File, setTimeout, clearTimeout, Date,
    CURRENT_PROFILE: { id: 'staff-1', role: 'admin', status: 'ativo' }, RP_REPORT_EXPORT_BUSY: false, RP_TAB_SOURCE_SELECTING: false, RP_TAB_SOURCE_SAVING: false,
    reportsSimpleBusy: () => false, reportsCurrentSurvey: () => db.survey, RP_REPORT_DOCUMENT_ID: db.report.id, RP_REPORT_DOCUMENT_STATUS: 'published', reportsDocValue: id => id === 'rp-doc-client' ? 'client-a' : '', reportsDocFeedback: () => {}, sb };
  Object.assign(window, { document, navigator, URL, Blob, File, setTimeout, clearTimeout });
  vm.createContext(context); vm.runInContext(moduleSource, context, { filename: 'reports-whatsapp.js' });
  return { context, api: context.window.PP_REPORT_WHATSAPP, document, db, popups, navigations, createdUrls, revokedUrls, clipboard, navigator, setShareMode: x => { shareMode = x; }, shareCalls, wait };
}

async function run() {
  const env = makeEnv(), { api, context, document, db, popups, navigations, createdUrls, clipboard } = env;
  const results = []; const pass = (name, detail = {}) => results.push({ name, passed: true, ...detail });
  const reset = async () => { api.reset(); db.mode = 'ok'; db.deferredTable = null; db.report = { id: 'doc-123', survey_id: 'survey-1', client_id: 'client-a', title: 'Relatório final — Pesquisa X <script>', status: 'published', pdf_path: 'reports/doc-123/2026-10-20T120000.pdf', published_at: '2026-10-20T12:00:00Z' }; db.survey = { id: 'survey-1', name: 'Pesquisa <XSS>', archived_at: null }; db.links = [ { client_id: 'client-a', results_released: true }, { client_id: 'client-global', results_released: false } ]; db.people[0].status = 'ativo'; db.people[0].phone = '+55 (34) 99999-1111'; db.people[0].results_released = false; db.people[1].results_released = true; db.staff.status = 'ativo'; context.CURRENT_PROFILE = { id: 'staff-1', role: 'admin', status: 'ativo' }; context.RP_REPORT_DOCUMENT_ID = db.report.id; context.RP_REPORT_DOCUMENT_STATUS = 'published'; };
  const open = async () => { await api.open(); await wait(0); };
  const prepare = async () => { await api.prepare(); await wait(0); };
  const click = async id => { document.getElementById(id).click(); await wait(0); };

  assert.equal(api.phone('+55 (34) 99999-1111'), '5534999991111'); assert.equal(api.phone('34999991111'), '5534999991111'); assert.equal(api.phone('0034 9999 9999'), '3499999999'); assert.equal(api.phone('12-345-67'), ''); assert.equal(api.phone('abc34999999999'), ''); assert(api.filename('Áção / relatório?').endsWith('.pdf')); assert(!api.filename('Áção / relatório?').includes('/')); const msg = api.message({ title: 'T' }, { name: 'C' }, { name: 'S' }); assert(msg.includes('cruzar até 3 variáveis') && msg.includes('Excel') && msg.includes('PDF')); assert(!/pdf_path|token|signed|storage|reports\/doc/.test(msg)); assert(api.waUrl('5534999999999', 'Olá').startsWith('https://wa.me/5534999999999?text=')); pass('helpers_phone_filename_message_waurl_no_secrets');

  await reset(); const returnFocus = document.createElement('button'); returnFocus.isConnected = true; document.body.appendChild(returnFocus); returnFocus.focus(); await open(); assert(document.getElementById('rw-dialog')); assert(document.body.style.overflow === 'hidden'); assert(document.getElementById('rw-actions').hidden); assert(document.getElementById('rw-message').value === ''); assert(document.getElementById('rw-client').options.length === 0 || document.getElementById('rw-client').children.length >= 2); const first = document.getElementById('rw-close'), last = document.getElementById('rw-message'); last.focus(); document.dispatchKey('Tab'); assert.equal(document.activeElement, first); document.dispatchKey('Tab', { shiftKey: true }); assert.equal(document.activeElement, last); document.dispatchKey('Escape'); assert(!document.getElementById('rw-overlay')); assert.equal(document.body.style.overflow, ''); assert.equal(document.activeElement, returnFocus); pass('modal_initdraft_focus_trap_escape_cancel');

  await reset(); await open(); const select = document.getElementById('rw-client'); assert(select.children.some(x => x.value === 'client-a')); assert(!select.children.some(x => x.value === 'client-unlinked')); select.value = 'client-a'; select.dispatchEvent({ type: 'change' }); await prepare(); const message = document.getElementById('rw-message').value; assert(message.includes('Cliente A') && message.includes('até 3 variáveis') && message.includes('Excel')); assert(!message.includes('reports/doc-123') && !message.includes('signedUrl') && !message.includes('token')); assert(document.getElementById('rw-actions').hidden === false); assert.equal(document.getElementById('rw-whatsapp').disabled, false); pass('authorized_link_or_global_filtered_active_cliente_and_safe_message');

  // Recheck must happen before popup navigation and before download.
  db.report = { ...db.report, published_at: 'changed-before-popup' }; await click('rw-whatsapp'); assert(popups.at(-1).closed && navigations.length === 0); assert(document.getElementById('rw-feedback').textContent.includes('mudou') || document.getElementById('rw-feedback').textContent.includes('novamente')); await reset(); await open(); await prepare(); db.report = { ...db.report, published_at: 'changed-before-download' }; const beforeUrls = createdUrls.length; await click('rw-download'); assert.equal(createdUrls.length, beforeUrls); pass('recheck_before_popup_navigation_and_download');

  const negative = async (name, mutate, expected) => { await reset(); await mutate(); await open(); assert(document.getElementById('rw-feedback').textContent.includes(expected), name + ': ' + document.getElementById('rw-feedback').textContent); pass(name); };
  await negative('draft_document_denied', async () => { db.report.status = 'draft'; }, 'publicado');
  await negative('invalid_pdf_path_denied', async () => { db.report.pdf_path = 'https://evil.invalid/x.pdf'; }, 'caminho');
  await negative('archived_survey_denied', async () => { db.survey.archived_at = '2026-10-20'; }, 'arquivada');
  await negative('sdk_query_error_denied', async () => { db.mode = 'sdk-error'; }, 'conferir');
  await reset(); db.links = [{ client_id: 'client-a', results_released: false }]; db.people[0].results_released = false; await open(); assert(document.getElementById('rw-feedback').textContent.includes('Nenhum cliente')); pass('no_link_or_global_release_denied');
  await reset(); db.links = [{ client_id: 'client-a', results_released: true }]; db.people[0].status = 'inativo'; await open(); assert(document.getElementById('rw-feedback').textContent.includes('Nenhum cliente')); pass('inactive_client_denied');
  await reset(); db.people[0].phone = '12-34'; await open(); await prepare(); assert(document.getElementById('rw-whatsapp').disabled); assert(document.getElementById('rw-feedback').textContent.includes('sem telefone')); pass('short_invalid_phone_prepare_without_whatsapp');

  await reset(); await open(); await prepare(); db.people[0].status = 'inativo'; await click('rw-whatsapp'); assert(popups.at(-1).closed); pass('revoked_before_click_popup_closed');

  // Native share cancellation and error are user-facing only; no late success UI.
  await reset(); await open(); await prepare(); env.setShareMode('abort'); await click('rw-native'); assert(document.getElementById('rw-feedback').textContent.includes('cancelado')); env.setShareMode('error'); await click('rw-native'); assert(document.getElementById('rw-feedback').textContent.includes('share falha')); env.setShareMode('none'); await click('rw-native'); assert(document.getElementById('rw-feedback').textContent.includes('não disponível')); pass('native_share_cancel_error_unavailable_no_late_ui');

  // Invalid and oversized blobs never produce a File or download UI.
  await reset(); await open(); db.blob = new Blob(['NOT PDF'], { type: 'application/pdf' }); await prepare(); assert(document.getElementById('rw-actions').hidden); assert(document.getElementById('rw-feedback').textContent.includes('PDF válido')); pass('invalid_pdf_header_denied');
  await reset(); await open(); db.blob = new Blob([new Uint8Array(50 * 1024 * 1024 + 1)]); await prepare(); assert(document.getElementById('rw-actions').hidden); assert(document.getElementById('rw-feedback').textContent.includes('50 MB')); pass('oversized_pdf_denied');

  // Session/context changes while initial query is awaiting must not hydrate stale UI.
  await reset(); db.deferredTable = deferred(); const pendingOpen = api.open(); await wait(0); context.CURRENT_PROFILE = { id: 'different-staff', role: 'admin', status: 'ativo' }; db.deferredTable.resolve(); await pendingOpen; await wait(0); assert(!document.getElementById('rw-client') || document.getElementById('rw-client').disabled); pass('profile_changed_while_open_await_no_stale_hydration');
  await reset(); await open(); await prepare(); db.deferredTable = deferred(); const pendingClick = document.getElementById('rw-whatsapp').onclick(); await wait(0); context.RP_REPORT_DOCUMENT_ID = 'other-doc'; db.deferredTable.resolve(); await pendingClick; assert(popups.at(-1).closed); pass('document_changed_while_recheck_await');

  await reset(); document.getElementById('rw-share-whatsapp')?.remove(); context.CURRENT_PROFILE = { id: 'client-x', role: 'cliente', status: 'ativo' }; context.RP_REPORT_DOCUMENT_STATUS = 'draft'; api.refresh(); assert(!document.getElementById('rw-share-whatsapp')); pass('refresh_denies_non_staff_or_draft_without_throw');
  return { passed: true, unitpass: results.length, results, real_data_accessed: false, real_whatsapp_api_called: false, external_requests: 0, limitations: ['VM harness mocks browser DOM/SDK/storage/share/popup/clipboard; it does not prove WhatsApp delivery or a real API call.', 'Browser screenshots use a local fixture and local module/CSS only; app.js/app.html/style.css were not modified.'] };
}
run().then(r => { console.log(JSON.stringify(r, null, 2)); }).catch(e => { console.error(e.stack || e); process.exitCode = 1; });
