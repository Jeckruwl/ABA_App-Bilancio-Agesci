// Simula il vecchio service worker cache-first che vede il nuovo HTML online.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),cp=require('node:child_process');
const old=cp.execFileSync('git',['show','d2feb22:sw.js'],{encoding:'utf8'}),html=fs.readFileSync('index.html','utf8');
const css=html.match(/href="(ui-emergent\.css[^\"]*)"/)[1],script=html.match(/src="(ledger\.js[^\"]*)"/)[1];
assert.notEqual(css,'ui-emergent.css');assert.notEqual(script,'ledger.js');
const events={},oldCache=new Map([['https://example.test/app/ui-emergent.css','OLD CSS'],['https://example.test/app/ledger.js','OLD SCRIPT']]);
const caches={match:async req=>oldCache.get(req.url),open:async()=>({put:async()=>{}})};
const self={location:{origin:'https://example.test'},addEventListener:(name,fn)=>events[name]=fn};
const fetch=async req=>'NETWORK '+req.url;
vm.runInNewContext(old,{self,caches,URL,fetch});
(async()=>{for(const name of [css,script]){let promise;events.fetch({request:{method:'GET',mode:'no-cors',url:'https://example.test/app/'+name},respondWith:p=>promise=p});assert.equal(await promise,'NETWORK https://example.test/app/'+name);}console.log('Aggiornamento prima nota: il vecchio service worker non mescola risorse in cache e nuovo HTML OK');})().catch(e=>{console.error(e);process.exitCode=1});
