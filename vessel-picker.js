import {icon} from './ui-icons.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function vesselMatches(profile,query){const terms=String(query).trim().toUpperCase().split(/\s+/).filter(Boolean),text=[profile.id,profile.engine,profile.family].join(' ').toUpperCase();return terms.every(term=>text.includes(term));}
export function setupVesselPicker({profiles,getSelected,onSelect,isBusy=()=>false}){
 const dialog=document.getElementById('vesselDialog'),search=document.getElementById('vesselSearch'),grid=document.getElementById('vesselGrid'),count=document.getElementById('vesselCount');let opener=null;
 function render(){
  const list=Object.values(profiles).filter(p=>vesselMatches(p,search.value)).sort((a,b)=>a.id.localeCompare(b.id));
  count.textContent=list.length+' vessel'+(list.length===1?'':'s');
  grid.innerHTML=list.length?list.map(p=>{const selected=p.id===getSelected();return `<button type="button" class="vessel-card ${selected?'selected':''}" data-vessel="${escapeHTML(p.id)}" aria-pressed="${selected}"><span class="vessel-symbol">${icon('vessel')}</span><span class="vessel-card-info"><strong>${escapeHTML(p.id)}</strong><span class="vessel-engine">${escapeHTML(p.engine)}</span></span><span class="vessel-selection-mark" aria-hidden="true">${selected?'✓':''}</span><span class="sr-only">${selected?'Selected':''}</span></button>`}).join(''):'<div class="vessel-no-results">No vessels found.</div>';
  grid.querySelectorAll('[data-vessel]').forEach(button=>button.onclick=()=>{if(isBusy())return;const id=button.dataset.vessel;dialog.close();if(id!==getSelected())onSelect(id);});
 }
 function open(button){if(isBusy())return;opener=button;search.value='';render();dialog.showModal();document.body.classList.add('vessel-dialog-open');search.focus();}
 document.getElementById('vesselSelect').onclick=e=>open(e.currentTarget);
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-change-vessel]');if(button)open(button);});
 document.getElementById('closeVesselDialog').onclick=()=>dialog.close();
 search.addEventListener('input',render);
 search.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=grid.querySelector('[data-vessel]');if(first){e.preventDefault();first.click();}}});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('vessel-dialog-open');(opener?.isConnected?opener:document.getElementById('vesselSelect')).focus();});
 return {open,render};
}
