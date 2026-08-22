
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

  tree.querySelectorAll('.person.root').forEach(rootPerson=>{
    const rootLi=rootPerson.closest('li');
    rootLi?.querySelectorAll('li').forEach(li=>{
      let depth=0;
      let cursor=li;
      while(cursor&&cursor!==rootLi){
        cursor=cursor.parentElement?.closest('li');
        depth+=1;
      }
      if(cursor!==rootLi||depth<2)return;
      const ul=[...li.children].find(x=>x.tagName==='UL');
      if(!ul)return;
      li.classList.add('is-collapsed');
      const fold=[...li.children].find(x=>x.classList?.contains('person'))?.querySelector('.node-fold');
      if(fold){fold.textContent='+';fold.setAttribute('aria-label','افتح الفرع');}
    });
  });
});

/* Keep the dense Quraysh material compact: only one post-tree panel stays open. */
document.querySelectorAll('.quraysh-content-stack').forEach(group=>{
  const panels=[...group.querySelectorAll(':scope > .quraysh-content-panel')];
  panels.forEach(panel=>panel.addEventListener('toggle',()=>{
    if(!panel.open)return;
    panels.forEach(other=>{if(other!==panel)other.open=false;});
  }));
});

/* Independent desktop columns prevent short Quraysh cards from inheriting a tall row gap. */
document.querySelectorAll('.quraysh-figure-groups').forEach(grid=>{
  const cards=[...grid.children].filter(card=>card.classList.contains('qahtan-figure-group'));
  if(cards.length<3)return;
  const firstColumn=document.createElement('div');
  const secondColumn=document.createElement('div');
  firstColumn.className='quraysh-figure-column';
  secondColumn.className='quraysh-figure-column';
  const mobileQuery=window.matchMedia('(max-width:720px)');
  const arrange=()=>{
    if(mobileQuery.matches){
      grid.replaceChildren(...cards);
      return;
    }
    cards.forEach((card,index)=>(index%2===0?firstColumn:secondColumn).append(card));
    grid.replaceChildren(firstColumn,secondColumn);
  };
  arrange();
  if(mobileQuery.addEventListener)mobileQuery.addEventListener('change',arrange);
  else mobileQuery.addListener(arrange);
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
    const k=norm(n); const ids=curatedByName.get(k)||[];
    if(!ids.includes(r.id))ids.push(r.id);
    curatedByName.set(k,ids);
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
  /* An ambiguous bare name must never be linked to the first record by chance. */
  return bestScore>0?best:null;
}

const nodeRecord=new WeakMap();
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
const candidates=[...document.querySelectorAll('.detail-page:not(.guide-page) .person,.detail-page:not(.guide-page) .leaf-tags>span,.detail-page:not(.guide-page) .name-list>span,.detail-page:not(.guide-page) .prophet-lineage-chain>span[data-guide-id],.detail-page:not(.guide-page) .ancestor-chain>span[data-guide-id]')];
candidates.forEach((el,i)=>{
  const name=cleanNodeName(el); if(!name)return;
  const lineage=contextFor(el);
  const id=el.dataset.guideId||pickRecord(name,lineage);
  if(!id)return;
  nodeRecord.set(el,id);
  el.classList.add('has-guide');
  const b=document.createElement('button');
  b.type='button';b.className='guide-link';b.textContent='ⓘ';b.title='تعرف عليها';
  b.setAttribute('aria-label','تعرف على '+name);
  b.addEventListener('click',e=>{e.stopPropagation();openGuide(id);});
  el.append(b);
});

/* Append the appropriate prayer to every companion name shown by the guide. */
function companionHonorific(record){
  const type=record?.type||'';
  if(/صحابية|أم المؤمنين/.test(type))return 'رضي الله عنها';
  if(/صحابي|صغار الصحابة/.test(type))return 'رضي الله عنه';
  return '';
}
const honorificById=new Map();
Object.values(curated).forEach(record=>{
  const honorific=companionHonorific(record);
  if(!honorific||/رضي الله عن(?:ه|ها)/.test(record.name||''))return;
  honorificById.set(record.id,honorific);
});
const directlyNamedFemaleCompanions=new Set([
  'خديجة بنت خويلد','سودة بنت زمعة','عائشة بنت أبي بكر','حفصة بنت عمر',
  'زينب بنت خزيمة','زينب بنت جحش','جويرية بنت الحارث','أم حبيبة رملة بنت أبي سفيان',
  'صفية بنت حيي','أم سلمة هند بنت أبي أمية','ميمونة بنت الحارث',
  'زينب','رقية','أم كلثوم','فاطمة','صفية'
].map(norm));
const directlyNamedMaleCompanions=new Set(['العباس','حمزة'].map(norm));
candidates.forEach(el=>{
  const id=nodeRecord.get(el)||el.dataset.guideId;
  const nodeName=cleanNodeName(el);
  const normalizedName=norm(nodeName);
  const honorific=honorificById.get(id)
    ||(directlyNamedFemaleCompanions.has(normalizedName)?'رضي الله عنها':'')
    ||(directlyNamedMaleCompanions.has(normalizedName)?'رضي الله عنه':'');
  if(!honorific||/رضي الله عن(?:ه|ها)/.test(nodeName))return;
  const textNode=[...el.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.nodeValue.trim());
  if(textNode)textNode.nodeValue=textNode.nodeValue.replace(/\s*$/,'')+` ${honorific} `;
});
Object.values(curated).forEach(record=>{
  const honorific=honorificById.get(record.id);
  if(!honorific)return;
  const originalName=record.name;
  record.aliases=[...new Set([...(record.aliases||[]),originalName])];
  record.name=`${originalName} ${honorific}`;
});

const allRecords=Object.values(curated);
const getRecord=id=>curated[id];
const guideCount=document.getElementById('guide-count');
if(guideCount)guideCount.textContent=allRecords.length.toLocaleString('ar');

function searchable(r){
  return norm([r.name,displayGuideName(r),(r.aliases||[]).join(' '),r.type,r.lineage,r.summary,r.geography,(r.branches||[]).join(' '),(r.figures||[]).join(' '),r.history,r.verse?.text,r.status,r.notes].join(' '));
}
let activeFilter='all';
const input=document.getElementById('guide-search');
const results=document.getElementById('guide-results');
const visibleCount=document.getElementById('guide-visible-count');

function filterOK(r){
  if(activeFilter==='all')return true;
  if(activeFilter==='disputed')return Boolean(r.disputed);
  if(['tribe','lineage','figure'].includes(activeFilter))return r.category===activeFilter;
  return true;
}
const guideSectionLabels={
  extinct:'العرب البائدة والأمم القديمة',
  qahtan:'العرب العاربة — قحطان وفروعه',
  adnan:'العرب المستعربة — عدنان وفروعه',
  quraysh:'قريش وبطونها',
  prophet:'النسب النبوي والأسرة الأقرب'
};
const guideSectionOrder=['extinct','qahtan','adnan','quraysh','prophet'];
const guideCategoryLabels={tribe:'قبيلة أو بطن',lineage:'أصل أو عقدة نسبية',figure:'علم'};
const stripHonorific=name=>(name||'').replace(/\s+رضي الله عن(?:ه|ها)$/,'').trim();
const repeatedGuideNames=new Map();
allRecords.forEach(record=>{
  const key=norm(stripHonorific(record.name));
  const records=repeatedGuideNames.get(key)||[];
  records.push(record);
  repeatedGuideNames.set(key,records);
});
const manualGuideNames=new Map([
  ['khuzaa','خزاعة (في المسار الأزدي)'],
  ['adnan-node-049','خزاعة (في عمود قمعة)'],
  ['quraysh-node-032','وهب بن عبد بن قصي'],
  ['adnan-node-142','أكلب (في عمود ربيعة)'],
  ['kahlan-node-085','أكلب (في خثعم بالحلف)']
]);
const generatedGuideNames=new Map();
const lineageAncestors=record=>(record.lineage||'').split('←').map(part=>part.trim()).filter(Boolean).slice(0,-1).reverse();
const cleanAncestor=name=>(name||'').replace(/\s+—.*$/,'').replace(/\s+\([^)]*\)$/,'').trim();
function patronymicCandidate(record,depth){
  const base=stripHonorific(record.name);
  const honorific=(record.name||'').slice(base.length);
  const ancestors=lineageAncestors(record).slice(0,depth).map(cleanAncestor).filter(Boolean);
  return ancestors.length?`${base} بن ${ancestors.join(' بن ')}${honorific}`:record.name;
}
repeatedGuideNames.forEach(records=>{
  if(records.length<2)return;
  records.forEach(record=>{
    if(manualGuideNames.has(record.id))return;
    const maxDepth=Math.max(1,lineageAncestors(record).length);
    let chosen=patronymicCandidate(record,1);
    for(let depth=1;depth<=maxDepth;depth+=1){
      const candidate=patronymicCandidate(record,depth);
      const collisions=records.filter(other=>{
        if(manualGuideNames.has(other.id))return false;
        return norm(patronymicCandidate(other,Math.min(depth,Math.max(1,lineageAncestors(other).length))))===norm(candidate);
      });
      chosen=candidate;
      if(collisions.length===1)break;
    }
    generatedGuideNames.set(record.id,chosen);
  });
});
function displayGuideName(record){
  return manualGuideNames.get(record.id)||generatedGuideNames.get(record.id)||record.name;
}
function renderResults(){
  if(!results)return;
  const q=norm(input?.value||'');
  let list=allRecords.filter(filterOK);
  if(q)list=list.filter(r=>searchable(r).includes(q));
  list=[...list].sort((a,b)=>displayGuideName(a).localeCompare(displayGuideName(b),'ar'));
  results.classList.add('compact');
  if(visibleCount)visibleCount.textContent=`${list.length.toLocaleString('ar')} سجل مستقل معروض`;
  if(!list.length){results.innerHTML='<div class="guide-empty">لم يظهر تطابق. جرّب الاسم بصيغة أخرى أو ابحث باسم الفرع الأعلى.</div>';return;}
  const grouped=new Map();
  list.forEach(record=>{
    const key=guideSectionLabels[record.sectionKey]?record.sectionKey:'extinct';
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(record);
  });
  const card=r=>{
    const category=guideCategoryLabels[r.category]||r.type||'';
    const displayName=displayGuideName(r);
    return `<button type="button" class="guide-card guide-card-compact" data-guide-card="${esc(r.id)}" aria-label="فتح معلومات ${esc(displayName)}">
      <span class="guide-card-compact-main"><strong>${esc(displayName)}</strong><small>${esc(r.lineage||r.summary||'')}</small></span>
      <span class="guide-type">${esc(category)}</span><i aria-hidden="true">ⓘ</i>
    </button>`;
  };
  results.innerHTML=guideSectionOrder.filter(key=>grouped.has(key)).map(key=>`<section class="guide-result-group">
    <h3><span>${guideSectionLabels[key]}</span><small>${grouped.get(key).length.toLocaleString('ar')} سجلًا</small></h3>
    <div class="guide-result-group-grid">${grouped.get(key).map(card).join('')}</div>
  </section>`).join('');
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
function openGuide(id,backId=null){
  const r=getRecord(id);if(!r||!panel)return;
  const returnId=backId||r.branchId||null;
  const returnRecord=returnId?getRecord(returnId):null;
  const backButton=returnRecord?`<button type="button" class="guide-back" data-guide-back="${esc(returnRecord.id)}">← الرجوع إلى ${esc(displayGuideName(returnRecord))}</button>`:'';
  const tags=a=>a?.length?`<div class="panel-tags">${a.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'';
  const figureTags=a=>a?.length?`<div class="panel-tags panel-figures">${a.map(name=>{
    const figureId=pickRecord(name,r.lineage||'');
    const figureRecord=figureId?getRecord(figureId):null;
    const figureName=figureRecord?displayGuideName(figureRecord):name;
    return figureId?`<button type="button" data-guide-figure="${esc(figureId)}">${esc(figureName)}<small>عرض التعريف</small></button>`:`<span>${esc(name)}</span>`;
  }).join('')}</div>`:'';
  const src=r.sources?.length?`<div class="panel-sources">${r.sources.map(s=>`<a class="panel-source" href="${esc(s.url)}" target="_blank" rel="noopener"><strong>${esc(s.title)}</strong>${s.kind?`<span>${esc(s.kind)}</span>`:''}<small>${esc(s.citation||'')}</small></a>`).join('')}</div>`:'';
  const verse=r.verse?.text?`<blockquote class="panel-verse"><p>${esc(r.verse.text).replace(/\n/g,'<br>')}</p>${r.verse.source?`<cite>${esc(r.verse.source)}</cite>`:''}</blockquote>`:'';
  panelContent.innerHTML=`${backButton}<div class="panel-kicker">${esc(r.type)}</div><h3 class="panel-title">${esc(displayGuideName(r))}</h3>
    ${r.lineage?`<div class="panel-lineage">${esc(r.lineage)}</div>`:''}
    ${r.status?`<div class="panel-status">${esc(r.status)}</div>`:''}
    ${section('نبذة',r.summary?`<p>${esc(r.summary)}</p>`:'')}
    ${section('الجغرافيا',r.geography?`<p>${esc(r.geography)}</p>`:'')}
    ${section('الفروع',tags(r.branches))}
    ${section('بعض الأعلام',figureTags(r.figures))}
    ${section('التاريخ والسياق',r.history?`<p>${esc(r.history)}</p>`:'')}
    ${section('من شعره',verse)}
    ${section('تنبيه',r.notes?`<p>${esc(r.notes)}</p>`:'')}
    ${section('المصادر',src)}
  `;
  panelContent.querySelector('[data-guide-back]')?.addEventListener('click',button=>openGuide(button.currentTarget.dataset.guideBack));
  panelContent.querySelectorAll('[data-guide-figure]').forEach(button=>button.addEventListener('click',()=>openGuide(button.dataset.guideFigure,r.id)));
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
