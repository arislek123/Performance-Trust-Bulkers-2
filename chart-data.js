import {nativeChartSeries,addNativeChart} from './excel-native-chart.js';
const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decodeXML=s=>s.replace(/&(?:amp|lt|gt|quot|#39);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[s]));
export const chartMetadata=model=>'<metadata data-chart-data="1">'+escapeXML(JSON.stringify(model))+'</metadata>';
export function readChartData(source){
 const encoded=typeof source==='string'?source.match(/<metadata\b[^>]*data-chart-data[^>]*>([\s\S]*?)<\/metadata>/)?.[1]:null;
 const content=typeof source==='string'?encoded?decodeXML(encoded):null:source?.querySelector?.('metadata[data-chart-data]')?.textContent;
 if(!content)throw Error('This chart has no exportable data. Reopen the chart after refreshing the page.');
 const model=JSON.parse(content);
 if(model.version!==1||!Array.isArray(model.series)||!model.axes)throw Error('Invalid chart data.');
 return model;
}
export function chartWorkbook(model,XLSX){
 const wb=XLSX.utils.book_new();
 const overview=XLSX.utils.aoa_to_sheet([['TRUSTBULKERS PERFORMANCE TOOL']]);overview['A28']={t:'s',v:'Edit values in Chart data to update the chart.'};overview['!ref']='A1:N28';overview['!cols']=Array.from({length:14},()=>({wch:10}));XLSX.utils.book_append_sheet(wb,overview,'Chart');
 const rows=[['Series','Type',model.xLabel,model.yLabel,'Point'],...nativeChartSeries(model).flatMap(s=>s.points.map(p=>[s.name,s.kind,p.x,p.y,p.label||'']))];
 const data=XLSX.utils.aoa_to_sheet(rows);data['!cols']=[{wch:31},{wch:17},{wch:24},{wch:31},{wch:36}];data['!autofilter']={ref:data['!ref']};
 XLSX.utils.book_append_sheet(wb,data,'Chart data');
 const information=[['Chart',model.title],['X axis',model.xLabel],['Y axis',model.yLabel],...(model.notes||[]).map(n=>['Note',n])];
 for(const series of model.series)if(series.curve)information.push(['Prediction series',series.name],['Model','P = k × x^3'],['k',series.curve.k],['Exponent',3],['Fitting','Least squares in power; measured trial points only']);
 const info=XLSX.utils.aoa_to_sheet(information);info['!cols']=[{wch:24},{wch:105}];XLSX.utils.book_append_sheet(wb,info,'Chart information');
 if(model.limits?.length){const sheet=XLSX.utils.aoa_to_sheet([['Reference line',model.yLabel],...model.limits.map(l=>[l.label,l.value])]);sheet['!cols']=[{wch:30},{wch:28}];XLSX.utils.book_append_sheet(wb,sheet,'Reference lines');}
 return wb;
}
export function exportChartExcel(source,XLSX=globalThis.XLSX){
 if(!XLSX?.utils||!XLSX.write)throw Error('Excel export is unavailable. Refresh the page and try again.');
 const model=readChartData(source),workbook=chartWorkbook(model,XLSX);
 const bytes=addNativeChart(XLSX.write(workbook,{type:'array',bookType:'xlsx',compression:true}),model,XLSX);
 return {blob:new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename:'TRUSTBULKERS_'+model.title.replace(/[^a-zA-Z0-9]+/g,'_')+'.xlsx'};
}
