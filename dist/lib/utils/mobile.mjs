var o=Object.defineProperty,r=(e,t,i)=>t in e?o(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,s=(e,t,i)=>(r(e,typeof t!="symbol"?t+"":t,i),i);class a{constructor(){s(this,"name"),s(this,"udid"),s(this,"version"),s(this,"cpuAbi"),s(this,"platform"),this.name="",this.udid="",this.version="",this.cpuAbi=[],this.platform=""}}export{a as Mobile};
