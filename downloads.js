// A retained URL allows a real second click if an embedded browser suppresses
// the initial programmatic download after asynchronous PDF generation.
export function prepareDownload(blob,filename,{document:doc=globalThis.document,URL:urls=globalThis.URL}={}){
 const url=urls.createObjectURL(blob);let revoked=false;
 return {url,filename,start(){
  const a=doc.createElement('a');a.href=url;a.download=filename;a.rel='noopener';a.style.display='none';doc.body.append(a);a.click();a.remove();
 },dispose(){if(!revoked){urls.revokeObjectURL(url);revoked=true;}}};
}
