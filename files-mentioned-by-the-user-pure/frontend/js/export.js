requireRole('admin','researcher');
async function download(path, filename){ const res=await fetch(API_BASE+path,{headers:{Authorization:'Bearer '+token()}}); if(!res.ok){ msg('Export failed'); return; } const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
function exportSurvey(){ const id=survey_id.value; if(id) download('/export/survey/'+id, 'survey-'+id+'-responses.xlsx'); }
function exportAll(){ download('/export/all', 'all-responses.xlsx'); }
