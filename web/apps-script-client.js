/* Google Apps Script popup bridge. Local storage remains the primary journal. */
(()=>{
  const url=window.JOURNALIT_APPS_SCRIPT_CONFIG?.url||'',enabledKey='journalit-google-sync-enabled',queueKey='journalit-google-sync-pending';
  let popup=null,port=null,sequence=0,connected=false,connecting=null;
  const pending=new Map();
  const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(url);
  const randomNonce=()=>{const b=new Uint8Array(24);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')};
  function trustedGoogleOrigin(origin){try{const host=new URL(origin).hostname;return host==='script.google.com'||host.endsWith('script.googleusercontent.com')}catch{return false}}
  function receive(event){const data=event.data;if(!data?.journalitBridgeResponse)return;const task=pending.get(String(data.id));if(!task)return;pending.delete(String(data.id));data.error?task.reject(Error(data.error)):task.resolve(data.result)}
  function request(action,payload){return new Promise((resolve,reject)=>{if(!port){reject(Error('Connect Google first.'));return}const id=String(++sequence);pending.set(id,{resolve,reject});port.postMessage({journalitBridge:true,id,action,payload});setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('Google sync timed out. Keep the Google sync window open and retry.'))}},30000)})}
  async function connect(){if(!configured())throw Error('Add your deployed Apps Script /exec URL in web/apps-script-config.js.');if(connected)return request('get');if(connecting)return connecting;connecting=new Promise((resolve,reject)=>{const nonce=randomNonce(),launchUrl=new URL(url);launchUrl.searchParams.set('nonce',nonce);popup=window.open(launchUrl.toString(),'journalit-google-sync','popup,width=480,height=620');if(!popup){connecting=null;reject(Error('Allow popups for Journalit, then click Connect Google again.'));return}let finished=false;const cleanup=()=>{window.removeEventListener('message',onMessage);clearTimeout(timer);connecting=null};const timer=setTimeout(()=>{if(finished)return;finished=true;cleanup();reject(Error('Google did not finish connecting. Sign in and authorize the Apps Script window, then retry.'))},120000);const onMessage=event=>{if(finished||!trustedGoogleOrigin(event.origin)||event.data?.journalitBridgeReady!==true||event.data.nonce!==nonce||!event.ports?.[0])return;finished=true;cleanup();port=event.ports[0];port.onmessage=receive;port.start?.();connected=true;localStorage.setItem(enabledKey,'yes');request('get').then(resolve,reject)};window.addEventListener('message',onMessage) });return connecting}
  async function load(){if(!enabled()||!connected)return{hasCloud:false,disabled:true};const result=await request('get');return{hasCloud:!!result?.payload,payload:result?.payload||null}}
  async function upload(payload){if(!connected)throw Error('Reconnect Google to sync.');await request('save',payload);localStorage.removeItem(queueKey)}
  function schedule(getPayload,onError){if(!enabled())return;localStorage.setItem(queueKey,'yes');if(!navigator.onLine||!connected)return;clearTimeout(schedule.timer);schedule.timer=setTimeout(()=>upload(getPayload()).catch(onError),500)}
  async function syncPending(getPayload,onError){if(localStorage.getItem(queueKey)!=='yes'||!navigator.onLine||!connected)return;try{await upload(getPayload())}catch(err){onError(err)}}
  function enabled(){return localStorage.getItem(enabledKey)==='yes'}
  function ready(){return connected&&enabled()}
  function disconnect(){connected=false;localStorage.removeItem(enabledKey);if(port){port.close();port=null}if(popup&&!popup.closed)popup.close();popup=null}
  window.JournalitCloud={configured,enabled,ready,connect,load,upload,schedule,syncPending,disconnect};
})();
