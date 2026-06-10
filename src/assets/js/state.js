const PREFIX='navigatorOscV2:';
export const store={
  get(key, fallback=null){try{const v=localStorage.getItem(PREFIX+key);return v?JSON.parse(v):fallback}catch{return fallback}},
  set(key, value){try{localStorage.setItem(PREFIX+key, JSON.stringify(value))}catch{}},
  remove(key){try{localStorage.removeItem(PREFIX+key)}catch{}}
};

export function parseUrlState(){
  const p=new URLSearchParams(location.search);
  return {
    q:p.get('q')||'',
    area:p.get('area')||'',
    relevance:p.get('rel')||'',
    effort:p.get('effort')||'',
    sort:p.get('sort')||'priority',
    lang:p.get('lang')||store.get('lang','ro'),
    goal:p.get('goal')||'',
    org:p.get('org')||'',
    time:p.get('time')||'',
    compare:(p.get('compare')||'').split(',').filter(Boolean).map(Number)
  };
}

export function writeUrlState(state, replace=true){
  const p=new URLSearchParams();
  if(state.q) p.set('q',state.q);
  if(state.area) p.set('area',state.area);
  if(state.relevance) p.set('rel',state.relevance);
  if(state.effort) p.set('effort',state.effort);
  if(state.sort && state.sort!=='priority') p.set('sort',state.sort);
  if(state.lang && state.lang!=='ro') p.set('lang',state.lang);
  if(state.goal) p.set('goal',state.goal);
  if(state.org) p.set('org',state.org);
  if(state.time) p.set('time',state.time);
  if(state.compare?.length) p.set('compare',state.compare.join(','));
  const url=`${location.pathname}${p.toString()?`?${p}`:''}${location.hash||''}`;
  history[replace?'replaceState':'pushState'](null,'',url);
}

export function downloadText(filename, content, type='text/plain;charset=utf-8'){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}

export async function copyToClipboard(text){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}
  const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return true;
}
