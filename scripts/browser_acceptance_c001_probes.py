# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_acceptance_c001.py.
"""Event-driven real-Chrome probes for exact C001."""

EXPECTED_TITLES = (
    "Tokenization",
    "Token Embedding",
    "Position Embedding",
    "LayerNorm",
    "Q/K/V",
    "Attention Score",
    "Causal Mask",
    "Softmax",
    "Value Aggregation",
    "Residual",
    "MLP",
    "Block Output",
    "Final LayerNorm",
    "LM Head",
    "Logits",
    "Temperature",
    "Top-K",
    "Sampling",
    "Generated Token",
    "Append to Context",
    "Repeat",
)

GENERATE = r"""new Promise((resolve, reject) => {
  const start=__acceptance.records.length, paints=[], longTasks=[], heartbeat=[],interaction={states:[],usable:false}; let running=true, interacted=false,generationStartedAt=performance.now(),interactionDone=Promise.resolve();
  const longObserver=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));
  longObserver.observe({type:'longtask',buffered:false});
  let prior=performance.now(); const tick=()=>{const now=performance.now();heartbeat.push(now-prior);prior=now;if(running)setTimeout(tick,0)};tick();
  const set=(selector,value,event='input')=>{const element=document.querySelector(selector);
    const owner=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(owner,'value').set.call(element,value);element.dispatchEvent(new Event(event,{bubbles:true}));};
  set('#generation-prompt','the cat');set('#max-new-tokens','8');set('#temperature','1.0');set('#top-k','20');set('#sampling-mode','sample','change');set('#seed','42');
  const listener=event=>{const payload=event.detail.payload;if(event.detail.direction!=='in')return;
    if(payload?.type==='token_generated'){const arrived=performance.now();requestAnimationFrame(()=>paints.push(performance.now()-arrived));
      if(!interacted){interacted=true;const before=performance.now();interactionDone=new Promise(done=>{document.querySelector('#mode-explore').click();requestAnimationFrame(()=>{interaction.states.push(document.querySelector('#mode-explore').getAttribute('aria-selected'));document.querySelector('#mode-guided').click();requestAnimationFrame(()=>{interaction.states.push(document.querySelector('#mode-guided').getAttribute('aria-selected'));interaction.usable=!document.querySelector('[data-testid="stop-generation"]').disabled;window.__interactionMs=performance.now()-before;done()})})})}}
    if(payload?.type!=='generation_finished')return;removeEventListener('acceptance-worker',listener);clearTimeout(timeout);running=false;longObserver.disconnect();
    interactionDone.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({start,end:__acceptance.records.length,
      prompt:document.querySelector('#generation-prompt').value,decoded:document.querySelector('[data-testid="decoded-continuation"]').textContent,
      fullText:document.querySelector('.decoded-text').textContent,promptChips:[...document.querySelectorAll('.raw-prompt .raw-token')].map(chip=>({display:chip.querySelector('.token-text').textContent,id:chip.querySelector('.token-id').textContent,bytes:chip.querySelector('.token-bytes').textContent})),
      generatedChips:[...document.querySelectorAll('.generated-token')].map(chip=>({display:chip.querySelector('.token-text').textContent,id:chip.querySelector('.token-id').textContent,bytes:chip.querySelector('.token-bytes').textContent})),
      paints,longTasks,heartbeats:heartbeat,heartbeatSpanMs:performance.now()-generationStartedAt,heartbeatMaxMs:Math.max(...heartbeat),interaction,interactionMs:window.__interactionMs,status:document.querySelector('[data-testid="generation-status"]').textContent,usage:{...document.querySelector('[data-testid="generation-usage"]').dataset}}))));};
  const timeout=setTimeout(()=>{removeEventListener('acceptance-worker',listener);reject('C001 timeout')},60000);
  addEventListener('acceptance-worker',listener);document.querySelector('[data-testid="generate"]').click();
})"""

REPLAY = r"""new Promise((resolve,reject)=>{
  const start=__acceptance.records.length;const listener=event=>{if(event.detail.direction!=='in'||event.detail.payload?.type!=='generation_step_trace')return;
    removeEventListener('acceptance-worker',listener);const observer=new MutationObserver(check);function check(){if(document.querySelector('#status')?.dataset.status!=='complete')return;
      observer.disconnect();clearTimeout(timeout);requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({start,end:__acceptance.records.length,
        selected:document.querySelector('.generated-token[aria-pressed="true"]')?.dataset.stepIndex,
        context:[...document.querySelectorAll('#token-reel .context-token')].map(node=>node.querySelector('.token-id').textContent),
        tensorIds:[...document.querySelectorAll('[data-detail-tensor-id]')].map(node=>node.dataset.detailTensorId),
        source:{meta:document.querySelector('.source-meta')?.textContent||'',activeLines:[...document.querySelectorAll('.source-line.active .line-number')].map(node=>node.textContent)},
        evidence:document.querySelector('.stage-visual')?.dataset||{}})));}observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});check();};
  const timeout=setTimeout(()=>reject('replay timeout'),60000);addEventListener('acceptance-worker',listener);document.querySelector('#generated-token-4').click();
})"""

