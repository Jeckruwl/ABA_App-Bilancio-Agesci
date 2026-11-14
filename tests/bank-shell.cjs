// Il client aggiornato deve funzionare anche con la pagina PWA precedente in cache.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
for(const script of ['bank-import.js','bank-import-v6.js']){
  const ids=new Map();
  class Element{
    constructor(){this.listeners={};this.children=[];this.disabled=false;this.value='';this.textContent='';this.classList={values:new Set(),add:x=>this.classList.values.add(x),remove:x=>this.classList.values.delete(x),contains:x=>this.classList.values.has(x),toggle:(x,on)=>on?this.classList.values.add(x):this.classList.values.delete(x)};}
    set id(value){this._id=value;ids.set(value,this);} get id(){return this._id;}
    setAttribute(){} addEventListener(name,fn){this.listeners[name]=fn;} append(...items){this.children.push(...items);} before(...items){this.children.push(...items);} replaceChildren(...items){this.children=items;} focus(){} querySelector(){return null;}
  }
  for(const id of ['bankScreen','bankFile','bankAccount','bankRows','bankSummary','bankUpload','bankReset','bankConfirmDialog','bankConfirmCancel','bankConfirmAccept','bankConfirmText','btnBankImport']){const el=new Element();el.id=id;}
  ids.get('bankScreen').classList.add('hidden');
  const wrap=new Element();const document={getElementById:id=>ids.get(id)||null,createElement:()=>new Element(),querySelector:()=>wrap,head:new Element(),addEventListener(){}};
  const history={state:{},pushState(s){this.state=s;}};
  const context={document,history,window:{addEventListener(){}},state:{user:{},year:{},conti:[],categorie:[],tipiE:[],tipiU:[]},fillSelect(){},console,Date,Math,Number,String,URL,setTimeout,clearTimeout};
  vm.runInNewContext(fs.readFileSync(script,'utf8'),context);
  assert.equal(typeof ids.get('btnBankImport').onclick,'function');
  ids.get('btnBankImport').onclick();
  assert.equal(ids.get('bankScreen').classList.contains('hidden'),false);
  assert.equal(ids.get('bankDetected').textContent,'Operazioni rilevate: 0');
  assert.equal(ids.get('bankReady').textContent,'Operazioni pronte: 0/0');
  assert(ids.get('bankPending').disabled);
}
assert(fs.readFileSync('index.html','utf8').includes('src="bank-import-v6.js"'));
assert(fs.readFileSync('sw.js','utf8').includes('./bank-import-v6.js'));
console.log('Apertura importazione con pagina PWA precedente e script aggiornato: OK');
