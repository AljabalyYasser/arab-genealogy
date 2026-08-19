
const modeBtns=[...document.querySelectorAll('.mode-btn')];
modeBtns.forEach(btn=>btn.addEventListener('click',()=>{
  modeBtns.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.mode').forEach(m=>m.classList.remove('active'));
  document.getElementById(btn.dataset.mode)?.classList.add('active');
  window.scrollTo({top:document.querySelector('.modebar').offsetTop,behavior:'smooth'});
}));

const subBtns=[...document.querySelectorAll('.sub-btn')];
subBtns.forEach(btn=>btn.addEventListener('click',()=>{
  subBtns.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.detail-page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+btn.dataset.page)?.classList.add('active');
  history.replaceState(null,'','#'+btn.dataset.page);
}));

const hash=location.hash.replace('#','');
const hashBtn=document.querySelector(`[data-page="${CSS.escape(hash)}"]`);
if(hashBtn){
  document.querySelector('[data-mode="deep"]')?.click();
  hashBtn.click();
}

/* Expanded tree folding */
function setTreeState(tree, open){
  tree.querySelectorAll('li').forEach(li=>{
    const ul=[...li.children].find(x=>x.tagName==='UL');
    if(!ul) return;
    li.classList.toggle('is-collapsed',!open);
    const fold=[...li.children].find(x=>x.classList?.contains('person'))?.querySelector('.node-fold');
    if(fold){fold.textContent=open?'−':'+';fold.setAttribute('aria-label',open?'اطوِ الفرع':'افتح الفرع');}
  });
}
document.querySelectorAll('.expanded-tree').forEach(tree=>{
  tree.querySelectorAll('li').forEach(li=>{
    const ul=[...li.children].find(x=>x.tagName==='UL');
    const person=[...li.children].find(x=>x.classList?.contains('person'));
    if(!ul||!person) return;
    const btn=document.createElement('button');
    btn.className='node-fold';btn.type='button';btn.textContent='−';btn.setAttribute('aria-label','اطوِ الفرع');
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      li.classList.toggle('is-collapsed');
      const closed=li.classList.contains('is-collapsed');
      btn.textContent=closed?'+':'−';
      btn.setAttribute('aria-label',closed?'افتح الفرع':'اطوِ الفرع');
    });
    person.append(btn);
  });
  const parent=tree.previousElementSibling;
  parent?.querySelector('.tree-expand')?.addEventListener('click',()=>setTreeState(tree,true));
  parent?.querySelector('.tree-collapse')?.addEventListener('click',()=>setTreeState(tree,false));
});

