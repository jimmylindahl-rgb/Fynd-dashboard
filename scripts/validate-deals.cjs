const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function loadData(source) {
  const context = { window: {} };
  new vm.Script(source, { filename: 'deals.js' }).runInNewContext(context, { timeout: 1000 });
  return context.window.DEALS_DATA;
}
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
function date(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function timestamp(value) {
  return typeof value === 'string' && date(value.slice(0, 10)) &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) && Number.isFinite(Date.parse(value));
}
function webUrl(value) {
  if (!text(value) || /[\s\\<>"\u0000-\u001f]/u.test(value) || !/^https?:\/\//.test(value) || /%(?![\da-f]{2})/i.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
      url.hostname.includes('.') && url.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
  } catch { return false; }
}
function validateData(data) {
  const errors = [];
  const requireValue = (valid, path, rule) => { if (!valid) errors.push(`${path}: ${rule}`); };
  if (!object(data)) return ['DEALS_DATA: expected an object'];
  for (const field of ['lastUpdated', 'lastChecked', 'lastDealAdded']) requireValue(timestamp(data[field]), field, 'expected ISO timestamp with timezone');
  for (const field of ['lastCheckNote', 'note']) requireValue(text(data[field]), field, 'required non-empty string');
  if (!Array.isArray(data.deals)) return [...errors, 'deals: expected an array'];
  const ids = new Set();
  data.deals.forEach((deal, index) => {
    const path = `deals[${index}]`;
    if (!object(deal)) { errors.push(`${path}: expected an object`); return; }
    const check = (valid, field, rule) => requireValue(valid, `${path}.${field}`, rule);
    for (const field of ['id', 'name', 'store', 'compatibility', 'protocol', 'description', 'limitation']) check(text(deal[field]), field, 'required non-empty string');
    check(!ids.has(deal.id), 'id', 'must be unique');
    ids.add(deal.id);
    check(date(deal.date), 'date', 'expected real YYYY-MM-DD date');
    check(['smart-home', 'homelab'].includes(deal.category), 'category', 'unknown category');
    check(['active', 'history'].includes(deal.status), 'status', 'unknown status');
    check(typeof deal.extraHub === 'string', 'extraHub', 'required string (may be empty)');
    const placeholder = deal.id === 'homelab-placeholder';
    if (placeholder) check(deal.category === 'homelab' && deal.status === 'history', 'id', 'placeholder must be historical homelab');
    for (const field of ['price', 'referencePrice', 'discountPercent']) {
      check(placeholder ? deal[field] === null : typeof deal[field] === 'number' && Number.isFinite(deal[field]) && deal[field] >= 0 && (field !== 'discountPercent' || deal[field] <= 100), field, placeholder ? 'placeholder requires null' : 'expected finite non-negative number (discount <= 100)');
    }
    for (const field of ['whyGoodDeal', 'fitForSetup']) if (!placeholder || field in deal) check(text(deal[field]), field, 'required non-empty string');
    if (!placeholder || 'useCases' in deal) check(Array.isArray(deal.useCases) && deal.useCases.length > 0 && deal.useCases.every(text), 'useCases', 'expected non-empty array of non-empty strings');
    check(typeof deal.productUrl === 'string' && ((deal.status === 'history' && deal.productUrl === '') || webUrl(deal.productUrl)), 'productUrl', 'expected absolute HTTP(S) URL; only history may have an empty link');
    check(typeof deal.imageUrl === 'string' && (deal.imageUrl === '' || webUrl(deal.imageUrl)), 'imageUrl', 'expected empty string or absolute HTTP(S) URL');
  });
  return errors;
}
if (require.main === module) {
  try {
    const data = loadData(readFileSync(process.argv[2] || 'deals.js', 'utf8'));
    const errors = validateData(data);
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`Validated ${data.deals.length} entries in deals.js`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { loadData, validateData, webUrl };
