export const monitoringDefaults={scavWarn:55,bpWarn:300,bpMax:350,scavDeviation:10,coolerApproach:5};
export const sources={
 scavTemp:{kind:'Monitoring warning / vessel alarm',label:'MAN ambient-temperature paper (2024), p.19; confirm installed vessel alarm',url:'https://www.man-es.com/docs/default-source/marine/tools/5510-0074-03.pdf?sfvrsn=fa9e1cee_6'},
 backPressure:{kind:'Model-specific project guidance / monitoring warning',label:'S50ME-B9.3 project guide, §15.03/15.05, pp.243/247–248; other engine models require applicability confirmation',url:'https://www.manualslib.com/manual/1572750/Man-BAndw-S50me-B9-3-Tii.html?page=247'},
 sfoc:{kind:'Model-specific guarantee-point guidance',label:'S50ME-B9.3 project guide, §2.08, p.46; other models require contractual applicability confirmation',url:'https://www.manualslib.com/manual/1572750/Man-BAndw-S50me-B9-3-Tii.html?page=46'},
 scavPressure:{kind:'Monitoring limit',label:'User-approved ±10% monitoring threshold; comparable load and ambient conditions required'},
 tcSpeed:{kind:'Verified maker limit',label:'Installed turbocharger manual / nameplate; maximum speed must be supplied and verified'},
 approach:{kind:'Monitoring limit',label:'User-approved +5°C degradation against a confirmed clean-state baseline'}
};
export function sfocTolerance(load){return load>=85&&load<=100?5:load>=65&&load<85?6:load>=50&&load<65?7:null;}
const num=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
export function extendedChecks(rows,report,rules,referenceLoad){
 const c=report.context||{},v=report.values,r={...monitoringDefaults,...rules},p=report.profile;
 const makerReady=!p||p.family==='S50ME-B'||c.makerGuidanceVerified===true;
 const row=id=>rows.find(x=>x.id===id);
 function set(id,base,status,limit,note){const x=row(id);if(!x)return;Object.assign(x,{status:x.actual===null?'Missing input':status,limit,ruleBasis:sources[base].kind,evidence:sources[base],note});}
 const alarm=num(c.scavAlarm);
 set('scavTemp','scavTemp',v.scavTemp>=r.scavWarn?'Warning':'Within limit',`Warning ≥${r.scavWarn}°C (monitoring); ${alarm!==null&&alarm>0?'confirmed vessel alarm ≥'+alarm+'°C':'vessel alarm not confirmed'}`,'Monitoring threshold; installed vessel alarm requires confirmation.');
 if(alarm!==null&&alarm>0&&v.scavTemp!==null&&v.scavTemp>=alarm)row('scavTemp').status='Critical';
 if(alarm===null&&v.scavTemp!==null&&v.scavTemp>=65){row('scavTemp').status='Review basis';row('scavTemp').note='Temperature reaches the published MAN guidance level; verify installed vessel alarm.';}
 const pressureRef=row('scavPressure').reference,comparable=c.scavComparable===true;
 set('scavPressure','scavPressure',!comparable?'Review basis':pressureRef===null||pressureRef<=0?'Missing reference':Math.abs(v.scavPressure-pressureRef)/pressureRef*100>r.scavDeviation+1e-9?'Warning':'Within limit',`±${r.scavDeviation}% versus ST (monitoring)`,comparable?`Comparable conditions confirmed; actual ${report.load}%, ST ${referenceLoad}%.`:'Confirm matching load and ambient conditions.');
 const corrected=num(c.correctedSFOC),reference=num(c.correctedReference),point=num(c.guaranteeLoad),tol=sfocTolerance(point),ready=makerReady&&c.sfocVerified===true&&corrected!==null&&corrected>0&&reference!==null&&reference>0&&point!==null&&tol!==null&&Math.abs(report.load-point)<=.01;
 set('sfoc','sfoc',ready?(corrected>reference*(1+tol/100)?'Warning':'Within limit'):'Review basis',ready?`Corrected SFOC ≤reference +${tol}% at verified ${point}% guarantee point`:'Corrected comparison and applicable guarantee basis pending',ready?'Verified corrected measurement, reference and contractual point.':'Requires verified corrected measurement/reference, guarantee point and model applicability.');
 if(ready){row('sfoc').correctedDeviation=(corrected/reference-1)*100;row('sfoc').allowedDeviation=tol;}
 for(let i=1;i<=(p?.unitCount||1);i++){
  const s=i===1?'':'2',bp=v['backPressure'+s],speed=v['tcSpeed'+s],max=num(c['tcMax'+s]),baseline=num(c['cleanApproach'+s]);
  set('backPressure'+s,'backPressure',c.backPressureVerified&&makerReady?(bp>=r.bpMax?'Critical':bp>=r.bpWarn?'Warning':'Within limit'):'Review basis',`Warning ≥${r.bpWarn} mmWC (monitoring); confirmed maximum <${r.bpMax} mmWC`,!makerReady?'Engine-model limit applicability not confirmed.':c.backPressureVerified?'Static pressure point verified.':'Confirm static pressure point after the turbocharger.');
  if(!makerReady&&row('backPressure'+s))row('backPressure'+s).basisPending=true;
  set('tcSpeed'+s,'tcSpeed',max!==null&&max>0?(speed>max?'Critical':'Within limit'):'Review basis',max!==null&&max>0?`Verified turbocharger maximum ≤${max} rpm`:'Turbocharger maximum speed not confirmed','Installed manual / nameplate limit required.');
  const air=v['airOut'+s],water=v['cwIn'+s],actual=air===null||water===null?null:air-water,readyCooler=c.coolerComparable===true&&baseline!==null&&baseline>=0;
  rows.push({id:'approach'+s,label:'Air cooler approach (Air out − CW in)'+((p?.unitCount||1)>1?' · Unit '+i:''),unit:'°C',actual,reference:baseline,delta:actual===null||baseline===null?null:actual-baseline,status:actual===null?'Missing input':!readyCooler?'Review basis':actual-baseline>=r.coolerApproach?'Warning':'Within limit',limit:`Warning: clean-state approach +${r.coolerApproach}°C (monitoring)`,source:'Calculated: '+(report.sheetName||'Service sheet')+'!'+(p?.fields['airOut'+s]||'G58')+' − '+(p?.fields['cwIn'+s]||'A46'),ruleBasis:sources.approach.kind,evidence:sources.approach,note:readyCooler?'Clean baseline and comparable conditions confirmed.':'Clean baseline and comparable conditions required.'});
 }
 return rows;
}
