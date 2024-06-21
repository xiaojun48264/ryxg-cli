import{promisify as w}from"node:util";import{LauncherBase as k}from"./base.mjs";import{exec as y,execSync as I}from"node:child_process";import{isBoolean as T}from"lodash-es";import B from"node:os";import{getIPAddress as C,exeCMDAndroid as l,compairVersion as S,getStandardPathByPlatform as M,getBaseVersion as v,getFileLastModifyTime as j,compressFilesStream as E,getUTF8Str as F,parseSpecilXML as L,readZipFile as x,parseXML2Json as O,getZipEntriesFile as $,addPagePathToManifestFile as H,isFilterFile as R}from"../utils/tools.mjs";import{existsSync as N}from"node:fs";import b from"node:path";import{Mobile as V}from"../utils/mobile.mjs";import{Project as W}from"./project.mjs";import{App as _}from"./app.mjs";import{getPortPromise as U}from"portfinder";import{WifiServer as J}from"../service/wifiServer.mjs";import{runLogs as G,printLog as g}from"../utils/logs.mjs";var K=Object.defineProperty,X=(m,t,e)=>t in m?K(m,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):m[t]=e,f=(m,t,e)=>(X(m,typeof t!="symbol"?t+"":t,e),e);let A,D="",p="";class Z extends k{constructor(){super(),f(this,"httpPort","0"),f(this,"httpPath",`http://127.0.0.1:${this.httpPort}/static/`),f(this,"webSocketPort",0),f(this,"httpProPID",0),f(this,"useLan",!1),f(this,"basePath",""),f(this,"hasBuildError",!1),f(this,"wifiServer",null)}getIP(){let t="127.0.0.1";return this.useLan&&(t=C()),t}setHasBuildError(t){this.hasBuildError=t}getHasBuildError(){return this.hasBuildError}async restartApp(t){return await this.stopApp(),await this.startApp()}async startApp(){const t=this.currentApp?.type;if(this.currentApp&&this.currentMobile)try{const e=`${this.currentApp.getPackageName()}/${t==="uni-app-x"?"io.dcloud.uniapp.UniAppActivity":"io.dcloud.PandoraEntry"}`;await l(p,"-s",this.currentMobile.udid,"shell","am","start",e)}catch{return console.error("\u542F\u52A8App\u5931\u8D25"),!1}return!0}async installBase(t){let e=!0;if(this.currentMobile)try{await l(p,"-s",this.currentMobile.udid,"install","-r","-d","-t",t)}catch{console.error("\u5B89\u88C5\u57FA\u5EA7\u5931\u8D25"),e=!1}return e}async isAppExist(){if(this.currentApp&&this.currentMobile){const t=this.currentApp.getPackageName();if((await l(p,"-s",this.currentMobile.udid,"shell","pm","list","packages",t)).includes(t))return!0}return!1}async isAppNeedUpdate(){let t=!1,e=!1;if(this.currentApp&&this.currentMobile)try{const r=this.currentApp.getPackageName(),s=(await l(p,"-s",this.currentMobile.udid,"shell","dumpsys","package",r)).split(/[(\r\n)\r\n]+/);let n="";for(let i of s){const a=i.indexOf("versionName"),c=i.indexOf("firstInstallTime");if(c>=0)try{const o=c+16+1,u=i.substring(o);if(!n){n=u;const h=new Date(u||new Date),d=new Date(this.currentApp?.getAppTime()||new Date);console.log("devicesTime",h,"apkTime",d),h<d&&(e=!0)}}catch{}if(a>=0){const o=a+11+1,u=i.substring(o),h=this.currentApp.getAppVersion();if(console.log("currentVersion",u,"baseVersion",h),S(u,h)){t=!0;break}}}}catch(r){console.error(r)}return t||e}async uninstallBase(){if(this.currentApp&&this.currentMobile){const t=this.currentApp.getPackageName();try{await l(p,"-s",this.currentMobile.udid,"uninstall",t)}catch{return console.error("\u5378\u8F7D\u57FA\u5EA7\u5931\u8D25"),!1}}return!0}async run(t){this.setRunningState(1),this.setMobile(t.mobile),this.setDeviceLauncher(t.deviceLauncher),this.httpPort.toString()==="0"&&this.getHttpPath();const e=parseInt(this.httpPort);await this.createPortAgent(e,this.currentMobile.udid)||(this.useLan=!0);const r=new W;t.projectNatureId.includes("UniApp")&&(r.setType("UniApp"),r.setCompliePath(t.compilePath)),r.setAppID(t.appid||""),r.setPath(t.projectPath),this.setCurrentProject(r);const s=new _;if(!t.androidBasePath)t.androidBasePath=M("android"),s.setAppID("io.dcloud.HBuilder"),s.setAppVersion(await v("android_version"));else{if(await this.initCustomBaseAppInfo(r.getAppID(),s,t.androidBasePath,r.getPath(),r.getType()),this.showNotSupprotTips(s))return!1;await this.showDiffSDKTips(s),s.isCustomBase=!0}const n=j(t.androidBasePath);if(s.setAppTime(n),s.setName(t.appName),this.basePath=t.androidBasePath,!N(this.basePath)){console.error("\u57FA\u5EA7\u4E0D\u5B58\u5728");return}s.setProject(r),this.setCurrentApp(s);const i=await this.isAppExist();let a=!0;i&&(a=await this.isAppNeedUpdate(),a&&await this.uninstallBase()),(!i||i&&a)&&await this.installBase(this.basePath),await this.stopApp();let c=await this.createWifiServer(t.mobile.udid);if(!c)return console.error("\u521B\u5EFA\u4EE3\u7406\u51FA\u9519"),!1;c=await this.startBaseServer(t.mobile.udid),G(s.getName());let o=t.compilePath+"/";if(r.getType()==="UniApp"){const d=t.pagePath,P=t.pageQuery;d!==""&&await this.doRunToPage(r,d,P)}let u=0;const h=setInterval(()=>{this.getRunningState()===2&&clearInterval(h);const d=this.wifiServer?.getClientInfo();console.log("\u68C0\u67E5\u5BA2\u6237\u7AEF\u662F\u5426\u94FE\u63A5",d),d!==""&&(E(o,this.currentApp.getName()).then(P=>{this.pushResources(P,!0)}).catch(P=>{console.error(P)}),clearInterval(h)),u>=30&&(clearInterval(h),console.error("\u540C\u6B65\u8D44\u6E90\u5931\u8D25\u6388\u6743"),this.currentApp.getIsCustomBase()&&console.error("\u79BB\u7EBF\u57FA\u5EA7")),u++},1e3);return c||!1}async startBaseServer(t){if(this.currentApp){const e=this.getIP(),r=this.currentApp.getPackageName()+"/io.dcloud.debug.PullDebugActivity";await l(p,"-s",t,"shell","am","start","-n",r,"--es","port",this.webSocketPort.toString(),"--es","ip",e,"--es","appid",this.currentApp.getID())}return!1}async stopApp(){if(this.currentApp&&this.currentMobile)try{await l(p,"-s",this.currentMobile.udid,"shell","am","force-stop",this.currentApp.getPackageName())}catch{return!1}return!0}async getMobileList(t=!0){let e=[];if(p=await this.getADBPath(),!p)return e;try{const r=(await l(p,"devices")).split(/[(\r\n)\r\n]+/);for(let s of r){if(s.indexOf("List of devices attached")>=0||s==""||s.indexOf("* daemon not running")>=0||s.indexOf("* daemon started successfully")>=0||s.indexOf("adb serveris ")>=0)continue;if(s.includes("unauthorized")){console.error("\u8BBE\u5907\u672A\u6388\u6743\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u786E\u8BA4\u6388\u6743");continue}let n=s.split("	"),i=new V;i.name=n[0],i.udid=n[0],i.platform="android";try{const a=await l(p,"-s",i.udid,"shell","getprop","ro.product.brand"),c=await l(p,"-s",i.udid,"shell","getprop","ro.product.model");i.name=`${a.trim()} ${c.trim()} - ${i.udid}`}catch(a){console.error(a)}try{let a=await l(p,"-s",i.udid,"shell","getprop","ro.build.version.release");a=a.trim(),i.version=a}catch(a){console.error(a);continue}try{let a=await l(p,"-s",i.udid,"shell","getprop","ro.product.cpu.abilist");i.cpuAbi=a.trim().toLocaleLowerCase().split(",")}catch(a){console.error(a)}e.push(i)}t&&e.length===0&&(await this.terminateADB(),e=await this.getMobileList(!1))}catch(r){console.error(r)}return e}async getADBPath(){let t=await this.getToolPath("android");if(!t){t=await this.getToolPath("default");const e=B.platform()==="win32";if(D=b.resolve(t,e?"./adb.exe":"./adb"),e){const r=await this.getRunningAdb();if(r){const s=await this.getAdbByPid(r);s&&(D=s)}}}return N(D)||(D=""),D}async getRunningAdb(){try{const{stdout:t}=await w(y)("cmd /c netstat -ano | findstr 5037",{encoding:"binary"});if(t=="")return"";{let e=t.trim(),r="",s=e.replace(/\r\n/g,`
`).split(`
`);for(let n of s)if(n.indexOf("listening")>=0||n.indexOf("LISTENING")>=0){let i=n.replace(/\r\n/g,`
`).split(" ");r=i[i.length-1];break}return r}}catch{return""}}async getAdbByPid(t){let e="";const r=this.isWin11Platform()?'cmd /c powerShell "Get-Process -id '+t+' | select-object path"':"wmic process where handle='"+t+"' get executablePath,handle";try{const{stdout:s}=await w(y)(r,{encoding:"buffer"});let n=F(s).replace(/\r\n/g,`
`).split(`
`);for(let i of n){let a=i.indexOf(".exe");if(a>=0&&!this.has360(i)){e=i.substring(0,a+4);break}}return e}catch(s){console.error(this.isWin11Platform()?"win11 powershell error:":"wmic error:"+s)}return e}has360(t){return t.toLocaleLowerCase().includes("360")}isWin11Platform(){if(T(A))return A;const t=B.release();if(t.startsWith("11"))A=!0;else{const e=t.split(".")||[];parseInt(e[e.length-1])>=22e3?A=!0:A=!1}return A}async terminateADB(){const t=await this.getToolPath("default");if(B.platform()=="win32")if(this.isWin11Platform()){const e="wmic process where caption='adb.exe' get executablePath,handle";let{stdout:r}=await w(y)(e,{encoding:"buffer"}),s=F(r).replace(/\r\n/g,`
`).split(`
`);for(let n of s)if(n.indexOf(t)>=0){let i=n.trim().split(/\s+/)||[];const a=Number(i[i.length-1]);if(a&&!isNaN(a))try{await w(y)(`taskkill /F /PID ${a}`,{shell:"cmd.exe"})}catch{}}}else{const e=`cmd /c powerShell "Get-Process | Where-Object { $_.ProcessName -eq 'adb' -and $_.Path -like '*${t}*' } | Stop-Process"`;try{await w(y)(e,{encoding:"buffer"})}catch{}}else if(B.platform()=="darwin"){let e=I("ps aux | grep adb | awk '{print $2}'",{encoding:"binary"}),[r]=e.replace(/\r\n/g,`
`).split(`
`)||[];if(r)try{I(`kill -9 ${r}`,{encoding:"binary"})}catch{}}return!0}getHttpPath(){const t=this.getDeviceLauncher();let e="";if(t){this.httpPort=t.getHttpPort().toString(),e=`http://${this.getIP()}:${this.httpPort}/static/`;const r=t.getChildProcess();let s=0;r&&(s=r.pid),this.setHttpProPID(s)}return e}setHttpProPID(t){this.httpProPID=t}async createPortAgent(t,e){try{await l(p,"-s",e,"reverse",`tcp:${t}`,`tcp:${t}`)}catch(r){return console.error(r),!1}return!0}async initCustomBaseAppInfo(t,e,r,s,n){let i="";try{const o=await L(r);o&&e.setPackageName(o.package)}catch{g("\u89E3\u6790AndroidManifest.xml\u6587\u4EF6\u5931\u8D25","error")}try{const o=x(r,"assets/data/dcloud_configs.json");if(o){const u=JSON.parse(o);u&&u.iv&&(i=u.iv,e.setInnerVerison(i))}}catch{g("\u89E3\u6790dcloud_configs.json\u6587\u4EF6\u5931\u8D25","error")}const a=x(r,"assets/data/dcloud_control.xml");if(a)try{const o=await O(a,"buffer"),u=o[Object.keys(o)[0]];u&&i===""&&(i=u.version,e.setInnerVerison(i))}catch{g("\u89E3\u6790dcloud_control.xml\u6587\u4EF6\u5931\u8D25","error")}const c=$(r,"manifest.json");if(c)try{const o=JSON.parse(c);e.setID(o?.id),e.setAppVersion(o?.version?.name)}catch{g("\u89E3\u6790manifest.json\u6587\u4EF6\u5931\u8D25","error")}}async createWifiServer(t){return this.webSocketPort=await U(),this.wifiServer=new J(this.webSocketPort),this.wifiServer.initState(),this.wifiServer.setCurrentLauncher(this),this.currentApp&&(this.wifiServer.applicationName=this.currentApp.getName()),this.useLan?!0:this.createPortAgent(this.webSocketPort,t)}async doRunToPage(t,e,r){let s="";t.getAppID()===""&&(s=this.uniAppVueTempAppID);const n=b.resolve(t.getCompilePath(),"manifest.json");await H(n,e,r,s)}pushResources(t,e=!1){let r=!1;if(this.wifiServer){const s=this.getCurrentProject(),n={mobile:{},contents:{refreashType:"reload",app:{},fileInfo:[],project:{}}};s?.getAppID()&&(n.contents.project.type=s.getType(),n.contents.project.appID=s.getAppID());const i=this.getHttpPath();if(i==="")return console.error("\u83B7\u53D6Http\u670D\u52A1\u5931\u8D25"),!1;n.contents.fileInfo.push({action:"writeFile",sourcePath:i+"?path="+t,name:b.basename(t),fullPackage:!0,firstInstall:e}),this.currentApp&&(n.contents.app.appID=this.currentApp.getID(),n.contents.app.customBase=this.currentApp.getIsCustomBase());const a=JSON.stringify(n);console.log("\u63A8\u9001\u8D44\u6E90"),this.wifiServer.sendSyncFileMsg(a),r=!0}return r}async isNeedFullUpdate(t,e){let r=!1;return e!=""&&t.length==0&&this.currentApp&&(r=!0,E(e,this.currentApp.getID()).then(s=>{this.pushResources(s)}).catch(s=>{g("\u540C\u6B65\u6587\u4EF6\u5931\u8D25","error"),console.error(s)})),r}async pushResource(t=[],e,r=-1,s){if(await this.isNeedFullUpdate(t,e))return!0;if(this.wifiServer){const n={mobile:{},contents:{associatePaths:"",app:{},fileInfo:[]},project:{}},i=this.getCurrentProject();i&&(n.project.type=i.getType(),n.project.appID=i.getAppID());const a=this.getHttpPath();if(a==="")return console.error("\u83B7\u53D6Http\u670D\u52A1\u5931\u8D25"),!1;for(const c of t){const o={action:"writeFile"};if(R(c))continue;o.sourcePath=a+"?path="+e+"/"+c;let u=c;if(u.lastIndexOf("/")==-1)u="/";else if(i&&(u=this.getPushDestPath(c,i),u==""))continue;o.path=u,o.name=b.basename(c),o.fullPackage=!1,n.contents.fileInfo.push(o)}if(n.contents.fileInfo.length===0)return!0;this.currentApp&&(n.contents.app.appID=this.currentApp.getID(),n.contents.app.customBase=this.currentApp.getIsCustomBase()),n.contents.refreashType=this.getRefreshTypeByFiles(t,r),await this.wifiServer.sendSyncFileMsg(JSON.stringify(n))}return!1}getRefreshTypeByFiles(t,e=-1){let r="reload";if(e!=1&&(r="current"),t[0].endsWith(".dex"))return r="restart",r;for(let s of t)if(s=="manifest.json"){r="reload";break}return r}getPushDestPath(t,e){let r="";const s=e.getPath(),n=e.getCompilePath(),i=b.basename(t);return t==n+"/"+i&&(r="/"),t.includes(s)&&!t.includes(n)?r="":r=t.replace(i,""),r}async showDiffSDKTips(t){const e=await v("inner_android_sdk_version"),r=t.getInnerVersion();e!==r&&g("\u81EA\u5B9A\u4E49\u57FA\u5EA7SDK\u4E0D\u540C","error")}showNotSupprotTips(t){return S(t.getInnerVersion(),"1.9.9.81430")>0?(g("\u5F53\u524D\u7248\u672C\u4E0D\u652F\u6301\u81EA\u5B9A\u4E49\u57FA\u5EA7","error"),!0):!1}}export{Z as AndroidLauncher};