import {chartMetadata} from './chart-data.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=1)=>n===null||n===undefined?'—':Number(n).toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
export function chart(points,actual,label,unit,{series=null,limits=null,cylinder=false,sequence=null,measurements=[],referenceLabel=null,seriesLabel=null}={}){
 const W=560,H=240,L=48,R=20,T=25,B=39;const extra=measurements.filter(m=>m.value!==null&&Number.isFinite(m.value));const xs=[...extra.map(m=>m.load),...points.map(p=>p[0]),...(actual?[actual[0]]:[]),...(series?series.map(p=>p[0]):[])];const ys=[...extra.map(m=>m.value),...points.map(p=>p[1]),...(actual?[actual[1]]:[]),...(series?series.map(p=>p[1]):[]),...(limits||[])].filter(Number.isFinite);
 if(!ys.length)return '<div class="notice info">No numeric measurements available for this chart.</div>';
 const xmin=cylinder?0.65:sequence?0.75:0,xmax=cylinder?6.35:sequence?sequence+.25:Math.max(100,...xs);let ymin=Math.min(...ys),ymax=Math.max(...ys);const pad=Math.max((ymax-ymin)*.18,Math.abs(ymax)*.04,1);ymin-=pad;ymax+=pad;
 const xticks=(cylinder?[1,2,3,4,5,6]:sequence?Array.from({length:sequence},(_,i)=>i+1):[0,25,50,75,100]).map(value=>({value,label:String(value)+(cylinder||sequence?'':'%')}));
 const model={version:1,title:label,xLabel:cylinder?'Cylinder':sequence?'Report sequence':'Engine load (%)',yLabel:label+' ('+unit+')',unit,
  axes:{xmin,xmax,ymin,ymax,xTicks:xticks,yTicks:Array.from({length:5},(_,i)=>{const value=ymin+(ymax-ymin)*i/4;return {value,label:fmt(value,Math.abs(value)<20?1:0)}})},
  series:[],limits:(limits||[]).map((value,i,all)=>({value,label:all.length===1||i===1?'Cylinder mean':i===0?'Lower deviation limit':'Upper deviation limit'})),notes:[]};
 const add=(name,kind,pts,color,marker,line=true)=>{if(pts?.length)model.series.push({name,kind,color,marker,line,points:pts.map(p=>({x:p[0],y:p[1]}))});};
 add(referenceLabel||(cylinder?'Reference':sequence?'Report history':'Shop test'),sequence?'history':'reference',points,'#0a8c76','circle');
 add(seriesLabel||(cylinder?'Cylinder measurement':'Measurements'),'measurement',series,'#1c5679','circle');
 if(actual)add('Selected report','measurement',[actual],'#1c5679','circle',false);
 for(const m of extra)add(m.label,'measurement',[[m.load,m.value]],m.color,'circle',false);
 const x=v=>L+(v-xmin)/(xmax-xmin)*(W-L-R),y=v=>H-B-(v-ymin)/(ymax-ymin)*(H-B-T);let html=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${esc(label)} chart"><title>${esc(label)} (${unit})</title>`;
 for(let i=0;i<5;i++){const val=ymin+(ymax-ymin)*i/4;html+=`<line class="tick" x1="${L}" y1="${y(val)}" x2="${W-R}" y2="${y(val)}"/><text x="${L-9}" y="${y(val)+3}" text-anchor="end">${fmt(val,Math.abs(val)<20?1:0)}</text>`}
 for(const v of cylinder?[1,2,3,4,5,6]:sequence?Array.from({length:sequence},(_,i)=>i+1):[0,25,50,75,100])html+=`<text x="${x(v)}" y="${H-B+20}" text-anchor="middle">${v}${cylinder||sequence?'':'%'}</text>`;
 html+=`<text x="${L}" y="13" class="label">${esc(unit)}</text><text x="${W-R}" y="${H-2}" text-anchor="end">${cylinder?'Cylinder':sequence?'Report sequence':'Engine load'}</text>`;
 for(const lim of limits||[])html+=`<line class="limit-line" x1="${L}" x2="${W-R}" y1="${y(lim)}" y2="${y(lim)}"><title>Limit ${fmt(lim)} ${esc(unit)}</title></line>`;
 if(points.length){html+=`<path class="curve" d="${points.map((p,i)=>(i?'L':'M')+x(p[0])+','+y(p[1])).join(' ')}"/>`;for(const p of points)html+=`<circle class="point" cx="${x(p[0])}" cy="${y(p[1])}" r="3"><title>${cylinder?'Cylinder '+p[0]:sequence?'Report '+p[0]:p[0]+'% load'}: ${fmt(p[1])} ${esc(unit)}</title></circle>`}
 if(series){html+=`<path class="actual-line" d="${series.map((p,i)=>(i?'L':'M')+x(p[0])+','+y(p[1])).join(' ')}"/>`;for(const p of series)html+=`<circle class="measurement" cx="${x(p[0])}" cy="${y(p[1])}" r="4.5"><title>Cylinder ${p[0]}: ${fmt(p[1])} ${esc(unit)}</title></circle>`}
 if(actual){html+=`<line stroke="#adc4d1" stroke-dasharray="3 5" x1="${x(actual[0])}" x2="${x(actual[0])}" y1="${T}" y2="${H-B}"/><circle class="measurement" cx="${x(actual[0])}" cy="${y(actual[1])}" r="6"><title>Report at ${fmt(actual[0],2)}%: ${fmt(actual[1])} ${esc(unit)}</title></circle>`}
 for(const m of extra)html+=`<line stroke="${m.color}" opacity=".3" stroke-dasharray="3 5" x1="${x(m.load)}" x2="${x(m.load)}" y1="${T}" y2="${H-B}"/><circle cx="${x(m.load)}" cy="${y(m.value)}" r="6" fill="${m.color}" stroke="white" stroke-width="2"><title>${esc(m.label)} at ${fmt(m.load,2)}%: ${fmt(m.value)} ${esc(unit)}</title></circle>`;
 return html+chartMetadata(model)+'</svg>';
}
