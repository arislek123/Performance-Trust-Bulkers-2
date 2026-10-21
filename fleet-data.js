export const profiles=Object.create(null);
export function installProfiles(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!data.RUBY||Object.values(data).some(p=>!p.id||!p.shop||!p.headers||!p.rows||!Array.isArray(p.columns)))throw Error('Vessel reference data is unavailable.');
 for(const key of Object.keys(profiles))delete profiles[key];
 Object.assign(profiles,data);
}
