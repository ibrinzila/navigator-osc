import { applyI18n } from './i18n.js';
import { parseUrlState, writeUrlState, store, downloadText, copyToClipboard } from './state.js';
import { INTENTS, GOALS, ORGS, TIMES, ORG_TYPES, buildSuggestions, searchOpportunities, makeGuidedAnswer, normalize } from './search.js';

let data;
let state=parseUrlState();
let profile=store.get('profile',{type:'',experience:'beginner',priority:'funding'});
let watch=store.get('watch',[]);
let verifiedSources=store.get('verifiedSources',{});
let checklistState=store.get('checklist',{});
let lastFocused=null;

const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const field=(o,k)=>o?.[k]??'';

init().catch(err=>{
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',`<div class="shell empty-state" style="margin-top:90px">Nu am putut încărca datele instrumentului. Verifică fișierul assets/data/navigator-data.json.</div>`);
});

async function init(){
  const res=await fetch('assets/data/navigator-data.json',{cache:'no-store'});
  data=await res.json();
  hydrateMeta();
  applyI18n(state.lang||'ro');
  setupStaticControls();
  renderEverything();
  bindEvents();
  updateUrl();
}

function hydrateMeta(){
  $('#stat-opps').textContent=data.opportunities.length;
  $('#stat-calendar').textContent=data.calendar.length;
  const updated=formatDate(data.meta.lastProductUpdate||data.meta.generatedAt);
  $('#product-updated').textContent=`Actualizat: ${updated}`;
  $('#trust-updated').textContent=updated;
}
function formatDate(iso){
  if(!iso) return '—';
  const [y,m,d]=String(iso).split('-');
  return d&&m&&y?`${d}.${m}.${y}`:iso;
}

