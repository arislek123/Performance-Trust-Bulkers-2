import {chartMetadata} from './chart-data.js';
export let leadVesselReference=null;
export function installLeadReference(data){
 if(!data||!Array.isArray(data.points)||data.points.length<2)throw Error('Trial reference data is unavailable.');
 leadVesselReference=Object.freeze({...data,points:Object.freeze(data.points.map(p=>Object.freeze({...p})))});
}
export function propulsionReference(vesselId){return vesselId==='RUBY'?leadVesselReference:null;}
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const num=v=>{if(v===null||v===undefined||v==='')return null;const s=String(v).trim().replace(',','.');return /^[+]?(?:\d+\.?\d*|\.\d+)$/.test(s)&&positive(Number(s))?Number(s):null;};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n).toLocaleString('en-GB',{maximumFractionDigits:d,minimumFractionDigits:d});

// Read labelled report cells; never infer power from engine load or SFOC.
export function propulsionPoint(report){
 const cells=report?.cells||{};
 function labelled(pattern,offsets){
  const entry=Object.entries(cells).find(([key,v])=>/^[A-Z]+\d+$/.test(key)&&pattern.test(clean(v)));
  if(!entry)return null;const [,col,row]=entry[0].match(/^([A-Z]+)(\d+)$/);
  for(const offset of offsets){const cell=col+(Number(row)+offset),value=num(cells[cell]);if(value!==null)return {value,cell};}
  return null;
 }
 const power=labelled(/^effective power$/i,[3,2,1,4]);
 const speed=labelled(/^(?:obs\.?|observed)\s*knots$/i,[1]);
 return {rpm:num(report?.values?.rpm),power:power?.value??null,speed:speed?.value??null,
  powerCell:power?.cell??null,speedCell:speed?.cell??null,date:report?.date,vessel:report?.vessel};
}

