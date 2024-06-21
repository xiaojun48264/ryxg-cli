import{spawn as E,execFile as k}from"node:child_process";import{promisify as x}from"node:util";import y from"iconv-lite";import{debounce as M}from"lodash-es";import{existsSync as f,mkdirSync as g,statSync as w,createWriteStream as N,writeFileSync as L}from"node:fs";import{readFile as p}from"node:fs/promises";import m from"node:path";import A from"hjson";import{platform as B,networkInterfaces as U,tmpdir as P}from"node:os";import{fileURLToPath as S,URL as v}from"node:url";import z from"dayjs";import C from"archiver";import{getPidByProcessName as F,printLog as d}from"./logs.mjs";import Y from"tree-kill";import{Project as _}from"../launchers/project.mjs";import I from"xml-manifest-decoder";import O from"xml2js";import j from"adm-zip";async function R(e,...t){try{const{stdout:n}=await x(k)(e,[...t],{encoding:"buffer"});return Promise.resolve(h(n))}catch(n){return Promise.reject(n)}}function h(e){return y.decode(e,"utf-8")}function T(e){return y.decode(e,"cp936")}function $(e,t){const n="000000000000000000000000000000000000000000";if(e===t)return 0;let r=e?e.length:0,o=t?t.length:0;if(r===0&&o===0)return 0;if(r===0)return 1;if(o===0)return-1;const u=e.split("."),s=t.split("."),c=Math.min(u.length,s.length);for(let i=0;i<c;i++){let a=u[i],l=s[i];if(a.length<l.length?a=n.substring(0,l.length-a.length)+a:a.length>l.length&&(l=n.substring(0,a.length-l.length)+l),a<l)return 1;if(a>l)return-1}return u.length<s.length?1:u.length>s.length?-1:0}function b(e){const t=m.join(e,"./src/manifest.json");return f(t)}async function H(e){const t=m.join(e,b(e)?"src/manifest.json":"manifest.json");return f(t)?A.parse(await p(t,"utf-8")):{}}function J(e,t){let n="unpackage";e&&(n="dist");const r=m.resolve(t,n);return f(r)||g(r,{recursive:!0}),r}function Z(){let e="";const t=U();for(let n in t){const r=t[n];for(let o=0;o<r.length;o++){let{family:u,address:s,internal:c}=r[o];if(u==="IPv4"&&s!=="127.0.0.1"&&!c){s=s;break}}}return e}function V(e){const t={android:"android_base.apk"};return S(new v(`../../../base/${t[e]}`,import.meta.url))}async function X(e){const t=S(new v("../../../base/version.txt",import.meta.url));if(f(t)){let n=(await p(t,{encoding:"utf-8"})).split(/[(\r\n)\r\n]+/);for(let r of n){const[o,u]=r.split("=");if(o===e)return u}}return"0.0.0"}function q(e){if(f(e)){const t=w(e);return z(t.mtime).format("YYYY-MM-DD HH:mm:ss")}return""}function G(e){return new Promise(t=>{setTimeout(t,e)})}function W(e,t,n){let r=P().replace(/\\/g,"/");r=r+"/ry-cli/launcher",f(r)&&g(r,{recursive:!0});let o=`${r}/${new Date().getTime()}${t}`;n!==""&&(o=n);try{L(o,e,{flag:"w+"})}catch(u){console.error("\u5199\u5165\u6587\u4EF6\u5931\u8D25",u)}return o}async function K(e,t,n,r){let o=!1;if(f(e)){const u=await p(e,"utf-8");try{const s=JSON.parse(u);s&&(r!==""&&(s.id=r),s.arguments={pageName:t,query:n},W(JSON.stringify(s),"",e),o=!0)}catch{}}return o}function D(e){let t=P().replace(/\\/g,"/");return t=t+"/ry-cli/runTmp/"+e,f(t)||g(t,{recursive:!0}),t}function Q(e,t,n=".zip"){return new Promise((r,o)=>{try{const u=D(t),s=m.resolve(u,t+n),c=N(s),i=C("zip",{zlib:{level:5}});c.on("close",()=>{r(s)}),i.on("warning",a=>{if(a.code!=="ENOENT")throw a}),i.on("error",a=>{throw a}),i.pipe(c),i.directory(e,!1),i.finalize()}catch(u){o(u)}})}function ee(e){const t=M(()=>{e.deviceLauncher.pushResources(e)},500);return new Promise(n=>{let r=!1;const o=F(["node.exe"]);let u=[];const s=E("npm",["run","dev:app"],{shell:B()==="win32",cwd:e.projectPath});s.stdout.on("data",c=>{u.length===0&&(u=F(["node.exe"]).filter(i=>!o.includes(i))),c=h(c),d(c,"info"),c.includes("DONE  Build complete.")&&(r?(d("\u70ED\u66F4\u65B0","success"),t()):(n(!0),r=!0))}),s.stderr.on("data",c=>{c=T(c),d(c,"error")}),s.on("close",c=>{c!==0&&n(!1)}),s.on("error",c=>{c.message&&d(c.message,"error"),n(!1)}),process.on("exit",()=>{u.forEach(c=>{Y(c)})})})}function te(e){let t=!1;return(e.includes("/.svn/")||e.includes("\\.svn\\")||e.includes("/.git/")||e.includes("\\.git\\")||e.includes("/.settings/")||e.includes("\\.settings\\")||e.includes("/.project")||e.includes("\\.project"))&&(t=!0),t}function re(e,t,n){let r=!1,o=m.relative(e,t);if(!f(t))return!0;let u=w(t).isDirectory();if(o.startsWith("unpackage/")||o.startsWith("node_modules/")||u&&(o.startsWith("unpackage/")||o=="node_modules"))return r=!0,r;let s=new _,c=s.getUniCloudProviders();for(let a of c){let l=s.getUnicloudRoot(a);if(o.startsWith(l))return!0}let i=m.basename(t);if(n){if(i==".svn"||i==".git"||i==".settings"||i==".project"||i==".DS_Store"||i.endsWith(".nvue")||i.endsWith(".less")||i.endsWith(".sass")||i.endsWith(".scss")||i.endsWith(".nview")||i.endsWith(".map"))return!0}else if(i==".svn"||i==".git"||i==".settings"||i==".project"||i==".DS_Store")return!0;return r}async function ne(e){const t=await p(e);return await I(t)}async function ie(e,t){const n=new O.Parser({mergeAttrs:!0,attrkey:"ANYTHINGELSE",explicitArray:!1});let r=t==="buffer"?e.toString("utf-8"):await p(e,{encoding:"utf-8"});return r=r.replace(/^\ufeff/i,"").replace(/^\ufffe/i,""),await n.parseStringPromise(r)}function oe(e,t,n){try{const r=new j(e);return n==="buffer"?r.readFile(t):r.readAsText(t)}catch{return""}}function se(e,t){try{const n=new j(e).getEntries();let r="";return n.forEach(function(o){o.entryName.endsWith(t)&&(r=o.getData().toString("utf8"))}),r}catch{return""}}export{K as addPagePathToManifestFile,$ as compairVersion,ee as compileProject,Q as compressFilesStream,R as exeCMDAndroid,X as getBaseVersion,T as getCP936Str,q as getFileLastModifyTime,Z as getIPAddress,H as getManifest,V as getStandardPathByPlatform,D as getTemZipPath,h as getUTF8Str,J as getUnpackagePath,se as getZipEntriesFile,b as isCliProject,te as isFilterFile,re as isFilterFiles,ne as parseSpecilXML,ie as parseXML2Json,oe as readZipFile,G as sleep,W as writeStringToTmpFile};
