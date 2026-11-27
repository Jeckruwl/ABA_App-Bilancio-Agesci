/* Prima nota in sola lettura: i dati provengono dal Tool, mai dalla cache locale. */
(function(){
  'use strict';
  const $l=id=>document.getElementById(id),screen=$l('ledgerScreen'),status=$l('ledgerStatus'),list=$l('ledgerRows'),search=$l('ledgerSearch'),reload=$l('ledgerReload');
  let rows=[],marker=null,version=0,context=null,loadState='idle';
  const key=()=>JSON.stringify([state.user?.userInfo?.codiceSocio??null,state.year?.value??null,state.incarico?.tipoIncarico??null,state.incarico?.accessoTipo??null,state.incarico?.dati?.creg??null,state.incarico?.dati?.czona??null,state.incarico?.dati?.ord??null,state.incarico?.codiceUnita??null,state.unita?.cun??null,state.unita?.prog??null]);
  const normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it');
  function date(s){if(!s)return 'Data non disponibile';const m=String(s).match(/^(\d{4})-(\d\d)-(\d\d)/);if(m)return m[3]+'/'+m[2]+'/'+m[1];return String(s);}
  function amount(x){if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null;}
  function account(r){const v=r.conto||r.conto_nome||r.nomeConto||r.descrizioneConto;return typeof v==='string'?v:state.conti.find(c=>String(c.value)===String(r.idconto))?.label||'';}
  function category(r){const v=r.categoria||r.categoria_nome||r.descrizionecategoria||r.categoriaLabel;if(typeof v==='string')return v;return state.categorie.find(c=>String(c.value)===String(r.idcategoria))?.label||'';}
  function appendText(parent,tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=text;parent.append(e);return e;}
  function render(){
    list.replaceChildren();const q=normalize(search.value.trim());const shown=rows.filter(r=>normalize([r.descrizione,r.note,r.e_descrizionetipo,r.u_descrizionetipo,r.unitaFullName,account(r),category(r),date(r.data_operazione)].join(' ')).includes(q));
    status.textContent=rows.length?(shown.length+' di '+rows.length+' operazioni'+(q?' trovate.':'.')):'Nessuna operazione per questo contesto.';
    if(rows.length&&!shown.length){appendText(list,'p','ledger-empty','Nessuna operazione corrisponde alla ricerca.');return;}
    shown.forEach(r=>{const card=document.createElement('article');card.className='ledger-row';const head=document.createElement('div');head.className='ledger-row-head';appendText(head,'strong','ledger-date',date(r.data_operazione));const numbers=document.createElement('div');numbers.className='ledger-amounts';const e=amount(r.e_importo),u=amount(r.u_importo);if(e!==null&&e!==0)appendText(numbers,'strong','ledger-in','Entrata '+fmtEUR(e));if(u!==null&&u!==0)appendText(numbers,'strong','ledger-out','Uscita '+fmtEUR(u));if(!numbers.childNodes.length)appendText(numbers,'span','ledger-neutral',e!==null||u!==null?fmtEUR(0):'Importo non disponibile');head.append(numbers);card.append(head);appendText(card,'h3','ledger-description',r.descrizione||'Descrizione non disponibile');const meta=document.createElement('div');meta.className='ledger-meta';for(const [name,val] of [['Conto',account(r)],['Tipologia',r.e_descrizionetipo||r.u_descrizionetipo],['Categoria',category(r)],['Unità',r.unitaFullName],['Note',r.note],['Saldo',amount(r.saldo)!==null?fmtEUR(Number(r.saldo)):null]])if(val){const p=document.createElement('p'),b=document.createElement('b');b.textContent=name+': ';p.append(b,document.createTextNode(String(val)));meta.append(p);}card.append(meta);list.append(card);});
  }
  async function load(){
    if(!state.user||!state.year||screen.classList.contains('hidden'))return;
    const run=++version,c=key();context=c;loadState='loading';rows=[];list.replaceChildren();status.textContent='Caricamento delle operazioni…';reload.disabled=true;
    try{const req=buildReq(0);req.loadMovimentiGroupedRF=true;const result=await postReq('/api/vocecassa/listbyparams',req);if(run!==version||c!==key()||screen.classList.contains('hidden'))return;if(!Array.isArray(result)||result.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('Risposta non valida dal Tool Bilancio.');loadState='ready';rows=result.slice().sort((a,b)=>String(b.data_operazione||'').localeCompare(String(a.data_operazione||'')));render();}
    catch(err){if(run===version&&c===key()&&!screen.classList.contains('hidden')){loadState='error';status.textContent='Impossibile caricare la prima nota. Verifica la connessione e riprova.';}}
    finally{if(run===version&&!screen.classList.contains('hidden'))reload.disabled=false;}
  }
  function close(){version++;rows=[];context=null;loadState='idle';list.replaceChildren();status.textContent='';screen.classList.add('hidden');document.querySelector('.wrap').inert=false;const b=$l('btnLedger');if(state.user&&!b.disabled)b.focus({preventScroll:true});}
  window.ledgerUpdate=()=>{$l('btnLedger').disabled=!(state.user&&state.year);if(!screen.classList.contains('hidden')&&context!==key())close();};
  window.ledgerSessionLost=()=>{if(!screen.classList.contains('hidden'))close();window.ledgerUpdate();};
  $l('btnLedger').onclick=()=>{if(!state.user||!state.year)return;marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaLedger:marker},'');document.querySelector('.wrap').inert=true;search.value='';screen.classList.remove('hidden');screen.focus({preventScroll:true});load();};
  $l('ledgerBack').onclick=()=>{if(history.state?.abaLedger===marker)history.back();else close();};
  window.addEventListener('popstate',()=>{if(!screen.classList.contains('hidden')&&history.state?.abaLedger!==marker)close();});
  reload.onclick=load;search.addEventListener('input',()=>{if(loadState==='ready')render();});
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'||(e.altKey&&e.key==='ArrowLeft')){e.preventDefault();$l('ledgerBack').click();return;}if(e.key==='Tab'){const a=[...screen.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(x=>x.getClientRects().length);if(a.length&&e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a[a.length-1].focus();}else if(a.length&&!e.shiftKey&&document.activeElement===a[a.length-1]){e.preventDefault();a[0].focus();}}});
  window.ledgerUpdate();
})();