ROUTE = r"""(async()=>{const settle=()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))),missing=[];
  const click=async selector=>{const node=document.querySelector(selector);if(!node){missing.push(selector);return}node.click();await settle()};
  await click('#curriculum-stage-4');await click('[data-testid="architecture-node-head-2"]');await click('[data-testid="architecture-node-query"]');
  await click('#tab-tensor');const tensors=[...document.querySelectorAll('[data-detail-tensor-id]')].map(node=>node.dataset.detailTensorId);
  await click('#tab-source');const activeLines=[...document.querySelectorAll('.source-line.active .line-number')].map(node=>Number(node.textContent)),meta=document.querySelector('.source-meta')?.textContent||'',sourceMap=await fetch('./models/edu/source_map.json').then(response=>response.json());const sourceId=Object.entries(sourceMap).find(([,entry])=>meta.startsWith(entry.label)&&activeLines.every(line=>line>=entry.line_start&&line<=entry.line_end))?.[0]||null;return{breadcrumb:[...document.querySelectorAll('.architecture-breadcrumb button')].map(node=>node.textContent.trim()),
    selected:[...document.querySelectorAll('.architecture-node[aria-current="true"]')].map(node=>node.textContent.trim()),tensors,
    source:{id:sourceId,meta,activeLines},
    coordinates:document.querySelector('.context-coordinates')?.textContent||'',evidence:document.querySelector('.stage-visual')?.dataset||{},missing};})()"""

