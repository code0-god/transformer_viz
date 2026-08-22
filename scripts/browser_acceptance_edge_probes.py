# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by browser_acceptance.py.
"""Visible-form C002 Korean error and recovery probe."""

KOREAN_UI = r"""(async()=>{const set=(selector,value,event='input')=>{const node=document.querySelector(selector);node.value=value;node.dispatchEvent(new Event(event,{bubbles:true}))};
 const wait=(test,action,label)=>new Promise((ok,bad)=>{const observer=new MutationObserver(check);function check(){if(!test())return;observer.disconnect();clearTimeout(timeout);requestAnimationFrame(()=>requestAnimationFrame(ok))}const timeout=setTimeout(()=>bad(label+' timeout'),60000);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});action();check()});
 const state=()=>{const message=document.querySelector('[data-testid="generation-error"]')?.textContent||'';return{message,korean:[...message].some(c=>c>='가'&&c<='힣'),generated:document.querySelectorAll('.generated-token').length,trace:Boolean(document.querySelector('.context-token[data-trace-ready="true"]')),inspectorEvidence:Boolean(document.querySelector('[data-detail-tensor-id],.source-line.active'))}};
 await wait(()=>Boolean(document.querySelector('[data-testid="generation-error"]')),()=>{set('#generation-prompt','');document.querySelector('[data-testid="generate"]').click()},'empty UI');const empty=state();
 await wait(()=>document.querySelector('[data-testid="generation-error"]')?.textContent!==empty.message,()=>{set('#generation-prompt','가나다라마바사아자a');document.querySelector('[data-testid="generate"]').click()},'overlength UI');const overlength=state();
 await wait(()=>document.querySelector('[data-testid="generation-usage"]')?.dataset.stopReason==='max_new_tokens',()=>{set('#generation-prompt','cat');set('#max-new-tokens','1');set('#sampling-mode','greedy','change');document.querySelector('[data-testid="generate"]').click()},'valid UI recovery');
 const recovery={status:document.querySelector('#status').dataset.status,generated:document.querySelectorAll('.generated-token').length,error:Boolean(document.querySelector('[data-testid="generation-error"]'))};return{empty,overlength,recovery}})()"""
