const API_BASE = localStorage.getItem('apiBase') || 'http://localhost:3000/api/v1';
function token(){ return localStorage.getItem('token'); }
function user(){ try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } }
function setSession(data){ if(data.token) localStorage.setItem('token', data.token); if(data.user) localStorage.setItem('user', JSON.stringify(data.user)); }
function logout(){ localStorage.clear(); location.href='index.html'; }
async function api(path, options={}){ const headers = { 'Content-Type':'application/json', ...(options.headers||{}) }; if(token()) headers.Authorization='Bearer '+token(); const res = await fetch(API_BASE + path, { ...options, headers }); if(!res.ok){ let err; try{ err=await res.json(); }catch{ err={message:res.statusText}; } throw new Error(err.message || 'Request failed'); } if(res.status===204) return null; const type=res.headers.get('content-type')||''; return type.includes('json') ? res.json() : res.blob(); }
function requireAuth(){ if(!token()) location.href='index.html'; }
function requireRole(...roles){ requireAuth(); const u=user(); if(!u || !roles.includes(u.role)) location.href='dashboard.html'; }
function nav(){ const u=user(); const links=[['dashboard.html','Dashboard'],['survey.html','Public Surveys']]; if(u?.role==='admin') links.push(['admin.html','Admin'],['users.html','Users'],['export.html','Export']); if(u?.role==='researcher'||u?.role==='admin') links.push(['researcher.html','Researcher'],['create-survey.html','Create Survey'],['responses.html','Responses']); if(u) links.push(['my-responses.html','My Responses']); document.write('<div class="nav">'+links.map(l=>'<a href="'+l[0]+'">'+l[1]+'</a>').join('')+(u?'<a href="#" onclick="logout()">Logout</a>':'')+'</div>'); }
function msg(text, ok=false){ const el=document.querySelector('#message'); if(el){ el.className='my-3 text-sm '+(ok?'text-green-700':'text-red-700'); el.textContent=text; } }
