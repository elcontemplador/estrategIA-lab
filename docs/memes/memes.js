'use strict';
(() => {
  const dataNode = document.getElementById('archive-data');
  const safeStore = { get(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } }, set(key,value) { try { sessionStorage.setItem(key,JSON.stringify(value)); } catch {} } };
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (dataNode) {
    const data=JSON.parse(dataNode.textContent), form=document.getElementById('archive-filters'), grid=document.getElementById('gallery');
    const cards=new Map([...grid.querySelectorAll('.meme-card')].map(card=>[card.dataset.id,card]));
    const search=document.getElementById('query'), theme=document.getElementById('theme'), year=document.getElementById('year'), order=document.getElementById('order');
    const more=document.getElementById('load-more'), status=document.getElementById('result-count'), progress=document.getElementById('load-progress');
    const reset=document.getElementById('reset'), empty=document.getElementById('empty');
    const filterToggle=document.getElementById('filter-toggle'),extra=document.getElementById('filters-extra');
    filterToggle.hidden=false;
    filterToggle.addEventListener('click',()=>{const open=filterToggle.getAttribute('aria-expanded')!=='true';filterToggle.setAttribute('aria-expanded',String(open));extra.classList.toggle('is-open',open);});
    const haystacks=new Map(data.map(item=>[item.id,normalize([item.title,item.context,item.transcript,item.issueTitle,...item.tags].join(' '))]));
    let limit=18, filtered=[], timer;
    function readURL(){ const params=new URLSearchParams(location.search);search.value=params.get('q')||'';theme.value=params.get('tema')||'';if(theme.selectedIndex<0)theme.value='';year.value=params.get('ano')||'';if(year.selectedIndex<0)year.value='';order.value=params.get('orden')==='antiguos'?'antiguos':'recientes';limit=Math.max(18,Math.min(data.length,Number(params.get('n'))||18)); }
    function updateURL(){const params=new URLSearchParams();if(search.value.trim())params.set('q',search.value.trim());if(theme.value)params.set('tema',theme.value);if(year.value)params.set('ano',year.value);if(order.value==='antiguos')params.set('orden','antiguos');if(limit>18)params.set('n',limit);const url=location.pathname+(params.size?'?'+params:'');history.replaceState(null,'',url);}
    function render(writeURL=true){
      const query=normalize(search.value.trim()), issueMatch=query.match(/^(?:estrategia\s*)?#?\s*(\d{1,3})$/), terms=query.split(/\s+/).filter(Boolean);
      filtered=data.filter(item=>(!theme.value||item.tags.includes(theme.value))&&(!year.value||item.date.startsWith(year.value))&&(!query||(issueMatch?item.issue===Number(issueMatch[1]):terms.every(term=>haystacks.get(item.id).includes(term))))).sort((a,b)=>order.value==='antiguos'?a.issue-b.issue||a.order-b.order:b.issue-a.issue||a.order-b.order);
      const shown=filtered.slice(0,limit), visible=new Set(shown.map(x=>x.id));
      for(const [id,card] of cards)card.hidden=!visible.has(id);
      for(const item of shown)grid.append(cards.get(item.id));
      const active=Boolean(query||theme.value||year.value);
      const activeCount=Number(Boolean(theme.value))+Number(Boolean(year.value))+Number(order.value==='antiguos');
      filterToggle.textContent='Filtros y orden'+(activeCount?' ('+activeCount+')':'');
      status.textContent=filtered.length===1?'1 meme'+(active?' encontrado':''):filtered.length+' memes'+(active?' encontrados':'');
      progress.textContent=filtered.length?`Estás viendo ${shown.length} de ${filtered.length} memes.`:'';
      more.hidden=shown.length>=filtered.length;empty.hidden=filtered.length>0;reset.hidden=!active&&order.value==='recientes';
      if(writeURL)updateURL();
      safeStore.set('estrategia-memes-selection',{ids:filtered.map(x=>x.id),url:location.pathname+location.search,at:Date.now()});
    }
    form.hidden=false;document.getElementById('load-area').hidden=false;
    readURL();render(false);
    form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);limit=18;render();});
    search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{limit=18;render();},140);});
    [theme,year,order].forEach(control=>control.addEventListener('change',()=>{clearTimeout(timer);limit=18;render();}));
    function clear(){clearTimeout(timer);search.value='';theme.value='';year.value='';order.value='recientes';limit=18;render();search.focus();}
    reset.addEventListener('click',clear);document.getElementById('clear-empty').addEventListener('click',clear);
    more.addEventListener('click',()=>{const firstNew=filtered[limit];limit+=18;render();if(firstNew)cards.get(firstNew.id).querySelector('a').focus({preventScroll:true});});
    grid.addEventListener('click',event=>{const card=event.target.closest('.meme-card');if(card)safeStore.set('estrategia-memes-position',{id:card.dataset.id,scroll:scrollY,url:location.pathname+location.search});});
    addEventListener('popstate',()=>{readURL();render(false);});
    if(location.hash.startsWith('#meme-')){const card=document.getElementById(location.hash.slice(1));if(card){const index=filtered.findIndex(x=>'meme-'+x.id===card.id);if(index>=limit){limit=Math.ceil((index+1)/18)*18;render(false);}requestAnimationFrame(()=>card.scrollIntoView({behavior:'instant',block:'start'}));}}
  }
  const detail=document.querySelector('[data-meme-id]');
  if(detail){
    const id=detail.dataset.memeId, root=new URL('../',location.href), selection=safeStore.get('estrategia-memes-selection');
    if(selection&&Date.now()-selection.at<86400000&&Array.isArray(selection.ids)&&selection.ids.includes(id)){
      let back;try{back=new URL(selection.url,location.origin);}catch{}
      if(back&&back.origin===location.origin&&back.pathname===root.pathname){document.querySelector('[data-back]').href=back.pathname+back.search+'#meme-'+id;}
      const index=selection.ids.indexOf(id);
      for(const [key,delta,label] of [['previous',-1,'Anterior de tu selección'],['next',1,'Siguiente de tu selección']]){
        const node=document.querySelector('[data-'+key+']'), target=selection.ids[index+delta];
        if(target&&/^\d{3}-\d{2}$/.test(target)){node.hidden=false;node.href=new URL(target+'/',root).href;node.textContent=delta<0?'← '+label:label+' →';}else node.hidden=true;
      }
      document.querySelector('.piece-navigation').hidden=[...document.querySelectorAll('.piece-navigation a')].every(a=>a.hidden);
    }
    const dialog=document.getElementById('lightbox'), trigger=document.getElementById('enlarge'), close=document.getElementById('close-lightbox');
    if(dialog&&typeof dialog.showModal==='function'){
      trigger.addEventListener('click',event=>{event.preventDefault();dialog.showModal();document.body.style.overflow='hidden';close.focus();});
      close.addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{document.body.style.overflow='';trigger.focus({preventScroll:true});});
      dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    }
    const copy=document.getElementById('copy-link');copy.hidden=false;
    copy.addEventListener('click',async()=>{const status=document.getElementById('copy-status'), input=document.getElementById('share-fallback');const url=new URL(location.href);url.search='';url.hash='';try{await navigator.clipboard.writeText(url.href);status.textContent='Enlace copiado.';input.hidden=true;}catch{input.value=url.href;input.hidden=false;input.focus();input.select();status.textContent='Selecciona y copia este enlace.';}});
  }
})();
