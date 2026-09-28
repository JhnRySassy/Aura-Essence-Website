export class ApiClient {
  constructor(baseUrl){this.baseUrl=baseUrl;}
  async get(params={}){const url=new URL(this.baseUrl);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));const r=await fetch(url,{cache:"no-store"});return r.json();}
  async post(params={}){const r=await fetch(this.baseUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams(params).toString()});return r.json();}
}