// Least squares in power (kW), zero intercept and a fixed cubic exponent.
// Least-squares cubic estimate; no approved trial corrections applied.
export function fitPrediction(points,axis='rpm'){
 const usable=points.filter(p=>positive(p[axis])&&positive(p.power));
 if(usable.length<2)return null;
 const numerator=usable.reduce((sum,p)=>sum+p.power*p[axis]**3,0);
 const denominator=usable.reduce((sum,p)=>sum+p[axis]**6,0);
 const k=numerator/denominator;
 if(!positive(k))return null;
 return {k,exponent:3,count:usable.length,predict:x=>positive(x)?k*x**3:x===0?0:null};
}
export function propulsionChart({reference=null,point=null,history=[],axis='rpm',width=760,height=360,id='propulsion-plot'}={}){
 axis=axis==='speed'?'speed':'rpm';
 const trials=reference?.points||[],valid=p=>positive(p?.[axis])&&positive(p?.power);
 const current=valid(point)?point:null,previous=history.filter(valid),model=fitPrediction(trials,axis);
 const observed=[...trials.filter(valid),...previous,...(current?[current]:[])];
 if(!observed.length)return '<div class="propulsion-empty">No reported '+(axis==='rpm'?'power / rpm':'power / observed speed')+' pair.</div>';
 const W=Math.max(240,Math.round(width)),H=Math.max(220,Math.round(height)),L=64,R=19,T=28,B=53,pw=W-L-R,ph=H-T-B;
 const xmax=Math.max(...observed.map(p=>p[axis]))*1.08;
 const curveEnd=Math.max(...observed.map(p=>p[axis]));
 const ymax=Math.ceil(Math.max(...observed.map(p=>p.power),model?.predict(curveEnd)||0)*1.12/1000)*1000;
 const x=n=>L+n/xmax*pw,y=n=>T+ph-n/ymax*ph;
 const label=axis==='rpm'?'Power–RPM':'P–V · Speed–Power',unit=axis==='rpm'?'rpm':'kn';
 const clip=esc(id)+'-clip';
 let svg=`<svg class="chart propulsion-chart" viewBox="0 0 ${W} ${H}" height="${H}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${label}: trial points, report point and estimated prediction curve"><title>${label}</title><desc>Squares: measured lead-vessel trials. Circle: selected report. Dashed line: cubic estimate fitted to all four trials. No operating limits or corrected performance assessment.</desc><defs><clipPath id="${clip}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs>`;
 const count=W<480?4:6;
 for(let i=0;i<5;i++){const v=ymax*i/4;svg+=`<line class="tick" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-9}" y="${y(v)+4}" text-anchor="end">${fmt(v)}</text>`;}
 for(let i=0;i<count;i++){const v=xmax*i/(count-1);svg+=`<text x="${x(v)}" y="${H-B+22}" text-anchor="${i===0?'start':i===count-1?'end':'middle'}">${fmt(v,axis==='speed'?1:0)}</text>`;}
 svg+=`<text class="label" x="${L}" y="15">Power (kW)</text><text class="label" x="${L+pw/2}" y="${H-8}" text-anchor="middle">${axis==='rpm'?'Engine speed (rpm)':'Reported ship speed (kn)'}</text><rect class="propulsion-frame" x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none"/><g clip-path="url(#${clip})">`;
 if(model){
  // Exact cubic Bezier representation of P=k*x^3, rather than straight segments.
  const endPower=model.predict(curveEnd);
  svg+=`<path class="propulsion-prediction" d="M${x(0)},${y(0)} C${x(curveEnd/3)},${y(0)} ${x(2*curveEnd/3)},${y(0)} ${x(curveEnd)},${y(endPower)}"><title>Prediction only: P=${model.k.toPrecision(7)} × ${unit}³. Least-squares fit to all ${model.count} measured trials.</title></path>`;
 }
 function title(p,name){return esc(name+' · '+fmt(p[axis],axis==='rpm'?2:3)+' '+unit+' · '+fmt(p.power)+' kW');}
 previous.forEach(p=>{svg+=`<circle class="propulsion-history-point" cx="${x(p[axis])}" cy="${y(p.power)}" r="4"><title>${title(p,'Previous report · '+clean(p.date))}</title></circle>`;});
 trials.filter(valid).forEach(p=>{svg+=`<g class="propulsion-trial"><rect class="propulsion-trial-hit" x="${x(p[axis])-16}" y="${y(p.power)-16}" width="32" height="32" fill="transparent"/><rect class="propulsion-trial-point" x="${x(p[axis])-4}" y="${y(p.power)-4}" width="8" height="8"/><title>${title(p,reference.vessel+' · '+p.test)}</title></g>`;});
 if(current){svg+=`<g><circle cx="${x(current[axis])}" cy="${y(current.power)}" r="22" fill="transparent"/><circle class="propulsion-current-halo" cx="${x(current[axis])}" cy="${y(current.power)}" r="11"/><circle class="measurement" cx="${x(current[axis])}" cy="${y(current.power)}" r="6"/><title>${title(current,current.vessel+' · selected report')}</title></g>`;}
 const chartModel={version:1,title:label,xLabel:axis==='rpm'?'Engine speed (rpm)':'Reported ship speed (kn)',yLabel:'Power (kW)',unit:'kW',
  axes:{xmin:0,xmax,ymin:0,ymax,xTicks:Array.from({length:count},(_,i)=>{const value=xmax*i/(count-1);return {value,label:fmt(value,axis==='speed'?1:0)}}),yTicks:Array.from({length:5},(_,i)=>({value:ymax*i/4,label:fmt(ymax*i/4)}))},
  series:[],limits:[],notes:reference?[reference.vessel+' · lead-vessel trials · '+reference.document+' · PDF p. '+reference.page,'Prediction only; not an engine operating limit.','Trial brake power and report effective power have not been independently reconciled.',...(axis==='speed'?['Trial speeds uncorrected; report STW/SOG unverified.']:[])]:['No sea-trial reference assigned.']};
 if(model)chartModel.series.push({name:'Prediction (estimate)',kind:'prediction',color:'#0a8c76',marker:null,line:true,curve:{k:model.k,exponent:3,from:0,to:curveEnd},points:Array.from({length:101},(_,i)=>{const value=curveEnd*i/100;return {x:value,y:model.predict(value)}})});
 if(previous.length)chartModel.series.push({name:'Previous reports',kind:'history',color:'#b4c4cc',marker:'circle',line:false,points:previous.map(p=>({x:p[axis],y:p.power,label:clean(p.date)}))});
 if(trials.length)chartModel.series.push({name:reference.vessel+' sea trials',kind:'reference',color:'#0a8c76',marker:'square',line:false,points:trials.filter(valid).map(p=>({x:p[axis],y:p.power,label:p.test}))});
 if(current)chartModel.series.push({name:current.vessel+' selected report',kind:'measurement',color:'#1c5679',marker:'circle',line:false,points:[{x:current[axis],y:current.power,label:clean(current.date)}]});
 svg+='</g>'+chartMetadata(chartModel)+'</svg>';
 return svg;
}

