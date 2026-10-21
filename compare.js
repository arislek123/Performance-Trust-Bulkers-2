import {fieldsFor,assess} from './engine.js';
export function compareReports(first,second,shop,rules){
 if(first.vessel!==second.vessel)throw Error('Comparison requires reports from the same vessel.');
 const firstAssessment=assess(first,shop,rules),secondAssessment=assess(second,shop,rules);
 const rows=firstAssessment.rows.map(x=>[x.id,x.label,x.unit]).map(([id,label,unit])=>{
  const a=first.values[id],b=second.values[id];
  return {id,label,unit,first:a,second:b,delta:a===null||b===null?null:b-a,percentage:a===null||b===null||a===0?null:(b-a)/Math.abs(a)*100,firstStatus:firstAssessment.rows.find(x=>x.id===id).status,secondStatus:secondAssessment.rows.find(x=>x.id===id).status};
 });
 return {first,second,firstAssessment,secondAssessment,rows,loadDifference:second.load-first.load};
}
