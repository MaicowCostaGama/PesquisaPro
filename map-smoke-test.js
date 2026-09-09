const assert = require('assert');
const fs = require('fs');
const app = fs.readFileSync('app.js','utf8');
const css = fs.readFileSync('style.css','utf8');
for (const token of [
  'collectMapApplyFilters','collectMapFit','collectMapRefresh','collectMapFilterEvents',
  'collectMapResearcher','collectMapStatus','collectMapLatest',
  "markerState=e.status==='rejected'?'is-rejected':e.calibration?'is-calibration':isLatest?'is-latest':'is-history'",
  'collectMapSummary','buildMapTooltip','marker.addListener',"goToAuditFromMap(e.id)",
  'AUDIT_HIGHLIGHT_ID=id','function mapDisplayPoint(e,events)','google.maps.Map',
  'google.maps.Marker','google.maps.InfoWindow','googleMarkerIcon','loadGoogleMaps',
  "mapTypeId:COLLECT_MAP_LAYERS[_collectMapKind]",'COLLECT_MAP_LAYERS={street:\'roadmap\',sat:\'satellite\'}'
]) assert(app.includes(token),`referência ausente: ${token}`);
assert(!app.includes('basemaps.cartocdn.com'),'Carto não deve mais ser usado');
assert(!app.includes('server.arcgisonline.com'),'Esri não deve mais ser usado');
assert(app.includes("collectTab(auditBtn,'auditoria')"));
for (const token of ['.map-toolbar','.map-legend','.map-loading','.map-popup','.collect-map-canvas{height:510px']) assert(css.includes(token),`estilo ausente: ${token}`);
console.log('Map smoke test OK: Google Maps, filtros, satélite, marcadores, auditoria e layout responsivo verificados.');
