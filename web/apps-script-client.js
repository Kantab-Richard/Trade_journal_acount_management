/* Offline-first connector to the Google Apps Script bridge. */
(()=>{
  const url=window.JOURNALIT_APPS_SCRIPT_CONFIG?.url||'',enabledKey='journalit-google-sync-enabled',queueKey='journalit-google-sync-pending';
  let frame=null,frameReady=null,sequence=0,connected=false,initializing=null;
  const pending=new Map();
  const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(url);
  function ensureFrame(){if(!configured())throw Error('Add your deployed Apps Script /exec URL in web/apps-script-config.js.');if(frame?.isConnected&&frameReady)return frameReady;frame=document.createElement('iframe');frame.title='Google sync';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;bottom:-10px;border:0';frameReady=new Promise((resolve,reject)=>{frame.addEventListener('load',()=>resolve(frame),{once:true});frame.addEventListener('error',()=>reject(Error('Could not load the Google Apps Script bridge.')), {once:true})});frame.src=url+'?bridge=1';document.body.append(frame);return frameReady}
  function call(action,payload){return ensureFrame().then(target=>new Promise((resolve,reject)=>{const id=String(++sequence);pending.set(id,{resolve,reject});target.contentWindow.postMessage({journalitBridge:true,id,action,payload},'*');setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('Google sync timed out. Check that the Apps Script deployment is available, authorized, and has the correct allowed origin.'))}},30000)}))}
  window.addEventListener('message',e=>{if(!frame||e.source!==frame.contentWindow||e.data?.journalitBridgeResponse!==true)return;const task=pending.get(String(e.data.id));if(!task)return;pending.delete(String(e.data.id));e.data.error?task.reject(Error(e.data.error)):task.resolve(e.data.result)});
  async function connect(){ensureFrame();if(initializing)return initializing;initializing=call('get').then(result=>{connected=true;localStorage.setItem(enabledKey,'yes');return result}).finally(()=>{initializing=null});return initializing}
  async function load(){if(!configured()||localStorage.getItem(enabledKey)!=='yes')return{hasCloud:false,disabled:true};const result=await connect();return{hasCloud:!!result?.payload,payload:result?.payload||null}}
  async function upload(payload){if(!connected)await connect();await call('save',payload);localStorage.removeItem(queueKey)}
  function schedule(getPayload,onError){if(!connected&&localStorage.getItem(enabledKey)!=='yes')return;localStorage.setItem(queueKey,'yes');if(!navigator.onLine)return;clearTimeout(schedule.timer);schedule.timer=setTimeout(()=>upload(getPayload()).catch(err=>onError(err)),500)}
  async function syncPending(getPayload,onError){if(localStorage.getItem(queueKey)!=='yes'||!navigator.onLine||localStorage.getItem(enabledKey)!=='yes')return;try{await connect();await upload(getPayload())}catch(err){onError(err)}}
  function enabled(){return localStorage.getItem(enabledKey)==='yes'}
  function ready(){return connected&&enabled()}
  window.JournalitCloud={configured,enabled,ready,connect,load,upload,schedule,syncPending,disconnect(){connected=false;localStorage.removeItem(enabledKey)}};
})();
