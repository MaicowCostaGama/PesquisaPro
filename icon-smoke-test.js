const assert = require('assert');
const fs = require('fs');
const app = fs.readFileSync('app.js','utf8');
const css = fs.readFileSync('style.css','utf8');
const html = fs.readFileSync('app.html','utf8');

assert(app.includes('const ICON_SVG='));
assert(app.includes('function icon3d(token,color)'));
assert(app.includes('class="ico ico-3d"'));
assert(app.includes('class="s-ico s-ico-3d"'));
for (const key of ['▤','✦','❒','✓','∑','⬇','▶','◫','☺','⚿','$','✎','⌂','↗','◷','☼','⏻']) {
  assert(app.includes(`'${key}':`), `ícone não mapeado: ${key}`);
}
assert(css.includes('.icon3d'));
assert(css.includes('.ico-3d'));
assert(css.includes('.s-ico-3d'));
assert(css.includes('inset 1px 1px 2px'));
assert(css.includes('drop-shadow'));
assert(css.includes('.nav-item .ico-3d'));
assert(css.includes('background:linear-gradient(145deg,#3f73b3'));
assert(css.includes('.nav-item.on .ico-3d'));
assert(html.includes('style.css?v=20260830310000'));
console.log('Icon smoke test OK: catálogo SVG, menu, cards, profundidade e cache verificados.');
