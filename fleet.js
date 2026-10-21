import {profiles} from './fleet-data.js';
export {profiles};
export function normalizeVessel(value){return String(value??'').toUpperCase().replace(/^NAME\s+OF\s+VESSEL\s*:\s*/,'').replace(/^M\s*\/?\s*V\s*[.\s]+/,'').replace(/[.]/g,'').replace(/\s+/g,' ').trim();}
export function detectProfile(cells){const found=Object.values(profiles).filter(p=>normalizeVessel(cells[p.headers.vessel_name])===p.id);if(found.length!==1)throw Error(found.length?'Ambiguous vessel identity in workbook.':'Vessel is missing or is not in the configured fleet.');return found[0];}
export function selectWorkbook(workbook,convertCell){
 const found=[];
 for(const name of workbook.SheetNames){if(/iso|corrected|macro|comment/i.test(name))continue;const sheet=workbook.Sheets[name],cells={};for(const [key,c] of Object.entries(sheet)){if(key[0]!=='!')cells[key]=convertCell(c);}try{const profile=detectProfile(cells);if(String(cells[profile.headers.engine_type]||'').toUpperCase().includes(profile.family))found.push({profile,cells,sheetName:name});}catch{}}
 if(found.length!==1)throw Error(found.length?'More than one engine report worksheet found. Import one report per workbook.':'No supported original ENG-004 worksheet found.');return found[0];
}
export function reportKey(raw){return JSON.stringify([raw.vesselId||detectProfile(raw.cells).id,raw.sheetName||'',raw.cells]);}
export function loadFleet(storage){
 const state={version:1,vesselId:'RUBY',reports:{},rules:{}};
 try{const saved=JSON.parse(storage.getItem('trustbulkers-fleet-v1')||'null');if(saved&&saved.version===1){state.vesselId=profiles[saved.vesselId]?saved.vesselId:'RUBY';state.reports=saved.reports||{};state.rules=saved.rules||{};return state;}}catch{}
 try{state.reports.RUBY=JSON.parse(storage.getItem('ruby-reports-v1')||'[]');state.rules.RUBY=JSON.parse(storage.getItem('ruby-rules-v1')||'{}');}catch{}
 return state;
}
export function saveFleet(storage,state){storage.setItem('trustbulkers-fleet-v1',JSON.stringify(state));}
