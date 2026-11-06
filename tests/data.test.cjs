const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { loadData, validateData } = require('../scripts/validate-deals.cjs');
const source = readFileSync('deals.js', 'utf8');
const fresh = () => loadData(source);
test('current data including history and placeholder passes unchanged', () => assert.deepEqual(validateData(fresh()), []));
test('lastCheckNote quoting regression is a syntax error', () => {
  const broken = source.replace(/lastCheckNote:.*\n/, 'lastCheckNote: "Broken "quote",\n');
  assert.throws(() => loadData(broken), { name: 'SyntaxError' });
  assert.notEqual(spawnSync(process.execPath, ['--check'], { input: broken }).status, 0);
});
test('missing global and runtime failure are detected', () => {
  assert.ok(validateData(loadData('window.OTHER = {};')).length);
  assert.throws(() => loadData('throw new Error("broken")'), /broken/);
});
const invalid = {
  'wrong root': () => null,
  'wrong collection': d => { d.deals = {}; },
  'null entry': d => { d.deals[0] = null; },
  'missing name': d => { delete d.deals[0].name; },
  'missing timestamp': d => { delete d.lastChecked; },
  'invalid timestamp': d => { d.lastChecked = '2026-02-30T12:00:00Z'; },
  'date rollover': d => { d.deals[0].date = '2026-02-30'; },
  'numeric string': d => { d.deals[0].price = '149'; },
  'negative price': d => { d.deals[0].price = -1; },
  'NaN': d => { d.deals[0].price = NaN; },
  'infinity': d => { d.deals[0].referencePrice = Infinity; },
  'invalid discount': d => { d.deals[0].discountPercent = 101; },
  'duplicate id': d => { d.deals[1].id = d.deals[0].id; },
  'unknown category': d => { d.deals[0].category = 'other'; },
  'unknown status': d => { d.deals[0].status = 'expired'; },
  'wrong useCases': d => { d.deals[0].useCases = 'example'; },
  'empty useCase': d => { d.deals[0].useCases = ['']; },
  'missing detail': d => { delete d.deals[0].whyGoodDeal; },
  'missing link': d => { delete d.deals[0].productUrl; },
  'empty active link': d => { d.deals[0].productUrl = ''; },
  'invalid historical link': d => { d.deals[0].status = 'history'; d.deals[0].productUrl = 'broken'; },
  'active placeholder': d => { d.deals.find(x => x.id === 'homelab-placeholder').status = 'active'; }
};
for (const [name, mutate] of Object.entries(invalid)) test(`rejects ${name}`, () => {
  const data = fresh();
  const result = mutate(data);
  assert.ok(validateData(result === null ? null : data).length);
});
for (const url of ['javascript:alert(1)', 'data:text/html,test', '/product/1', '//shop.se/item', 'https://', 'https://shop.se/a b', 'https://user:pass@shop.se/item', 'https://shop.se/%zz', 'https://shop.se/\\bad']) {
  test(`rejects URL ${url}`, () => { const d = fresh(); d.deals[0].productUrl = url; assert.ok(validateData(d).some(x => x.includes('productUrl'))); });
}
test('accepts query strings and encoded product names', () => {
  const d = fresh(); d.deals[0].productUrl = 'https://shop.se/produkt/r%C3%B6d?id=123&variant=2';
  assert.deepEqual(validateData(d), []);
});