/* Guide */
const curated=window.GENEALOGY_GUIDE||{};
const arabicMarks=/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const norm=s=>(s||'').toString().replace(arabicMarks,'').replace(/ـ/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim().toLowerCase();
const cleanNodeName=el=>{
  const clone=el.cloneNode(true);
  clone.querySelectorAll('.note,.node-fold,.guide-link').forEach(x=>x.remove());
  return clone.textContent.replace(/\s+/g,' ').trim();
};
const curatedByName=new Map();
Object.values(curated).forEach(r=>{
  [r.name,...(r.aliases||[])].forEach(n=>{
    const k=norm(n); const ids=curatedByName.get(k)||[]; ids.push(r.id); curatedByName.set(k,ids);
  });
});

function pickRecord(name,lineage){
  const ids=curatedByName.get(norm(name))||[];
  if(!ids.length)return null;
  if(ids.length===1)return ids[0];
  const nl=norm(lineage);
  let best=null,bestScore=-1;
  ids.forEach(id=>{
    const r=curated[id], rl=norm(r?.lineage||'');
    let score=0;
    if(rl&&nl===rl)score=1000;
    else if(rl&&nl.includes(rl))score=600+rl.length;
    else if(rl&&rl.includes(nl))score=400+nl.length;
    if(score>bestScore){best=id;bestScore=score;}
  });
  return bestScore>0?best:ids[0];
}

const fallback=[];
const nodeRecord=new WeakMap();
const seenFallback=new Set();
function contextFor(el){
  const tree=el.closest('.expanded-tree');
  if(tree){
    const names=[];
    let li=el.closest('li');
    while(li&&li.closest('.expanded-tree')===tree){
      const p=[...li.children].find(x=>x.classList?.contains('person'));
      if(p)names.push(cleanNodeName(p));
      li=li.parentElement?.closest('li');
    }
    return names.reverse().join(' ← ');
  }
  const card=el.closest('.branch-card');
  const path=card?.querySelector('.path');
  if(path)return [...path.querySelectorAll('span')].map(s=>s.textContent.trim()).join(' ← ');
  const section=el.closest('.detail-page');
  return section?.querySelector('.detail-head h2')?.textContent.trim()||'';
}
const candidates=[...document.querySelectorAll('.detail-page:not(.guide-page) .person,.detail-page:not(.guide-page) .leaf-tags>span,.detail-page:not(.guide-page) .name-list>span')];
candidates.forEach((el,i)=>{
  const name=cleanNodeName(el); if(!name)return;
  const lineage=contextFor(el);
  const direct=pickRecord(name,lineage);
  let id=direct;
  if(!id){
    const key=norm(name)+'|'+norm(lineage);
    if(!seenFallback.has(key)){
      seenFallback.add(key);
      id='fallback-'+fallback.length;
      fallback.push({
        id,name,type:'فرع نسبي',lineage,
        summary:'يظهر هذا الاسم في المشجرة ضمن التسلسل الموضح. لم أضف له وصفاً تاريخياً أو جغرافياً مستقلاً حين لم أجد مادة تكفي لصياغة مسؤولة.',
        geography:'',branches:[],figures:[],history:'',
        status:'مادة تعريفية محدودة',notes:'غياب التفاصيل هنا لا يعني قلة شأن الفرع؛ بل يعني أن المادة التي أمكن توثيقها ضمن نطاق التحقيق لم تكف لإضافة بطاقة أوسع.',sources:[]
      });
    }else{
      id=fallback.find(r=>norm(r.name)+'|'+norm(r.lineage)===key)?.id;
    }
  }
  nodeRecord.set(el,id);
  el.classList.add('has-guide');
  const b=document.createElement('button');
  b.type='button';b.className='guide-link';b.textContent='ⓘ';b.title='تعرف عليها';
  b.setAttribute('aria-label','تعرف على '+name);
  b.addEventListener('click',e=>{e.stopPropagation();openGuide(id);});
  el.append(b);
});

const allRecords=[...Object.values(curated),...fallback];
const getRecord=id=>curated[id]||fallback.find(r=>r.id===id);
const guideCount=document.getElementById('guide-count');
if(guideCount)guideCount.textContent=allRecords.length.toLocaleString('ar');

function searchable(r){
  return norm([r.name,(r.aliases||[]).join(' '),r.type,r.lineage,r.summary,r.geography,(r.branches||[]).join(' '),(r.figures||[]).join(' '),r.history,r.status,r.notes].join(' '));
}
let activeFilter='all';
const input=document.getElementById('guide-search');
const results=document.getElementById('guide-results');

function filterOK(r){
  if(activeFilter==='all')return true;
  if(activeFilter==='علم')return r.type==='علم';
  if(activeFilter==='مختلف')return (r.status||'').includes('مختلف')||(r.notes||'').includes('خلاف');
  if(activeFilter==='قبيلة')return r.type!=='علم';
  return true;
}
function renderResults(){
  if(!results)return;
  const q=norm(input?.value||'');
  let list=allRecords.filter(filterOK);
  if(q) list=list.filter(r=>searchable(r).includes(q));
  else{
    const featured=list.filter(r=>r.featured);
    list=featured.length?featured:list.slice(0,18);
  }
  list=list.slice(0,60);
  if(!list.length){results.innerHTML='<div class="guide-empty">لم يظهر تطابق. جرّب الاسم بصيغة أخرى أو ابحث باسم الفرع الأعلى.</div>';return;}
  results.innerHTML=list.map(r=>`<article class="guide-card" data-guide-card="${r.id}">
    <div class="guide-card-head"><h3>${esc(r.name)}</h3><span class="guide-type">${esc(r.type)}</span></div>
    <p>${esc(r.summary||'')}</p><div class="guide-path">${esc(r.lineage||'')}</div>
  </article>`).join('');
  results.querySelectorAll('[data-guide-card]').forEach(c=>c.addEventListener('click',()=>openGuide(c.dataset.guideCard)));
}
function esc(s){return (s||'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
input?.addEventListener('input',renderResults);
document.querySelectorAll('.guide-filter').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.guide-filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');activeFilter=b.dataset.filter;renderResults();
}));

document.querySelectorAll('.guide-tab').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.guide-tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.guide-tab-panel').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');document.getElementById('guide-'+b.dataset.guideTab)?.classList.add('active');
}));

const panel=document.getElementById('guide-panel');
const overlay=document.getElementById('guide-overlay');
const panelContent=document.getElementById('guide-panel-content');
function section(title,body){return body?`<section class="panel-section"><h4>${title}</h4>${body}</section>`:'';}
function openGuide(id){
  const r=getRecord(id);if(!r||!panel)return;
  const tags=a=>a?.length?`<div class="panel-tags">${a.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'';
  const src=r.sources?.length?`<div class="panel-sources">${r.sources.map(s=>`<a class="panel-source" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}<small>${esc(s.kind||'مصدر')}</small></a>`).join('')}</div>`:'';
  panelContent.innerHTML=`<div class="panel-kicker">${esc(r.type)}</div><h3 class="panel-title">${esc(r.name)}</h3>
    ${r.lineage?`<div class="panel-lineage">${esc(r.lineage)}</div>`:''}
    ${r.status?`<div class="panel-status">${esc(r.status)}</div>`:''}
    ${section('نبذة',`<p>${esc(r.summary)}</p>`)}
    ${section('الجغرافيا',r.geography?`<p>${esc(r.geography)}</p>`:'')}
    ${section('الفروع',tags(r.branches))}
    ${section('الأعلام',tags(r.figures))}
    ${section('التاريخ والسياق',r.history?`<p>${esc(r.history)}</p>`:'')}
    ${section('ملاحظات التحقيق',r.notes?`<p>${esc(r.notes)}</p>`:'')}
    ${section('المصادر',src)}
  `;
  overlay.hidden=false;requestAnimationFrame(()=>overlay.classList.add('show'));
  panel.classList.add('open');panel.setAttribute('aria-hidden','false');document.body.classList.add('guide-open');
}
function closeGuide(){
  panel?.classList.remove('open');panel?.setAttribute('aria-hidden','true');overlay?.classList.remove('show');document.body.classList.remove('guide-open');
  setTimeout(()=>{if(overlay)overlay.hidden=true},220);
}
document.querySelector('.guide-close')?.addEventListener('click',closeGuide);
overlay?.addEventListener('click',closeGuide);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeGuide()});
renderResults();