function setupStaticControls(){
  $('#language-select').value=state.lang||'ro';
  fillSelect($('#filter-area'), unique(data.opportunities.map(o=>o['Arie'])));
  fillSelect($('#filter-relevance'), unique(data.opportunities.map(o=>o['Relevanță'])));
  fillSelect($('#filter-effort'), unique(data.opportunities.map(o=>o['Efort'])));
  fillSelect($('#profile-type'), ORG_TYPES.map(o=>o.label), ORG_TYPES.map(o=>o.id));
  $('#global-search').value=state.q;
  $('#filter-area').value=state.area;
  $('#filter-relevance').value=state.relevance;
  $('#filter-effort').value=state.effort;
  $('#sort-by').value=state.sort||'priority';
  $('#profile-type').value=profile.type||'';
  $('#profile-experience').value=profile.experience||'beginner';
  $('#profile-priority').value=profile.priority||'funding';
  renderChoiceGroup($('#goal-choices'),GOALS,'goal',state.goal);
  renderChoiceGroup($('#org-choices'),ORGS,'org',state.org);
  renderChoiceGroup($('#time-choices'),TIMES,'time',state.time);
}
function unique(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ro'))}
function fillSelect(select, labels, values=labels){
  labels.forEach((label,i)=>{const opt=document.createElement('option');opt.value=values[i];opt.textContent=label;select.appendChild(opt)});
}
function renderChoiceGroup(root,items,name,current){
  root.innerHTML=items.map(item=>`<label class="choice"><input type="radio" name="${name}" value="${esc(item.id)}" ${current===item.id?'checked':''}><span>${esc(item.label)}</span></label>`).join('');
}

function bindEvents(){
  $('#language-select').addEventListener('change',e=>{state.lang=e.target.value;store.set('lang',state.lang);applyI18n(state.lang);updateUrl();toast('Limba interfeței a fost schimbată.');});
  $('#route-form').addEventListener('submit',e=>{e.preventDefault();state.goal=radioValue('goal');state.org=radioValue('org');state.time=radioValue('time');state.q=routeQueryFromState();$('#global-search').value=state.q;renderEverything();updateUrl(false);location.hash='mecanisme';});
  $('#reset-route').addEventListener('click',()=>{state.goal='';state.org='';state.time='';$$('#route-form input[type="radio"]').forEach(i=>i.checked=false);renderEverything();updateUrl(false)});
  $('#run-search').addEventListener('click',()=>runSearchFromInput());
  $('#global-search').addEventListener('input',e=>{state.q=e.target.value;renderSuggestions(e.target.value);renderResultsOnly();updateUrl();});
  $('#global-search').addEventListener('keydown',e=>handleSuggestionKeys(e));
  $('#global-search').addEventListener('focus',()=>renderSuggestions($('#global-search').value));
  document.addEventListener('click',e=>{if(!e.target.closest('.search-box')) closeSuggestions()});
  ['filter-area','filter-relevance','filter-effort','sort-by'].forEach(id=>{$('#'+id).addEventListener('change',()=>{syncFilters();renderResultsOnly();updateUrl();})});
  $('#clear-filters').addEventListener('click',()=>{Object.assign(state,{q:'',area:'',relevance:'',effort:'',sort:'priority'});$('#global-search').value='';$('#filter-area').value='';$('#filter-relevance').value='';$('#filter-effort').value='';$('#sort-by').value='priority';renderEverything();updateUrl(false)});
  $('#copy-state').addEventListener('click',async()=>{updateUrl();await copyToClipboard(location.href);toast('Link copiat. Include filtrele și ruta curentă.');});
  $('#export-csv').addEventListener('click',exportCsv);
  $('#open-compare').addEventListener('click',openCompare);
  $('#profile-form').addEventListener('submit',e=>{e.preventDefault();profile={type:$('#profile-type').value,experience:$('#profile-experience').value,priority:$('#profile-priority').value};store.set('profile',profile);renderEverything();toast('Profil salvat local.');});
  $('#download-watch-ics').addEventListener('click',downloadWatchIcs);
  $('#export-checklist').addEventListener('click',exportChecklist);
  $('#open-command').addEventListener('click',openCommand);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()} if(e.key==='/' && !isTypingTarget(e.target)){e.preventDefault();$('#global-search').focus();}});
  $('#command-input').addEventListener('input',renderCommandResults);
  $$('.app-dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog) closeDialog(dialog)}));
  $$('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>closeDialog(btn.closest('dialog'))));
}
function isTypingTarget(el){return ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName) || el?.isContentEditable}
function radioValue(name){return $(`input[name="${name}"]:checked`)?.value||''}
function routeQueryFromState(){return [state.goal,state.org,state.time].filter(Boolean).map(v=>({grant:'grant proiect',sustainability:'venit stabil',contract:'contract cu statul',service:'prestator servicii',socialbiz:'antreprenoriat social',beginner:'first time applicant',local:'local rural apl',youth:'tineret',social:'servicii sociale',culture:'cultura',diaspora:'diaspora',experienced:'grant writer',now:'rapid termen',annual:'anual calendar',strategic:'strategic 3 ani'}[v]||v)).join(' ')}
function syncFilters(){state.area=$('#filter-area').value;state.relevance=$('#filter-relevance').value;state.effort=$('#filter-effort').value;state.sort=$('#sort-by').value;state.q=$('#global-search').value;}
function updateUrl(replace=true){writeUrlState(state,replace)}
function runSearchFromInput(){state.q=$('#global-search').value;renderEverything();updateUrl(false);closeSuggestions();$('#mecanisme').scrollIntoView({behavior:'smooth'});}

function renderEverything(){
  renderIntents();
  renderResultsOnly();
  renderTimeline();
  renderCpv();
  renderChecklist();
  renderSources();
  renderWatchList();
  renderSourceMonitor();
}
function renderResultsOnly(){
  syncFilters();
  const rows=searchOpportunities(data.opportunities,state,profile);
  $('#result-count').textContent=rows.length;
  renderChips();
  renderCards(rows);
  renderGuidedAnswer(rows);
  $('#open-compare').disabled=!state.compare?.length;
}

