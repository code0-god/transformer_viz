"""Event-driven JavaScript probes for Chrome performance acceptance."""

from __future__ import annotations

BOOTSTRAP = r"""(() => {
  window.__perf = {workerReadyMs: null, lcpMs: 0, workers: 0, messages: 0,
    promptTokens: 0, stopAtContext: null, stopIntercepted: null};
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) window.__perf.lcpMs = entry.startTime;
  }).observe({type: 'largest-contentful-paint', buffered: true});
  const NativeWorker = window.Worker;
  window.Worker = new Proxy(NativeWorker, {construct(Target, args) {
    const worker = new Target(...args); window.__perf.workers++;
    worker.addEventListener('message', event => {
      window.__perf.messages++;
      if (event.data?.type === 'generation_started') window.__perf.promptTokens = event.data.prompt_tokens.length;
      dispatchEvent(new Event('__perf_worker_message'));
    });
    const post = worker.postMessage.bind(worker);
    worker.postMessage = (message, options) => {
      const context = window.__perf.promptTokens + (message?.step_index ?? -1) + 1;
      if (message?.type === 'continue_generation' && window.__perf.stopAtContext === context) {
        window.__perf.stopAtContext = null;
        window.__perf.stopIntercepted = {context, stepIndex: message.step_index,
          buttonDisabled: document.querySelector('[data-testid="stop-generation"]').disabled,
          at: performance.now(), tokens: document.querySelectorAll('.generated-token').length};
        dispatchEvent(new Event('__perf_stop_intercepted'));
        document.querySelector('[data-testid="stop-generation"]').dispatchEvent(
          new MouseEvent('click', {bubbles:true}));
        return;
      }
      return options === undefined ? post(message) : post(message, options);
    };
    return worker;
  }});
  const inspect = () => {
    if (window.__perf.workerReadyMs === null &&
        document.querySelector('#status')?.dataset.status === 'ready') {
      window.__perf.workerReadyMs = performance.now();
    }
  };
  const attach = () => {
    if (!document.documentElement) return;
    new MutationObserver(inspect).observe(document.documentElement,
      {subtree: true, childList: true, attributes: true});
    inspect();
  };
  document.addEventListener('DOMContentLoaded', attach, {once: true}); attach();
})()"""

READY_METRICS = "({lcpMs:window.__perf.lcpMs,workerReadyMs:window.__perf.workerReadyMs,workers:window.__perf.workers})"

FORWARD_PROFILE = r"""new Promise((resolve, reject) => {
  const arrivals = [], started = performance.now(); let seen = 0;
  const timeout = setTimeout(() => done('forward profile timeout'), 30000);
  const observer = new MutationObserver(check);
  function done(error) { clearTimeout(timeout); observer.disconnect();
    error ? reject(error) : requestAnimationFrame(() => resolve({
      intervals: arrivals.map((value, index) => value - (index ? arrivals[index-1] : started)),
      count: document.querySelectorAll('.generated-token').length})); }
  function check() {
    const count = document.querySelectorAll('.generated-token').length;
    while (seen < count) { arrivals.push(performance.now()); seen++; }
    const reason = document.querySelector('[data-testid="generation-usage"]')?.dataset.stopReason;
    if (reason && reason !== 'running') done();
  }
  observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true});
  const prompt = document.querySelector('#generation-prompt'); prompt.value='a';
  prompt.dispatchEvent(new Event('input', {bubbles:true}));
  const set = (id, value) => { const input=document.querySelector(id); input.value=value;
    input.dispatchEvent(new Event('input', {bubbles:true})); };
  set('#seed','14'); set('#temperature','2'); set('#top-k','259');
  const max = document.querySelector('#max-new-tokens'); max.value='24';
  max.dispatchEvent(new Event('input', {bubbles:true}));
  document.querySelector('[data-testid="generate"]').click(); check();
})"""

STOP_TRIAL = r"""target => new Promise((resolve, reject) => {
  const longTasks = [], clicks = [], timeout = setTimeout(() => done('stop timeout'), 30000);
  const longObserver = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
  longObserver.observe({type:'longtask', buffered:false});
  let clickedAt = null, clickedCount = 0, clickedContext = 0, terminalCount = null;
  const observer = new MutationObserver(check);
  function intercepted() { const event=window.__perf.stopIntercepted;
    clickedAt=event.at; clickedCount=event.tokens; clickedContext=event.context; check(); }
  addEventListener('__perf_stop_intercepted', intercepted, {once:true});
  function done(error) { clearTimeout(timeout); observer.disconnect(); longObserver.disconnect();
    removeEventListener('__perf_stop_intercepted', intercepted); window.__perf.stopAtContext=null;
    if (error) reject(error); else requestAnimationFrame(() => requestAnimationFrame(() => resolve({
      target, latencyMs: performance.now()-clickedAt, tokensAfterClick:
        document.querySelectorAll('.generated-token').length-clickedCount,
      tokensAfterTerminal: document.querySelectorAll('.generated-token').length-terminalCount,
      maxLongTaskMs: Math.max(0,...longTasks), contextAtClick: clickedContext,
      stopReason: document.querySelector('[data-testid="generation-usage"]').dataset.stopReason,
      intercepted: target===23 ? window.__perf.stopIntercepted : null
    }))); }
  function check() {
    const generated = document.querySelectorAll('.generated-token').length;
    const context = document.querySelectorAll('#token-reel .context-token').length;
    if (target < 23 && clickedAt === null && context === target && !document.querySelector('[data-testid="stop-generation"]').disabled) {      clickedCount=generated; clickedContext=context; clickedAt=performance.now();
      document.querySelector('[data-testid="stop-generation"]').click();
    }
    const reason=document.querySelector('[data-testid="generation-usage"]')?.dataset.stopReason;
    if (clickedAt !== null && reason && reason !== 'running') { terminalCount=generated; done(); }
  }
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
  const prompt=document.querySelector('#generation-prompt'); prompt.value=target===23?'a':'a'.repeat(target-1);
  prompt.dispatchEvent(new Event('input',{bubbles:true}));
  if(target===23){const set=(id,value)=>{const input=document.querySelector(id);input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));};set('#seed','14');set('#temperature','2');set('#top-k','259');
    const mode=document.querySelector('#sampling-mode');mode.value='sample';
    mode.dispatchEvent(new Event('change',{bubbles:true}));window.__perf.stopAtContext=23;
  } else {const mode=document.querySelector('#sampling-mode'); mode.value='greedy';
    mode.dispatchEvent(new Event('change',{bubbles:true}));}
  const max=document.querySelector('#max-new-tokens'); max.value='24';
  max.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('[data-testid="generate"]').click(); check();
})"""

