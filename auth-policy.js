export function permittedUser(user,allowedUid){return Boolean(user&&typeof allowedUid==='string'&&allowedUid&&user.uid===allowedUid);}
export function loginEmail(username,config){
 if(typeof username!=='string'||username!==config.username)throw Error('Invalid username or password.');
 return config.loginEmail;
}
export function validateReferencePayload(value){
 if(value?.version!==1||!value.profiles?.RUBY||!value.leadVesselReference?.points?.length)throw Error('Vessel reference data is unavailable.');
 return value;
}
export function parseReferenceDocument(document){
 const payload=document?.fields?.payload?.stringValue;
 if(typeof payload!=='string')throw Error('Vessel reference data is unavailable.');
 let value;try{value=JSON.parse(payload);}catch{throw Error('Vessel reference data is unavailable.');}
 return validateReferencePayload(value);
}