CURRICULUM = r"""(async()=>{const settle=()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))),cursor=()=>document.querySelector('.curriculum-rail [aria-current="step"]')?.id;
  const stages=[];for(let index=0;index<21;index++){document.querySelector(`#curriculum-stage-${index}`).click();await settle();const evidence=document.querySelector('.trace-evidence > :last-child');
    stages.push({index,title:document.querySelector('.stage-heading h2').textContent,current:cursor(),group:document.querySelector(`#curriculum-stage-${index}`).closest('.curriculum-group').querySelector('h3').textContent,
      evidenceClass:evidence?.className||'',testid:evidence?.dataset?.testid||'',visual:evidence?.dataset?.visual||'',operation:document.querySelector('.stage-visual')?.dataset?.operation||'',source:document.querySelector('.source-meta')?.textContent||''});}
  const before=()=>({cursor:cursor(),architecture:[...document.querySelectorAll('.architecture-node[aria-current="true"]')].map(n=>n.textContent.trim()),details:[...document.querySelectorAll('[data-detail-tensor-id]')].map(n=>n.dataset.detailTensorId),
    evidence:document.querySelector('.trace-evidence').textContent,inspector:document.querySelector('.inspector-panel:not([hidden])').textContent,source:document.querySelector('.source-meta')?.textContent||''});
  document.querySelector('#curriculum-stage-4').click();await settle();document.querySelector('#tab-source').click();await settle();const guided=before();document.querySelector('#mode-explore').click();await settle();const explore=before();document.querySelector('#mode-guided').click();await settle();const guidedAgain=before();
  document.querySelector('#mode-explore').click();document.querySelector('[data-testid="architecture-node-key"]').click();await settle();const exploreWrites=before();document.querySelector('#mode-guided').click();await settle();const guidedFollows=before();document.querySelector('#curriculum-stage-7').click();await settle();const guidedWrites=before();document.querySelector('#mode-explore').click();await settle();const exploreFollows=before();document.querySelector('#mode-guided').click();await settle();
  const tabs=[];for(const id of ['tab-explanation','tab-tensor','tab-source']){document.querySelector(`#${id}`).click();await settle();tabs.push({id,selected:[...document.querySelectorAll('.inspector-tabs [role="tab"]')].map(n=>[n.id,n.getAttribute('aria-selected'),n.tabIndex]),visible:[...document.querySelectorAll('.inspector-panel')].filter(n=>!n.hidden).map(n=>({id:n.id,text:n.textContent}))});}
  document.querySelector('#tab-explanation').focus();document.querySelector('#tab-explanation').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await settle();const keyboard={focused:document.activeElement.id,selected:document.querySelector('.inspector-tabs [aria-selected="true"]').id};
  const advance=()=>new Promise((ok,bad)=>{const initial=cursor(),observer=new MutationObserver(()=>{if(cursor()===initial)return;observer.disconnect();clearTimeout(timeout);ok({from:initial,to:cursor(),at:performance.now()})});observer.observe(document.querySelector('.curriculum-rail'),{subtree:true,attributes:true});const timeout=setTimeout(()=>bad('speed timeout'),5000);document.querySelector('.play-toggle').click()});
  const speed=[];for(const [label,start] of [['0.5x',0],['2x',3]]){document.querySelector(`#curriculum-stage-${start}`).click();[...document.querySelectorAll('.speed-buttons button')].find(n=>n.textContent===label).click();await settle();const begun=performance.now(),move=await advance();document.querySelector('.play-toggle').click();speed.push({label,elapsed:move.at-begun,cursor:move.to,pressed:[...document.querySelectorAll('.speed-buttons button')].filter(n=>n.getAttribute('aria-pressed')==='true').map(n=>n.textContent),cue:getComputedStyle([...document.querySelectorAll('.speed-buttons button')].find(n=>n.getAttribute('aria-pressed')==='true')).boxShadow})}
  document.querySelector('#curriculum-stage-17').click();[...document.querySelectorAll('.speed-buttons button')].find(n=>n.textContent==='2x').click();await settle();const autoplay=await new Promise((ok,bad)=>{const moves=[],observer=new MutationObserver(()=>{const value=cursor();if(value==='curriculum-stage-20'&&document.querySelector('.play-toggle').getAttribute('aria-pressed')==='false'){observer.disconnect();clearTimeout(timeout);ok(moves);return}if(moves.at(-1)?.to!==value)moves.push({to:value,at:performance.now()})});observer.observe(document.documentElement,{subtree:true,attributes:true});const timeout=setTimeout(()=>bad('autoplay timeout'),5000);document.querySelector('.play-toggle').click()});await settle();
  const stopped={cursor:cursor(),playing:document.querySelector('.play-toggle').getAttribute('aria-pressed')};document.querySelector('#curriculum-stage-3').click();[...document.querySelectorAll('.speed-buttons button')].find(n=>n.textContent==='2x').click();await settle();await advance();document.querySelector('.play-toggle').click();const pauseBefore=cursor(),pauseStart=performance.now();let frames=0;await new Promise(ok=>{const frame=now=>{frames++;if(now-pauseStart>=750)ok();else requestAnimationFrame(frame)};requestAnimationFrame(frame)});const pause={before:pauseBefore,after:cursor(),frames,elapsedMs:performance.now()-pauseStart,intervalMs:750};
  return{stages,groups:[...document.querySelectorAll('.curriculum-group')].map(g=>({title:g.querySelector('h3').textContent,count:g.querySelectorAll('.stage-reel button').length})),modes:{guided,explore,guidedAgain,exploreWrites,guidedFollows,guidedWrites,exploreFollows},tabs,keyboard,speed,autoplay,
    stopped,pause};})()"""

RAPID_REPLAY = r"""new Promise((ok,bad)=>{const start=__acceptance.records.length,traces=[];const listener=event=>{const value=event.detail.payload;if(event.detail.direction!=='in'||value?.type!=='generation_step_trace')return;traces.push(value);if(traces.length!==2)return;removeEventListener('acceptance-worker',listener);clearTimeout(timeout);requestAnimationFrame(()=>requestAnimationFrame(()=>ok({start,end:__acceptance.records.length,finalSelected:Number(document.querySelector('.generated-token[aria-pressed="true"]').dataset.stepIndex),traces}))) };const timeout=setTimeout(()=>bad('rapid replay timeout'),60000);addEventListener('acceptance-worker',listener);document.querySelector('#generated-token-0').click();document.querySelector('#generated-token-7').click()})"""

CONTEXT_PATH = r"""(async()=>{const settle=()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))),read=selector=>[...document.querySelectorAll(selector+' li')].map(n=>Number(n.textContent));
  document.querySelector('#mode-guided').click();document.querySelector('#curriculum-stage-18').click();await settle();document.querySelector('#mode-explore').click();document.querySelector('[data-testid="architecture-node-sample"]').click();await settle();const sample={...document.querySelector('.stage-visual').dataset};
  document.querySelector('[data-testid="architecture-node-append"]').click();await settle();const append={...document.querySelector('.stage-visual').dataset,before:read('.context-equation ol:first-of-type'),after:read('[data-testid="after-context"]')};
  document.querySelector('[data-testid="architecture-node-repeat"]').click();await settle();const repeat={...document.querySelector('.stage-visual').dataset,after:read('[data-testid="repeat-after-context"]'),next:read('[data-testid="repeat-next-context"]')};
  document.querySelector('#mode-guided').click();return{sample,append,repeat}})()"""
