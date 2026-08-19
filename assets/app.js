const modeBtns=[...document.querySelectorAll('.mode-btn')];
modeBtns.forEach(btn=>btn.addEventListener('click',()=>{
  modeBtns.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.mode').forEach(m=>m.classList.remove('active'));
  document.getElementById(btn.dataset.mode).classList.add('active');
  window.scrollTo({top:document.querySelector('.modebar').offsetTop,behavior:'smooth'});
}));
const subBtns=[...document.querySelectorAll('.sub-btn')];
subBtns.forEach(btn=>btn.addEventListener('click',()=>{
  subBtns.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.detail-page').forEach(p=>p.classList.remove('active'));
  const page=document.getElementById('page-'+btn.dataset.page);
  if(page) page.classList.add('active');
  history.replaceState(null,'','#'+btn.dataset.page);
}));
const hash=location.hash.replace('#','');
const hashBtn=document.querySelector(`[data-page="${hash}"]`);
if(hashBtn){
  const deepBtn=document.querySelector('[data-mode="deep"]');
  if(deepBtn) deepBtn.click();
  hashBtn.click();
}
