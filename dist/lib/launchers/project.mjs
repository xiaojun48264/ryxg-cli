var c=(t,e,r)=>{if(!e.has(t))throw TypeError("Cannot "+r)},a=(t,e,r)=>(c(t,e,"read from private field"),r?r.call(t):e.get(t)),i=(t,e,r)=>{if(e.has(t))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(t):e.set(t,r)},n=(t,e,r,l)=>(c(t,e,"write to private field"),l?l.call(t,r):e.set(t,r),r),h,p,s,o,u;const d="UniApp",g="UniApp_Vue";class m{constructor(){i(this,h,""),i(this,p,""),i(this,s,""),i(this,o,""),i(this,u,"")}hasNature(e){return a(this,s).includes(e)}isUniApp(){return this.hasNature(d)}isUniAppVue(){return this.hasNature(g)}setCompliePath(e){n(this,o,e)}getCompilePath(){return a(this,o)}getUniCloudProviders(){return["aliyun","tcb"]}getUnicloudRoot(e){return"uniCloud-"+e}setPath(e){n(this,u,e)}getPath(){return a(this,u)}setAppID(e){n(this,h,e)}getAppID(){return a(this,h)}setName(e){n(this,p,e)}getName(){return a(this,p)}setType(e){n(this,s,e)}getType(){return a(this,s)}}h=new WeakMap,p=new WeakMap,s=new WeakMap,o=new WeakMap,u=new WeakMap;export{m as Project};