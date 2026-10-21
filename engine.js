import {applyRubyMan} from './ruby-man.js';
import {profiles,normalizeVessel} from './fleet.js';
import {extendedChecks,monitoringDefaults} from './extended-checks.js';
export const fields = [
 ['pi','Average Pi','bar',null,23],['pmax','Average Pmax','bar',null,24],['pcomp','Average Pcomp','bar',null,26],['egt','Average exhaust temperature','°C',null,31],
 ['rpm','Engine speed','rpm','I17'],['fuelIndex','Fuel index ECU','%','K17'],['sfoc','Effective fuel consumption','g/kWh','E21'],['scavPressure','Scavenge pressure','bar','V37'],['scavTemp','Scavenge temperature','°C','A52'],['tcSpeed','Turbocharger speed','rpm','N46'],['filterDrop','Air filter pressure drop','mmWC','R46'],['coolerDrop','Air cooler pressure drop','mmWC','T46'],['cwIn','Cooling water inlet','°C','A46'],['cwOut','Cooling water outlet','°C','B46'],['lo','System lubricating oil pressure','bar','J50'],['airBefore','Air before filters','°C','B58'],['airIn','Air cooler inlet','°C','D58'],['airOut','Air cooler outlet','°C','G58'],['exhIn','Turbine exhaust inlet','°C','F38'],['exhOut','Turbine exhaust outlet','°C','H38'],['backPressure','Exhaust back pressure','mmWC','L46']
];
export const referenceKeys = {pi:'Average Pi, bar',pmax:'Average Pmax, bar',pcomp:'Average Pcomp, bar',egt:'Average Exhaust Gas Temp, °C',rpm:'Engine Speed',fuelIndex:'Pump Index',sfoc:'Effective FOC',scavPressure:'Scavenge air pressure',scavTemp:'Scavenge air Temperature',tcSpeed:'T/C Speed',filterDrop:'Air Filter pres. drop',coolerDrop:'Press. drop',cwIn:'Cool. Water In Temp',cwOut:'Cool. Water Out Temp',lo:'LO In Pressure',airBefore:'Air Temp before filters',airIn:'Air In Temp',airOut:'Air Out Temp',exhIn:'Exhaust Gas Inlet Temperature',exhOut:'Exhaust Gas Outlet Temperature',backPressure:'Exhaust Gas Back Pressure',rise:'Pressure Rise (Pmax-Pcomp), bar'};
export const defaults={...monitoringDefaults,pi:0.5,pmax:3,pcomp:3,egt:50,fuelIndex:110,drop:150,lo:2.2,rise:20,airDelta:14,cylPi:0.5,cylPmax:2,cylPcomp:2,cylEgt:15};
export function number(v){if(v===null||v===undefined||v==='')return null;if(typeof v==='string'){v=v.trim().replace(',','.');if(!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(v))return null;}return Number.isFinite(Number(v))?Number(v):null;}
const mean=a=>a.length&&a.every(v=>v!==null)?a.reduce((s,v)=>s+v,0)/a.length:null;
export function profileDefaults(profile=profiles.RUBY){return {...defaults,cylFuelIndex:3,...profile.limits};}
export function fieldsFor(profile=profiles.RUBY){
 const extras=[['barometric','Barometric pressure','mbar'],['receiverPressure','Exhaust receiver pressure','bar'],['tcOil','Turbocharger oil pressure','bar'],['loTemp','System oil inlet temperature','°C']];
 const result=[];
 for(const f of [...fields,...extras]){const [id,label,unit]=f,row=profile.rows[id],cell=profile.fields[id]??null;
  if(extras.includes(f)&&!cell)continue;
  const dual=profile.unitCount===2&&Object.hasOwn(profile.fields,id+'2');
  result.push([id,id==='fuelIndex'&&row?'Average fuel pump index':dual?label+' · Unit 1':label,id==='fuelIndex'&&row?'index':unit,cell,row??null]);
  if(dual)result.push([id+'2',label+' · Unit 2',unit,profile.fields[id+'2'],null]);
 }
 return result;
}
export function referenceKey(id,profile=profiles.RUBY){return Object.hasOwn(profile.references,id)?profile.references[id]:referenceKeys[id];}
export function extract(cells,context={},profile=profiles.RUBY,sheetName=profile.sheet){
 const h=profile.headers,vessel=normalizeVessel(cells[h.vessel_name]);
 if(vessel!==profile.id)throw Error('This profile accepts '+profile.id+' reports only. Vessel at '+h.vessel_name+': '+(vessel||'missing'));
 if(!String(cells[h.engine_type]||'').toUpperCase().includes(profile.family))throw Error('Unexpected engine type at '+h.engine_type+'. Expected '+profile.family+' layout.');
 if(number(cells[profile.cylinderCountCell])!==profile.columns.length||!String(cells['A'+profile.rows.pmax]||'').includes('Pmax')||!String(cells['A'+profile.rows.pcomp]||'').includes('Pcomp'))throw Error('The workbook layout does not match the '+profile.id+' profile.');
 const result={context,profile,vessel:profile.id,engine:cells[h.engine_type],date:cells[h.test_date],load:number(cells[h.load_pct]),cells,sheetName,values:{},cylinders:{},warnings:[...profile.warnings]};
 for(const [id,label,unit,cell,row] of fieldsFor(profile)){
  if(row){const vals=profile.columns.map(c=>number(cells[c+row]));result.cylinders[id]=vals;result.values[id]=mean(vals);const cacheCol='W',cached=number(cells[cacheCol+row]);if(cached===null||result.values[id]!==null&&Math.abs(cached-result.values[id])>0.05)result.warnings.push(label+': recalculated from '+vals.length+' cylinders; cached '+cacheCol+row+' is '+String(cells[cacheCol+row]??'blank')+'.');}
  else{result.values[id]=number(cell?cells[cell]:null);if(profile.id==='RUBY'&&id==='loTemp'&&!/inlet[\s\S]*engine|engine[\s\S]*inlet/i.test(String(cells.J56||''))){result.values[id]=null;result.warnings.push('System oil inlet temperature: source label not confirmed.');}}
 }
 for(const id of ['pi','pmax','pcomp','egt'])if(!result.cylinders[id])result.cylinders[id]=profile.columns.map(()=>null);
 for(let i=1;i<=profile.unitCount;i++){const suffix=i===1?'':'2',air=result.values['airOut'+suffix],cw=result.values['cwIn'+suffix];result.values['approach'+suffix]=air===null||cw===null?null:air-cw;}
 result.values.rise=result.values.pmax!==null&&result.values.pcomp!==null?result.values.pmax-result.values.pcomp:null;
 if(result.load===null||result.load<0||result.load>100)throw Error('Missing or invalid engine load at '+h.load_pct+'. Expected 0–100%.');
 if(profile.family==='S50ME-B'){const mop=number(cells.M21);if(mop!==null&&Math.abs(mop-result.load)>0.5)result.warnings.push('Reported load '+h.load_pct+' ('+result.load+'%) differs from MOP estimate M21 ('+mop+'%). '+h.load_pct+' is used for assessment.');}
 return result;
}
export function assess(report,shop,rules){
 const profile=report.profile||profiles.RUBY;rules={...profileDefaults(profile),...rules};shop=shop||profile.shop;
 const loads=Object.keys(shop).map(Number).sort((a,b)=>a-b);if(!loads.length)throw Error('No shop-test references available.');
 const refLoad=loads.reduce((a,b)=>Math.abs(b-report.load)<Math.abs(a-report.load)?b:a),ref=shop[refLoad],v=report.values;
 const rows=[...fieldsFor(profile),['rise','Pressure rise (Pmax − Pcomp)','bar']].map(([id,label,unit,cell,row])=>{
  const base=id.replace(/2$/,''),suffix=id.endsWith('2')?'2':'',actual=v[id]??null,key=referenceKey(id,profile),reference=number(key?ref[key]:null);let status='Reference only',limit='No evaluation limit configured',bad=false;
  if(['pi','pmax','pcomp','egt'].includes(base)){limit='±'+rules[base]+' '+unit;bad=actual!==null&&reference!==null&&Math.abs(actual-reference)>rules[base]+1e-9;status=reference===null?'Missing reference':bad?'Out of limit':'Within limit';}
  if(base==='fuelIndex'&&profile.id!=='NILOS'){limit='≤ '+rules.fuelIndex+'% of shop test';bad=actual!==null&&reference!==null&&actual>reference*rules.fuelIndex/100;status=reference===null?'Missing reference':bad?'Out of limit':'Within limit';}
  if(['filterDrop','coolerDrop'].includes(base)){limit='≤ '+rules.drop+'% of shop test';bad=actual!==null&&reference!==null&&actual>reference*rules.drop/100;status=reference===null?'Missing reference':bad?'Out of limit':'Within limit';}
  if(base==='lo'&&!profile.oilReferenceOnly){limit='> '+rules.lo+' bar (system oil '+cell+')';bad=actual!==null&&actual<=rules.lo;status=bad?'Out of limit':'Within limit';}
  if(base==='airOut'){const water=v[profile.airBasis+suffix];limit='≤ cooling water '+(profile.airBasis==='cwIn'?'inlet':'outlet')+' + '+rules.airDelta+'°C';bad=actual!==null&&water!==null&&actual>water+rules.airDelta;status=water===null?'Missing input':bad?'Out of limit':'Within limit';}
  if(base==='rise'&&!profile.riseReferenceOnly){limit='≥ '+rules.rise+' bar';bad=actual!==null&&actual<rules.rise;status=bad?'Out of limit':'Within limit';if(reference!==null&&reference<rules.rise){status='Review rule';limit+='; shop test itself is below threshold at this load';}}
  if(actual===null)status='Missing input';
  return {id,label,unit,actual,reference,delta:actual===null||reference===null?null:actual-reference,limit,status,source:row?sheetName(report)+'!'+profile.columns[0]+row+':'+profile.columns.at(-1)+row:cell?sheetName(report)+'!'+cell:'Calculated from cylinder means'};
 });
 extendedChecks(rows,report,rules,refLoad);
 applyRubyMan(rows,report);
 const cylinderRows=[];
 for(const id of ['pi','pmax','pcomp','egt',...(report.cylinders.fuelIndex?['fuelIndex']:[])])for(let i=0;i<profile.columns.length;i++){const a=report.cylinders[id][i],avg=v[id],t=rules[{pi:'cylPi',pmax:'cylPmax',pcomp:'cylPcomp',egt:'cylEgt',fuelIndex:'cylFuelIndex'}[id]],d=a===null||avg===null?null:a-avg;cylinderRows.push({id,cylinder:i+1,actual:a,average:avg,delta:d,limit:t,unit:id==='egt'?'°C':id==='fuelIndex'?'index':'bar',status:d===null?'Missing input':t===null?'Reference only':Math.abs(d)>t+1e-9?'Out of limit':'Within limit'});}
 return {refLoad,rows,cylinderRows,rules:{...rules},loadGap:report.load-refLoad};
}
function sheetName(report){return report.sheetName||'Service sheet';}

export function cylinderLabel(id){return {pi:'Pi',pmax:'Pmax',pcomp:'Pcomp',egt:'Exhaust temperature',fuelIndex:'Fuel pump index'}[id]||id;}
