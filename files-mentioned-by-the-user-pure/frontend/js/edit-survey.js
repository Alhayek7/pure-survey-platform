requireRole('admin','researcher'); const id=new URLSearchParams(location.search).get('id');
async function load(){ const s=await api('/surveys/'+id); title.value=s.title; description.value=s.description||''; statusText.textContent=s.status; questions.innerHTML=''; for(const q of s.questions||[]) addQuestion(q); }
async function save(){ const payload={ title:title.value, description:description.value, is_public:is_public.checked, questions:collect() }; await api('/surveys/'+id,{method:'PUT',body:JSON.stringify(payload)}); msg('Saved',true); }
async function publish(){ await api('/surveys/'+id+'/publish',{method:'POST'}); load(); }
async function closeSurvey(){ await api('/surveys/'+id+'/close',{method:'POST'}); load(); }
document.addEventListener('DOMContentLoaded',()=>{ window.addQuestion=addQuestion; window.collect=collect; addQuestion=window.addQuestion; collect=window.collect; document.querySelector('#addQuestion').onclick=()=>addQuestion(); document.querySelector('#save').onclick=save; document.querySelector('#publish').onclick=publish; document.querySelector('#close').onclick=closeSurvey; load().catch(e=>msg(e.message)); });
