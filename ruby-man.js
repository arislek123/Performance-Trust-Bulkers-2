const guide='https://www.manualslib.com/manual/1572750/Man-BAndw-S50me-B9-3-Tii.html';
export const rubyManSources={
 loTemp:{kind:'MAN operating guidance',label:'MAN S50ME-B9.3-TII Project Guide (May 2014), §8.05 p.1, printed p.179: engine-inlet system oil 40–47°C',url:guide+'?page=179'},
 cwIn:{kind:'MAN cooling design reference',label:'MAN S50ME-B9.3-TII Project Guide, §11.03 p.2 / §12.04 p.1, printed pp.208/214: air-cooler inlet water 36°C central FW / 32°C seawater',url:guide+'?page=208'},
 rpm:{kind:'MAN conditional speed guidance',label:'MAN S50ME-B9.3-TII Project Guide, §2.04 pp.2–3, printed pp.35–36: standard continuous speed ceiling 105% SMCR; approved load diagram and torsional-vibration restrictions apply',url:guide+'?page=35'},
 airBefore:{kind:'MAN tropical design reference',label:'MAN S50ME-B9.3-TII Project Guide, §11.03/§12.04: tropical design ambient air 45°C; not an installed alarm setpoint',url:guide+'?page=214'}
};
export const rubyManCoverage=[
 ['System oil inlet temperature','40–47°C','MAN operating guidance · J57'],
 ['Air-cooler water inlet','36°C central FW / 32°C seawater','Design reference · circuit confirmation required'],
 ['Engine speed','105% of confirmed SMCR speed','Standard speed ceiling only · approved load diagram required'],
 ['Air before filters','45°C','Tropical design reference · no alarm assigned'],
 ['Exhaust back pressure','350 mmWC at SMCR; 300 mmWC design margin','Existing check · verified static measuring point required'],
 ['SFOC','5% / 6% / 7% at the applicable guarantee load','Existing conditional check · corrected contractual basis required'],
 ['T/C speed and gas temperatures','Installed MET53MB manual / nameplate','No universal MAN numerical limit verified'],
 ['CW outlet / compressor outlet / receiver pressure','Plant and operating-point dependent','No fixed applicable MAN limit verified'],
 ['Pi / Pmax / Pcomp / EGT deviations','Existing configured tolerances','Workflow limits · not identified as MAN alarm settings']
];
const num=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
export function applyRubyMan(rows,report){
 if(report.vessel!=='RUBY'||!String(report.engine).toUpperCase().includes('S50ME-B9.3'))return;
 const c=report.context||{},v=report.values;
 function set(id,source,details){const row=rows.find(x=>x.id===id);if(!row)return;Object.assign(row,{...details,ruleBasis:rubyManSources[source].kind,evidence:rubyManSources[source]});if(row.actual===null)row.status='Missing input';}
 set('loTemp','loTemp',{status:v.loTemp===null?'Missing input':v.loTemp<40||v.loTemp>47?'Warning':'Within guidance',limit:'40–47°C (MAN engine-inlet guidance)',guidanceSummary:'MAN engine inlet: 40–47°C.',note:'Project-guide operating range, not the installed alarm or shutdown threshold.'});
 const circuit=c.coolingCircuit,confirmed=['central-fw','seawater'].includes(circuit)&&c.coolingCircuitVerified===true,waterLimit=circuit==='central-fw'?36:32;
 set('cwIn','cwIn',{status:!confirmed?'Reference only':v.cwIn>waterLimit?'Warning':'Within design reference',limit:confirmed?'MAN '+(circuit==='central-fw'?'central FW':'seawater')+' design inlet: '+waterLimit+'°C':'MAN design inlet: 36°C central FW / 32°C seawater',guidanceSummary:confirmed?'MAN design inlet: '+waterLimit+'°C.':'MAN design: 36°C FW / 32°C SW; circuit unconfirmed.',note:'Air-cooler coolant design reference only. Does not establish an installed alarm setting.'});
 const speed=num(c.smcrRpm),ready=speed!==null&&speed>0&&c.standardSpeedLimitVerified===true;
 set('rpm','rpm',{status:!ready?'Review basis':v.rpm>speed*1.05+1e-9?'Warning':'Within speed ceiling',limit:ready?'≤ '+(speed*1.05).toFixed(2)+' rpm (105% of confirmed SMCR)':'MAN standard: 105% SMCR; approved load diagram required',guidanceSummary:ready?'MAN speed ceiling: '+(speed*1.05).toFixed(2)+' rpm.':'SMCR speed / approved speed ceiling not confirmed.',note:'Single-axis speed check only. Torque, power, barred speed ranges and approved extensions remain subject to the vessel load diagram.'});
 set('airBefore','airBefore',{status:'Reference only',limit:'MAN tropical ambient design reference: 45°C',guidanceSummary:'MAN tropical design: 45°C; reference only.',note:'Design ambient condition, not a general maximum operating temperature or alarm.'});
}
