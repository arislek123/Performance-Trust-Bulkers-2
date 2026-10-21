import {readChartData} from './chart-data.js';
const rgb=hex=>{const h=/^#[0-9a-f]{6}$/i.test(hex||'')?hex:'#73828b';return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));};
const text=s=>String(s??'').replace(/[\u2010-\u2015−]/g,'-').replace(/Δ/g,'Delta ').replace(/≤/g,'<=').replace(/≥/g,'>=');
// Draw directly into PDF: no SVG image loading, blob-image CSP dependency,
// canvas taint, raster blur or image-onload promise in the download path.
export function drawVectorChart(doc,svg,left,top,width,height){
 const model=readChartData(svg),a=model.axes;
 const L=20,R=4,T=8,B=15,pw=width-L-R,ph=height-T-B;
 const x=v=>left+L+(v-a.xmin)/(a.xmax-a.xmin)*pw;
 const y=v=>top+T+ph-(v-a.ymin)/(a.ymax-a.ymin)*ph;
 doc.setFont('TrustFont','normal');doc.setFontSize(8);doc.setLineWidth(.18);
 doc.setTextColor(112,132,143);doc.setDrawColor(232,238,240);
 for(const tick of a.yTicks){doc.line(left+L,y(tick.value),left+width-R,y(tick.value));doc.text(text(tick.label),left+L-3,y(tick.value)+1,{align:'right'});}
 for(const [i,tick] of a.xTicks.entries())doc.text(text(tick.label),x(tick.value),top+height-B+5,{align:i===0?'left':i===a.xTicks.length-1?'right':'center'});
 doc.setTextColor(83,107,119);doc.text(model.unit==='kW'?'Power (kW)':text(model.unit),left+L,top+3.5);doc.text(text(model.xLabel),left+L+pw/2,top+height-1,{align:'center'});
 doc.setDrawColor(227,234,237);doc.rect(left+L,top+T,pw,ph);
 for(const limit of model.limits||[]){doc.setDrawColor(202,169,128);doc.setLineWidth(.2);doc.setLineDashPattern([1.2,1.5],0);doc.line(left+L,y(limit.value),left+width-R,y(limit.value));}
 doc.setLineDashPattern([],0);
 for(const series of model.series){
  const pts=series.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));if(!pts.length)continue;
  doc.setDrawColor(...rgb(series.color));doc.setFillColor(...rgb(series.color));doc.setLineWidth(series.kind==='prediction'?.65:.5);
  if(series.kind==='prediction'&&series.curve){const end=series.curve.to,k=series.curve.k;doc.setLineDashPattern([2,1.5],0);doc.path([{op:'m',c:[x(0),y(0)]},{op:'c',c:[x(end/3),y(0),x(2*end/3),y(0),x(end),y(k*end**3)]}]);doc.stroke();doc.setLineDashPattern([],0);}
  else if(series.line&&pts.length>1){doc.path(pts.map((p,i)=>({op:i?'l':'m',c:[x(p.x),y(p.y)]})));doc.stroke();}
  if(!series.marker)continue;
  for(const p of pts){
   if(series.marker==='square'){doc.setFillColor(255,255,255);doc.rect(x(p.x)-1.1,y(p.y)-1.1,2.2,2.2,'FD');}
   else if(series.kind==='reference'){doc.setFillColor(255,255,255);doc.circle(x(p.x),y(p.y),.95,'FD');}
   else{doc.setFillColor(...rgb(series.color));doc.circle(x(p.x),y(p.y),series.kind==='history'?1:1.45,'F');}
  }
 }
 doc.setLineDashPattern([],0);return model;
}
