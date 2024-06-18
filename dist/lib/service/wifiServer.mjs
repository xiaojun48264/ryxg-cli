import a,{WebSocketServer as g}from"ws";import{AndroidLauncher as p}from"../launchers/android.mjs";import{sleep as f}from"../utils/tools.mjs";var m=Object.defineProperty,S=(u,e,t)=>e in u?m(u,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):u[e]=t,i=(u,e,t)=>(S(u,typeof e!="symbol"?e+"":e,t),t);class _{constructor(e){i(this,"server",null),i(this,"connect",null),i(this,"clientID",""),i(this,"applicationName",""),i(this,"unsent_msgs",[]),i(this,"launcher",null),i(this,"port",0),i(this,"timers",null),this.port=e}initState(){try{this.server=new g({port:this.port}),this.server.on("connection",(e,t)=>{if(t.headers["x-checkserver-header"]){e.close();return}this.connect=e;const n=this.mergeUnSentMsg();this.connect.on("message",o=>{if(o==null||o==null)return;const r=JSON.parse(o.toString());r&&(this.getClientInfo()===""?this.saveClientInfo(r):r.contents?.logStr?this.printLog(r.contents?.logStr):r.returnValue&&r.returnValue.str&&this.printLog(r.returnValue.str))})}),this.server.on("listening",()=>{console.log("Wifi\u670D\u52A1\u5668\u76D1\u542C",this.port)}),this.checkServer()}catch(e){console.error(e)}}checkServer(){this.timers=setInterval(()=>{new a(`ws://localhost:${this.port}/test`,{headers:{"x-checkserver-header":"true"}}).on("error",()=>{console.error("Wifi\u670D\u52A1\u5668\u6CA1\u6709\u8FD0\u884C\u3002\u91CD\u65B0\u542F\u52A8..."),this.initState()})},1e3*20)}unCheckServer(){this.timers&&clearInterval(this.timers)}mergeUnSentMsg(){const e=(r,s)=>{const c={restart:3,reload:2,current:1},h=c[r]||0,l=c[s]||0;return h>l?r:s},t="debug";if(this.unsent_msgs.length<=0)return;let n=null,o=null;return this.unsent_msgs.length===1?n=JSON.parse(this.unsent_msgs[0]):this.unsent_msgs.forEach(r=>{try{const s=JSON.parse(r),c=s?.contents?.refreashType;c===t?o=s:n?(s.contents?.fileInfo?.forEach(h=>{h?.fullPackage&&(n.contents.fileInfo=[],n.contents.refreashType=c),n.contents.fileInfo.push(h)}),n.contents.refreashType=e(c,n.contents?.refreashType)):n=s}catch(s){console.error(s)}}),this.unsent_msgs=[],{debug:o,unsentMsg:n}}async sendSyncFileMsg(e){if(this.connect&&this.connect.readyState===this.connect.OPEN)return this.clientID!==""&&this.connect.send(e),!0;if(this.unsent_msgs.push(e),await f(1e3),!this.connect||this.connect?.readyState!==this.connect?.OPEN){const t="\u540C\u6B65\u8D44\u6E90\u7A0B\u5E8F\u5B8C\u6210",n=this.launcher?.currentMobile?.udid;n&&this.launcher?.restartApp({uuid:n,msg:t})}}saveClientInfo(e){let t=e.mobile.clientID;t&&(this.clientID=t)}getClientInfo(){return this.clientID}setCurrentLauncher(e){this.launcher=e}printLog(e,t){if(this.launcher){if(e=="application_Started"){let n=!1;this.launcher instanceof p&&(n=this.launcher.getHasBuildError()),n?e=`\u8FD0\u884C\u9879\u76EE\u6709\u751F\u6210\u9519\u8BEF\uFF1A${this.applicationName}`:e=this.getSpecialLogStr(e),t="error"}else e=this.getSpecialLogStr(e);e&&this.launcher.printLogToRunConsole(e,t||"error")}}getSpecialLogStr(e){return e=="application_Started"?e="\u5E94\u7528\u542F\u52A8":e=="HX_Device_Log_SyncResource_Completed"?e="\u540C\u6B65\u8D44\u6E90\u5B8C\u6210":e=="HX_Device_Log_StandarBase_Starting"?e="\u6807\u51C6\u57FA\u5EA7\u542F\u52A8":e=="HX_Device_Log_CustomBase_Starting"||e=="HX_Device_Log_customBase_Starting"?e="\u81EA\u5B9A\u4E49\u57FA\u5EA7\u542F\u52A8":e=="HX_Device_Log_CustomBase_Need_HX_Process"?(new Promise(t=>{setTimeout(t,210)}).then(()=>{console.log("\u62C9\u53D6\u57FA\u5EA7"),this.launcher?.restartApp?.({msg:!0})}),e=""):e=="\u91CD\u542F\u6210\u529F"&&(e=""),e}async closeConnection(){this.unCheckServer(),this.server?.close(()=>{console.log("Wifi\u670D\u52A1\u5668\u5173\u95ED")})}getApplicationName(){return this.launcher?.getCurrentApp()?.getName()||""}}export{_ as WifiServer};
