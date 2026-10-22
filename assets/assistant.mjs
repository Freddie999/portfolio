import { retrieve, selectionRequest, resolveSelection } from './knowledge.mjs?v=shadow-20261021';
const dialog = document.querySelector('#assistant');
if (dialog) {
  const input = document.querySelector('#chat-input');
  const log = document.querySelector('#chat-messages');
  const status = document.querySelector('#assistant-status');
  const setup = document.querySelector('#ai-setup');
  const enable = document.querySelector('#enable-ai');
  const progress = document.querySelector('#ai-progress');
  const cancel = document.querySelector('#cancel-ai');
  const mic = document.querySelector('#voice-input');
  const readReplies = document.querySelector('#read-replies');
  const stopVoice = document.querySelector('#stop-voice');
  const send = document.querySelector('.send-button');
  let mode = 'guide', engine = null, worker = null, loading = false, busy = false;
  let loadID = 0, requestID = 0, history = [], lastDocs = [], returnFocus = null;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null, listening = false;
  let speechTurn = 0, speechTimer = null, currentUtterance = null;
  const defaultGreeting = log.firstElementChild.cloneNode(true);
  const setStatus = text => { status.textContent = text; };
  function scrollLog() { log.scrollTop = log.scrollHeight; }
  function message(role, text, label) {
    const item = document.createElement('div'); item.className = `message ${role}-message`;
    const name = document.createElement('span'); name.className = 'message-label mono'; name.textContent = label;
    const p = document.createElement('p'); p.textContent = text;
    item.append(name,p); log.append(item); scrollLog(); return { item,p };
  }
  function sources(item, docs) {
    if (!docs.length) return;
    const links = document.createElement('div'); links.className = 'message-sources';
    for (const doc of docs) { const a = document.createElement('a'); a.href = doc.url; a.textContent = `${doc.title} ↗`;links.append(a); }
    if ('speechSynthesis' in window) {
      const listen=document.createElement('button');listen.type='button';listen.className='listen-reply text-button';listen.textContent='Listen ▷';listen.setAttribute('aria-label','Listen to this answer');
      listen.addEventListener('click',()=>speak(item.querySelector('.source-excerpt p')?.textContent||item.querySelector('p').textContent,true));links.append(listen);
    }
    item.append(links);scrollLog();
  }
  function stopSpeaking() {
    speechTurn++;clearTimeout(speechTimer);currentUtterance=null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopVoice.hidden=true;
  }
  function speak(text, force = false) {
    stopSpeaking();if ((!force && !readReplies.checked) || !dialog.open || !('speechSynthesis' in window)) return;
    const turn=speechTurn;stopVoice.hidden=false;
    // Let a prior browser-level cancellation settle before queuing new audio.
    speechTimer=setTimeout(()=>{
      if(turn!==speechTurn||!dialog.open)return;
      const utterance=new SpeechSynthesisUtterance(text);currentUtterance=utterance;utterance.lang='en-US';utterance.rate=1;
      utterance.onstart=()=>{if(turn===speechTurn)setStatus('VOICE PLAYBACK · PRESS STOP AUDIO TO END');};
      utterance.onend=()=>{if(turn===speechTurn){stopVoice.hidden=true;currentUtterance=null;idleStatus();}};
      utterance.onerror=event=>{if(turn!==speechTurn)return;stopVoice.hidden=true;currentUtterance=null;if(event.error!=='interrupted'&&event.error!=='canceled')setStatus('BROWSER AUDIO COULD NOT PLAY · THE TEXT ANSWER IS AVAILABLE');else idleStatus();};
      window.speechSynthesis.speak(utterance);
    },100);
  }
  function idleStatus() {setStatus(mode==='guide'?'SOURCE-BASED GUIDE · NO GENERATION':engine?'ON-DEVICE AI · READY':'AI CHAT · MODEL NOT LOADED');}
  document.querySelectorAll('[data-open-assistant]').forEach(button => button.addEventListener('click', () => {
    returnFocus = button;if(!dialog.open)dialog.showModal();input.focus();
  }));
  document.querySelector('#assistant-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if(event.target===dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();} });
  dialog.addEventListener('close', () => {
    stopSpeaking();recognition?.abort();requestID++;
    if(busy){Promise.resolve(engine?.interruptGenerate()).catch(()=>{});busy=false;send.disabled=false;input.disabled=false;}
    idleStatus();returnFocus?.focus();
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    if(busy)return;mode=button.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed',String(b===button)));
    setup.hidden=mode!=='ai'||Boolean(engine);idleStatus();
  }));
  function disposeLoading() {
    loadID++;worker?.terminate();worker=null;engine=null;loading=false;enable.disabled=false;enable.textContent='Try AI chat again';progress.hidden=true;cancel.hidden=true;
  }
  cancel.addEventListener('click', () => {disposeLoading();setStatus('MODEL LOADING CANCELED · QUICK GUIDE IS AVAILABLE');});
  enable.addEventListener('click', async () => {
    if(loading||engine)return;
    if(!navigator.gpu){setStatus('AI CHAT NEEDS WEBGPU · USE THE QUICK GUIDE IN THIS BROWSER');return;}
    const id=++loadID;loading=true;setStatus('PREPARING ON-DEVICE AI');enable.disabled=true;enable.textContent='Preparing AI chat…';progress.hidden=false;cancel.hidden=false;progress.value=0;
    let timeout;
    try {
      const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('gpu');
      const model=adapter.features.has('shader-f16')?'Qwen2.5-1.5B-Instruct-q4f16_1-MLC':'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
      const runtime=await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/lib/index.js');
      if(id!==loadID)return;
      worker=new Worker(new URL('./ai-worker.mjs',import.meta.url),{type:'module'});
      const ready=runtime.CreateWebWorkerMLCEngine(worker,model,{
        initProgressCallback: report => {if(id!==loadID)return;progress.value=report.progress;setStatus(`PREPARING ON-DEVICE AI · ${Math.round(report.progress*100)}%`);}
      });
      const fail=new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),240000);worker.addEventListener('error',()=>reject(new Error('worker')),{once:true});});
      const loaded=await Promise.race([ready,fail]);clearTimeout(timeout);
      if(id!==loadID){await loaded.unload();return;}
      engine=loaded;loading=false;setup.hidden=true;cancel.hidden=true;progress.hidden=true;idleStatus();input.focus();
      message('assistant','AI chat is ready. Ask about a project, a method, or Freddie’s experience. The model selects relevant portfolio passages and shows their sources.','ON-DEVICE AI');
    } catch(error) {
      clearTimeout(timeout);if(id!==loadID)return;disposeLoading();
      setStatus(error.message==='gpu'?'NO COMPATIBLE GPU FOUND · USE THE QUICK GUIDE':'AI COULD NOT LOAD · RETRY OR USE THE QUICK GUIDE');
    }
  });
  function guideAnswer(question,docs) {
    if(!docs.length){const reply='I don’t have a portfolio source for that. Try a project name, Python, mapping, Zipline, or contact details.';message('assistant',reply,'SOURCE-BASED GUIDE');speak(reply);return;}
    const result=message('assistant','Here are the closest portfolio sources. These are saved project facts, not an AI-generated answer.','SOURCE-BASED GUIDE');
    for(const doc of docs){const section=document.createElement('section');section.className='source-excerpt';const h=document.createElement('h3');h.textContent=doc.title;const p=document.createElement('p');p.textContent=doc.text;section.append(h,p);result.item.append(section);}
    sources(result.item,docs);speak(docs[0].text);
  }
  document.querySelector('#chat-form').addEventListener('submit', async event => {
    event.preventDefault();const question=input.value.trim();if(!question||busy)return;
    if(mode==='ai'&&!engine){setStatus(loading?'AI IS STILL LOADING · PLEASE WAIT':'ENABLE AI CHAT ABOVE OR SWITCH TO QUICK GUIDE');return;}
    input.value='';stopSpeaking();message('user',question,'YOU');
    let docs=retrieve(question);if(lastDocs.length&&(!docs.length||docs.every(d=>d.score<5))&&/\b(it|that|those|its|limitations|results|method|why|how)\b/i.test(question))docs=lastDocs;lastDocs=docs;
    if(mode==='guide'){guideAnswer(question,docs);return;}
    if(!docs.length){const answer='That isn’t covered by the portfolio facts I have. Please contact Frederick directly for more information.';message('assistant',answer,'ON-DEVICE AI · OUTSIDE PORTFOLIO SCOPE');speak(answer);return;}
    const id=++requestID;busy=true;send.disabled=true;input.disabled=true;setStatus('ON-DEVICE AI · FINDING RELEVANT FACTS');
    try {
      const request=selectionRequest(question,docs,history);
      const response=await engine.chat.completions.create({messages:request.messages,max_tokens:80,temperature:.1,stream:false});
      if(id!==requestID)return;
      const raw=response.choices?.[0]?.message?.content?.trim();if(!raw)throw new Error('Empty answer');
      const selected=resolveSelection(raw,request.evidence);
      const fallback=request.evidence.slice(0,2);
      const answer=selected.answer||fallback.map(p=>p.text).join('\n\n');
      const result=message('assistant',answer,selected.answer?'AI-SELECTED · VERIFIED PORTFOLIO TEXT':'PORTFOLIO SOURCE · MATCHING FACTS');sources(result.item,selected.answer?selected.docs:docs.slice(0,1));
      history.push({role:'user',content:question},{role:'assistant',content:answer});history=history.slice(-4);speak(answer);
    } catch(error) {console.warn('Portfolio assistant request failed:', error.message || 'Unknown generation error');if(id===requestID)message('assistant','The model couldn’t finish this answer. You can try again or switch to Quick guide to read the matching portfolio sources.','MODEL ERROR');}
    finally {if(id===requestID){busy=false;send.disabled=false;input.disabled=false;idleStatus();input.focus();}}
  });
  document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.question;document.querySelector('#chat-form').requestSubmit();}));
  document.querySelector('#clear-chat').addEventListener('click',()=>{
    if(busy)return;history=[];lastDocs=[];stopSpeaking();recognition?.abort();log.replaceChildren(defaultGreeting.cloneNode(true));idleStatus();input.focus();
  });
  stopVoice.addEventListener('click',()=>{stopSpeaking();idleStatus();});readReplies.addEventListener('change',()=>{if(!readReplies.checked)stopSpeaking();});
  if(!('speechSynthesis' in window)){readReplies.disabled=true;readReplies.parentElement.title='Speech playback is unavailable in this browser.';}
  if(!Recognition){mic.disabled=true;mic.title='Voice dictation is unavailable in this browser. You can type your question.';mic.setAttribute('aria-label','Voice dictation unavailable');}
  else {
    mic.addEventListener('click',()=>{
      if(busy)return;if(listening){recognition?.stop();return;}stopSpeaking();
      recognition=new Recognition();recognition.lang='en-US';recognition.continuous=false;recognition.interimResults=false;
      recognition.onstart=()=>{listening=true;mic.setAttribute('aria-pressed','true');setStatus('LISTENING · YOUR BROWSER HANDLES VOICE TRANSCRIPTION');};
      recognition.onresult=event=>{input.value=event.results[0][0].transcript.slice(0,600);input.focus();setStatus('VOICE CAPTURED · REVIEW YOUR QUESTION AND PRESS SEND');};
      recognition.onerror=event=>{setStatus(event.error==='not-allowed'?'MICROPHONE ACCESS WAS NOT ALLOWED · YOU CAN TYPE INSTEAD':'VOICE INPUT COULD NOT FINISH · YOU CAN TYPE INSTEAD');};
      recognition.onend=()=>{listening=false;mic.setAttribute('aria-pressed','false');};
      try{recognition.start();}catch{setStatus('VOICE INPUT IS UNAVAILABLE · YOU CAN TYPE INSTEAD');}
    });
  }
}