function renderIntents(){
  $('#intent-cards').innerHTML=INTENTS.map(item=>`<button type="button" class="intent-card" data-intent="${item.id}"><span class="icon" aria-hidden="true">${item.icon}</span><h3>${esc(item.title)}</h3><p>${esc(item.desc)}</p><span class="tag">${esc(item.area)}</span></button>`).join('');
  $$('#intent-cards .intent-card').forEach(btn=>btn.addEventListener('click',()=>{
    const item=INTENTS.find(i=>i.id===btn.dataset.intent);
    state.goal=item.goal; state.area=item.area==='Servicii sociale'?'':item.area; state.q=item.query; state.sort='priority';
    $('#global-search').value=state.q; $('#filter-area').value=state.area; $('#sort-by').value='priority';
    renderChoiceGroup($('#goal-choices'),GOALS,'goal',state.goal);
    renderResultsOnly(); updateUrl(false); $('#ruta').scrollIntoView({behavior:'smooth'});
  }));
}
function renderChips(){
  const items=[];
  if(state.q) items.push(['q',`Căutare: ${state.q}`]);
  if(state.area) items.push(['area',`Arie: ${state.area}`]);
  if(state.relevance) items.push(['relevance',`Relevanță: ${state.relevance}`]);
  if(state.effort) items.push(['effort',`Efort: ${state.effort}`]);
  if(state.goal) items.push(['goal',`Scop: ${state.goal}`]);
  $('#active-chips').innerHTML=items.map(([k,label])=>`<span class="chip">${esc(label)} <button type="button" data-chip="${k}" aria-label="Elimină ${esc(label)}">×</button></span>`).join('');
  $$('#active-chips button').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.chip;state[k]=''; if(k==='q') $('#global-search').value=''; if(k==='area') $('#filter-area').value=''; if(k==='relevance') $('#filter-relevance').value=''; if(k==='effort') $('#filter-effort').value=''; renderEverything();updateUrl(false)}));
}
function renderCards(rows){
  const root=$('#cards');
  if(!rows.length){root.innerHTML='<div class="empty-state">Nu există rezultate. Curăță filtrele sau caută un termen mai general.</div>';return}
  root.innerHTML=rows.map(({o,index},pos)=>cardHtml(o,index,pos<3)).join('');
  $$('#cards [data-detail]').forEach(btn=>btn.addEventListener('click',()=>openDetail(Number(btn.dataset.detail))));
  $$('#cards [data-compare]').forEach(btn=>btn.addEventListener('click',()=>toggleCompare(Number(btn.dataset.compare))));
  $$('#cards [data-watch]').forEach(btn=>btn.addEventListener('click',()=>toggleWatch(Number(btn.dataset.watch))));
  $$('#cards [data-verified]').forEach(btn=>btn.addEventListener('click',()=>markVerified(btn.dataset.verified)));
}
function cardHtml(o,index,highlight){
  const title=field(o,'Mecanism / oportunitate');
  const area=field(o,'Arie');
  const watched=watch.includes(index);
  const compared=state.compare?.includes(index);
  const urlLinks=sourceLinks(field(o,'URL oficial / sursă'));
  return `<article class="mechanism-card ${highlight?'highlight':''}">
    <div class="card-top"><div><div class="card-meta"><span class="tag">${esc(area)}</span><span class="tag green">${esc(field(o,'Relevanță'))}</span><span class="tag yellow">Efort: ${esc(field(o,'Efort'))}</span></div><h3 class="card-title">${esc(title)}</h3></div><span class="pill">#${esc(field(o,'Nr.'))}</span></div>
    <p class="card-body">${esc(truncate(field(o,'Ce permite'),190))}</p>
    <p class="muted"><strong>Următorul pas:</strong> ${esc(truncate(field(o,'Acțiune imediată'),155))}</p>
    <div class="source-links">${urlLinks || `<span class="tag">${esc(field(o,'Ghid pagini'))}</span>`}</div>
    <div class="card-actions">
      <button type="button" class="mini-button" data-detail="${index}">Detalii</button>
      <button type="button" class="mini-button" data-compare="${index}">${compared?'Scoate din comparație':'Compară'}</button>
      <button type="button" class="mini-button" data-watch="${index}">${watched?'Urmărit':'Urmărește'}</button>
      ${urlLinks?`<button type="button" class="mini-button" data-verified="${esc(firstUrl(field(o,'URL oficial / sursă')))}">Marchează verificat</button>`:''}
    </div>
  </article>`;
}
function truncate(v,n){v=String(v??'');return v.length>n?v.slice(0,n-1)+'…':v}
function sourceLinks(value){
  const urls=parseUrls(value);
  return urls.slice(0,3).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">Sursă ${i+1}</a>`).join('');
}
function parseUrls(value){return String(value||'').split(/[\s;]+/).map(x=>x.trim().replace(/[.,)]+$/,'' )).filter(x=>/^https?:\/\//i.test(x))}
function firstUrl(value){return parseUrls(value)[0]||''}

function renderGuidedAnswer(rows){
  const a=makeGuidedAnswer(rows,state);
  $('#guided-answer').innerHTML=`<div class="answer-box"><h4>Cea mai bună rută</h4><p>${esc(a.route)}</p></div><div class="answer-box"><h4>De ce</h4><p>${esc(a.why)}</p></div><div class="answer-box"><h4>Ce faci mai departe</h4><ul>${a.next.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></div>${a.top.length?`<div class="route-list">${a.top.map((o)=>`<div class="mini-route"><strong>${esc(field(o,'Mecanism / oportunitate'))}</strong><p>${esc(field(o,'Ghid pagini'))}</p>${sourceLinks(field(o,'URL oficial / sursă'))}</div>`).join('')}</div>`:''}`;
}

function renderSuggestions(query){
  const suggestions=buildSuggestions(data,query);
  const root=$('#suggestions-list');
  if(!suggestions.length){closeSuggestions();return}
  root.innerHTML=suggestions.map((s,i)=>`<button type="button" role="option" class="suggestion" data-suggestion="${esc(s.value)}" id="suggestion-${i}"><span class="suggestion-icon" aria-hidden="true">${esc(s.icon)}</span><span><strong>${esc(s.label)}</strong><small>${esc(s.detail||'')}</small></span><span class="kind">${esc(s.kind)}</span></button>`).join('');
  root.classList.add('open');
  $('#global-search').setAttribute('aria-expanded','true');
  $$('.suggestion',root).forEach(btn=>btn.addEventListener('click',()=>{state.q=btn.dataset.suggestion;$('#global-search').value=state.q;renderEverything();updateUrl(false);closeSuggestions();$('#mecanisme').scrollIntoView({behavior:'smooth'});}));
}
function closeSuggestions(){const root=$('#suggestions-list');root.classList.remove('open');root.innerHTML='';$('#global-search')?.setAttribute('aria-expanded','false')}
function handleSuggestionKeys(e){
  const items=$$('.suggestion'); if(!items.length) return;
  const active=$('.suggestion.active'); let idx=items.indexOf(active);
  if(e.key==='ArrowDown'){e.preventDefault(); idx=(idx+1)%items.length; setActive(items,idx)}
  if(e.key==='ArrowUp'){e.preventDefault(); idx=(idx-1+items.length)%items.length; setActive(items,idx)}
  if(e.key==='Enter' && active){e.preventDefault(); active.click()}
  if(e.key==='Escape') closeSuggestions();
}
function setActive(items,idx){items.forEach(x=>x.classList.remove('active'));items[idx].classList.add('active');items[idx].scrollIntoView({block:'nearest'});}

function openDetail(index){
  const o=data.opportunities[index];
  const rows=[['Ce permite',field(o,'Ce permite')],['Eligibilitate / condiții-cheie',field(o,'Eligibilitate / condiții-cheie')],['Termen / frecvență',field(o,'Termen / frecvență')],['Documente / pași principali',field(o,'Documente / pași principali')],['Acțiune imediată',field(o,'Acțiune imediată')],['Atenție / risc',field(o,'Atenție / risc')],['Pagini în ghid',field(o,'Ghid pagini')],['Sursă oficială',field(o,'URL oficial / sursă')]];
  $('#detail-content').innerHTML=`<div class="detail-layout"><div class="card-meta"><span class="tag">${esc(field(o,'Arie'))}</span><span class="tag green">${esc(field(o,'Relevanță'))}</span><span class="tag yellow">Efort: ${esc(field(o,'Efort'))}</span></div><h2 id="detail-title">${esc(field(o,'Mecanism / oportunitate'))}</h2><p class="muted"><strong>Autoritate/platformă:</strong> ${esc(field(o,'Autoritate / platformă'))}</p><dl class="detail-grid">${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${k==='Sursă oficială'?sourceLinks(v)||esc(v):esc(v)}</dd>`).join('')}</dl><div class="card-actions"><button type="button" class="button secondary small" data-compare="${index}">Compară</button><button type="button" class="button secondary small" data-watch="${index}">Urmărește</button>${firstUrl(field(o,'URL oficial / sursă'))?`<a class="button primary small" href="${esc(firstUrl(field(o,'URL oficial / sursă')))}" target="_blank" rel="noopener">Verifică live</a>`:''}</div></div>`;
  $('#detail-content [data-compare]')?.addEventListener('click',()=>{toggleCompare(index);toast('Comparația a fost actualizată.')});
  $('#detail-content [data-watch]')?.addEventListener('click',()=>{toggleWatch(index);toast('Urmărirea a fost actualizată.')});
  openDialog($('#detail-dialog'));
}
function toggleCompare(index){
  state.compare=state.compare||[];
  if(state.compare.includes(index)) state.compare=state.compare.filter(i=>i!==index);
  else state.compare=[...state.compare,index].slice(-4);
  renderResultsOnly();updateUrl();
}
function toggleWatch(index){
  if(watch.includes(index)) watch=watch.filter(i=>i!==index); else watch=[...watch,index];
  store.set('watch',watch);renderWatchList();renderResultsOnly();
}
function openCompare(){
  const rows=(state.compare||[]).map(i=>data.opportunities[i]).filter(Boolean);
  if(!rows.length)return;
  const fields=['Arie','Relevanță','Efort','Termen / frecvență','Acțiune imediată','Atenție / risc','Ghid pagini','URL oficial / sursă'];
  $('#compare-content').innerHTML=`<table class="compare-table"><thead><tr><th>Criteriu</th>${rows.map(o=>`<th>${esc(field(o,'Mecanism / oportunitate'))}</th>`).join('')}</tr></thead><tbody>${fields.map(f=>`<tr><th>${esc(f)}</th>${rows.map(o=>`<td>${f.includes('URL')?sourceLinks(field(o,f))||esc(field(o,f)):esc(field(o,f))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  openDialog($('#compare-dialog'));
}

function renderWatchList(){
  const root=$('#watch-list');
  if(!watch.length){root.innerHTML='<div class="empty-state">Nu urmărești încă niciun mecanism.</div>';return}
  root.innerHTML=watch.map(i=>{const o=data.opportunities[i];return `<div class="watch-item"><strong>${esc(field(o,'Mecanism / oportunitate'))}</strong><small>${esc(field(o,'Termen / frecvență'))}</small><div class="card-actions"><button type="button" class="mini-button" data-detail="${i}">Detalii</button><button type="button" class="mini-button" data-unwatch="${i}">Scoate</button></div></div>`}).join('');
  $$('#watch-list [data-detail]').forEach(b=>b.addEventListener('click',()=>openDetail(Number(b.dataset.detail))));
  $$('#watch-list [data-unwatch]').forEach(b=>b.addEventListener('click',()=>toggleWatch(Number(b.dataset.unwatch))));
}
function downloadWatchIcs(){
  const now=new Date(); const year=now.getFullYear();
  const events=watch.map(i=>{const o=data.opportunities[i];const d=guessDate(field(o,'Termen / frecvență'),year);return `BEGIN:VEVENT\nUID:navigator-osc-${i}@local\nDTSTAMP:${icsDate(now)}\nDTSTART;VALUE=DATE:${d}\nSUMMARY:${escapeIcs(field(o,'Mecanism / oportunitate'))}\nDESCRIPTION:${escapeIcs(field(o,'Acțiune imediată')+' | '+field(o,'URL oficial / sursă'))}\nEND:VEVENT`}).join('\n');
  downloadText('mecanisme-urmarite.ics',`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Navigator OSC//RO\n${events}\nEND:VCALENDAR`,'text/calendar;charset=utf-8');
}
function guessDate(text,year){const n=normalize(text);let m='01',d='15';if(n.includes('30 aprilie')){m='04';d='30'}else if(n.includes('30 septembrie')){m='09';d='30'}else if(n.includes('31 august')){m='08';d='31'}else if(n.includes('25 martie')){m='03';d='25'}else if(n.includes('31 decembrie')){m='12';d='31'}else if(n.includes('iunie')){m='06';d='15'}else if(n.includes('martie')){m='03';d='15'}return `${year}${m}${d}`}
function icsDate(date){return date.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z'}
function escapeIcs(v){return String(v||'').replace(/([,;\\])/g,'\\$1').replace(/\n/g,'\\n')}

function renderSourceMonitor(){
  const urls=[];data.opportunities.forEach(o=>parseUrls(field(o,'URL oficial / sursă')).forEach(u=>urls.push({url:u,title:field(o,'Mecanism / oportunitate')})));
  const dedup=[];const seen=new Set();urls.forEach(x=>{const host=new URL(x.url).host;if(!seen.has(host)){seen.add(host);dedup.push({...x,host})}});
  $('#source-monitor').innerHTML=dedup.slice(0,7).map(x=>`<div class="source-item"><strong>${esc(x.host)}</strong><small>${verifiedSources[x.url]?`Verificat: ${verifiedSources[x.url]}`:'Neverificat în această sesiune'}</small><div class="card-actions"><a class="mini-button" href="${esc(x.url)}" target="_blank" rel="noopener">Deschide</a><button type="button" class="mini-button" data-verified="${esc(x.url)}">Marchează verificat azi</button></div></div>`).join('');
  $$('#source-monitor [data-verified]').forEach(b=>b.addEventListener('click',()=>markVerified(b.dataset.verified)));
}
function markVerified(url){if(!url)return;verifiedSources[url]=new Date().toISOString().slice(0,10);store.set('verifiedSources',verifiedSources);renderSourceMonitor();toast('Sursa a fost marcată ca verificată azi.');}

function renderTimeline(){
  $('#timeline').innerHTML=data.calendar.map(c=>`<article class="timeline-item"><div class="timeline-date">${esc(c['Perioadă / dată-limită'])}</div><div><h3>${esc(c['Mecanism'])}</h3><p>${esc(c['Acțiune'])}</p><p class="muted">${esc(c['Note / sursă ghid']||'')}</p></div><button type="button" class="mini-button" data-calendar-search="${esc(c['Mecanism'])}">Caută</button></article>`).join('');
  $$('#timeline [data-calendar-search]').forEach(b=>b.addEventListener('click',()=>{state.q=b.dataset.calendarSearch;$('#global-search').value=state.q;renderEverything();updateUrl(false);$('#mecanisme').scrollIntoView({behavior:'smooth'});}));
}
function renderCpv(){
  $('#cpv-list').innerHTML=data.cpv.map(c=>{const code=field(c,'Cod / familie CPV');return `<article class="cpv-item"><h3>${esc(code)}</h3><p><strong>${esc(field(c,'Denumire / exemplu'))}</strong></p><p>${esc(field(c,'Cum se folosește'))}</p><p class="muted">Potențial: ${esc(field(c,'Potențial'))}</p><div class="card-actions"><button type="button" class="mini-button" data-cpv-search="${esc(code)}">Caută în navigator</button><a class="mini-button" href="https://mtender.gov.md/" target="_blank" rel="noopener">MTender</a><a class="mini-button" href="https://tender.gov.md/ro/cpv-ro" target="_blank" rel="noopener">CPV oficial</a></div></article>`}).join('');
  $$('#cpv-list [data-cpv-search]').forEach(b=>b.addEventListener('click',()=>{state.q=b.dataset.cpvSearch;$('#global-search').value=state.q;renderEverything();updateUrl(false);$('#mecanisme').scrollIntoView({behavior:'smooth'});}));
}
function renderChecklist(){
  $('#checklist-list').innerHTML=data.checklist.map((c,i)=>`<label class="check-item"><input type="checkbox" data-check="${i}" ${checklistState[i]?'checked':''} aria-label="Marchează pregătit: ${esc(field(c,'Document / cerință'))}"><span><strong>${esc(field(c,'Document / cerință'))}</strong><small>${esc(field(c,'Pachet'))} · ${esc(field(c,'Când se folosește'))}</small><small>${esc(field(c,'Note')||'')}</small></span></label>`).join('');
  $$('#checklist-list [data-check]').forEach(input=>input.addEventListener('change',()=>{checklistState[input.dataset.check]=input.checked;store.set('checklist',checklistState)}));
}
function exportChecklist(){
  const lines=['Pachet;Document;Când se folosește;Pregătit;Note',...data.checklist.map((c,i)=>[field(c,'Pachet'),field(c,'Document / cerință'),field(c,'Când se folosește'),checklistState[i]?'Da':'Nu',field(c,'Note')].map(csv).join(';'))];
  downloadText('checklist-dosar-osc.csv',lines.join('\n'),'text/csv;charset=utf-8');
}
function renderSources(){
  $('#sources-list').innerHTML=data.sources.map(s=>`<div class="source-row"><strong>${esc(field(s,'Secțiune'))}</strong><span>${esc(field(s,'Pagini în ghid'))}</span><span>${esc(field(s,'Ce am folosit'))}</span>${sourceLinks(field(s,'URL / sursă oficială din ghid'))}</div>`).join('');
}

function exportCsv(){
  const rows=searchOpportunities(data.opportunities,state,profile).map(r=>r.o);
  const headers=['Nr.','Arie','Mecanism / oportunitate','Autoritate / platformă','Ce permite','Eligibilitate / condiții-cheie','Termen / frecvență','Documente / pași principali','Efort','Relevanță','Scor prioritate','Acțiune imediată','Atenție / risc','Ghid pagini','URL oficial / sursă'];
  const csvText=[headers.join(';'),...rows.map(o=>headers.map(h=>csv(field(o,h))).join(';'))].join('\n');
  downloadText('navigator-osc-mecanisme-filtrate.csv',csvText,'text/csv;charset=utf-8');
}
function csv(v){v=String(v??'');return /[;"\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}

function openCommand(){openDialog($('#command-dialog'));$('#command-input').value=state.q||'';renderCommandResults();setTimeout(()=>$('#command-input').focus(),20)}
function renderCommandResults(){
  const q=$('#command-input').value;
  const rows=searchOpportunities(data.opportunities,{...state,q},profile).slice(0,9);
  $('#command-results').innerHTML=rows.map(({o,index})=>`<button type="button" class="command-result" data-command="${index}"><strong>${esc(field(o,'Mecanism / oportunitate'))}</strong><br><small>${esc(field(o,'Arie'))} · ${esc(field(o,'Autoritate / platformă'))}</small></button>`).join('');
  $$('#command-results [data-command]').forEach(b=>b.addEventListener('click',()=>{closeDialog($('#command-dialog'));openDetail(Number(b.dataset.command));}));
}

function openDialog(dialog){
  lastFocused=document.activeElement;
  dialog.showModal();
  dialog.addEventListener('keydown',trapFocus);
  const focusable=getFocusable(dialog);
  setTimeout(()=>focusable[0]?.focus(),20);
}
function closeDialog(dialog){
  if(!dialog?.open)return;
  dialog.removeEventListener('keydown',trapFocus);
  dialog.close();
  lastFocused?.focus?.();
}
function getFocusable(root){return $$('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',root).filter(el=>!el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))}
function trapFocus(e){
  if(e.key==='Escape'){e.preventDefault();closeDialog(e.currentTarget);return}
  if(e.key!=='Tab')return;
  const items=getFocusable(e.currentTarget); if(!items.length)return;
  const first=items[0], last=items[items.length-1];
  if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus()}
}

function toast(message){
  const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2600);
}
