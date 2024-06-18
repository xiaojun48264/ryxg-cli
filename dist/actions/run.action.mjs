import{BuildAction as h}from"./build.action.mjs";import g from"ora";import v from"prompts";import c from"chalk";import{getManifest as P,isCliProject as B,compileProject as D,getUnpackagePath as b}from"../lib/utils/tools.mjs";import s from"node:path";import{createLauncher as C}from"../lib/launchers/index.mjs";import{DeviceLauncher as j}from"../lib/launchers/deviceLauncher.mjs";import{printLog as w}from"../lib/utils/logs.mjs";class L extends h{async handle(i,u){const n=i.find(a=>a.name==="platform")?.value,l=u.find(a=>a.name==="custom")?.value,p=u.find(a=>a.name==="path")?.value,f=g("\u83B7\u53D6\u8BBE\u5907\u5217\u8868...").start(),m=await C(n).getMobileList();f.stop();const d=await P(p),o={adbPath:"",androidBasePath:"",androidSimulatorPort:"26944",appName:d.name||"",appid:d.appid||"",compilePath:"",isCli:B(p),model:"",name:"",pagePath:"",pageQuery:"",platform:n,projectNatureId:"UniApp_Vue",projectPath:p,uuid:"",version:"",mobile:{},deviceLauncher:new j};if(n==="android"){const a=await v([{name:"udid",type:"select",message:"\u9009\u62E9\u8FD0\u884C\u8BBE\u5907",choices:m.map(r=>({title:r.name,value:r.udid}))}],{onCancel(){console.log(c.red("\u2716")+" \u64CD\u4F5C\u88AB\u53D6\u6D88"),process.exit(1)}}),t=m.find(r=>r.udid===a.udid);Object.assign(o,{name:t?.name,platform:t?.platform,uuid:t?.udid,version:t?.version,mobile:t})}F(o),await x(o,l),await D(o)||(console.log(c.red("\u2716")+" \u7F16\u8BD1\u5931\u8D25"),process.exit(1)),w("\u7F16\u8BD1\u6210\u529F","success"),await o.deviceLauncher.runDevice(o)}}function F(e){let i="unpackage";e.isCli&&(i=""),e.compilePath=s.resolve(e.projectPath,i,"dist","dev","app")}async function x(e,i){if(i){let u=b(e.isCli,e.projectPath);e.platform=="andorid"&&(e.androidBasePath=s.resolve(u,"debug","android_debug.apk"))}}export{L as RunAction};