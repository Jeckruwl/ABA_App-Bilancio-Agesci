/* Prima nota in sola lettura. Filtri locali alla schermata, dati sempre dal Tool. */
(function(){
  'use strict';
  const $l=id=>document.getElementById(id),screen=$l('ledgerScreen'),status=$l('ledgerStatus'),list=$l('ledgerRows'),year=$l('ledgerYear'),account=$l('ledgerAccount'),unit=$l('ledgerUnit');
  let rows=[],accounts=[],categories=[],marker=null,version=0,context=null;
  const key=()=>JSON.stringify([state.user?.userInfo?.codiceSocio??null,state.year?.value??null,state.incarico?.tipoIncarico??null,state.incarico?.accessoTipo??null,state.incarico?.dati?.creg??null,state.incarico?.dati?.czona??null,state.incarico?.dati?.ord??null,state.incarico?.codiceUnita??null,state.unita?.cun??null,state.unita?.prog??null]);
  const canChooseUnit=()=>!!state.incarico&&[3,4].includes(state.incarico.accessoTipo)&&Array.isArray(state.incarico.dati?.unita)&&state.incarico.dati.unita.length>0;
  const date=s=>{if(!s)return '—';const m=String(s).match(/^(\d{4})-(\d\d)-(\d\d)/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(s);};
  const amount=x=>{if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null;};
  function option(sel,value,text){const o=document.createElement('option');o.value=String(value);o.textContent=String(text);sel.append(o);}
  function resetTotals(){$l('ledgerOpening').textContent='—';$l('ledgerIncome').textContent='—';$l('ledgerExpense').textContent='—';$l('ledgerClosing').textContent='—';}
  function clear(){rows=[];list.replaceChildren();resetTotals();}
  function reqForSelection(conto){
    const req=buildReq(conto);req.rendicontoid=year.value?Number(year.value):null;
    if(canChooseUnit()){
      const u=state.incarico.dati.unita.find(x=>String(x.cun)+String(x.prog)===unit.value);
      req.codiceUnita=u?String(u.cun)+String(u.prog):(state.incarico.codiceUnita||null);
      req.unita_nome=u?u.nome:getNomeUnitaByIncarico(state.incarico);
    }
    return req;
  }
  function initialize(){
    year.replaceChildren();const years=state.allYears?.length?state.allYears:state.years||[];
    for(const y of years)if(y?.value!=null)option(year,y.value,y.label||y.value);
    if(![...year.options].some(o=>o.value===String(state.year?.value)))option(year,state.year.value,state.year.label||state.year.value);
    year.value=String(state.year.value);
    unit.replaceChildren();if(canChooseUnit()){option(unit,'','Tutte le unità');for(const u of state.incarico.dati.unita)option(unit,String(u.cun)+String(u.prog),u.nome?String(u.cun)+String(u.prog)+' — '+u.nome:String(u.cun)+String(u.prog));unit.value=state.unita?String(state.unita.cun)+String(state.unita.prog):'';unit.disabled=false;}
    else{option(unit,'',state.unita?.nome||getNomeUnitaByIncarico(state.incarico)||'Unità del contesto');unit.disabled=true;}
    account.replaceChildren();option(account,'','Tutti i conti');account.disabled=true;
  }
  function category(r){const v=r.categoria||r.categoria_nome||r.descrizionecategoria||r.categoriaLabel;if(typeof v==='string')return v;return categories.find(c=>String(c.value)===String(r.idcategoria))?.label||'';}
  function cell(tr,text,cls){const td=document.createElement('td');if(cls)td.className=cls;td.textContent=text===null||text===undefined||text===''?'—':String(text);tr.append(td);}
  // Importi assenti sul lato opposto sono ammessi, ma non quelli non numerici.
  function amounts(r){
    const e=amount(r.e_importo),u=amount(r.u_importo);
    const invalid=(v,n)=>v!==null&&v!==undefined&&v!==''&&n===null;
    if((e===null&&u===null)||invalid(r.e_importo,e)||invalid(r.u_importo,u))return null;
    return {e:Math.round((e??0)*100),u:Math.round((u??0)*100)};
  }
  function render(){
    list.replaceChildren();let income=0,expense=0,complete=true;
    const openings=rows.filter(r=>r.is_saldoiniziale===true);
    const movements=rows.filter(r=>r.is_saldoiniziale!==true&&r.is_saldo_totale!==true);
    const q=$l('ledgerSearch').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it');
    movements.forEach(r=>{const tr=document.createElement('tr');const values=amounts(r),e=amount(r.e_importo),u=amount(r.u_importo);if(!values)complete=false;else{income+=values.e;expense+=values.u;}
      if(q&&!String([r.descrizione,r.note,r.e_descrizionetipo,r.u_descrizionetipo,category(r),date(r.data_operazione)].join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it').includes(q))return;
      cell(tr,date(r.data_operazione),'ledger-date');cell(tr,r.descrizione);cell(tr,r.e_descrizionetipo||r.u_descrizionetipo);cell(tr,category(r));cell(tr,e!==null&&e!==0?fmtEUR(e):'—','ledger-in');cell(tr,u!==null&&u!==0?fmtEUR(u):'—','ledger-out');cell(tr,r.note);list.append(tr);
    });
    $l('ledgerIncome').textContent=complete?fmtEUR(income/100):'—';$l('ledgerExpense').textContent=complete?fmtEUR(expense/100):'—';
    // Un saldo ha significato certo solo per un conto selezionato con una sola riga iniziale.
    const opening=account.value&&openings.length===1&&String(openings[0].idconto)===account.value?amounts(openings[0]):null;
    $l('ledgerOpening').textContent=opening?fmtEUR((opening.e-opening.u)/100):'—';
    $l('ledgerClosing').textContent=opening&&complete?fmtEUR((opening.e-opening.u+income-expense)/100):'—';
    status.textContent=movements.length?(q?list.children.length+' di ':'')+movements.length+' operazioni restituite dal Tool.':'Nessuna operazione per la selezione corrente.';
    if(!complete)status.textContent+=' Totali non disponibili: alcuni importi mancano o non sono validi.';
    if(!account.value)status.textContent+=' Seleziona un conto per visualizzare i saldi.';
    else if(!opening)status.textContent+=' Saldo iniziale non disponibile o non univoco per il conto selezionato.';
  }
  function isCurrent(run,c){return run===version&&c===key()&&!screen.classList.contains('hidden');}
  async function loadRows(run,c){
    clear();status.textContent='Caricamento delle operazioni…';
    try{const req=reqForSelection(account.value?Number(account.value):0);req.loadMovimentiGroupedRF=true;const result=await postReq('/api/vocecassa/listbyparams',req);if(!isCurrent(run,c))return;if(!Array.isArray(result)||result.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error();rows=result.slice().sort((a,b)=>String(b.data_operazione||'').localeCompare(String(a.data_operazione||'')));render();}
    catch(err){if(isCurrent(run,c)){clear();status.textContent='Impossibile caricare la prima nota. Verifica la connessione e riprova cambiando selezione.';}}
  }
  async function loadContext(preserveAccount=false){
    if(!state.user||!year.value||screen.classList.contains('hidden'))return;
    const selected=preserveAccount?account.value:'';const run=++version,c=key();context=c;clear();status.textContent='Caricamento di conti e operazioni…';account.disabled=true;account.replaceChildren();option(account,'','Tutti i conti');accounts=[];categories=[];
    const req=reqForSelection(0);try{const [ac,cat]=await Promise.all([postReq('/api/conto/listbyparams',{...req,loadAllByZona:false}),postReq('/api/vocecassa/categorie',req).catch(()=>[])]);if(!isCurrent(run,c))return;if(!Array.isArray(ac)||!Array.isArray(cat))throw Error();accounts=ac.filter(x=>x&&x.isdummy!==true&&x.isdummy!==1&&x.value!=null);categories=cat;accounts.sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),'it'));for(const a of accounts)option(account,a.value,a.label||a.value);if([...account.options].some(o=>o.value===selected))account.value=selected;account.disabled=false;await loadRows(run,c);}
    catch(e){if(isCurrent(run,c)){clear();status.textContent='Impossibile caricare conti e categorie. Verifica la connessione e riprova cambiando selezione.';}}
  }
  function close(){version++;rows=[];accounts=[];categories=[];context=null;list.replaceChildren();resetTotals();status.textContent='';screen.classList.add('hidden');document.querySelector('.wrap').inert=false;const b=$l('btnLedger');if(state.user&&!b.disabled)b.focus({preventScroll:true});}
  window.ledgerUpdate=()=>{$l('btnLedger').disabled=!(state.user&&state.year);if(!screen.classList.contains('hidden')&&context!==key())close();};
  window.ledgerSessionLost=()=>{if(!screen.classList.contains('hidden'))close();window.ledgerUpdate();};
  $l('btnLedger').onclick=()=>{if(!state.user||!state.year)return;marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaLedger:marker},'');document.querySelector('.wrap').inert=true;screen.classList.remove('hidden');$l('ledgerSearch').value='';initialize();screen.focus({preventScroll:true});loadContext();};
  $l('ledgerBack').onclick=()=>{if(history.state?.abaLedger===marker)history.back();else close();};
  window.addEventListener('popstate',()=>{if(!screen.classList.contains('hidden')&&history.state?.abaLedger!==marker)close();});
  $l('ledgerReload').addEventListener('click',()=>loadContext(true));$l('ledgerSearch').addEventListener('input',()=>{if(!screen.classList.contains('hidden')&& !status.textContent.includes('Caricamento')&&!status.textContent.includes('Impossibile caricare'))render();});
  year.addEventListener('change',()=>loadContext());unit.addEventListener('change',()=>loadContext());account.addEventListener('change',()=>loadRows(++version,key()));
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'||(e.altKey&&e.key==='ArrowLeft')){e.preventDefault();$l('ledgerBack').click();return;}if(e.key==='Tab'){const a=[...screen.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')].filter(x=>x.tabIndex>=0&&x.getClientRects().length);if(a.length&&e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a[a.length-1].focus();}else if(a.length&&!e.shiftKey&&document.activeElement===a[a.length-1]){e.preventDefault();a[0].focus();}}});
  window.ledgerUpdate();
})();
