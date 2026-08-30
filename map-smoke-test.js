const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

for (const token of [
  'collectMapApplyFilters',
  'collectMapFit',
  'collectMapRefresh',
  'collectMapFilterEvents',
  'collectMapResearcher',
  'collectMapStatus',
  'collectMapLatest',
  "markerState=e.status==='rejected'?'is-rejected':e.calibration?'is-calibration':isLatest?'is-latest':'is-history'",
  'collectMapSummary',
  'buildMapTooltip',
  "scrollWheelZoom:true,zoomControl:true",
  'marker.bindTooltip(buildMapTooltip(e,isLatest)',
  'marker.on(\'click\',()=>goToAuditFromMap(e.id))',
  'AUDIT_HIGHLIGHT_ID=id',
  'function mapDisplayPoint(e,events)',
  'setView(pts[0],17',
  'maxZoom:18',
  'iconSize:[36,42],iconAnchor:[18,38]'
]) {
  assert(app.includes(token), `referência ausente: ${token}`);
}
assert(app.includes("url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/"));
assert(app.includes("url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/"));
assert(app.includes("collectTab(auditBtn,'auditoria')"));
assert(css.includes('.map-toolbar'));
assert(css.includes('.map-legend'));
assert(css.includes('.map-loading'));
assert(css.includes('.map-popup'));
assert(css.includes('border-radius:50% 50% 50% 0'));
assert(css.includes('.map-marker::before'));
assert(css.includes('transform:rotate(-45deg)'));
assert(css.includes('.collect-map-canvas{height:510px'));
console.log('Map smoke test OK: filtros, ações, camadas, marcadores e layout responsivo verificados.');
