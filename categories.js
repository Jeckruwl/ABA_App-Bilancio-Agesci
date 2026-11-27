/* Gestione delle categorie reali del Tool Bilancio nel contesto selezionato. */
(function(){
  'use strict';
  const $c=id=>document.getElementById(id),screen=$c('categoriesScreen'),list=$c('categoriesList'),status=$c('categoriesStatus'),edit=$c('categoryEditDialog'),del=$c('categoryDeleteDialog');
  let marker=null,dialogMarker=null,activeDialog=null,busy=false,selected=null,context=null,locks=new Set();
  const norm=x=>String(x||'').trim().normalize('NFC').toLocaleLowerCase('it');
  const contextKey=()=>JSON.stringify([state.user?.userInfo?.codiceSocio??null,state.year?.value??null,state.incarico?.tipoIncarico??null,state.incarico?.accessoTipo??null,state.incarico?.dati?.creg??null,state.incarico?.dati?.czona??null,state.incarico?.dati?.ord??null,state.incarico?.codiceUnita??null,state.unita?.cun??null,state.unita?.prog??null]);
  const lockKey=c=>'ab_category_uncertain:'+c;
  function locked(){if(!context)return true;try{return locks.has(context)||localStorage.getItem(lockKey(context))==='1';}catch(e){return locks.has(context);}}
  // La richiesta parte solo dopo aver registrato localmente l'operazione in sospeso:
  // anche la chiusura improvvisa della pagina non deve consentire invii duplicati.
  function markPending(c){try{localStorage.setItem(lockKey(c),'1');locks.add(c);return true;}catch(e){return false;}}
  function clearLock(c){try{localStorage.removeItem(lockKey(c));locks.delete(c);return true;}catch(e){locks.add(c);return false;}}
  function unlock(){clearLock(context);render();}
  const canChange=()=>!!state.user&&!!state.year&&state.mappingReady&&!readOnlyRole()&&!$c('btnBankImport').disabled&&contextKey()===context;
  const canEdit=row=>!(state.incarico?.tipoIncarico===3&&!row.codiceUnita);
  function req(){
    const e=state.user,i=state.incarico,u=state.unita;
    if(i){const r={rendicontoid:state.year?.value,codicesocio:e?.userInfo?.codiceSocio,creg:i?.dati?.creg,czona:i?.dati?.czona,ord:i?.dati?.ord,contoid:0,tipoIncaricoMain:e?.userInfo?.tipoIncarico,tipoIncarico:i?.tipoIncarico,accessoTipo:i?.accessoTipo,gruppozona_nome:i?.dati?.nome,codiceUnita:i?.codiceUnita||null,unita_nome:getNomeUnitaByIncarico(i),nomeRegione:i?.dati?.nomeRegione,nomeZona:i?.dati?.nomeZona,nomeGruppo:i.tipoIncarico===1?null:i?.dati?.nomeGruppo,filterByUnita:true};if(u){r.codiceUnita=u.cun+u.prog;r.unita_nome=u.nome;}return r;}
    return {rendicontoid:state.year?.value,codicesocio:e?.userInfo?.codiceSocio,creg:null,czona:0,ord:0,contoid:0};
  }
  function render(){
    const isLocked=locked(),enabled=canChange()&&!busy&&!isLocked;
    $c('categoriesAdd').disabled=!enabled;status.replaceChildren();
    if(isLocked){const p=document.createElement('p');p.textContent='Esito non confermato. Verifica sul Tool Bilancio se la modifica è stata eseguita prima di continuare.';const button=document.createElement('button');button.type='button';button.className='btn ghost';button.textContent='Ho verificato sul Tool';button.disabled=busy;button.onclick=async()=>{button.disabled=true;try{await refresh();unlock();}catch(e){button.disabled=false;p.textContent='Impossibile aggiornare le categorie. Riprova dopo aver verificato sul Tool Bilancio.';}};status.append(p,button);}
    list.replaceChildren();const rows=state.categorie.filter(c=>norm(c.label).includes(norm($c('categoriesSearch').value)));
    if(!rows.length){const p=document.createElement('p');p.className='categories-empty';p.textContent='Nessuna categoria trovata.';list.append(p);return;}
    rows.forEach(row=>{const card=document.createElement('article');card.className='category-row';const info=document.createElement('div');info.className='category-info';const name=document.createElement('strong');name.textContent=row.label;info.append(name);if(row.unitaFullName){const u=document.createElement('span');u.textContent=row.unitaFullName;info.append(u);}const actions=document.createElement('div');actions.className='category-actions';for(const [label,handler,cls] of [['Modifica',()=>openEdit(row),''],['Elimina',()=>openDelete(row),'category-danger']]){const b=document.createElement('button');b.type='button';b.className='btn '+cls;b.textContent=label;b.disabled=!enabled||!canEdit(row);b.setAttribute('aria-label',label+' categoria '+row.label);if(!canEdit(row))b.title='Categoria non modificabile con questo incarico';b.onclick=handler;actions.append(b);}card.append(info,actions);list.append(card);});
  }
  async function refresh(){const c=context,rows=await postReq('/api/vocecassa/categorie',req());if(!Array.isArray(rows)||c!==context||contextKey()!==c)throw Error('Elenco non confermato');state.categorie=rows;const select=$c('fCat'),old=select.value;fillSelect(select,rows,'— Nessuna —');select.value=old;window.refreshManualMapping?.();render();return rows;}
  function openDialog(dialog){if(!canChange()||locked()||busy||activeDialog)return;activeDialog=dialog;dialogMarker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaCategoryDialog:dialogMarker},'');dialog.showModal();}
  function finishDialog(){if(!activeDialog)return;if(activeDialog.open)activeDialog.close();activeDialog=null;dialogMarker=null;selected=null;render();}
  function dismissDialog(){if(busy||!activeDialog)return;if(history.state?.abaCategoryDialog===dialogMarker)history.back();else finishDialog();}
  function openEdit(row){if(row&&!canEdit(row))return;selected=row?{...row}:null;$c('categoryEditTitle').textContent=row?'Modifica categoria':'Aggiungi categoria';$c('categoryEditName').value=row?.label||'';$c('categoryEditStatus').textContent='';openDialog(edit);if(activeDialog) $c('categoryEditName').focus();}
  function openDelete(row){if(!canEdit(row))return;selected={...row};$c('categoryDeleteText').textContent='Eliminare la categoria «'+row.label+'»?';$c('categoryDeleteStatus').textContent='';openDialog(del);if(activeDialog)$c('categoryDeleteCancel').focus();}
  function setBusy(value){busy=value;$c('categoryEditName').disabled=value;$c('categoryEditSave').disabled=value;$c('categoryEditCancel').disabled=value;$c('categoryDeleteConfirm').disabled=value;$c('categoryDeleteCancel').disabled=value;$c('categoriesBack').disabled=value;render();}
  async function mutate(kind,label){
    const out=$c(kind==='delete'?'categoryDeleteStatus':'categoryEditStatus');if(busy||locked()||!canChange())return;
    const c=context,row=selected?{...selected}:null;if(kind==='delete'&&!row){out.textContent='Categoria non disponibile.';return;}
    if(row&&(!Number.isSafeInteger(Number(row.value))||Number(row.value)<=0||!canEdit(row)||!state.categorie.some(x=>String(x.value)===String(row.value)))){out.textContent='Categoria non più disponibile o non modificabile.';return;}
    if(kind!=='delete'){
      if(!label){out.textContent='Inserisci il nome della categoria.';return;}
      if(state.categorie.some(x=>String(x.value)!==String(row?.value??'')&&norm(x.label)===norm(label))){out.textContent='Una categoria con questo nome è già presente.';return;}
    }
    if(!markPending(c)){out.textContent='Impossibile salvare lo stato di sicurezza sul dispositivo. Operazione non inviata.';return;}
    setBusy(true);out.textContent='Operazione in corso…';let confirmed=false;
    try{
      const body=kind==='delete'?{req:req(),categoriaToDeleteId:row.value}:{req:req(),categoria:row?{...row,label}:{label}};
      const result=await api(kind==='delete'?'/api/vocecassa/deleteCategoria':'/api/vocecassa/saveCategoria',{body});
      if(typeof result==='string'&&result.trim()){clearLock(c);out.textContent='Il Tool Bilancio ha rifiutato la richiesta: '+result;return;}
      if(typeof result==='string'||result==null||result===false||result?.success===false||result?.ok===false)throw Error('Esito non confermato');confirmed=true;
      const rows=await refresh();
      const exists=kind==='delete'?rows.some(x=>String(x.value)===String(row.value)):row?rows.some(x=>String(x.value)===String(row.value)&&norm(x.label)===norm(label)):rows.some(x=>Number(x.value)>0&&norm(x.label)===norm(label));
      if(kind==='delete'?exists:!exists)throw Error('Elenco non confermato');
      if(c!==context||contextKey()!==c)throw Error('Contesto cambiato');
      if(!clearLock(c))throw Error('Stato di sicurezza non aggiornato');
      out.textContent='';setBusy(false);dismissDialog();return;
    }catch(e){if(c===context){out.textContent=confirmed?'Operazione inviata, ma aggiornamento non confermato. Verifica nel Tool Bilancio prima di riprovare.':'Esito non confermato. Verifica nel Tool Bilancio prima di riprovare.';}}
    finally{setBusy(false);}
  }
  $c('categoriesAdd').onclick=()=>openEdit(null);$c('categoriesSearch').addEventListener('input',render);
  $c('categoryEditForm').addEventListener('submit',e=>{e.preventDefault();mutate('save',$c('categoryEditName').value.trim());});
  $c('categoryDeleteConfirm').onclick=()=>mutate('delete');$c('categoryEditCancel').onclick=dismissDialog;$c('categoryDeleteCancel').onclick=dismissDialog;
  [edit,del].forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();dismissDialog();}));
  function close(){finishDialog();screen.classList.add('hidden');document.querySelector('.wrap').inert=false;$c('btnManageCategories').focus({preventScroll:true});}
  $c('btnManageCategories').onclick=()=>{if(!state.user||!state.year||!state.mappingReady)return;context=contextKey();marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaCategories:marker},'');document.querySelector('.wrap').inert=true;screen.classList.remove('hidden');$c('categoriesSearch').value='';render();screen.focus({preventScroll:true});};
  $c('categoriesBack').onclick=()=>{if(busy)return;if(history.state?.abaCategories===marker)history.back();else close();};
  window.addEventListener('popstate',()=>{
    if(screen.classList.contains('hidden'))return;
    if(busy){if(history.state?.abaCategories!==marker||history.state?.abaCategoryDialog!==dialogMarker)history.pushState({...history.state,abaCategories:marker,abaCategoryDialog:dialogMarker},'');return;}
    if(activeDialog&&history.state?.abaCategoryDialog!==dialogMarker)finishDialog();
    if(history.state?.abaCategories!==marker)close();
  });
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'||(e.altKey&&e.key==='ArrowLeft')){e.preventDefault();$c('categoriesBack').click();}if(e.key==='Tab'){const items=[...screen.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(x=>x.getClientRects().length);if(items.length&&e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items[items.length-1].focus();}else if(items.length&&!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus();}}});
  window.categoriesSessionLost=()=>{if(!screen.classList.contains('hidden'))close();};
})();
