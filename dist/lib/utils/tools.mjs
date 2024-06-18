import{spawn as D,execFile as k}from"node:child_process";import{promisify as x}from"node:util";import y from"iconv-lite";import{debounce as M}from"lodash-es";import{existsSync as f,mkdirSync as p,statSync as w,createWriteStream as B,writeFileSync as N}from"node:fs";import{readFile as g}from"node:fs/promises";import m from"node:path";import E from"hjson";import{platform as U,networkInterfaces as L,tmpdir as P}from"node:os";import{fileURLToPath as v,URL as S}from"node:url";import _ from"dayjs";import $ from"archiver";import{getPidByProcessName as j,printLog as d}from"./logs.mjs";import z from"tree-kill";import{Project as C}from"../launchers/project.mjs";async function O(t,...e){try{const{stdout:i}=await x(k)(t,[...e],{encoding:"buffer"});return Promise.resolve(h(i))}catch(i){return Promise.reject(i)}}function h(t){return y.decode(t,"utf-8")}function F(t){return y.decode(t,"cp936")}function R(t,e){const i="000000000000000000000000000000000000000000";if(t===e)return 0;let r=t?t.length:0,o=e?e.length:0;if(r===0&&o===0)return 0;if(r===0)return 1;if(o===0)return-1;const l=t.split("."),s=e.split("."),c=Math.min(l.length,s.length);for(let n=0;n<c;n++){let u=l[n],a=s[n];if(u.length<a.length?u=i.substring(0,a.length-u.length)+u:u.length>a.length&&(a=i.substring(0,u.length-a.length)+a),u<a)return 1;if(u>a)return-1}return l.length<s.length?1:l.length>s.length?-1:0}function T(t){const e=m.join(t,"./src/manifest.json");return f(e)}async function Y(t){const e=m.join(t,T(t)?"src/manifest.json":"manifest.json");return f(e)?E.parse(await g(e,"utf-8")):{}}function I(t,e){let i="unpackage";t&&(i="dist");const r=m.resolve(e,i);return f(r)||p(r,{recursive:!0}),r}function A(){let t="";const e=L();for(let i in e){const r=e[i];for(let o=0;o<r.length;o++){let{family:l,address:s,internal:c}=r[o];if(l==="IPv4"&&s!=="127.0.0.1"&&!c){s=s;break}}}return t}function H(t){const e={android:"android_base.apk"};return v(new S(`../../../base/${e[t]}`,import.meta.url))}async function J(t){const e=v(new S("../../../base/version.txt",import.meta.url));if(f(e)){let i=(await g(e,{encoding:"utf-8"})).split(/[(\r\n)\r\n]+/);for(let r of i){const[o,l]=r.split("=");if(o===t)return l}}return"0.0.0"}function V(t){if(f(t)){const e=w(t);return _(e.mtime).format("YYYY-MM-DD HH:mm:ss")}return""}function q(t){return new Promise(e=>{setTimeout(e,t)})}function W(t,e,i){let r=P().replace(/\\/g,"/");r=r+"/ry-cli/launcher",f(r)&&p(r,{recursive:!0});let o=`${r}/${new Date().getTime()}${e}`;i!==""&&(o=i);try{N(o,t,{flag:"w+"})}catch(l){console.error("\u5199\u5165\u6587\u4EF6\u5931\u8D25",l)}return o}async function Z(t,e,i,r){let o=!1;if(f(t)){const l=await g(t,"utf-8");try{const s=JSON.parse(l);s&&(r!==""&&(s.id=r),s.arguments={pageName:e,query:i},W(JSON.stringify(s),"",t),o=!0)}catch{}}return o}function b(t){let e=P().replace(/\\/g,"/");return e=e+"/ry-cli/runTmp/"+t,f(e)||p(e,{recursive:!0}),e}function G(t,e,i=".zip"){return new Promise((r,o)=>{try{const l=b(e),s=m.resolve(l,e+i),c=B(s),n=$("zip",{zlib:{level:5}});c.on("close",()=>{r(s)}),n.on("warning",u=>{if(u.code!=="ENOENT")throw u}),n.on("error",u=>{throw u}),n.pipe(c),n.directory(t,!1),n.finalize()}catch(l){o(l)}})}function K(t){const e=M(()=>{t.deviceLauncher.pushResources(t)},500);return new Promise(i=>{let r=!1;const o=j(["node.exe"]);let l=[];const s=D("npm",["run","dev:app"],{shell:U()==="win32",cwd:t.projectPath});s.stdout.on("data",c=>{l.length===0&&(l=j(["node.exe"]).filter(n=>!o.includes(n))),c=h(c),d(c,"info"),c.includes("DONE  Build complete.")&&(r?(d("\u70ED\u66F4\u65B0","success"),e()):(i(!0),r=!0))}),s.stderr.on("data",c=>{c=F(c),d(c,"error")}),s.on("close",c=>{c!==0&&i(!1)}),s.on("error",c=>{c.message&&d(c.message,"error"),i(!1)}),process.on("exit",()=>{l.forEach(c=>{z(c)})})})}function Q(t){let e=!1;return(t.includes("/.svn/")||t.includes("\\.svn\\")||t.includes("/.git/")||t.includes("\\.git\\")||t.includes("/.settings/")||t.includes("\\.settings\\")||t.includes("/.project")||t.includes("\\.project"))&&(e=!0),e}function X(t,e,i){let r=!1,o=m.relative(t,e);if(!f(e))return!0;let l=w(e).isDirectory();if(o.startsWith("unpackage/")||o.startsWith("node_modules/")||l&&(o.startsWith("unpackage/")||o=="node_modules"))return r=!0,r;let s=new C,c=s.getUniCloudProviders();for(let u of c){let a=s.getUnicloudRoot(u);if(o.startsWith(a))return!0}let n=m.basename(e);if(i){if(n==".svn"||n==".git"||n==".settings"||n==".project"||n==".DS_Store"||n.endsWith(".nvue")||n.endsWith(".less")||n.endsWith(".sass")||n.endsWith(".scss")||n.endsWith(".nview")||n.endsWith(".map"))return!0}else if(n==".svn"||n==".git"||n==".settings"||n==".project"||n==".DS_Store")return!0;return r}export{Z as addPagePathToManifestFile,R as compairVersion,K as compileProject,G as compressFilesStream,O as exeCMDAndroid,J as getBaseVersion,F as getCP936Str,V as getFileLastModifyTime,A as getIPAddress,Y as getManifest,H as getStandardPathByPlatform,b as getTemZipPath,h as getUTF8Str,I as getUnpackagePath,T as isCliProject,Q as isFilterFile,X as isFilterFiles,q as sleep,W as writeStringToTmpFile};