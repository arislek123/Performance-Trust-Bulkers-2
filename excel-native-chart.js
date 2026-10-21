// Native Office Open XML XY chart, linked to workbook cells. ZIP packaging
// uses the container API already bundled with the application's XLSX library.
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const C='http://schemas.openxmlformats.org/drawingml/2006/chart';
const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const P='http://schemas.openxmlformats.org/package/2006/relationships';
export function nativeChartSeries(model){
 return [...model.series,...(model.limits||[]).map(limit=>({name:limit.label,kind:'reference line',color:'#caa980',marker:null,line:true,dashed:true,points:[{x:model.axes.xmin,y:limit.value},{x:model.axes.xmax,y:limit.value}]}))];
}
const color=s=>/^#[0-9a-f]{6}$/i.test(s||'')?s.slice(1).toUpperCase():'73828B';
const textStyle=(size=1100)=>`<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}"><a:solidFill><a:srgbClr val="536B77"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="en-GB"/></a:p></c:txPr>`;
const title=(label,size=1200)=>`<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}"/></a:pPr><a:r><a:rPr lang="en-GB" sz="${size}"><a:solidFill><a:srgbClr val="1B3440"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${xml(label)}</a:t></a:r><a:endParaRPr lang="en-GB"/></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
function numberReference(series,column,start){
 const end=start+series.points.length-1,axis=column==='C'?'x':'y';
 return `<c:numRef><c:f>${xml("'Chart data'!$"+column+'$'+start+':$'+column+'$'+end)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${series.points.length}"/>${series.points.map((p,i)=>`<c:pt idx="${i}"><c:v>${p[axis]}</c:v></c:pt>`).join('')}</c:numCache></c:numRef>`;
}
export function nativeChartXML(model){
 let row=2;
 const seriesXML=nativeChartSeries(model).map((series,i)=>{
  const start=row;row+=series.points.length;if(!series.points.length)return '';
  const rgb=color(series.color),hollow=series.kind==='reference',line=series.line!==false;
  const stroke=line?`<a:solidFill><a:srgbClr val="${rgb}"/></a:solidFill><a:prstDash val="${series.kind==='prediction'||series.dashed?'dash':'solid'}"/>`:'<a:noFill/>';
  const marker=series.marker?`<c:marker><c:symbol val="${series.marker==='square'?'square':'circle'}"/><c:size val="${series.kind==='measurement'?8:6}"/><c:spPr><a:solidFill><a:srgbClr val="${hollow?'FFFFFF':rgb}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="${rgb}"/></a:solidFill></a:ln></c:spPr></c:marker>`:'<c:marker><c:symbol val="none"/></c:marker>';
  return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:strRef><c:f>${xml("'Chart data'!$A$"+start)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xml(series.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx><c:spPr><a:noFill/><a:ln w="${series.kind==='prediction'?28575:19050}">${stroke}</a:ln></c:spPr>${marker}<c:xVal>${numberReference(series,'C',start)}</c:xVal><c:yVal>${numberReference(series,'D',start)}</c:yVal><c:smooth val="0"/></c:ser>`;
 }).join('');
 function axis(id,cross,position,label,min,max,format){
  const grid=position==='l'?'<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E7EEF1"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>':'';
  return `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/><c:max val="${max}"/><c:min val="${min}"/></c:scaling><c:delete val="0"/><c:axPos val="${position}"/>${grid}${title(label,1100)}<c:numFmt formatCode="${xml(format)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="DCE6EA"/></a:solidFill></a:ln></c:spPr>${textStyle()}<c:crossAx val="${cross}"/><c:crosses val="min"/></c:valAx>`;
 }
 const a=model.axes,xFormat=model.xLabel.includes('(%)')?'0"%"':/speed.*kn/i.test(model.xLabel)?'0.0':'0';
 return `${header}<c:chartSpace xmlns:c="${C}" xmlns:a="${A}" xmlns:r="${R}"><c:date1904 val="0"/><c:lang val="en-GB"/><c:roundedCorners val="0"/><c:chart>${title(model.title,1500)}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${seriesXML}<c:axId val="100001"/><c:axId val="100002"/></c:scatterChart>${axis(100001,100002,'b',model.xLabel,a.xmin,a.xmax,xFormat)}${axis(100002,100001,'l',model.yLabel,a.ymin,a.ymax,Math.max(Math.abs(a.ymax),Math.abs(a.ymin))>=1000?'#,##0':'0.0')}<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea><c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/>${textStyle()}</c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>${textStyle()}</c:chartSpace>`;
}
function drawingXML(){
 return `${header}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${A}"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>25</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Performance chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${C}"><c:chart xmlns:c="${C}" xmlns:r="${R}" r:id="rIdChart1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
}
export function addNativeChart(bytes,model,XLSX){
 const CFB=XLSX.CFB;if(!CFB?.utils?.cfb_add)throw Error('Native Excel chart packaging is unavailable. Refresh the page and try again.');
 const container=CFB.read(new Uint8Array(bytes),{type:'array'}),root=container.FullPaths[0];
 const read=path=>{const index=container.FullPaths.indexOf(root+path);if(index<0)throw Error('Missing XLSX part: '+path);return new TextDecoder().decode(container.FileIndex[index].content);};
 const write=(path,value)=>{const content=new TextEncoder().encode(value),index=container.FullPaths.indexOf(root+path);if(index>=0){container.FileIndex[index].content=content;container.FileIndex[index].size=content.length;}else{CFB.utils.cfb_add(container,path,content);}};
 let sheet=read('xl/worksheets/sheet1.xml');
 if(!sheet.includes('xmlns:r='))sheet=sheet.replace('<worksheet ','<worksheet xmlns:r="'+R+'" ');
 sheet=sheet.replace(/<sheetView\b([^>]*)/,(_,attrs)=>'<sheetView showGridLines="0"'+attrs.replace(/\s+showGridLines="[^"]*"/,''));
 write('xl/worksheets/sheet1.xml',sheet.replace('</worksheet>','<drawing r:id="rIdNativeDrawing"/></worksheet>'));
 write('xl/worksheets/_rels/sheet1.xml.rels',`${header}<Relationships xmlns="${P}"><Relationship Id="rIdNativeDrawing" Type="${R}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
 write('xl/drawings/drawing1.xml',drawingXML());
 write('xl/drawings/_rels/drawing1.xml.rels',`${header}<Relationships xmlns="${P}"><Relationship Id="rIdChart1" Type="${R}/chart" Target="../charts/chart1.xml"/></Relationships>`);
 write('xl/charts/chart1.xml',nativeChartXML(model));
 const content=read('[Content_Types].xml').replace('</Types>','<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>');
 write('[Content_Types].xml',content);
 return CFB.write(container,{fileType:'zip',type:'array',compression:true});
}
