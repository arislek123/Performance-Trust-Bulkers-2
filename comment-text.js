export function shortComment(input){
 const row={...input,id:input.id.replace(/2$/,'')};
 if(row.guidanceSummary&&row.status!=='Missing input')return row.guidanceSummary;
 if(row.status==='Reference only')return 'Reference only.';
 if(row.status==='Missing input')return 'Measurement missing.';
 if(row.status==='Missing reference')return 'Reference missing.';
 if(row.id==='rise'&&row.status==='Review rule'){const t=Number(row.limit.match(/[≥>]\s*([\d.]+)/)?.[1]||20);return row.actual<t?'Below '+t+' bar; shop test is also below this limit.':'Shop test below '+t+' bar; confirm rule.';}
 if(row.id==='sfoc'){
  if(row.status==='Review basis'){
   const p=row.actual!==null&&row.reference>0?(row.actual/row.reference-1)*100:null;
   return (p===null?'':`${Math.abs(p).toFixed(1)}% ${p>=0?'above':'below'} shop test. `)+'Corrected comparison pending.';
  }
  return `Corrected deviation ${row.correctedDeviation?.toFixed(1)??'—'}%; tolerance ${row.allowedDeviation??'—'}%.`;
 }
 if(row.id==='scavPressure')return row.status==='Review basis'?'Comparable load and ambient conditions not confirmed.':row.limit.split(' (')[0]+'.';
 if(row.id==='tcSpeed')return row.status==='Review basis'?'Turbocharger speed limit not confirmed.':row.limit+'.';
 if(row.id==='backPressure')return row.status==='Review basis'?(row.basisPending?'Engine-model limit not confirmed.':'Back-pressure measuring point not confirmed.'):row.limit.split('; published')[0]+'.';
 if(row.id==='approach')return row.status==='Review basis'?'Clean-state baseline or comparable conditions not confirmed.':row.limit.split(' (')[0]+'.';
 if(row.id==='scavTemp')return row.status==='Review basis'?'At or above 65°C; vessel alarm not confirmed.':row.limit.replace('MAN guidance: 65°C; RUBY alarm verification pending','vessel alarm not confirmed')+'.';
 return 'Limit: '+row.limit.split(';')[0]+'.';
}
export function measuredLine(row){
 const fmt=v=>v===null||v===undefined?'—':Number(v).toFixed(row.id==='pi'?2:1);
 return `Measured ${fmt(row.actual)} ${row.unit} · ${row.id.startsWith('approach')?'Clean baseline':'Shop test'} ${fmt(row.reference)} ${row.unit}`;
}
export function cylinderComment(row){
 const unit=row.unit||(row.id==='egt'?'°C':row.id==='fuelIndex'?'index':'bar');
 const fmt=n=>n===null||n===undefined?'—':Number(n).toFixed(row.id==='pi'?2:1);
 const delta=row.delta===null?'—':(row.delta>0?'+':'')+fmt(row.delta);
 return `Measured ${fmt(row.actual)} ${unit} · Mean ${fmt(row.average)} ${unit} · Deviation ${delta} ${unit} · ${row.limit===null?'Reference only':'Limit ±'+row.limit+' '+unit}`;
}