let resizeObserver=null;
export function mountPropulsion(root,{profile,point=null,history=[],axis='rpm',showHistory=false,onAxis=()=>{},onHistory=()=>{}}){
 resizeObserver?.disconnect();resizeObserver=null;
 const reference=propulsionReference(profile.id),hasTrials=Boolean(reference);
 const validHistory=history.filter(p=>positive(p.power)&&(positive(p.rpm)||positive(p.speed)));
 root.innerHTML=`<section class="panel propulsion-panel"><div class="panel-head"><div class="propulsion-tabs" role="tablist" aria-label="Propulsion chart"><button type="button" role="tab" id="propulsion-rpm-tab" aria-controls="propulsion-chart-host" aria-selected="${axis==='rpm'}" data-propulsion-axis="rpm">Power–RPM</button><button type="button" role="tab" id="propulsion-speed-tab" aria-controls="propulsion-chart-host" aria-selected="${axis==='speed'}" data-propulsion-axis="speed">P–V</button></div><button type="button" class="chart-open" data-chart-open aria-label="Expand propulsion chart">⤢</button></div><div class="propulsion-legend">${hasTrials?'<span><i class="propulsion-square"></i>Sea trials</span><span><i class="propulsion-dash"></i>Prediction</span>':''}${point?'<span><i class="propulsion-circle"></i>'+esc(profile.id)+'</span>':''}${validHistory.length?`<label><input type="checkbox" id="propulsion-history" ${showHistory?'checked':''}> Previous reports</label>`:''}</div><div id="propulsion-chart-host" role="tabpanel" aria-labelledby="propulsion-${axis}-tab"></div><div class="propulsion-caption">${hasTrials?'SBI CRONOS · lead vessel reference · Prediction only'+(axis==='speed'?' · Trial speeds uncorrected':''):'No sea-trial reference assigned.'}${point&&(!positive(point.power)||!positive(point[axis]))?' · Missing report '+(!positive(point.power)?'power':axis==='rpm'?'rpm':'observed speed'):''}</div></section>`;
 const host=root.querySelector('#propulsion-chart-host');
 const draw=()=>{host.innerHTML=propulsionChart({reference,point,history:showHistory?validHistory:[],axis,width:host.clientWidth||760});};
 root.querySelectorAll('[data-propulsion-axis]').forEach(button=>{button.onclick=()=>onAxis(button.dataset.propulsionAxis);});
 const checkbox=root.querySelector('#propulsion-history');if(checkbox)checkbox.onchange=()=>onHistory(checkbox.checked);
 draw();if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(draw);resizeObserver.observe(host);}
}

export function propulsionSourceHTML(vesselId){
 const reference=propulsionReference(vesselId);if(!reference)return '';
 return `<details class="section-spacing settings-section"><summary>Propulsion reference</summary><div class="settings-section-body"><p class="panel-sub">SBI CRONOS · lead vessel · engine 4806 · hull S-A089<br>M-110 Result of Sea Trial · PDF p. 11 · October 2015</p><div class="table-wrap"><table><thead><tr><th>Trial</th><th>rpm</th><th>Brake kW</th><th>Reported speed kn</th></tr></thead><tbody>${reference.points.map(p=>`<tr><td>${esc(p.test)}</td><td>${fmt(p.rpm,2)}</td><td>${fmt(p.power)}</td><td>${fmt(p.speed,3)}</td></tr>`).join('')}</tbody></table></div><p class="panel-sub">Prediction: P = k × x³; k = Σ(P × x³) / Σ(x⁶), fitted to all four trials. x is rpm or reported speed. No graph-derived points. Least-squares estimate; not a MAN-approved procedure.</p><p class="panel-sub">Report power: labelled Effective Power (kW). Ship speed: labelled Obs. Knots; STW/SOG unverified. Trial brake power and report power have not been independently reconciled. No weather or draught corrections, performance verdicts or engine operating limits.</p></div></details>`;
}
