/* Relazioni tipologia Scout/categoria, locali al contesto corrente. */
(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  const key=()=>{const u=state.user?.userInfo?.codiceSocio,y=state.year?.value,i=state.incarico,n=state.unita;if(u==null||y==null)return null;return 'ab_mapping_v2:'+JSON.stringify([u,y,i?.tipoIncarico??null,i?.accessoTipo??null,i?.dati?.creg??null,i?.dati?.czona??null,i?.dati?.ord??null,i?.codiceUnita??null,n?.cun??null,n?.prog??null]);};
  const scout=t=>t && t.selezionabile!==false && (t.voceMinisteroId!=null||!!t.gruppoZona);
  const types=dir=>(dir==='i'?state.tipiE:state.tipiU).filter(scout);
  const id=x=>String(x);
  function read(){
    try{
      const k=key();if(!k)return {version:2,nodes:[],links:[]};
      const raw=localStorage.getItem(k);
      if(raw){const d=JSON.parse(raw);return d&&d.version===2&&Array.isArray(d.nodes)&&Array.isArray(d.links)?d:{version:2,nodes:[],links:[]};}
      // Le categorie del grafo originale erano comuni ai due versi: le replichiamo
      // nei due layer conservando posizioni e collegamenti. Il vecchio dato resta intatto.
      const old=JSON.parse(localStorage.getItem(k.replace('ab_mapping_v2:','ab_mapping_v1:'))||'null');
      if(old?.version===1&&Array.isArray(old.nodes)&&Array.isArray(old.links)){
        const nodes=old.nodes.flatMap(n=>n.kind==='category'?['i','o'].map(dir=>({...n,dir})):n.kind==='type'&&['i','o'].includes(n.dir)?[{...n}]:[]);
        return {version:2,nodes,links:old.links.map(l=>({...l}))};
      }
    }catch(e){}
    return {version:2,nodes:[],links:[]};
  }
  function write(d){try{const k=key();if(!k)throw Error();localStorage.setItem(k,JSON.stringify(d));return true;}catch(e){message('Impossibile salvare la mappatura sul dispositivo. Nessuna modifica applicata.');return false;}}
  function activeLinks(dir){if(state.mappingReady===false)return [];const d=read(), ts=types(dir), cs=state.categorie;return d.links.filter(l=>l.dir===dir&&ts.some(t=>id(t.value)===id(l.type))&&cs.some(c=>id(c.value)===id(l.category)));}
  function associated(dir,side,value){if(!value)return [];return [...new Set(activeLinks(dir).filter(l=>id(l[side])===id(value)).map(l=>id(l[side==='type'?'category':'type'])) )];}
  // null indica nessun filtro. Il filtro tiene conto delle sole voci effettivamente selezionabili.
  function apply(dir,source,type,category,availableTypes,availableCategories){
    type=id(type||'');category=id(category||'');
    const typeIds=new Set(availableTypes.map(x=>id(x.value))),catIds=new Set(availableCategories.map(x=>id(x.value)));
    let allowed=null;
    if(source==='type' && type){allowed=associated(dir,'type',type).filter(x=>catIds.has(x));if(!allowed.length)allowed=null;if(allowed){if(allowed.length===1)category=allowed[0];else if(!allowed.includes(category))category='';}}
    if(source==='category' && category){allowed=associated(dir,'category',category).filter(x=>typeIds.has(x));if(!allowed.length)allowed=null;if(allowed){if(allowed.length===1)type=allowed[0];else if(!allowed.includes(type))type='';}}
    return {type,category,allowed};
  }
  function compatible(dir,t,c,source){if(!t||!c)return true;const links=activeLinks(dir), relevant=links.filter(l=>source==='category'?id(l.category)===id(c):id(l.type)===id(t));return !relevant.length||relevant.some(l=>id(l.type)===id(t)&&id(l.category)===id(c));}
  window.TypeMapping={apply,activeLinks,compatible};

  const screen=el('mappingScreen'),board=el('mapBoard'),svg=el('mapLines'),viewport=el('mapViewport'),extent=el('mapExtent');
  let data=null,selected=null,marker=null,zoom=1,pinching=null,camera={x:0,y:0},pan=null,categoryBusy=false,layer='i',views={},selectedNodes=new Set(),selectionDrag=null;
  const uncertainCategories=new Set();
  function message(s){el('mapMessage').textContent=s;}
  function allTypes(){return types(layer).map(t=>({kind:'type',dir:layer,value:id(t.value),label:(layer==='i'?'Entrata · ':'Uscita · ')+t.label}));}
  function allCats(){return state.categorie.map(c=>({kind:'category',dir:layer,value:id(c.value),label:c.label}));}
  const nodeKey=n=>n.kind+':'+(n.dir||'')+':'+id(n.value);
  function resolve(n){const source=n.kind==='type'?types(n.dir):state.categorie;const item=source.find(x=>id(x.value)===id(n.value));return item?{...n,label:n.kind==='type'?(n.dir==='i'?'Entrata · ':'Uscita · ')+item.label:item.label}:null;}
  function point(clientX,clientY){const r=viewport.getBoundingClientRect();return {x:(clientX-r.left-camera.x)/zoom,y:(clientY-r.top-camera.y)/zoom};}
  function sizing(){
    board.style.transform=`translate(${camera.x}px, ${camera.y}px) scale(${zoom})`;
    // La griglia vive nelle stesse coordinate del grafo, non dello schermo.
    viewport.style.backgroundPosition=`${camera.x}px ${camera.y}px`;
    viewport.style.backgroundSize=`${20*zoom}px ${20*zoom}px`;
    viewport.style.setProperty('--map-dot-radius',`${Math.min(5*zoom,Math.max(.7,1.2*zoom))}px`);
    el('mapZoomReset').textContent=(zoom<.01?Number((zoom*100).toFixed(1)):Math.round(zoom*100))+'%';
  }
  function setZoom(value,clientX,clientY){
    const next=Math.max(.001,Math.min(4,value));if(next===zoom)return;
    const rect=viewport.getBoundingClientRect(),x=clientX==null?rect.width/2:clientX-rect.left,y=clientY==null?rect.height/2:clientY-rect.top;
    const bx=(x-camera.x)/zoom,by=(y-camera.y)/zoom;zoom=next;camera={x:x-bx*zoom,y:y-by*zoom};sizing();
  }
  function fit(){
    const nodes=(data?.nodes||[]).filter(n=>n.dir===layer).filter(resolve),rect=viewport.getBoundingClientRect();
    const leftPanel=el('mapTypes').closest('.map-side')?.getBoundingClientRect(),rightPanel=el('mapCategories').closest('.map-side')?.getBoundingClientRect();
    const x0=leftPanel?Math.max(0,leftPanel.right-rect.left+12):20,x1=rightPanel?Math.min(rect.width,rightPanel.left-rect.left-12):rect.width-20;
    const y0=Math.min(rect.height-40,Math.max(110,(el('mapMessage').getBoundingClientRect().bottom||0)-rect.top+12)),y1=rect.height-65;
    if(!nodes.length){zoom=1;camera={x:(x0+x1)/2-320,y:(y0+y1)/2-200};sizing();return;}
    const left=Math.min(...nodes.map(n=>Number(n.x)||0)),top=Math.min(...nodes.map(n=>Number(n.y)||0)),right=Math.max(...nodes.map(n=>(Number(n.x)||0)+190)),bottom=Math.max(...nodes.map(n=>(Number(n.y)||0)+100));
    zoom=Math.max(.001,Math.min(1,Math.max(1,x1-x0)/(right-left),Math.max(1,y1-y0)/(bottom-top)));
    camera={x:(x0+x1)/2-(left+right)*zoom/2,y:(y0+y1)/2-(top+bottom)*zoom/2};sizing();
  }
  function switchLayer(next){
    if(next===layer)return;
    views[layer]={zoom,camera:{...camera}};layer=next;selected=null;selectedNodes.clear();cancelSelection();pan=null;pinching=null;
    el('mapSearchTypes').value='';message('');render();
    if(views[layer]){zoom=views[layer].zoom;camera={...views[layer].camera};sizing();}else fit();
  }
  function updateLayerButtons(){['i','o'].forEach(dir=>{const button=el(dir==='i'?'mapLayerIn':'mapLayerOut');button.classList.toggle('on',dir===layer);button.setAttribute('aria-pressed',String(dir===layer));});}
  el('mapLayerIn').onclick=()=>switchLayer('i');el('mapLayerOut').onclick=()=>switchLayer('o');
  el('mapZoomIn').onclick=()=>setZoom(zoom*1.25);
  el('mapZoomOut').onclick=()=>setZoom(zoom/1.25);
  el('mapZoomReset').onclick=()=>setZoom(1);
  el('mapFit').onclick=fit;
  viewport.addEventListener('wheel',e=>{e.preventDefault();if(e.deltaY!==0)setZoom(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX,e.clientY);},{passive:false});
  viewport.addEventListener('keydown',e=>{
    const step=60;if(e.key==='ArrowLeft')camera.x+=step;else if(e.key==='ArrowRight')camera.x-=step;else if(e.key==='ArrowUp')camera.y+=step;else if(e.key==='ArrowDown')camera.y-=step;else if(e.key==='+'||e.key==='='){setZoom(zoom*1.25);e.preventDefault();return;}else if(e.key==='-'){setZoom(zoom/1.25);e.preventDefault();return;}else return;e.preventDefault();sizing();
  });
  function syncSelection(){board.querySelectorAll('.map-node').forEach(n=>n.classList.toggle('map-selected',selectedNodes.has(n.dataset.key)));}
  function cancelSelection(){if(selectionDrag?.box)selectionDrag.box.remove();selectionDrag=null;}
  function updateSelection(e){
    if(!selectionDrag)return;const r=viewport.getBoundingClientRect(),x0=selectionDrag.x,y0=selectionDrag.y,x1=e.clientX,y1=e.clientY;
    selectionDrag.moved=selectionDrag.moved||Math.hypot(x1-x0,y1-y0)>4;
    const left=Math.min(x0,x1),right=Math.max(x0,x1),top=Math.min(y0,y1),bottom=Math.max(y0,y1);
    Object.assign(selectionDrag.box.style,{left:(left-r.left)+'px',top:(top-r.top)+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
    if(!selectionDrag.moved)return;
    selectedNodes=new Set(selectionDrag.base);
    board.querySelectorAll('.map-node').forEach(node=>{const b=node.getBoundingClientRect();if(b.left<=right&&b.right>=left&&b.top<=bottom&&b.bottom>=top)selectedNodes.add(node.dataset.key);});syncSelection();
  }
  viewport.addEventListener('pointerdown',e=>{
    if(e.button!==0||pinching)return;
    if(e.shiftKey&&!e.target.closest('.map-port,.map-node-remove')){
      e.preventDefault();selected=null;board.querySelectorAll('.map-port[aria-pressed="true"]').forEach(p=>p.setAttribute('aria-pressed','false'));
      const box=document.createElement('div');box.className='map-selection-box';viewport.append(box);
      selectionDrag={id:e.pointerId,x:e.clientX,y:e.clientY,base:new Set(selectedNodes),box,moved:false,target:e.target.closest('.map-node')?.dataset.key};viewport.setPointerCapture(e.pointerId);updateSelection(e);return;
    }
    if(e.target.closest('.map-node,.map-link-hit'))return;
    pan={id:e.pointerId,x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,moved:false};viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove',e=>{if(selectionDrag&&selectionDrag.id===e.pointerId){updateSelection(e);return;}if(!pan||pinching||pan.id!==e.pointerId)return;pan.moved=pan.moved||Math.hypot(e.clientX-pan.x,e.clientY-pan.y)>4;camera={x:pan.cx+e.clientX-pan.x,y:pan.cy+e.clientY-pan.y};sizing();});
  function endPointer(e){
    if(selectionDrag&&selectionDrag.id===e.pointerId){
      const d=selectionDrag;if(e.type==='pointercancel')selectedNodes=d.base;else if(!d.moved&&d.target){selectedNodes=new Set(d.base);if(selectedNodes.has(d.target))selectedNodes.delete(d.target);else selectedNodes.add(d.target);}
      cancelSelection();syncSelection();return;
    }
    if(pan&&pan.id===e.pointerId){if(e.type!=='pointercancel'&&!pan.moved){selectedNodes.clear();syncSelection();}pan=null;}
  }
  viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);
  viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){const [a,b]=e.touches;pan=null;if(selectionDrag){selectedNodes=selectionDrag.base;cancelSelection();syncSelection();}pinching={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom};e.preventDefault();}},{passive:false});
  viewport.addEventListener('touchmove',e=>{if(pinching && e.touches.length===2){const [a,b]=e.touches,dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinching.distance>0)setZoom(pinching.zoom*dist/pinching.distance,(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);e.preventDefault();}},{passive:false});
  viewport.addEventListener('touchend',e=>{if(e.touches.length<2)pinching=null;});viewport.addEventListener('touchcancel',()=>{pinching=null;});
  function add(n,x,y){if(data.nodes.some(a=>nodeKey(a)===nodeKey(n)))return;const count=data.nodes.filter(a=>a.kind===n.kind&&a.dir===layer).length;const p={...n,x:x??(n.kind==='type'?20:430),y:y??(25+count*85)};const next={...data,nodes:[...data.nodes,p]};if(write(next)){data=next;render();}}
  function remove(n){const next={...data,nodes:data.nodes.filter(x=>nodeKey(x)!==nodeKey(n)),links:data.links.filter(l=>n.kind==='type'?!(l.dir===n.dir&&id(l.type)===id(n.value)):!(l.dir===n.dir&&id(l.category)===id(n.value)))};if(write(next)){data=next;selected=null;render();}}
  function connect(a,b){if(!a||!b||a.kind===b.kind||a.dir!==b.dir){message('Scegli una tipologia e una categoria.');return;}const t=a.kind==='type'?a:b,c=a.kind==='category'?a:b;if(data.links.some(l=>l.dir===t.dir&&id(l.type)===id(t.value)&&id(l.category)===id(c.value))){message('Il collegamento esiste già.');return;}const next={...data,links:[...data.links,{dir:t.dir,type:id(t.value),category:id(c.value)}]};if(write(next)){data=next;selected=null;message('Collegamento salvato.');render();}}
  function removeLink(l){const next={...data,links:data.links.filter(x=>!(x.dir===l.dir&&id(x.type)===id(l.type)&&id(x.category)===id(l.category)))};if(write(next)){data=next;render();}}
  function linkCount(n){
    const valid=new Set(data.nodes.filter(resolve).map(nodeKey));
    return data.links.filter(l=>valid.has('type:'+l.dir+':'+id(l.type))&&valid.has('category:'+l.dir+':'+id(l.category))&&(n.kind==='type'?l.dir===n.dir&&id(l.type)===id(n.value):l.dir===n.dir&&id(l.category)===id(n.value))).length;
  }
  function palette(container,items,query){
    container.replaceChildren();items.filter(n=>n.label.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())).forEach(n=>{
      const b=document.createElement('button');b.type='button';b.className='map-palette-item';const label=document.createElement('span');label.className='map-palette-label';label.textContent=n.label;const badge=document.createElement('span');badge.className='map-link-count';badge.textContent=String(linkCount(n));badge.setAttribute('aria-hidden','true');b.append(label,badge);b.setAttribute('aria-label',n.label+', '+badge.textContent+' collegamenti');b.title='Tocca o trascina nel grafo';b.onclick=()=>{add(n);fit();};
      let start=null;
      b.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,id:e.pointerId,scroll:container.scrollTop,moved:false};b.setPointerCapture(e.pointerId);});
      b.addEventListener('pointermove',e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>10)start.moved=true;const bounds=container.getBoundingClientRect();if(e.pointerType==='touch'&&e.clientX>=bounds.left&&e.clientX<=bounds.right&&Math.abs(dy)>Math.abs(dx))container.scrollTop=start.scroll-dy;});
      b.addEventListener('pointercancel',()=>{start=null;});
      b.addEventListener('pointerup',e=>{if(!start)return;const moved=start.moved||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10;start=null;if(moved){b._drag=true;setTimeout(()=>b._drag=false,0);const rect=viewport.getBoundingClientRect();if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){const p=point(e.clientX,e.clientY);add(n,p.x-95,p.y-20);}}});
      b.addEventListener('click',e=>{if(b._drag){e.stopImmediatePropagation();e.preventDefault();}},true);container.append(b);
    });
  }
  function render(){
    updateLayerButtons();
    palette(el('mapTypes'),allTypes(),el('mapSearchTypes').value);palette(el('mapCategories'),allCats(),el('mapSearchCategories').value);board.querySelectorAll('.map-node').forEach(n=>n.remove());svg.replaceChildren();
    const valid=data.nodes.filter(n=>n.dir===layer).filter(resolve),nodeElements=new Map();selectedNodes=new Set([...selectedNodes].filter(k=>valid.some(n=>nodeKey(n)===k)));sizing();svg.setAttribute('viewBox','0 0 1 1');
    function drawLines(preview){svg.replaceChildren();data.links.filter(l=>l.dir===layer).forEach(l=>{const a=valid.find(n=>n.kind==='type'&&n.dir===l.dir&&id(n.value)===id(l.type)),b=valid.find(n=>n.kind==='category'&&n.dir===l.dir&&id(n.value)===id(l.category));if(!a||!b)return;line(Number(a.x)+190,Number(a.y)+36,Number(b.x),Number(b.y)+36,false,l,a,b);});if(preview){const n=preview.node;line(Number(n.x)+(n.kind==='type'?190:0),Number(n.y)+36,preview.x,preview.y,true);}}
    function line(x1,y1,x2,y2,preview,link,a,b){
      const path=document.createElementNS('http://www.w3.org/2000/svg','path'),curve=Math.max(40,Math.abs(x2-x1)*.45),d=`M ${x1} ${y1} C ${x1+(x2>=x1?curve:-curve)} ${y1}, ${x2-(x2>=x1?curve:-curve)} ${y2}, ${x2} ${y2}`;
      path.setAttribute('d',d);path.setAttribute('class','map-link'+(preview?' map-link-preview':''));svg.append(path);
      if(!preview){const hit=document.createElementNS('http://www.w3.org/2000/svg','path');hit.setAttribute('d',d);hit.setAttribute('class','map-link-hit');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label','Elimina collegamento '+resolve(a).label+' e '+resolve(b).label);hit.addEventListener('pointerdown',e=>{if(!e.shiftKey)e.stopPropagation();});const del=e=>{if(e?.shiftKey)return;if(confirm('Eliminare questo collegamento?'))removeLink(link);};hit.addEventListener('click',del);hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();del();}});svg.append(hit);}
    }
    valid.forEach(n=>{const item=resolve(n),box=document.createElement('div');box.className='map-node '+(n.kind==='type'?'map-node-type':'map-node-category');box.style.left=n.x+'px';box.style.top=n.y+'px';box.dataset.key=nodeKey(n);box.classList.toggle('map-selected',selectedNodes.has(nodeKey(n)));nodeElements.set(nodeKey(n),box);
      const label=document.createElement('div');label.className='map-node-label';label.textContent=item.label;label.title='Trascina per spostare';box.append(label);
      const port=document.createElement('button');port.type='button';port.className='map-port';port.setAttribute('aria-pressed',String(!!selected&&nodeKey(selected)===nodeKey(n)));port.setAttribute('aria-label','Collega '+item.label);port.title='Trascina sul punto dell’altra scheda oppure tocca due punti';port.onclick=()=>{if(selected&&nodeKey(selected)!==nodeKey(n))connect(selected,n);else{selected=selected?null:n;message(selected?'Seleziona il punto dell’altro nodo.':'');render();}};
      let ps=null;port.addEventListener('pointerdown',e=>{e.stopPropagation();if(pinching)return;ps={x:e.clientX,y:e.clientY};port.setPointerCapture(e.pointerId);});port.addEventListener('pointermove',e=>{if(!ps||pinching)return;if(Math.hypot(e.clientX-ps.x,e.clientY-ps.y)>8){const p=point(e.clientX,e.clientY);drawLines({node:n,x:p.x,y:p.y});}});port.addEventListener('pointercancel',()=>{ps=null;drawLines();});port.addEventListener('pointerup',e=>{if(!ps)return;const moved=Math.hypot(e.clientX-ps.x,e.clientY-ps.y)>8;ps=null;drawLines();if(moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.map-port');const dest=valid.find(x=>nodeKey(x)===target?.closest('.map-node')?.dataset.key);if(dest)connect(n,dest);else message('Trascina il collegamento sul punto di un’altra scheda.');port._drag=true;setTimeout(()=>port._drag=false,0);}});port.addEventListener('click',e=>{if(port._drag){e.stopImmediatePropagation();e.preventDefault();}},true);
      const del=document.createElement('button');del.type='button';del.className='map-node-remove';del.textContent='×';del.setAttribute('title','Rimuovi nodo');del.setAttribute('aria-label','Rimuovi nodo '+item.label);del.onclick=()=>{if(confirm('Rimuovere il nodo e tutti i suoi collegamenti?'))remove(n);};box.append(port,del);board.append(box);
      let drag=null,frame=null;
      function moveNode(x,y){if(!drag)return;const p=point(x,y),dx=p.x-drag.worldX,dy=p.y-drag.worldY;drag.items.forEach(item=>{item.node.x=item.x+dx;item.node.y=item.y+dy;const target=nodeElements.get(nodeKey(item.node));if(target){target.style.left=item.node.x+'px';target.style.top=item.node.y+'px';}});drawLines();}
      function autoPan(){if(!drag)return;const r=viewport.getBoundingClientRect(),margin=35;
        const speed=(v,min,max)=>v<min+margin?Math.min(20,(min+margin-v)*.3):v>max-margin?-Math.min(20,(v-(max-margin))*.3):0;
        if(drag.moved&&!pinching){const dx=speed(drag.x,r.left,r.right),dy=speed(drag.y,r.top,r.bottom);if(dx||dy){camera.x+=dx;camera.y+=dy;sizing();moveNode(drag.x,drag.y);}}
        frame=requestAnimationFrame(autoPan);
      }
      label.addEventListener('pointerdown',e=>{if(pinching||e.shiftKey||e.button!==0)return;if(!selectedNodes.has(nodeKey(n))){selectedNodes=new Set([nodeKey(n)]);syncSelection();}const p=point(e.clientX,e.clientY),items=valid.filter(item=>selectedNodes.has(nodeKey(item))).map(node=>({node,x:Number(node.x)||0,y:Number(node.y)||0}));drag={worldX:p.x,worldY:p.y,items,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};label.setPointerCapture(e.pointerId);frame=requestAnimationFrame(autoPan);});
      label.addEventListener('pointermove',e=>{if(!drag||pinching)return;drag.x=e.clientX;drag.y=e.clientY;drag.moved=drag.moved||Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>3;moveNode(e.clientX,e.clientY);});
      function stopDrag(save){if(!drag)return;drag=null;if(frame!==null)cancelAnimationFrame(frame);frame=null;if(save){if(!write(data))data=read();}else data=read();render();}
      label.addEventListener('pointercancel',()=>stopDrag(false));label.addEventListener('pointerup',()=>stopDrag(true));
    });
    drawLines();

  }
  el('mapSearchTypes').addEventListener('input',()=>{if(data)palette(el('mapTypes'),allTypes(),el('mapSearchTypes').value);});el('mapSearchCategories').addEventListener('input',()=>{if(data)palette(el('mapCategories'),allCats(),el('mapSearchCategories').value);});
  el('btnMapping').onclick=()=>{if(!key() || state.mappingReady===false){message('Seleziona un account e un anno e ricarica le voci.');return;}data=read();selected=null;layer='i';views={};selectedNodes.clear();cancelSelection();zoom=1;camera={x:0,y:0};el('mapSearchTypes').value='';el('mapSearchCategories').value='';message('');marker=Date.now().toString(36)+Math.random().toString(36).slice(2);history.pushState({...history.state,abaMapping:marker},'');document.querySelector('.wrap').inert=true;screen.classList.remove('hidden');render();fit();screen.focus();};
  // Il Tool usa un endpoint dedicato e crea la categoria nel contesto corrente.
  function categoryReq(){
    const e=state.user,i=state.incarico,u=state.unita;
    if(i){const req={rendicontoid:state.year?.value,codicesocio:e?.userInfo?.codiceSocio,creg:i?.dati?.creg,czona:i?.dati?.czona,ord:i?.dati?.ord,contoid:0,tipoIncaricoMain:e?.userInfo?.tipoIncarico,tipoIncarico:i?.tipoIncarico,accessoTipo:i?.accessoTipo,gruppozona_nome:i?.dati?.nome,codiceUnita:i?.codiceUnita||null,unita_nome:getNomeUnitaByIncarico(i),nomeRegione:i?.dati?.nomeRegione,nomeZona:i?.dati?.nomeZona,nomeGruppo:i.tipoIncarico===1?null:i?.dati?.nomeGruppo,filterByUnita:true};if(u){req.codiceUnita=u.cun+u.prog;req.unita_nome=u.nome;}return req;}
    return {rendicontoid:state.year?.value,codicesocio:e?.userInfo?.codiceSocio,creg:null,czona:0,ord:0,contoid:0};
  }
  const categoryDialog=el('mapCategoryDialog'),categoryName=el('mapCategoryName'),categoryStatus=el('mapCategoryStatus'),categorySave=el('mapCategorySave');
  const normalizeCategory=s=>String(s||'').trim().normalize('NFC').toLocaleLowerCase('it');
  function setCategoryBusy(b){categoryBusy=b;categorySave.disabled=b;el('mapCategoryCancel').disabled=b;el('mapClose').disabled=b;categoryName.disabled=b;}
  el('mapAddCategory').onclick=()=>{
    if(!state.user||!state.year||!state.mappingReady||readOnlyRole()||el('btnBankImport').disabled){message('Il contesto non è abilitato alla modifica.');return;}
    categoryName.value='';categoryStatus.textContent='';setCategoryBusy(false);categoryDialog.showModal();categoryName.focus();
  };
  el('mapCategoryCancel').onclick=()=>{if(!categoryBusy)categoryDialog.close();};
  categoryDialog.addEventListener('cancel',e=>{if(categoryBusy)e.preventDefault();});
  el('mapCategoryForm').addEventListener('submit',async e=>{
    e.preventDefault();if(categoryBusy)return;
    const label=categoryName.value.trim(),normalized=normalizeCategory(label),context=key(),uncertainKey=context+':'+normalized;
    if(!label){categoryStatus.textContent='Inserisci il nome della categoria.';categoryName.focus();return;}
    if(!state.user||!state.year||!state.mappingReady||readOnlyRole()||el('btnBankImport').disabled){categoryStatus.textContent='Il contesto non è abilitato alla modifica.';return;}
    if(uncertainCategories.has(uncertainKey)){categoryStatus.textContent='Esito precedente non confermato. Verifica nel Tool Bilancio se la categoria esiste; se necessario, riapri l’app prima di riprovare.';return;}
    if(state.categorie.some(c=>normalizeCategory(c.label)===normalized)){categoryStatus.textContent='Una categoria con questo nome è già presente.';return;}
    const req=categoryReq(), listReq=buildReq(0);setCategoryBusy(true);categoryStatus.textContent='Creazione nel Tool Bilancio…';let saved=false;
    try{
      const result=await api('/api/vocecassa/saveCategoria',{body:{req,categoria:{label}}});
      if(typeof result==='string' && result.trim()){categoryStatus.textContent='Il Tool Bilancio ha rifiutato la categoria: '+result;return;}
      if(result==null||result===false||result?.success===false||result?.ok===false)throw Error('Esito non confermato');
      saved=true;
      const categories=await postReq('/api/vocecassa/categorie',listReq);
      if(!Array.isArray(categories)||!categories.some(c=>normalizeCategory(c.label)===normalized && Number(c.value)>0))throw Error('Elenco non confermato');
      if(key()!==context)throw Error('Contesto cambiato');
      state.categorie=categories;
      const sel=el('fCat'),previous=sel.value;fillSelect(sel,state.categorie,'— Nessuna —');sel.value=previous;window.refreshManualMapping?.();
      el('mapSearchCategories').value='';render();categoryDialog.close();message('Categoria creata nel Tool Bilancio e aggiunta all’elenco.');
    }catch(err){
      uncertainCategories.add(uncertainKey);
      categoryStatus.textContent=saved?'Categoria inviata, ma non è stato possibile aggiornare l’elenco. Verifica nel Tool Bilancio prima di riprovare.':'Esito non confermato. Verifica nel Tool Bilancio se la categoria esiste prima di riprovare.';
    }finally{setCategoryBusy(false);}
  });
  el('mapExport').onclick=()=>{
    if(!data)return;
    const nodes=data.nodes.map(n=>{
      const source=n.kind==='type'?types(n.dir).find(t=>id(t.value)===id(n.value)):state.categorie.find(c=>id(c.value)===id(n.value));
      return {kind:n.kind,dir:n.dir,value:id(n.value),label:source?.label||n.label||'',available:!!source,x:Number(n.x)||0,y:Number(n.y)||0};
    });
    const links=data.links.map(l=>({dir:l.dir,type:id(l.type),category:id(l.category)}));
    const payload={format:'helper-bilancio-mappatura',version:2,exportedAt:new Date().toISOString(),nodes,links};
    try{
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='mappatura-tipologie.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      message(nodes.some(n=>!n.available)?'Esportazione avviata. Alcuni nodi non sono più disponibili nel contesto: verifica il file prima di condividerlo.':'Esportazione avviata. Il file contiene i nomi e gli identificativi delle voci, non le credenziali.');
    }catch(e){message('Impossibile esportare la mappatura su questo dispositivo.');}
  };
  el('mapClose').onclick=()=>{if(history.state?.abaMapping===marker)history.back();else close();};
  function close(){cancelSelection();selectedNodes.clear();screen.classList.add('hidden');document.querySelector('.wrap').inert=false;window.refreshManualMapping?.();el('btnMapping').focus();}
  window.addEventListener('popstate',()=>{if(!screen.classList.contains('hidden')&&history.state?.abaMapping!==marker){if(categoryBusy){history.pushState({...history.state,abaMapping:marker},'');return;}if(categoryDialog.open)categoryDialog.close();close();}});
  screen.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();el('mapClose').click();}});
})();
/* Sincronizzazione dei selettori dell'operazione manuale. */
(function(){
  const type=document.getElementById('fTipo'),category=document.getElementById('fCat');
  function typeChoices(){const arr=(state.tipo==='i'?state.tipiE:state.tipiU).filter(x=>x.selezionabile!==false);let list=arr.filter(x=>state.voceMode==='scout'?isScout(x):!isScout(x));if(state.voceMode==='scout'){const level=state.incarico?.tipoIncarico===1?'z':'g',match=list.filter(x=>x.gruppoZona===level);if(match.length)list=match;}return list;}
  function fill(sel,items,placeholder,value){fillSelect(sel,items,placeholder);sel.value=value||'';}
  function sync(source){
    const ts=typeChoices(),cs=state.categorie;
    const result=state.voceMode==='scout'?window.TypeMapping.apply(state.tipo,source,type.value,category.value,ts,cs):{type:type.value,category:category.value,allowed:null};
    if(source==='type')fill(category,result.allowed?cs.filter(c=>result.allowed.includes(String(c.value))):cs,'— Nessuna —',result.category);
    else fill(type,result.allowed?ts.filter(t=>result.allowed.includes(String(t.value))):ts,'— Seleziona tipologia —',result.type);
    updatePayloadPreview();
  }
  window.resetManualMapping=()=>{const old=category.value;fill(category,state.categorie,'— Nessuna —',old);};
  window.refreshManualMapping=()=>{const t=type.value,c=category.value;fill(type,typeChoices(),'— Seleziona tipologia —',t);fill(category,state.categorie,'— Nessuna —',c);if(t)sync('type');else if(c)sync('category');};
  type.addEventListener('change',()=>sync('type'));category.addEventListener('change',()=>sync('category'));
})();