CYCLE_BATCH = r"""async ([first, last]) => {
  const waitMutation = (test, action) => new Promise((resolve,reject) => {
    const timeout=setTimeout(()=>finish('cycle mutation timeout'),30000), observer=new MutationObserver(check);
    function finish(error){clearTimeout(timeout);observer.disconnect();error?reject(error):resolve();}
    function check(){if(test())finish();} observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});action();check();
  });
  const waitReplay = (index, action) => waitMutation(() =>
    document.querySelector(`.generated-token[data-step-index="${index}"]`)?.getAttribute('aria-pressed')==='true' &&
    document.querySelector('#status')?.dataset.status==='complete', action);
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  for(let cycle=first;cycle<=last;cycle++) {
    const stopAt=1+(cycle%5);
    await waitMutation(()=>document.querySelector('[data-testid="generation-usage"]').dataset.stopReason==='running' &&
      document.querySelectorAll('.generated-token').length>=stopAt,
      ()=>document.querySelector('[data-testid="generate"]').click());
    await waitMutation(()=>document.querySelector('[data-testid="generation-usage"]').dataset.stopReason!=='running',
      ()=>document.querySelector('[data-testid="stop-generation"]').click());
    const tokens=[...document.querySelectorAll('.generated-token')];
    await waitReplay(0,()=>tokens[0].click());
    await waitReplay(tokens.length-1,()=>tokens.at(-1).click());
    document.querySelector('#mode-explore').click(); document.querySelector('#mode-guided').click();
    for(const id of ['tab-tensor','tab-source','tab-explanation']) document.querySelector('#'+id).click();
  }
  document.querySelector('#mode-guided').click(); document.querySelector('#tab-explanation').click();
  document.querySelector('#curriculum-stage-0').click(); await settle();
  return {cycle:last,workers:window.__perf.workers,messages:window.__perf.messages,
    generated:document.querySelectorAll('.generated-token').length,
    selected:document.querySelectorAll('.generated-token[aria-pressed="true"]').length,
    selectedIndex:Number(document.querySelector('.generated-token[aria-pressed="true"]').dataset.stepIndex),
    mode:document.querySelector('#mode-guided').getAttribute('aria-selected'),
    tab:document.querySelector('#tab-explanation').getAttribute('aria-selected'),
    stage:document.querySelector('#curriculum-stage-0').getAttribute('aria-current'),
    status:document.querySelector('#status').dataset.status};
}"""

BURST = r"""async () => {
  const buttons=[...document.querySelectorAll('.generated-token')], expected=buttons.length;
  const start=performance.now();
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>finish('burst timeout'),60000);
    const observer=new MutationObserver(check);let sawRunning=false;
    function finish(error){clearTimeout(timeout);observer.disconnect();error?reject(error):resolve();}
    function check(){const selected=document.querySelector('.generated-token[aria-pressed="true"]');
      const status=document.querySelector('#status')?.dataset.status;if(status==='running')sawRunning=true;
      if(sawRunning && Number(selected?.dataset.stepIndex)===expected-1 && status==='complete')finish();}
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});
    for(const button of buttons)button.click();check();});
  return {requests:expected,newestLatencyMs:performance.now()-start,
    selectedIndex:Number(document.querySelector('.generated-token[aria-pressed="true"]').dataset.stepIndex)};
}"""

DENSE_SWITCHES = r"""async () => {
  const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const states={};
  function sample(){return {nodes:document.getElementsByTagName('*').length,
    cells:document.querySelectorAll('[role="gridcell"]').length,visual:document.querySelector('.stage-visual')?.dataset.visual||'none'};}
  states.maxContext=sample();
  document.querySelector('#curriculum-stage-5').click(); await settle(); states.attention=sample();
  document.querySelector('#curriculum-stage-7').click(); await settle(); states.softmax=sample();
  const interactions=[];
  for(let i=0;i<100;i++) {const id=i%2?'mode-guided':'mode-explore';let start=performance.now();
    document.querySelector('#'+id).click(); document.body.offsetHeight; interactions.push(performance.now()-start);
    document.querySelector('#curriculum-stage-'+(i%3===0?5:7)).click(); await settle();}
  document.querySelector('#mode-guided').click(); document.querySelector('#curriculum-stage-7').click(); await settle();
  states.final=sample(); const cell=document.querySelector('[role="gridcell"]'); let clickMs=null;
  if(cell){const start=performance.now();cell.click();document.body.offsetHeight;clickMs=performance.now()-start;}
  return {states,maxInteractionMs:Math.max(...interactions),cellClickMs:clickMs};
}"""
