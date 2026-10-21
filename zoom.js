import {exportChartExcel} from './chart-data.js';
import {prepareDownload} from './downloads.js';
export const BASE = {x:0,y:0,w:560,h:240};
export const MAX_ZOOM = 20;
export function constrainBox(box,base=BASE){
 const w=Math.min(base.w,Math.max(base.w/MAX_ZOOM,box.w)),h=w*base.h/base.w;
 return {x:Math.max(0,Math.min(base.w-w,box.x)),y:Math.max(0,Math.min(base.h-h,box.y)),w,h};
}
export function zoomAt(box,factor,anchor,base=BASE){
 const w=Math.max(base.w/MAX_ZOOM,Math.min(base.w,box.w/factor)),ratio=w/box.w;
 return constrainBox({x:anchor.x-(anchor.x-box.x)*ratio,y:anchor.y-(anchor.y-box.y)*ratio,w,h:w*base.h/base.w},base);
}
export async function toggleViewerFullscreen(dialog,doc=globalThis.document){
 if(dialog.classList.contains('viewer-fullscreen')){dialog.classList.remove('viewer-fullscreen');return false;}
 if(doc.fullscreenElement===dialog){await doc.exitFullscreen();return false;}
 if(doc.fullscreenEnabled!==false&&typeof dialog.requestFullscreen==='function'){
  try{await dialog.requestFullscreen();return true;}catch{}
 }
 dialog.classList.add('viewer-fullscreen');return true;
}
export function setupChartViewer(){
 const dialog=document.createElement('dialog');dialog.className='chart-dialog';
 dialog.innerHTML=`<div class="viewer-head"><div><div class="eyebrow">TRUSTBULKERS · CHART EXPLORER</div><h2 id="viewerTitle">Performance chart</h2></div><button class="ghost" data-view="close" aria-label="Close chart">Close ×</button></div><div class="viewer-toolbar"><div class="viewer-zoom"><button class="ghost" data-view="minus" aria-label="Zoom out">−</button><input id="zoomRange" type="range" min="100" max="2000" step="25" value="100" aria-label="Chart zoom percentage"><button class="ghost" data-view="plus" aria-label="Zoom in">+</button><output id="zoomLevel">100%</output><button class="ghost" data-view="reset">Reset view</button></div><div><button class="ghost" data-view="full" aria-pressed="false">Fullscreen</button> <button class="ghost" data-view="save">Download Excel</button></div></div><div class="viewer-canvas"></div><div class="viewer-download" role="status" hidden></div><div class="viewer-foot"><span>Scroll to zoom · Drag to pan</span><span>Esc to close</span></div>`;
 dialog.setAttribute('aria-labelledby','viewerTitle');document.body.append(dialog);
 const canvas=dialog.querySelector('.viewer-canvas'),range=dialog.querySelector('#zoomRange'),level=dialog.querySelector('#zoomLevel');
 let excelDownload=null;
 const downloadStatus=dialog.querySelector('.viewer-download');
 const fullButton=dialog.querySelector('[data-view="full"]');
 function syncFullscreen(){const expanded=document.fullscreenElement===dialog||dialog.classList.contains('viewer-fullscreen');fullButton.textContent=expanded?'Exit fullscreen':'Fullscreen';fullButton.setAttribute('aria-pressed',String(expanded));}
 document.addEventListener('fullscreenchange',syncFullscreen);
 dialog.addEventListener('cancel',e=>{if(dialog.classList.contains('viewer-fullscreen')){e.preventDefault();dialog.classList.remove('viewer-fullscreen');syncFullscreen();}});
 let svg=null,base={...BASE},box={...base},opener=null,pan=null,pinch=null,pointers=new Map();
 function render(){if(!svg)return;svg.setAttribute('viewBox',`${box.x} ${box.y} ${box.w} ${box.h}`);const scale=base.w/box.w;range.value=Math.round(scale*100);level.value=Math.round(scale*100)+'%';level.textContent=level.value;canvas.classList.toggle('zoomed',scale>1.001);}
 function userPoint(clientX,clientY,matrix=null){const p=new DOMPoint(clientX,clientY);return p.matrixTransform(matrix||svg.getScreenCTM().inverse());}
 function change(factor,anchor={x:box.x+box.w/2,y:box.y+box.h/2}){box=zoomAt(box,factor,anchor,base);render()}
 function open(source){opener=source;downloadStatus.hidden=true;downloadStatus.textContent='';const dimensions=source.getAttribute('viewBox').split(/\s+/).map(Number);base={x:dimensions[0],y:dimensions[1],w:dimensions[2],h:dimensions[3]};box={...base};pan=null;pinch=null;pointers.clear();svg=source.cloneNode(true);svg.removeAttribute('tabindex');svg.removeAttribute('role');svg.removeAttribute('aria-haspopup');svg.classList.remove('chart-expandable');svg.querySelectorAll('clipPath[id]').forEach(clip=>{const before=clip.id,after=before+'-viewer';clip.id=after;svg.querySelectorAll('[clip-path]').forEach(mark=>{if(mark.getAttribute('clip-path')==='url(#'+before+')')mark.setAttribute('clip-path','url(#'+after+')')});});svg.style.cursor='inherit';canvas.replaceChildren(svg);dialog.querySelector('#viewerTitle').textContent=source.closest('.panel')?.querySelector('h2')?.textContent||source.querySelector('title')?.textContent||source.getAttribute('aria-label')||'Performance chart';dialog.showModal();document.body.style.overflow='hidden';render();}
 document.addEventListener('click',e=>{const source=e.target.closest?.('svg.chart')||(e.target.closest?.('[data-chart-open]')?.closest('.panel')?.querySelector('svg.chart'));if(source&&!dialog.contains(source))open(source)});
 document.addEventListener('keydown',e=>{if(!dialog.open&&(e.key==='Enter'||e.key===' ')&&e.target.matches?.('svg.chart')){e.preventDefault();open(e.target)}});
 dialog.addEventListener('close',()=>{document.body.style.overflow='';dialog.classList.remove('viewer-fullscreen');syncFullscreen();pointers.clear();pan=pinch=null;if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});opener?.focus()});
 dialog.addEventListener('click',async e=>{const action=e.target.closest('[data-view]')?.dataset.view;if(!action)return;if(action==='close')dialog.close();if(action==='plus')change(1.5);if(action==='minus')change(1/1.5);if(action==='reset'){box={...base};render()}if(action==='full'){await toggleViewerFullscreen(dialog);syncFullscreen()}if(action==='save')saveExcel();});
 range.addEventListener('input',()=>change((Number(range.value)/100)/(base.w/box.w)));
 canvas.addEventListener('wheel',e=>{if(!svg)return;e.preventDefault();change(Math.exp(-Math.max(-160,Math.min(160,e.deltaY))*.003),userPoint(e.clientX,e.clientY))},{passive:false});
 canvas.addEventListener('dblclick',e=>{e.preventDefault();change(e.shiftKey?.5:2,userPoint(e.clientX,e.clientY))});
 function startPan(point){pan={point:{...point},box:{...box},inverse:svg.getScreenCTM().inverse()};}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.classList.add('dragging');if(pointers.size===1)startPan({x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),box:{...box},anchor:userPoint((a.x+b.x)/2,(a.y+b.y)/2)};pan=null;}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.distance>0){box=zoomAt(pinch.box,distance/pinch.distance,pinch.anchor,base);render()}}else if(pan&&pointers.size===1){const a=userPoint(pan.point.x,pan.point.y,pan.inverse),b=userPoint(e.clientX,e.clientY,pan.inverse);box=constrainBox({...pan.box,x:pan.box.x-(b.x-a.x),y:pan.box.y-(b.y-a.y)},base);render()}});
 function endPointer(e){pointers.delete(e.pointerId);pinch=null;pan=null;if(pointers.size===1)startPan([...pointers.values()][0]);if(!pointers.size)canvas.classList.remove('dragging');}
 canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
 dialog.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')change(1.5);if(e.key==='-')change(1/1.5);if(e.key==='0'){box={...base};render()}if(e.key.startsWith('Arrow')){const step=box.w*.12;box=constrainBox({...box,x:box.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y:box.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)},base);render()}});
 function saveExcel(){
  try{
   const result=exportChartExcel(svg);excelDownload?.dispose();excelDownload=prepareDownload(result.blob,result.filename);
   downloadStatus.hidden=false;downloadStatus.textContent='Excel ready · ';
   const link=document.createElement('a');link.href=excelDownload.url;link.download=excelDownload.filename;link.textContent='Download Excel ↓';downloadStatus.append(link);excelDownload.start();
  }catch(error){downloadStatus.hidden=false;downloadStatus.textContent='Excel export failed: '+error.message;}
 }
}
