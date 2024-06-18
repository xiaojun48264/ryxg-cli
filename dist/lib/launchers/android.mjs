import{promisify as A}from"node:util";import{LauncherBase as F}from"./base.mjs";import{exec as w,execSync as I}from"node:child_process";import{isBoolean as x}from"lodash-es";import D from"node:os";import{getIPAddress as E,exeCMDAndroid as u,compairVersion as C,getStandardPathByPlatform as k,getBaseVersion as N,getFileLastModifyTime as T,compressFilesStream as B,getUTF8Str as v,addPagePathToManifestFile as M,isFilterFile as L}from"../utils/tools.mjs";import{existsSync as S}from"node:fs";import b from"node:path";import{Mobile as j}from"../utils/mobile.mjs";import{Project as $}from"./project.mjs";import{App as O}from"./app.mjs";import{getPortPromise as H}from"portfinder";import{WifiServer as R}from"../service/wifiServer.mjs";import{runLogs as W,printLog as U}from"../utils/logs.mjs";var V=Object.defineProperty,G=(g,t,e)=>t in g?V(g,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):g[t]=e,d=(g,t,e)=>(G(g,typeof t!="symbol"?t+"":t,e),e);let m,y="",o="";class _ extends F{constructor(){super(),d(this,"httpPort","0"),d(this,"httpPath",`http://127.0.0.1:${this.httpPort}/static/`),d(this,"webSocketPort",0),d(this,"httpProPID",0),d(this,"useLan",!1),d(this,"isCustomBase",!1),d(this,"basePath",""),d(this,"hasBuildError",!1),d(this,"wifiServer",null)}getIP(){let t="127.0.0.1";return this.useLan&&(t=E()),t}setHasBuildError(t){this.hasBuildError=t}getHasBuildError(){return this.hasBuildError}async restartApp(t){return await this.stopApp(),await this.startApp()}async startApp(){const t=this.currentApp?.type;if(this.currentApp.appID&&this.currentMobile.udid)try{const e=`${this.currentApp.getPackageName()}/${t==="uni-app-x"?"io.dcloud.uniapp.UniAppActivity":"io.dcloud.PandoraEntry"}`;await u(o,"-s",this.currentMobile.udid,"shell","am","start",e)}catch{return console.error("\u542F\u52A8App\u5931\u8D25"),!1}return!0}async installBase(t){let e=!0;if(this.currentMobile.udid)try{await u(o,"-s",this.currentMobile.udid,"install","-r","-d","-t",t)}catch{console.error("\u5B89\u88C5\u57FA\u5EA7\u5931\u8D25"),e=!1}return e}async isAppExist(){if(this.currentApp.appID&&this.currentMobile.udid){const t=this.currentApp.getPackageName();if((await u(o,"-s",this.currentMobile.udid,"shell","pm","list","packages",t)).includes(t))return!0}return!1}async isAppNeedUpdate(){let t=!1,e=!1;if(this.currentApp.appID&&this.currentMobile.udid)try{const r=this.currentApp.getPackageName(),i=(await u(o,"-s",this.currentMobile.udid,"shell","dumpsys","package",r)).split(/[(\r\n)\r\n]+/);let a="";for(let s of i){const n=s.indexOf("versionName"),p=s.indexOf("firstInstallTime");if(p>=0)try{const l=p+16+1,c=s.substring(l);if(!a){a=c;const h=new Date(c||new Date),f=new Date(this.currentApp?.getAppTime()||new Date);console.log("devicesTime",h,"apkTime",f),h<f&&(e=!0)}}catch{}if(n>=0){const l=n+11+1,c=s.substring(l),h=this.currentApp.getAppVersion();if(console.log("currentVersion",c,"baseVersion",h),C(c,h)){t=!0;break}}}}catch(r){console.error(r)}return t||e}async uninstallBase(){if(this.currentApp.appID&&this.currentMobile.udid){const t=this.currentApp.getPackageName();try{await u(o,"-s",this.currentMobile.udid,"uninstall",t)}catch{return console.error("\u5378\u8F7D\u57FA\u5EA7\u5931\u8D25"),!1}}return!0}async run(t){this.setRunningState(1),this.setMobile(t.mobile),this.setDeviceLauncher(t.deviceLauncher),this.httpPort.toString()==="0"&&this.getHttpPath();const e=parseInt(this.httpPort);await this.createPortAgent(e,this.currentMobile.udid)||(this.useLan=!0);const r=new $;t.projectNatureId.includes("UniApp")&&(r.setType("UniApp"),r.setCompliePath(t.compilePath)),r.setAppID(t.appid||""),r.setPath(t.projectPath),this.setCurrentProject(r);const i=new O;t.androidBasePath?(await this.initCustomBaseAppInfo(r.getAppID(),i,t.androidBasePath,r.getPath(),r.getType()),this.isCustomBase=!0):(t.androidBasePath=k("android"),i.setAppID("io.dcloud.HBuilder"),i.setAppVersion(await N("android_version")));const a=T(t.androidBasePath);if(i.setAppTime(a),i.setName(t.appName),this.basePath=t.androidBasePath,!S(this.basePath)){console.error("\u57FA\u5EA7\u4E0D\u5B58\u5728");return}i.setProject(r),this.setCurrentApp(i);const s=await this.isAppExist();let n=!0;s&&(n=await this.isAppNeedUpdate(),n&&await this.uninstallBase()),(!s||s&&n)&&await this.installBase(this.basePath),await this.stopApp();let p=await this.createWifiServer(t.mobile.udid);if(!p)return console.error("\u521B\u5EFA\u4EE3\u7406\u51FA\u9519"),!1;p=await this.startBaseServer(t.mobile.udid),W();let l=t.compilePath+"/";if(r.getType()==="UniApp"){const f=t.pagePath,P=t.pageQuery;f!==""&&await this.doRunToPage(r,f,P)}let c=0;const h=setInterval(()=>{this.getRunningState()===2&&clearInterval(h);const f=this.wifiServer?.getClientInfo();console.log("\u68C0\u67E5\u5BA2\u6237\u7AEF\u662F\u5426\u94FE\u63A5",f),f!==""&&(B(l,this.currentApp.getName()).then(P=>{this.pushResources(P,!0)}).catch(P=>{console.error(P)}),clearInterval(h)),c>=30&&(clearInterval(h),console.error("\u540C\u6B65\u8D44\u6E90\u5931\u8D25\u6388\u6743"),this.currentApp.getIsCustomBase()&&console.error("\u79BB\u7EBF\u57FA\u5EA7")),c++},1e3);return p||!1}async startBaseServer(t){if(this.currentApp.appID){const e=this.getIP(),r=this.currentApp.getPackageName()+"/io.dcloud.debug.PullDebugActivity";await u(o,"-s",t,"shell","am","start","-n",r,"--es","port",this.webSocketPort.toString(),"--es","ip",e,"--es","appid",this.currentApp.getID())}return!1}async stopApp(){if(this.currentApp.appID&&this.currentMobile.udid)try{await u(o,"-s",this.currentMobile.udid,"shell","am","force-stop",this.currentApp.getPackageName())}catch{return!1}return!0}async getMobileList(t=!0){let e=[];if(o=await this.getADBPath(),!o)return e;try{const r=(await u(o,"devices")).split(/[(\r\n)\r\n]+/);for(let i of r){if(i.indexOf("List of devices attached")>=0||i==""||i.indexOf("* daemon not running")>=0||i.indexOf("* daemon started successfully")>=0||i.indexOf("adb serveris ")>=0)continue;if(i.includes("unauthorized")){console.error("\u8BBE\u5907\u672A\u6388\u6743\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u786E\u8BA4\u6388\u6743");continue}let a=i.split("	"),s=new j;s.name=a[0],s.udid=a[0],s.platform="android";try{const n=await u(o,"-s",s.udid,"shell","getprop","ro.product.brand"),p=await u(o,"-s",s.udid,"shell","getprop","ro.product.model");s.name=`${n.trim()} ${p.trim()} - ${s.udid}`}catch(n){console.error(n)}try{let n=await u(o,"-s",s.udid,"shell","getprop","ro.build.version.release");n=n.trim(),s.version=n}catch(n){console.error(n);continue}try{let n=await u(o,"-s",s.udid,"shell","getprop","ro.product.cpu.abilist");s.cpuAbi=n.trim().toLocaleLowerCase().split(",")}catch(n){console.error(n)}e.push(s)}t&&e.length===0&&(await this.terminateADB(),e=await this.getMobileList(!1))}catch(r){console.error(r)}return e}async getADBPath(){let t=await this.getToolPath("android");if(!t){t=await this.getToolPath("default");const e=D.platform()==="win32";if(y=b.resolve(t,e?"./adb.exe":"./adb"),e){const r=await this.getRunningAdb();if(r){const i=await this.getAdbByPid(r);i&&(y=i)}}}return S(y)||(y=""),y}async getRunningAdb(){try{const{stdout:t}=await A(w)("cmd /c netstat -ano | findstr 5037",{encoding:"binary"});if(t=="")return"";{let e=t.trim(),r="",i=e.replace(/\r\n/g,`
`).split(`
`);for(let a of i)if(a.indexOf("listening")>=0||a.indexOf("LISTENING")>=0){let s=a.replace(/\r\n/g,`
`).split(" ");r=s[s.length-1];break}return r}}catch{return""}}async getAdbByPid(t){let e="";const r=this.isWin11Platform()?'cmd /c powerShell "Get-Process -id '+t+' | select-object path"':"wmic process where handle='"+t+"' get executablePath,handle";try{const{stdout:i}=await A(w)(r,{encoding:"buffer"});let a=v(i).replace(/\r\n/g,`
`).split(`
`);for(let s of a){let n=s.indexOf(".exe");if(n>=0&&!this.has360(s)){e=s.substring(0,n+4);break}}return e}catch(i){console.error(this.isWin11Platform()?"win11 powershell error:":"wmic error:"+i)}return e}has360(t){return t.toLocaleLowerCase().includes("360")}isWin11Platform(){if(x(m))return m;const t=D.release();if(t.startsWith("11"))m=!0;else{const e=t.split(".")||[];parseInt(e[e.length-1])>=22e3?m=!0:m=!1}return m}async terminateADB(){const t=await this.getToolPath("default");if(D.platform()=="win32")if(this.isWin11Platform()){const e="wmic process where caption='adb.exe' get executablePath,handle";let{stdout:r}=await A(w)(e,{encoding:"buffer"}),i=v(r).replace(/\r\n/g,`
`).split(`
`);for(let a of i)if(a.indexOf(t)>=0){let s=a.trim().split(/\s+/)||[];const n=Number(s[s.length-1]);if(n&&!isNaN(n))try{await A(w)(`taskkill /F /PID ${n}`,{shell:"cmd.exe"})}catch{}}}else{const e=`cmd /c powerShell "Get-Process | Where-Object { $_.ProcessName -eq 'adb' -and $_.Path -like '*${t}*' } | Stop-Process"`;try{await A(w)(e,{encoding:"buffer"})}catch{}}else if(D.platform()=="darwin"){let e=I("ps aux | grep adb | awk '{print $2}'",{encoding:"binary"}),[r]=e.replace(/\r\n/g,`
`).split(`
`)||[];if(r)try{I(`kill -9 ${r}`,{encoding:"binary"})}catch{}}return!0}getHttpPath(){const t=this.getDeviceLauncher();let e="";if(t){this.httpPort=t.getHttpPort().toString(),e=`http://${this.getIP()}:${this.httpPort}/static/`;const r=t.getChildProcess();let i=0;r&&(i=r.pid),this.setHttpProPID(i)}return e}setHttpProPID(t){this.httpProPID=t}async createPortAgent(t,e){try{await u(o,"-s",e,"reverse",`tcp:${t}`,`tcp:${t}`)}catch(r){return console.error(r),!1}return!0}async initCustomBaseAppInfo(t,e,r,i,a){}async createWifiServer(t){return this.webSocketPort=await H(),this.wifiServer=new R(this.webSocketPort),this.wifiServer.initState(),this.wifiServer.setCurrentLauncher(this),this.currentApp.appID&&(this.wifiServer.applicationName=this.currentApp.getName()),this.useLan?!0:this.createPortAgent(this.webSocketPort,t)}async doRunToPage(t,e,r){let i="";t.getAppID()===""&&(i=this.uniAppVueTempAppID);const a=b.resolve(t.getCompilePath(),"manifest.json");await M(a,e,r,i)}pushResources(t,e=!1){let r=!1;if(this.wifiServer){const i=this.getCurrentProject(),a={mobile:{},contents:{refreashType:"reload",app:{},fileInfo:[],project:{}}};i?.getAppID()&&(a.contents.project.type=i.getType(),a.contents.project.appID=i.getAppID());const s=this.getHttpPath();if(s==="")return console.error("\u83B7\u53D6Http\u670D\u52A1\u5931\u8D25"),!1;a.contents.fileInfo.push({action:"writeFile",sourcePath:s+"?path="+t,name:b.basename(t),fullPackage:!0,firstInstall:e}),this.currentApp.getAppID()&&(a.contents.app.appID=this.currentApp.getID(),a.contents.app.customBase=this.currentApp.getIsCustomBase());const n=JSON.stringify(a);console.log("\u63A8\u9001\u8D44\u6E90"),this.wifiServer.sendSyncFileMsg(n),r=!0}return r}async isNeedFullUpdate(t,e){let r=!1;return e!=""&&t.length==0&&this.currentApp.getAppID()&&(r=!0,B(e,this.currentApp.getID()).then(i=>{this.pushResources(i)}).catch(i=>{U("\u540C\u6B65\u6587\u4EF6\u5931\u8D25","error"),console.error(i)})),r}async pushResource(t=[],e,r=-1,i){if(await this.isNeedFullUpdate(t,e))return!0;if(this.wifiServer){const a={mobile:{},contents:{associatePaths:"",app:{},fileInfo:[]},project:{}},s=this.getCurrentProject();s.getAppID()&&(a.project.type=s.getType(),a.project.appID=s.getAppID());const n=this.getHttpPath();if(n==="")return console.error("\u83B7\u53D6Http\u670D\u52A1\u5931\u8D25"),!1;for(const p of t){const l={action:"writeFile"};if(L(p))continue;l.sourcePath=n+"?path="+e+"/"+p;let c=p;if(c.lastIndexOf("/")==-1)c="/";else if(s.getAppID()&&(c=this.getPushDestPath(p,s),c==""))continue;l.path=c,l.name=b.basename(p),l.fullPackage=!1,a.contents.fileInfo.push(l)}if(a.contents.fileInfo.length===0)return!0;this.currentApp.getID()&&(a.contents.app.appID=this.currentApp.getID(),a.contents.app.customBase=this.currentApp.getIsCustomBase()),a.contents.refreashType=this.getRefreshTypeByFiles(t,r),await this.wifiServer.sendSyncFileMsg(JSON.stringify(a))}return!1}getRefreshTypeByFiles(t,e=-1){let r="reload";if(e!=1&&(r="current"),t[0].endsWith(".dex"))return r="restart",r;for(let i of t)if(i=="manifest.json"){r="reload";break}return r}getPushDestPath(t,e){let r="";const i=e.getPath(),a=e.getCompilePath(),s=b.basename(t);return t==a+"/"+s&&(r="/"),t.includes(i)&&!t.includes(a)?r="":r=t.replace(s,""),r}}export{_ as AndroidLauncher};
