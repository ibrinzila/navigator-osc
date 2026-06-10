export function normalize(value){
  return String(value??'')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[„”«»]/g,'"')
    .replace(/[-_]+/g,' ')
    .replace(/[^a-z0-9%./\s]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export const SYNONYMS={
  'venit stabil':['2%','desemnare procentuala','surse proprii','sustenabilitate','antreprenoriat social','contracte publice','subventii','income','stable income','predictibil'],
  'stable income':['2%','desemnare procentuala','antreprenoriat social','contracte publice','venit stabil','surse recurente'],
  'contract cu statul':['achizitii publice','mtender','comanda sociala','servicii sociale','operator economic','state contract','public contract'],
  'state contract':['achizitii publice','mtender','comanda sociala','contract cu statul','servicii pentru stat'],
  'prestator servicii':['servicii sociale','cnapss','cnam','acreditare','service provider','furnizor servicii'],
  'service provider':['prestator servicii','servicii sociale','cnam','cnapss','acreditare'],
  'first time applicant':['incepator','dosar standard','eligibilitate','cerere de finantare','buget proiect','granturi publice'],
  'incepator':['first time applicant','dosar','checklist','eligibilitate','cerere de finantare'],
  'tineri':['tineret','ant','educatie non-formala','participare civica','youth'],
  'youth':['tineret','tineri','ant','granturi tineret'],
  'diaspora':['brd','diaspora engagement hub','deh','moldoveni peste hotare'],
  'cultura':['ministerul culturii','proiecte culturale','patrimoniu','festival','arte'],
  'social':['servicii sociale','mmps','imbatranire activa','persoane vulnerabile','asistenta sociala'],
  'medical':['cnam','cneas','sanatate','profilaxie','servicii medicale'],
  'cpv':['mtender','achizitii','cod cpv','servicii sociale','853','850'],
  '2%':['desemnare procentuala','asp','sfs','ong17','30 aprilie','1 iunie','30 septembrie'],
  '30 aprilie':['2%','declaratie venit','sfs','desemnare procentuala'],
  'mtender':['achizitii publice','cpv','contracte','operator economic','garantie oferta'],
  'rural':['apl','bugetare participativa','granturi locale','servicii comunitare'],
  'media':['fond mass-media','ministerul culturii','furnizor produse jurnalistice']
};

export const INTENTS=[
  {id:'project', icon:'💶', title:'Finanțare pentru un proiect', desc:'Granturi publice pentru proiecte sociale, educaționale, culturale, de tineret sau mediu.', area:'Granturi publice', goal:'grant', query:'grant proiect finantare nerambursabila'},
  {id:'stable', icon:'♻️', title:'Venit stabil sau recurente', desc:'2%, antreprenoriat social, contracte și mecanisme care reduc dependența de granturi externe.', area:'2%', goal:'sustainability', query:'venit stabil 2% antreprenoriat social'},
  {id:'contract', icon:'🤝', title:'Contract cu statul', desc:'Achiziții publice, comandă socială, servicii sociale și CPV-uri relevante pentru OSC.', area:'Achiziții publice', goal:'contract', query:'contract cu statul achizitii mtender'},
  {id:'services', icon:'🧭', title:'Servicii sociale / medicale', desc:'Acreditare, contractare CNAM, prestator servicii sociale și standarde.', area:'Servicii sociale', goal:'service', query:'prestator servicii acreditare CNAM CNAPSS'},
  {id:'first', icon:'🗂️', title:'Aplic pentru prima dată', desc:'Eligibilitate, statut, dosar standard, cerere de finanțare și buget.', area:'Statut / eligibilitate', goal:'beginner', query:'first time applicant dosar eligibilitate'},
  {id:'procurement', icon:'🔎', title:'Caut în MTender / CPV', desc:'Transformă serviciile OSC în termeni de achiziții publice și monitorizează proceduri.', area:'Achiziții publice', goal:'procurement', query:'cpv mtender servicii sociale'}
];

export const GOALS=[
  {id:'grant', label:'Grant pentru proiect'},
  {id:'sustainability', label:'Venit stabil / sustenabilitate'},
  {id:'contract', label:'Contract cu statul'},
  {id:'service', label:'Prestare servicii sociale/medicale'},
  {id:'socialbiz', label:'Întreprindere socială'},
  {id:'beginner', label:'Să pregătesc dosarul'}
];
export const ORGS=[
  {id:'local', label:'OSC local / rural'},
  {id:'youth', label:'Organizație de tineret'},
  {id:'social', label:'Prestator social'},
  {id:'culture', label:'Culturală'},
  {id:'diaspora', label:'Diaspora'},
  {id:'experienced', label:'Grant writer avansat'}
];
export const TIMES=[
  {id:'now', label:'Am nevoie rapid'},
  {id:'annual', label:'Planific anul acesta'},
  {id:'strategic', label:'Construiesc pe 1–3 ani'}
];

export const ORG_TYPES=[
  {id:'local', label:'OSC local / rural'},
  {id:'youth', label:'Organizație de tineret'},
  {id:'social', label:'Prestator servicii sociale'},
  {id:'culture', label:'Organizație culturală'},
  {id:'diaspora', label:'Diaspora / partener diaspora'},
  {id:'media', label:'Media / comunicare'},
  {id:'medical', label:'Servicii medicale / sănătate'},
  {id:'apla', label:'APL / partener public'}
];


const SEMANTIC_FILTERS=[
  {keys:['venit stabil','stable income','surse recurente','income'], areas:['2%','Antreprenoriat social','Achiziții publice','Servicii sociale','CNAM / servicii medicale','Sprijin indirect','Participare locală']},
  {keys:['contract cu statul','state contract','public contract','servicii pentru stat'], areas:['Achiziții publice','Servicii sociale','CNAM / servicii medicale']},
  {keys:['prestator servicii','service provider','furnizor servicii'], areas:['Servicii sociale','CNAM / servicii medicale','Achiziții publice']},
  {keys:['first time applicant','incepator'], areas:['Statut / eligibilitate','Granturi publice','2%']},
  {keys:['cpv','mtender'], areas:['Achiziții publice','Servicii sociale']},
  {keys:['cnam','medical','sanatate'], areas:['CNAM / servicii medicale','Granturi publice']}
];
function semanticFilterFor(q){
  const base=normalize(q);
  return SEMANTIC_FILTERS.find(f=>f.keys.some(k=>base.includes(normalize(k))));
}

const goalBoost={
  grant:['Granturi publice'], sustainability:['2%','Antreprenoriat social','Achiziții publice'], contract:['Achiziții publice','Servicii sociale','CNAM / servicii medicale'], service:['Servicii sociale','CNAM / servicii medicale','Achiziții publice'], socialbiz:['Antreprenoriat social'], beginner:['Statut / eligibilitate','Granturi publice']
};
const orgBoost={
  youth:['tineret','ant','tineri'], social:['servicii sociale','mmps','acreditare','cnapss','imbatranire'], culture:['cultura','culturale','ministerul culturii','patrimoniu'], diaspora:['diaspora','brd','deh'], media:['media','mass-media'], medical:['cnam','cneas','sanatate'], local:['apl','local','comunitar','bugetare participativa']
};

export function expandQuery(query){
  const base=normalize(query);
  const terms=new Set(base.split(' ').filter(Boolean));
  Object.entries(SYNONYMS).forEach(([key,values])=>{
    const nkey=normalize(key);
    if(base.includes(nkey)) values.forEach(v=>normalize(v).split(' ').filter(Boolean).forEach(t=>terms.add(t)));
  });
  return [...terms];
}

export function opportunityText(o){
  return [
    o['Arie'], o['Mecanism / oportunitate'], o['Autoritate / platformă'], o['Ce permite'], o['Eligibilitate / condiții-cheie'], o['Termen / frecvență'], o['Documente / pași principali'], o['Acțiune imediată'], o['Atenție / risc'], o['Ghid pagini'], o['URL oficial / sursă']
  ].map(v=>normalize(v)).join(' ');
}

export function scoreOpportunity(o, state={}, profile={}){
  let score=Number(o['Scor prioritate']||0);
  const text=opportunityText(o);
  const q=state.q||'';
  if(q){
    const terms=expandQuery(q);
    const base=normalize(q);
    if(text.includes(base) && base.length>2) score+=16;
    terms.forEach(t=>{ if(t.length>1 && text.includes(t)) score+=3; });
    Object.entries(SYNONYMS).forEach(([k,vals])=>{
      if(base.includes(normalize(k)) && vals.some(v=>text.includes(normalize(v)))) score+=8;
    });
  }
  if(state.area && o['Arie']===state.area) score+=12;
  if(state.relevance && o['Relevanță']===state.relevance) score+=5;
  if(state.effort && o['Efort']===state.effort) score+=4;
  if(state.goal && (goalBoost[state.goal]||[]).includes(o['Arie'])) score+=14;
  if(state.goal==='contract' && /achizi|mtender|contract|comand/i.test(opportunityText(o))) score+=8;
  if(state.goal==='sustainability' && /2%|antreprenoriat|social|contract/i.test(opportunityText(o))) score+=8;
  const org=state.org || profile.type;
  if(org && orgBoost[org]) orgBoost[org].forEach(term=>{if(text.includes(normalize(term))) score+=7});
  if(state.time==='now' && /lunar|anual|ianuarie|martie|aprilie|iunie|septembrie|trimestru|permanent|direct/i.test(o['Termen / frecvență']||'')) score+=4;
  if(state.time==='strategic' && /3 ani|multianual|statut|acredit|antreprenoriat|contract/i.test(text)) score+=7;
  if(profile.experience==='beginner' && /dosar|eligibil|cerere|buget|statut/i.test(text)) score+=5;
  return score;
}

function queryMatches(o, q){
  if(!q) return true;
  const text=opportunityText(o);
  const base=normalize(q);
  const semantic=semanticFilterFor(q);
  if(semantic && !semantic.areas.includes(o['Arie'])) return false;
  if(base && text.includes(base)) return true;
  const weak=new Set(['social','public','publice','surse','proiecte','servicii','moldova','statul','state','income','time','first']);
  const terms=expandQuery(q).filter(t=>t.length>2 && !weak.has(t));
  const hits=terms.filter(t=>text.includes(t)).length;
  return hits >= (semantic ? 1 : 2);
}

export function searchOpportunities(opportunities, state={}, profile={}){
  let rows=opportunities.map((o,index)=>({o,index,score:scoreOpportunity(o,state,profile)}));
  if(state.q) rows=rows.filter(r=>queryMatches(r.o,state.q));
  else if(state.goal || state.org || state.time) rows=rows.filter(r=>r.score>Number(r.o['Scor prioritate']||0)+2);
  if(state.area) rows=rows.filter(r=>r.o['Arie']===state.area);
  if(state.relevance) rows=rows.filter(r=>r.o['Relevanță']===state.relevance);
  if(state.effort) rows=rows.filter(r=>r.o['Efort']===state.effort);
  const sort=state.sort||'priority';
  rows.sort((a,b)=>{
    if(sort==='name') return String(a.o['Mecanism / oportunitate']).localeCompare(String(b.o['Mecanism / oportunitate']),'ro');
    if(sort==='urgency') return Number(b.o['Urgență 1-3']||0)-Number(a.o['Urgență 1-3']||0) || b.score-a.score;
    if(sort==='effort') return effortRank(a.o['Efort'])-effortRank(b.o['Efort']) || b.score-a.score;
    return b.score-a.score;
  });
  return rows;
}
function effortRank(v){return {'Scăzut':0,'Mediu':1,'Ridicat':2}[v]??9}

export function buildSuggestions(data, query){
  const n=normalize(query);
  const tokens=n.split(' ').filter(t=>t.length>1);
  const looseMatch=(hay)=> hay.includes(n) || (tokens.length>1 && tokens.every(t=>hay.includes(t)));
  const suggestions=[];
  if(n.startsWith('cpv')) suggestions.push({kind:'CPV',label:'CPV / MTender',detail:'Caută coduri CPV și achiziții publice',value:n,icon:'#'});
  const add=(kind,label,detail,value,icon='🔎')=>suggestions.push({kind,label,detail,value,icon});
  if(!n){
    ['2%','CNAM','MTender','CPV 853','servicii sociale','venit stabil','grant tineret','antreprenoriat social'].forEach(v=>add('termen',v,'Căutare rapidă',v));
    return suggestions.slice(0,8);
  }
  Object.entries(SYNONYMS).forEach(([k,vals])=>{
    const all=[k,...vals].map(normalize).join(' ');
    if(all.includes(n)) add('sinonim',k,vals.slice(0,4).join(', '),k,'↔');
  });
  data.opportunities.forEach((o,i)=>{
    const title=o['Mecanism / oportunitate'];
    const hay=normalize([title,o['Arie'],o['Autoritate / platformă'],o['Ce permite']].join(' '));
    if(looseMatch(hay)) add('mecanism',title,o['Arie'],title,'▣');
  });
  data.cpv.forEach(c=>{
    const label=c['Cod / familie CPV'];
    const hay=normalize(['cpv',label,c['Denumire / exemplu'],c['Cum se folosește']].join(' '));
    if(looseMatch(hay)) add('CPV',label,c['Denumire / exemplu'],label,'#');
  });
  data.calendar.forEach(c=>{
    const label=c['Perioadă / dată-limită'];
    const hay=normalize([label,c['Mecanism'],c['Acțiune']].join(' '));
    if(looseMatch(hay)) add('calendar',label,c['Mecanism'],c['Mecanism'],'📅');
  });
  const seen=new Set();
  return suggestions.filter(s=>{const key=s.kind+s.label;if(seen.has(key))return false;seen.add(key);return true}).slice(0,10);
}

export function makeGuidedAnswer(results, state){
  const top=results.slice(0,3).map(r=>r.o);
  if(!top.length) return {route:'Nu există rezultate clare încă.', why:'Încearcă un termen mai general sau curăță filtrele.', next:['Verifică dosarul standard', 'Caută după arie sau instituție'], top:[]};
  const first=top[0];
  const route=first['Mecanism / oportunitate'];
  const why=`Se potrivește pentru ${first['Arie']} și are relevanță ${String(first['Relevanță']).toLowerCase()}. ${first['Ce permite']}`;
  const next=[first['Acțiune imediată'], `Verifică sursa oficială: ${first['URL oficial / sursă']||'vezi paginile ghidului'}`, `Pregătește documentele: ${first['Documente / pași principali']}`].filter(Boolean);
  return {route, why, next, top};
}
