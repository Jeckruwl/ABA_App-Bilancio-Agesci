const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const handlers = {};
const removed = [];
let shell;
const caches = {
  keys: async () => ['agesci-bilancio-helper-v24', 'agesci-bilancio-helper-v25', 'agesci-bilancio-helper-v26', 'agesci-bilancio-helper-v27', 'agesci-bilancio-helper-v28', 'agesci-bilancio-helper-v29', 'agesci-bilancio-helper-v30', 'agesci-bilancio-helper-v31', 'agesci-bilancio-helper-v32', 'agesci-bilancio-helper-v33', 'agesci-bilancio-ocr-v1', 'unrelated'],
  delete: async key => removed.push(key),
  open: async () => ({addAll: async entries => { shell = entries; }})
};
const self = {addEventListener: (name, fn) => handlers[name] = fn, skipWaiting: async () => {}, clients: {claim: async () => {}}};
vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {self, caches, URL, Promise});
(async () => {
  let task;
  handlers.install({waitUntil: p => task = p}); await task;
  assert(shell.includes('./index.html'));
  assert(!shell.some(s => /ocr|receipt/i.test(s)));
  handlers.activate({waitUntil: p => task = p}); await task;
  assert.deepEqual(removed.sort(), ['agesci-bilancio-helper-v24', 'agesci-bilancio-helper-v25', 'agesci-bilancio-helper-v26', 'agesci-bilancio-helper-v27', 'agesci-bilancio-helper-v28', 'agesci-bilancio-helper-v29', 'agesci-bilancio-helper-v30', 'agesci-bilancio-helper-v31', 'agesci-bilancio-helper-v32', 'agesci-bilancio-ocr-v1']);
  console.log('App shell e pulizia cache OCR: OK');
})().catch(e => { console.error(e); process.exitCode = 1; });
