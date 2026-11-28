const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const handlers = {};
const removed = [];
let shell;
const caches = {
  keys: async () => ['agesci-bilancio-helper-v24', 'agesci-bilancio-helper-v25', 'agesci-bilancio-helper-v26', 'agesci-bilancio-helper-v27', 'agesci-bilancio-helper-v28', 'agesci-bilancio-helper-v29', 'agesci-bilancio-helper-v30', 'agesci-bilancio-helper-v31', 'agesci-bilancio-helper-v32', 'agesci-bilancio-helper-v33', 'agesci-bilancio-helper-v34', 'agesci-bilancio-helper-v35', 'agesci-bilancio-helper-v36', 'agesci-bilancio-helper-v37', 'agesci-bilancio-helper-v38', 'agesci-bilancio-helper-v39', 'agesci-bilancio-helper-v40', 'agesci-bilancio-helper-v41', 'agesci-bilancio-helper-v42', 'agesci-bilancio-helper-v43', 'agesci-bilancio-helper-v44', 'agesci-bilancio-helper-v45', 'agesci-bilancio-helper-v46', 'agesci-bilancio-helper-v47', 'agesci-bilancio-helper-v48', 'agesci-bilancio-helper-v49', 'agesci-bilancio-helper-v50', 'agesci-bilancio-helper-v51', 'agesci-bilancio-helper-v52', 'agesci-bilancio-helper-v53', 'agesci-bilancio-helper-v54', 'agesci-bilancio-helper-v55', 'agesci-bilancio-helper-v56', 'agesci-bilancio-helper-v57', 'agesci-bilancio-helper-v58', 'agesci-bilancio-helper-v59', 'agesci-bilancio-helper-v60', 'agesci-bilancio-helper-v61', 'agesci-bilancio-helper-v62', 'agesci-bilancio-helper-v63', 'agesci-bilancio-helper-v64', 'agesci-bilancio-helper-v65', 'agesci-bilancio-helper-v66', 'agesci-bilancio-helper-v67', 'agesci-bilancio-helper-v68', 'agesci-bilancio-helper-v69', 'agesci-bilancio-helper-v70', 'agesci-bilancio-helper-v71', 'agesci-bilancio-helper-v72', 'agesci-bilancio-helper-v73', 'agesci-bilancio-helper-v74', 'agesci-bilancio-helper-v75', 'agesci-bilancio-helper-v76', 'agesci-bilancio-helper-v77', 'agesci-bilancio-helper-v78', 'agesci-bilancio-helper-v79', 'agesci-bilancio-helper-v80', 'agesci-bilancio-ocr-v1', 'unrelated'],
  delete: async key => removed.push(key),
  open: async () => ({addAll: async entries => { shell = entries; }})
};
const self = {addEventListener: (name, fn) => handlers[name] = fn, skipWaiting: async () => {}, clients: {claim: async () => {}}};
vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {self, caches, URL, Promise});
(async () => {
  let task;
  handlers.install({waitUntil: p => task = p}); await task;
  assert(shell.includes('./index.html'));
  assert(shell.includes('./ui-emergent.css?v=84'));
  assert(shell.includes('./assets/body-bg.png'));
  assert(shell.includes('./assets/body-bg-inverted.png'));
  assert(shell.includes('./categories.js'));
  assert(shell.includes('./ledger.js?v=85'));
  assert(shell.includes('./mapping-v15.js'));
  assert(shell.includes('./vendor/roboto/Roboto-variable.ttf'));
  assert(shell.includes('./vendor/roboto/Roboto-variable-italic.ttf'));
  assert(!shell.some(s => /ocr|receipt/i.test(s)));
  handlers.activate({waitUntil: p => task = p}); await task;
  assert.deepEqual(removed.sort(), ['agesci-bilancio-helper-v24', 'agesci-bilancio-helper-v25', 'agesci-bilancio-helper-v26', 'agesci-bilancio-helper-v27', 'agesci-bilancio-helper-v28', 'agesci-bilancio-helper-v29', 'agesci-bilancio-helper-v30', 'agesci-bilancio-helper-v31', 'agesci-bilancio-helper-v32', 'agesci-bilancio-helper-v33', 'agesci-bilancio-helper-v34', 'agesci-bilancio-helper-v35', 'agesci-bilancio-helper-v36', 'agesci-bilancio-helper-v37', 'agesci-bilancio-helper-v38', 'agesci-bilancio-helper-v39', 'agesci-bilancio-helper-v40', 'agesci-bilancio-helper-v41', 'agesci-bilancio-helper-v42', 'agesci-bilancio-helper-v43', 'agesci-bilancio-helper-v44', 'agesci-bilancio-helper-v45', 'agesci-bilancio-helper-v46', 'agesci-bilancio-helper-v47', 'agesci-bilancio-helper-v48', 'agesci-bilancio-helper-v49', 'agesci-bilancio-helper-v50', 'agesci-bilancio-helper-v51', 'agesci-bilancio-helper-v52', 'agesci-bilancio-helper-v53', 'agesci-bilancio-helper-v54', 'agesci-bilancio-helper-v55', 'agesci-bilancio-helper-v56', 'agesci-bilancio-helper-v57', 'agesci-bilancio-helper-v58', 'agesci-bilancio-helper-v59', 'agesci-bilancio-helper-v60', 'agesci-bilancio-helper-v61', 'agesci-bilancio-helper-v62', 'agesci-bilancio-helper-v63', 'agesci-bilancio-helper-v64', 'agesci-bilancio-helper-v65', 'agesci-bilancio-helper-v66', 'agesci-bilancio-helper-v67', 'agesci-bilancio-helper-v68', 'agesci-bilancio-helper-v69', 'agesci-bilancio-helper-v70', 'agesci-bilancio-helper-v71', 'agesci-bilancio-helper-v72', 'agesci-bilancio-helper-v73', 'agesci-bilancio-helper-v74', 'agesci-bilancio-helper-v75', 'agesci-bilancio-helper-v76', 'agesci-bilancio-helper-v77', 'agesci-bilancio-helper-v78', 'agesci-bilancio-helper-v79', 'agesci-bilancio-helper-v80', 'agesci-bilancio-ocr-v1']);
  console.log('App shell e pulizia cache OCR: OK');
})().catch(e => { console.error(e); process.exitCode = 1; });
