export class ApiClient {
  constructor(baseUrl){this.baseUrl=String(baseUrl||"").trim();}
  assertConfigured(){
    if(!this.baseUrl || this.baseUrl.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")){
      throw new Error("Admin API URL is not configured. Open assets/js/admin.js and replace PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE with your Google Apps Script /exec URL.");
    }
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/.test(this.baseUrl)){
      throw new Error("Invalid Admin API URL. Use the deployed Google Apps Script Web App URL ending in /exec.");
    }
  }
  async parse(r){
    const text=await r.text();
    if(!r.ok) throw new Error(`Admin API HTTP ${r.status}. Check the Google Apps Script deployment.`);
    try{return JSON.parse(text);}catch(_){
      const preview=text.replace(/\s+/g," ").slice(0,180);
      throw new Error(`Admin API returned non-JSON content. Check that the Web App URL is the /exec URL and access is set to Anyone. Response: ${preview}`);
    }
  }
  async get(params={}){
    this.assertConfigured();
    const maxAttempts=5;
    const delays=[500,900,1500,2500];
    let lastError=null;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      try{
        const url=new URL(this.baseUrl);
        Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
        url.searchParams.set("_ts",Date.now().toString());
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),12000);
        try{
          const response=await fetch(url,{cache:"no-store",redirect:"follow",signal:controller.signal});
          if(response.status===404 && attempt<maxAttempts-1) throw new Error("Temporary Google Apps Script 404.");
          return await this.parse(response);
        } finally { clearTimeout(timer); }
      }catch(error){
        lastError=error;
        if(attempt<maxAttempts-1) await new Promise(resolve=>setTimeout(resolve,delays[attempt]));
      }
    }
    throw new Error(`Admin API temporarily unavailable after ${maxAttempts} attempts. ${lastError?.message||""}`);
  }
  async post(params={}){
    this.assertConfigured();
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    try{
      return await this.parse(await fetch(this.baseUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams(params).toString(),redirect:"follow",cache:"no-store",signal:controller.signal}));
    } finally { clearTimeout(timer); }
  }
}
