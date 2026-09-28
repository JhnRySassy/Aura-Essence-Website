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
    const type=(r.headers.get("content-type")||"").toLowerCase();
    if(!r.ok) throw new Error(`Admin API HTTP ${r.status}. Check the Google Apps Script deployment.`);
    try{return JSON.parse(text);}catch(_){
      const preview=text.replace(/\s+/g," ").slice(0,180);
      throw new Error(`Admin API returned non-JSON content. Check that the Web App URL is the /exec URL and access is set to Anyone. Response: ${preview}`);
    }
  }
  async get(params={}){
    this.assertConfigured();
    const url=new URL(this.baseUrl);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
    return this.parse(await fetch(url,{cache:"no-store"}));
  }
  async post(params={}){
    this.assertConfigured();
    return this.parse(await fetch(this.baseUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams(params).toString()}));
  }
}
