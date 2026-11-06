const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { loadData } = require('../scripts/validate-deals.cjs');
test('rendering, filters, all sort modes and refresh remain functional', () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { innerHTML: '', handlers: {}, addEventListener(event, fn) { this.handlers[event] = fn; }, querySelectorAll: () => [] });
    return elements.get(id);
  };
  let script, interval;
  const document = { baseURI: 'https://example.com/Fynd-dashboard/', visibilityState: 'visible', getElementById: element,
    createElement: () => ({ remove() {} }), head: { appendChild(s) { script = s; } }, addEventListener() {} };
  const window = { addEventListener() {} };
  vm.runInNewContext(readFileSync('app.js', 'utf8'), { document, window, URL, setInterval(fn, ms) { interval = { fn, ms }; } });
  const data = loadData(readFileSync('deals.js', 'utf8'));
  window.DEALS_DATA = data; script.onload();
  const ids = () => [...element('dealGrid').innerHTML.matchAll(/data-deal-id="([^"]+)"/g)].map(x => x[1]);
  assert.equal(ids().length, data.deals.length);
  assert.equal(interval.ms, 300000);
  for (const category of ['history', 'homelab', 'smart-home', 'all']) {
    element('categoryTabs').handlers.click({ target: { closest: () => ({ dataset: { category } }) } });
    const expected = data.deals.filter(d => category === 'all' || (category === 'history' ? d.status === category : d.category === category));
    assert.deepEqual(new Set(ids()), new Set(expected.map(d => d.id)));
  }
  for (const [sort, compare] of Object.entries({ newest: (a,b) => new Date(b.date)-new Date(a.date), discount: (a,b) => (b.discountPercent ?? -1)-(a.discountPercent ?? -1), 'price-low': (a,b) => (a.price ?? Number.MAX_SAFE_INTEGER)-(b.price ?? Number.MAX_SAFE_INTEGER), 'price-high': (a,b) => (b.price ?? -1)-(a.price ?? -1) })) {
    element('sortSelect').value = sort; element('sortSelect').handlers.change();
    assert.deepEqual(ids(), Array.from(data.deals).sort(compare).map(d => d.id));
  }
  element('searchInput').value = 'NO-MATCH-123'; element('searchInput').handlers.input();
  assert.equal(ids().length, 0); assert.equal(element('emptyState').hidden, false);
  element('searchInput').value = 'Telldus'; element('searchInput').handlers.input();
  assert.ok(ids().length > 0 && ids().length < data.deals.length);
  interval.fn(); script.onerror(); assert.ok(ids().length > 0);
  interval.fn(); window.DEALS_DATA = { ...data, lastCheckNote: 'New check' }; script.onload();
  assert.equal(element('lastCheckNote').textContent, 'New check');
  assert.ok(ids().length > 0 && ids().length < data.deals.length);
});
