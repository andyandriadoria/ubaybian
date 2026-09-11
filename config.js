function cleanBaseUrl(value){
 const raw=String(value??'').trim().replace(/\/+$/,'');
 if(!raw)return '';
 let url;
 try{url=new URL(raw);}catch{throw new Error('UBAYBIAN_API_BASE bukan URL yang valid.');}
 const localHost=['localhost','127.0.0.1','::1'].includes(url.hostname);
 if(url.protocol!=='https:'&&!(localHost&&url.protocol==='http:'))throw new Error('API harus menggunakan HTTPS (kecuali localhost).');
 if(url.username||url.password)throw new Error('Jangan menaruh credential di URL API.');
 return url.toString().replace(/\/$/,'');
}

export const apiBase=cleanBaseUrl(globalThis.UBAYBIAN_API_BASE??'');
export const backendEnabled=Boolean(apiBase);
export {cleanBaseUrl};
