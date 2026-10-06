import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Evaluate each shipped renderer with its real imported modules. The DOM
// double models current controls, native activation, containment, focus and
// memory-only history; no browser, network, source data or survey is changed.
async function globalsFor(site) {
  const names=['support-paths.mjs','support-flow.mjs','support-journeys.mjs',
    ...(site==='defence'?['support-routing.mjs','support-verified-data.mjs']:
      ['support-catalog.mjs','support-handbook.mjs'])];
  return Object.assign({},...await Promise.all(names.map(name=>import(new URL('../'+site+'/'+name,import.meta.url)))));
}
const globals=Object.fromEntries(await Promise.all(['homelessness','defence'].map(async site=>[site,await globalsFor(site)])));

function renderer(site,globals) {
  const handlers={},documentHandlers={},windowHandlers={},pageTargets={};
  const decode=value=>String(value).replace(/&(amp|lt|gt|quot|#39);/g,(_all,name)=>({'amp':'&','lt':'<','gt':'>','quot':'"','#39':"'"}[name]));
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const voidTags=new Set(['input','br','img','hr','meta','link']);
  let focused=null,activeElement=null,selectedPreferences=[];
  let window;

  // A small tree, rather than an HTML-only stub, lets the real reconciliation
  // module retain nodes, remove stale controls and restore native checked state.
  class Element {
    constructor(tag,attributes={}) {
      this.tag=tag;this.attributes=attributes;this.childNodes=[];this.parentNode=null;
      this.checked=Object.hasOwn(attributes,'checked');this.focused=false;this.scrolled=false;this.focusCalls=0;
    }
    get children(){return this.childNodes.filter(child=>child instanceof Element);}
    get firstElementChild(){return this.children[0]||null;}
    get id(){return this.attributes.id||'';}
    get name(){return this.attributes.name||'';}
    get value(){return this.attributes.value||'';}
    get type(){return this.attributes.type||'';}
    get dataset(){return Object.fromEntries(Object.entries(this.attributes).filter(([name])=>name.startsWith('data-')).map(([name,value])=>[name.slice(5).replace(/-([a-z])/g,(_all,char)=>char.toUpperCase()),value]));}
    get hidden(){return Object.hasOwn(this.attributes,'hidden');}
    set hidden(value){if(value)this.attributes.hidden='';else delete this.attributes.hidden;}
    get innerHTML(){return this.childNodes.map(child=>typeof child==='string'?child:child.outerHTML).join('');}
    set innerHTML(value){
      if(this.contains(activeElement)){activeElement=null;focused=null;}
      for(const child of this.children)child.parentNode=null;
      this.childNodes=parse(value,this);
    }
    get outerHTML(){
      const attributes={...this.attributes};
      if(this.tag==='input'){if(this.checked)attributes.checked='';else delete attributes.checked;}
      const attrs=Object.entries(attributes).map(([name,value])=>value===''?' '+name:' '+name+'="'+escape(value)+'"').join('');
      return '<'+this.tag+attrs+'>'+ (voidTags.has(this.tag)?'':this.innerHTML+'</'+this.tag+'>');
    }
    get textContent(){return this.childNodes.map(child=>typeof child==='string'?decode(child):child.textContent).join('');}
    set textContent(value){this.childNodes=[escape(value)];}
    getAttribute(name){return this.attributes[name]??null;}
    setAttribute(name,value){this.attributes[name]=String(value);}
    matches(selector){
      let checked=false;
      if(selector.endsWith(':checked')){checked=true;selector=selector.slice(0,-8);}
      const notOpen=selector.endsWith(':not([open])');
      if(notOpen)selector=selector.slice(0,-12);
      const attrs=[...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
      const plain=selector.replace(/\[[^\]]+\]/g,'');
      const tag=plain.match(/^[a-z][\w-]*/i)?.[0];
      const id=plain.match(/#([\w-]+)/)?.[1];
      const classes=[...plain.matchAll(/\.([\w-]+)/g)].map(match=>match[1]);
      return (!tag||this.tag===tag)&&(!id||this.id===id)&&classes.every(name=>(this.attributes.class||'').split(/\s+/).includes(name))&&attrs.every(match=>Object.hasOwn(this.attributes,match[1])&&(match[2]===undefined||this.attributes[match[1]]===match[2]))&&(!checked||this.checked)&&(!notOpen||!Object.hasOwn(this.attributes,'open'));
    }
    closest(selector){for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;return null;}
    contains(node){for(let current=node;current;current=current.parentNode)if(current===this)return true;return false;}
    querySelectorAll(selector){
      const parts=selector.split(/\s+/),found=[];
      const accepts=node=>{
        if(!node.matches(parts.at(-1)))return false;
        let ancestor=node.parentNode;
        for(let index=parts.length-2;index>=0;index--){while(ancestor&&!ancestor.matches(parts[index]))ancestor=ancestor.parentNode;if(!ancestor)return false;ancestor=ancestor.parentNode;}
        return true;
      };
      const visit=node=>{for(const child of node.children){if(accepts(child))found.push(child);visit(child);}};
      visit(this);return found;
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    insertBefore(node,before){
      node.remove();
      const index=before?this.childNodes.indexOf(before):this.childNodes.length;
      assert.ok(index>=0,'Insert before a live child');this.childNodes.splice(index,0,node);node.parentNode=this;
    }
    remove(){
      if(!this.parentNode)return;
      if(this.contains(activeElement)){activeElement=null;focused=null;}
      const siblings=this.parentNode.childNodes;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;
    }
    focus(){this.focused=true;this.focusCalls++;activeElement=this;focused=this.id||(this.tag==='h1'?'heading':this.tag);}
    scrollIntoView(){this.scrolled=true;}
    getBoundingClientRect(){
      const field=this.closest('fieldset'),container=field?.parentNode;
      const index=container?.children.indexOf(field)||0;
      const control=field?.querySelectorAll('input[type="radio"]').indexOf(this)||0;
      return {top:260+index*180+Math.max(control,0)*40-window.scrollY};
    }
    click(){
      if(this.type==='radio')activateControl(this,false);
      else handlers.click?.({target:this,preventDefault:()=>{}});
    }
    addEventListener(type,handler){handlers[type]=handler;}
  }
  function parse(markup,parent){
    const holder=new Element('fragment'),stack=[holder];
    for(const token of String(markup).match(/<[^>]+>|[^<]+/g)||[]){
      if(token.startsWith('</')){stack.pop();continue;}
      if(!token.startsWith('<')){stack.at(-1).childNodes.push(token);continue;}
      if(token.startsWith('<!'))continue;
      const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
      const attributes={};
      for(const match of token.slice(tag.length+1,-1).matchAll(/([^\s=]+)(?:="([^"]*)")?/g))attributes[match[1]]=decode(match[2]||'');
      const element=new Element(tag,attributes);element.parentNode=stack.at(-1);stack.at(-1).childNodes.push(element);
      if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push(element);
    }
    for(const child of holder.children)child.parentNode=parent;
    return holder.childNodes;
  }
  const root=new Element('div',{id:'finder'});
  const target=id=>pageTargets[id]||=(new Element('section',{id}));
  for(const id of ['main','urgent-help'])target(id);
  const getById=id=>id==='finder'?root:root.querySelector('#'+id)||pageTargets[id]||null;
  let href='https://example.test/support.html#home';
  const location={get href(){return href;},get hash(){return new URL(href).hash;},set hash(value){href=new URL(value,href).href;}};
  const historyEntries=[{state:null,url:href}];let historyIndex=0;
  const history={
    get state(){return historyEntries[historyIndex].state;},
    replaceState(state,_title,url){if(url)href=new URL(url,href).href;historyEntries[historyIndex]={state,url:href};},
    pushState(state,_title,url){if(url)href=new URL(url,href).href;historyEntries.splice(historyIndex+1);historyEntries.push({state,url:href});historyIndex++;}
  };
  window={
    scrollY:0,addEventListener:(type,handler)=>{windowHandlers[type]=handler;},
    scrollTo:({top})=>{window.scrollY=top;},scrollBy:({top})=>{window.scrollY+=top;},print:()=>{}
  };
  window.self=window;window.top=window;
  const document={
    get activeElement(){return activeElement;},getElementById:getById,querySelector:()=>null,
    createElement(tag){if(tag==='template'){const element=new Element('template');Object.defineProperty(element,'content',{get:()=>element});return element;}return new Element(tag);},
    addEventListener:(type,handler)=>{documentHandlers[type]=handler;}
  };
  const context=vm.createContext({
    ...globals,location,history,document,window,URL,requestAnimationFrame:callback=>callback(),
    localStorage:new Proxy({}, {get:()=>{throw new Error('No persistent answers');}}),
    sessionStorage:new Proxy({}, {get:()=>{throw new Error('No persistent answers');}})
  });
  const progressive=readFileSync(new URL('../'+site+'/support-progressive.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
  vm.runInContext(progressive,context);
  const source=readFileSync(new URL('../'+site+'/support.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source,context);
  const run=code=>vm.runInContext(code,context);
  const render=hash=>{if(hash)location.hash=hash;run('render()');};
  function click(action,hash,question){
    const element={dataset:{action,question},hash};
    handlers.click({target:{closest(selector){
      if(selector==='a[href^="#"]')return hash?element:null;
      const match=selector.match(/^\[data-action="([^"]+)"\]$/);return match&&match[1]===action?element:null;
    }},preventDefault:()=>{}});
  }
  const navigate=hash=>click(undefined,hash);
  function nativeButton(action){
    const control=root.querySelector('button[data-action="'+action+'"]');
    assert.ok(control,'The action must be a currently visible native button');assert.equal(control.type,'button','The action must not submit a form');return control;
  }
  function pressButton(action,key){
    const control=nativeButton(action);control.focus();let prevented=false;
    handlers.keydown?.({target:control,key,preventDefault:()=>{prevented=true;}});
    if(!prevented&&key==='Enter')control.click();
    if(!prevented&&key===' '){handlers.keyup?.({target:control,key,preventDefault:()=>{prevented=true;}});if(!prevented)control.click();}
    return prevented;
  }
  function filterDirectory(id,value){handlers.change({target:{id,value}});}
  const fields=()=>root.querySelector('#flow-questions')?.children||[];
  const field=id=>fields().find(node=>node.dataset.questionId===id);
  const question=()=>fields().find(node=>!node.querySelector('input:checked'))?.dataset.questionId;
  function radio(questionId,value){
    const group=field(questionId);assert.ok(group,'Choose a currently visible question group');
    const control=group.querySelectorAll('input[type="radio"]').find(input=>input.value===value);
    assert.ok(control,'Choose an offered radio value');return control;
  }
  function activateControl(control,focus=true){
    const group=control.closest('fieldset'),wasChecked=control.checked;
    assert.ok(root.contains(control)&&group,'Activate a current rendered control');
    if(focus)control.focus();handlers.pointerdown?.({target:control});
    for(const input of group.querySelectorAll('input[type="radio"]'))input.checked=input===control;
    handlers.click({target:control,preventDefault:()=>{}});
    if(!wasChecked)handlers.change({target:control});
  }
  const choose=(id,value)=>activateControl(radio(id,value));
  function change(id,value){
    const control=radio(id,value);control.focus();
    for(const input of field(id).querySelectorAll('input[type="radio"]'))input.checked=input===control;
    handlers.change({target:control});
  }
  function key(id,value,key){
    const control=radio(id,value);control.focus();let prevented=false;
    handlers.keydown?.({target:control,key,preventDefault:()=>{prevented=true;}});
    if(!prevented&&(key===' '||key==='Spacebar'))activateControl(control,false);
    if(!prevented&&['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(key)){
      const controls=field(id).querySelectorAll('input[type="radio"]'),direction=['ArrowUp','ArrowLeft'].includes(key)?-1:1;
      activateControl(controls[(controls.indexOf(control)+direction+controls.length)%controls.length]);
    }
    return prevented;
  }
  function submit(){let prevented=false;handlers.submit({target:{id:'support-flow'},preventDefault:()=>{prevented=true;}});assert.equal(prevented,true,'A form event cannot submit personal information');}
  function jump(targetId){
    let prevented=false;documentHandlers.click({target:{closest:selector=>selector==='a[data-page-jump]'?{dataset:{pageJump:targetId}}:null},preventDefault:()=>{prevented=true;}});
    return {prevented,target:getById(targetId)};
  }
  function prefer(values){
    selectedPreferences=values;
    for(const control of root.querySelectorAll('input[name="support-preference"]'))control.checked=selectedPreferences.includes(control.value);
    const control=root.querySelectorAll('input[name="support-preference"]').find(input=>input.value===values[0]);
    assert.ok(control,'Preference is a currently offered control');handlers.change({target:control});
  }
  function traverse(offset){
    const nextIndex=historyIndex+offset;assert.ok(nextIndex>=0&&nextIndex<historyEntries.length,'History entry exists');
    const oldHash=location.hash;historyIndex=nextIndex;href=historyEntries[historyIndex].url;
    windowHandlers.popstate?.({state:history.state});if(oldHash!==location.hash)windowHandlers.hashchange?.({});
  }
  return {root,run,render,navigate,click,change,submit,choose,jump,prefer,location,pageTargets,
    back:()=>traverse(-1),forward:()=>traverse(1),question,fields,radio,
    selected:(id=question())=>field(id)?.querySelector('input:checked')?.value,
    next:()=>root.querySelector('#flow-next'),focus:()=>focused,key,nativeButton,pressButton,filterDirectory,
    dispatchChange:control=>handlers.change({target:control}),historySize:()=>historyEntries.length,
    active:()=>activeElement,scroll:()=>window.scrollY};
}

const plans={
 homelessness:{
  food:'#task/food-washing/0',foodNeed:'food-essentials',
  multistep:'#task/tonight',steps:[['region','darwin'],['age','25-49'],['household','single-man']],
  named:'#health/health-wellbeing',namedSteps:[['region','alice'],['age','25-49']],
  other:'#task/medical/0',recoveryRegion:'darwin'
 },
 defence:{
  food:'#task/money/2',foodNeed:'essentials',
  multistep:'#task/mental-health/0',steps:[['age','26+'],['counselling','member'],['region','darwin']],
  named:'#mental/feelings',namedSteps:[['age','26+'],['counselling','member'],['region','darwin']],
  other:'#task/health/0',recoveryRegion:'palmerston'
 }
};
for(const site of ['homelessness','defence']){
 const plan=plans[site],fresh=()=>renderer(site,globals[site]);
 test(site+': choosing a radio reveals the next group while retaining every answered group and option',()=>{
  const ui=fresh();ui.navigate(plan.multistep);
  const retained=new Map();
  for(const [index,[id,value]] of plan.steps.entries()){
   assert.equal(ui.question(),id);
   const control=ui.radio(id,value),group=control.closest('fieldset');
   const options=group.querySelectorAll('input[type="radio"]');
   const beforeHistory=ui.historySize();
   retained.set(id,{group,options});ui.choose(id,value);
   assert.equal(ui.run('state.answers['+JSON.stringify(id)+']'),value);
   assert.equal(ui.historySize(),beforeHistory+1,'One answer adds one post-answer snapshot');
   assert.equal(ui.active(),control,'Native focus stays on the selected radio');
   for(const [questionId,prior] of retained){
    assert.equal(ui.radio(questionId,prior.options[0].value).closest('fieldset'),prior.group,'An answered group keeps its node');
    assert.deepEqual(prior.group.querySelectorAll('input[type="radio"]'),prior.options,'All original options stay available');
   }
   ui.dispatchChange(control);
   assert.equal(ui.historySize(),beforeHistory+1,'A duplicate event from the retained control creates no extra history');
   if(index<plan.steps.length-1)assert.equal(ui.question(),plan.steps[index+1][0]);
   else{assert.equal(ui.question(),undefined);assert.match(ui.root.innerHTML,/Contact a service/);}
   assert.doesNotMatch(ui.root.innerHTML,/id="flow-next"|type="submit"|data-action="edit-answer"|data-action="previous-question"/);
   assert.ok((ui.root.innerHTML.match(/id="chat-options"/g)||[]).length<=1,'Contact cards never duplicate the primary chat target');
  }
 });
 test(site+': Back restores the immutable unanswered snapshot and Forward restores the selected answer and contacts',()=>{
  const ui=fresh();ui.navigate(plan.food);
  const before=ui.run('JSON.stringify(state)');ui.choose('region','alice');
  const after=ui.run('JSON.stringify(state)');
  ui.back();
  assert.equal(ui.run('JSON.stringify(state)'),before,'A later native selection cannot mutate the pre-answer snapshot');
  assert.equal(ui.question(),'region');assert.equal(ui.selected('region'),undefined);
  assert.doesNotMatch(ui.root.innerHTML,/class="primary-service-heading"/);
  ui.forward();assert.equal(ui.run('JSON.stringify(state)'),after);
  assert.equal(ui.question(),undefined);assert.equal(ui.selected('region'),'alice');
  assert.match(ui.root.innerHTML,/Contact a service/);
  const history=ui.historySize(),key=ui.run('history.state.supportView'),control=ui.radio('region','alice');
  ui.choose('region','alice');
  assert.equal(ui.historySize(),history,'Re-clicking the checked value adds no history');
  assert.equal(ui.run('history.state.supportView'),key,'Re-clicking does not replace the existing snapshot');
  assert.equal(ui.active(),control);
 });
 test(site+': native change, Enter and Space reveal contacts without moving radio focus',()=>{
  const changed=fresh();changed.navigate(plan.food);changed.change('region','alice');
  assert.equal(changed.question(),undefined);assert.equal(changed.active(),changed.radio('region','alice'));
  for(const key of ['Enter',' ','Spacebar']){
   const ui=fresh();ui.navigate(plan.food);
   const control=ui.radio('region','alice');
   assert.equal(ui.key('region','alice',key),key==='Enter','Space keeps its native default; Enter activates the radio');
   assert.equal(ui.question(),undefined);assert.equal(ui.run('state.answers.region'),'alice');assert.equal(ui.active(),control);
   const history=ui.historySize();
   assert.equal(ui.key('region','alice',key),key==='Enter');
   assert.equal(ui.historySize(),history,'Checked keyboard activation adds no duplicate snapshot');
   assert.equal(ui.active(),control);
  }
 });
 test(site+': native arrow selection changes the actual event control rather than reading another checked group',()=>{
  const ui=fresh();ui.navigate(plan.food);ui.choose('region','alice');
  const controls=ui.radio('region','alice').closest('fieldset').querySelectorAll('input[type="radio"]');
  const next=controls[(controls.indexOf(ui.radio('region','alice'))+1)%controls.length];
  assert.equal(ui.key('region','alice','ArrowDown'),false);
  assert.equal(ui.run('state.answers.region'),next.value);assert.equal(ui.active(),next);
  assert.equal(ui.run('state.answers.need'),plan.foodNeed);
 });
 test(site+': direct region reselection immediately recalculates contacts with every original option still visible',()=>{
  const ui=fresh();ui.navigate(plan.food);ui.choose('region','alice');
  const before=ui.run('JSON.stringify(currentResults().ids)'),group=ui.radio('region','alice').closest('fieldset');
  const options=group.querySelectorAll('input[type="radio"]');ui.choose('region','darwin');
  assert.equal(ui.run('state.answers.need'),plan.foodNeed);assert.equal(ui.run('state.answers.region'),'darwin');
  assert.equal(ui.question(),undefined);assert.notEqual(ui.run('JSON.stringify(currentResults().ids)'),before);
  assert.equal(ui.radio('region','alice').closest('fieldset'),group);assert.deepEqual(group.querySelectorAll('input[type="radio"]'),options);
  assert.equal(ui.active(),ui.radio('region','darwin'));
 });
 test(site+': task choice remains an editable radio group through contacts and its history restores both branches',()=>{
  const ui=fresh(),taskHash=plan.food.replace(/\/\d+$/,''),choiceIndex=plan.food.split('/').at(-1);
  ui.navigate(taskHash);assert.equal(ui.question(),'journey-choice');
  const group=ui.radio('journey-choice',choiceIndex).closest('fieldset'),options=group.querySelectorAll('input[type="radio"]');
  ui.choose('journey-choice',choiceIndex);
  assert.equal(ui.run('state.answers.need'),plan.foodNeed);assert.equal(ui.question(),'region');
  ui.choose('region','alice');assert.equal(ui.question(),undefined);
  const original=ui.run('JSON.stringify(state)'),alternative=options.find(input=>input.value!==choiceIndex);
  ui.choose('journey-choice',alternative.value);
  assert.equal(ui.active(),alternative,'Changing an earlier task choice keeps native radio focus');
  assert.equal(ui.radio('journey-choice',choiceIndex).closest('fieldset'),group);
  assert.deepEqual(group.querySelectorAll('input[type="radio"]'),options,'Earlier task choices are never collapsed');
  assert.equal(ui.run('state.entryKey'),taskHash.replace('#task/','')+'/'+alternative.value);
  const revised=ui.run('JSON.stringify(state)');assert.notEqual(revised,original);
  ui.back();assert.equal(ui.run('JSON.stringify(state)'),original);assert.equal(ui.selected('journey-choice'),choiceIndex);
  ui.forward();assert.equal(ui.run('JSON.stringify(state)'),revised);assert.equal(ui.selected('journey-choice'),alternative.value);
 });
 test(site+': a detached control from the previous task cannot change the current answers or history',()=>{
  const ui=fresh();ui.navigate(plan.food);const stale=ui.radio('region','alice');
  ui.navigate(plan.multistep);assert.equal(ui.root.contains(stale),false);
  const before=ui.run('JSON.stringify(state)'),history=ui.historySize();stale.checked=true;ui.dispatchChange(stale);
  assert.equal(ui.run('JSON.stringify(state)'),before);assert.equal(ui.historySize(),history);
 });
 test(site+': urgent-help focus and return preserve the current unanswered flow',()=>{
  const ui=fresh();ui.navigate(plan.multistep);
  const state=ui.run('JSON.stringify(state)'),question=ui.question(),hash=ui.location.hash;
  for(const id of ['urgent-help','main']){
   const jump=ui.jump(id);assert.equal(jump.prevented,true);assert.equal(jump.target.focused,true);assert.equal(jump.target.scrolled,true);
   assert.equal(ui.run('JSON.stringify(state)'),state);assert.equal(ui.question(),question);assert.equal(ui.location.hash,hash);
  }
  ui.choose(...plan.steps[0]);assert.equal(ui.active(),ui.radio(...plan.steps[0]));
 });
 test(site+': recovery retains original need and region with real Back, Forward and return links',()=>{
  const ui=fresh();ui.navigate(plan.food);ui.choose('region',plan.recoveryRegion);
  const original=ui.run('JSON.stringify(state)'),primary=ui.run('currentResults().ids[0]');
  ui.click('request-help','#help');ui.back();
  assert.equal(ui.run('JSON.stringify(state)'),original);assert.equal(ui.question(),undefined);
  ui.forward();assert.equal(ui.run('handoff.answers.need'),plan.foodNeed);assert.equal(ui.run('handoff.answers.region'),plan.recoveryRegion);
  if(site==='defence')ui.choose('connection','former');
  assert.equal(ui.question(),undefined);assert.equal(ui.run('currentResults().ids.includes('+JSON.stringify(primary)+')'),false);
  assert.doesNotMatch(ui.root.innerHTML,/data-action="request-help"/);
  ui.click('return-to-request',plan.food);assert.equal(ui.run('JSON.stringify(state)'),original);assert.equal(ui.question(),undefined);
 });
 test(site+': named-link history restores eligibility despite the paired hashchange event',()=>{
  const ui=fresh();ui.navigate(plan.named);for(const step of plan.namedSteps)ui.choose(...step);
  const original=ui.run('JSON.stringify(state)');ui.navigate(plan.other);ui.back();
  assert.equal(ui.location.hash,plan.named);assert.equal(ui.run('JSON.stringify(state)'),original);assert.equal(ui.question(),undefined);
 });
 test(site+': form submission cannot advance or transmit an unanswered flow',()=>{
  const ui=fresh();ui.navigate(plan.food);const before=ui.run('JSON.stringify(state)');
  ui.submit();assert.equal(ui.question(),'region');assert.equal(ui.run('JSON.stringify(state)'),before);
 });
 test(site+': visible contact cards retain service access conditions, real actions and checked source links',()=>{
  const ui=fresh();ui.navigate(plan.food);ui.choose('region','alice');
  const cards=ui.root.querySelectorAll('.service-card');assert.ok(cards.length>0);
  for(const card of cards){
   assert.ok(card.querySelector('h3')?.textContent.trim());
   assert.ok(card.querySelector('.fit')?.textContent.includes('Who can use it:'));
   assert.ok(card.querySelector('.access')?.textContent.includes('How to access it:'));
   assert.match(card.querySelector('.service-source summary')?.textContent||'',/Information checked/);
   const sources=card.querySelectorAll('.service-source a').filter(anchor=>/^https?:\/\//.test(anchor.getAttribute('href')));
   assert.ok(sources.length>0,'Each visible service retains its official sources');
   for(const anchor of card.querySelectorAll('.service-actions a'))assert.match(anchor.getAttribute('href'),/^(tel:|sms:|mailto:|https?:\/\/)/);
  }
 });
}
test('homelessness: changing refuge region clears the old community qualification before showing contacts',()=>{
 const ui=renderer('homelessness',globals.homelessness);
 ui.navigate('#task/violence/1');ui.choose('refugeFor','first-nations-child');ui.choose('region','topend');
 assert.equal(ui.question(),'community');
 const community=ui.run("currentFlow().nextQuestion.options[0].value");
 ui.choose('community',community);assert.equal(ui.question(),undefined);
 const stale=ui.radio('community',community);
 ui.choose('region','alice');
 assert.equal(ui.root.contains(stale),false,'The former community control is detached');
 const current=ui.run('JSON.stringify(state)'),history=ui.historySize();ui.dispatchChange(stale);
 assert.equal(ui.run('JSON.stringify(state)'),current);assert.equal(ui.historySize(),history);
 assert.notEqual(ui.run('state.answers.community'),community);
 assert.equal(ui.run('state.answers.region'),'alice');
});
test('defence: changing patient role clears former treatment answers and asks the new prerequisite',()=>{
 const ui=renderer('defence',globals.defence);
 ui.navigate('#task/health/3');ui.choose('connection','serving');ui.choose('role','other');ui.choose('dvaTravel','yes');
 assert.equal(ui.question(),undefined);
 const stale=ui.radio('dvaTravel','yes');
 ui.choose('role','member');
 assert.equal(ui.root.contains(stale),false,'The former treatment-cover control is detached');
 const current=ui.run('JSON.stringify(state)'),history=ui.historySize();ui.dispatchChange(stale);
 assert.equal(ui.run('JSON.stringify(state)'),current);assert.equal(ui.historySize(),history);
 assert.equal(ui.run('state.answers.dvaTravel'),undefined);assert.equal(ui.question(),'region');
 ui.choose('region','alice');ui.choose('role','other');
 assert.equal(ui.question(),'dvaTravel');assert.doesNotMatch(ui.root.innerHTML,/class="primary-service-heading"/);
});

for(const site of ['homelessness','defence'])test(site+': unavailable route recovers without showing a fabricated contact',()=>{
 const ui=renderer(site,{...globals[site],getResults:()=>({ids:[]})}),plan=plans[site];
 ui.navigate(plan.food);ui.choose('region',plan.recoveryRegion);
 assert.match(ui.root.innerHTML,/There is no matched contact|No service matches/);
 assert.doesNotMatch(ui.root.innerHTML,/class="primary-service-heading"/);
 ui.click('request-help','#help');
 assert.equal(ui.run('handoff.answers.need'),plan.foodNeed);
 assert.equal(ui.run('handoff.answers.region'),plan.recoveryRegion);
 if(site==='defence')ui.choose('connection','former');
 assert.equal(ui.question(),undefined);
 assert.ok(ui.run('currentResults().ids.length')>0,'Recovery provides a real published navigation service');
 assert.doesNotMatch(ui.root.innerHTML,/data-action="request-help"/,'Recovery avoids a loop');
});

function assertRestarted(ui) {
  assert.equal(ui.location.hash,'#home','Start again removes the current choice URL');
  assert.equal(ui.focus(),'heading','Focus returns to the home heading');
  assert.equal(ui.question(),undefined);
  assert.deepEqual(JSON.parse(ui.run('JSON.stringify(state)')),{topicId:null,answers:{}});
  assert.equal(ui.run('topicAnswers.size + journeyAnswers.size + historyViews.size'),0,'No saved answers or old snapshots survive');
  assert.equal(ui.run('savedRegion'),'');
  for(const name of ['handoff','activeJourney','restoredHistoryURL'])assert.equal(ui.run(name),null);
  assert.deepEqual(JSON.parse(ui.run('JSON.stringify(directoryChoice)')),{need:'',region:''});
  assert.equal(ui.run('history.state'),null,'The current history entry no longer names an answer snapshot');
  assert.doesNotMatch(ui.root.innerHTML,/id="support-contacts"|class="answer-record"|data-action="return-to-request"/);
}
function assertFreshQualifiers(ui) {
  for(const key of ['age','childAge','region','household','counselling','connection','role','dvaTravel','ntResidence','dependant','community','preferences']) {
    assert.equal(ui.run('state.answers['+JSON.stringify(key)+']'),undefined,'Old '+key+' must not return');
  }
}
function registerResetTests(site,fresh,plan) {
  test(site+': visible Start again from a retained answered group clears all remembered eligibility and regions',()=>{
    const ui=fresh();ui.navigate(plan.multistep);
    for(const step of plan.steps)ui.choose(...step);
    ui.navigate(plan.food);
    assert.equal(ui.question(),undefined,'The old local region is remembered before reset');
    ui.navigate(plan.multistep);
    assert.equal(ui.question(),undefined,'The old journey answers are remembered before reset');
    assert.ok(ui.run('topicAnswers.size')>=2);assert.ok(ui.run('journeyAnswers.size')>=2);
    ui.radio('age',plan.steps.find(([id])=>id==='age')[1]).focus();
    assert.match(ui.root.innerHTML,/<nav class="back-nav"[^>]*>[\s\S]*data-action="reset">Start again<\/button><\/nav>/);
    ui.nativeButton('reset').click();
    assertRestarted(ui);
    ui.navigate(plan.multistep);
    assert.equal(ui.question(),plan.steps[0][0],'The original task starts with its first required question');
    assertFreshQualifiers(ui);
    assert.doesNotMatch(ui.root.innerHTML,/id="flow-next"/);
  });
  test(site+': Enter and Space activate the native Start again button once from results',()=>{
    for(const key of ['Enter',' ']) {
      const ui=fresh();ui.navigate(plan.multistep);
      for(const step of plan.steps)ui.choose(...step);
      assert.match(ui.root.innerHTML,/Contact a service/);
      assert.equal(ui.pressButton('reset',key),false,'Keyboard activation keeps the native button default');
      assertRestarted(ui);
      ui.navigate(plan.food);
      assert.equal(ui.question(),'region','The last saved town cannot silently prefill the next person');
      assertFreshQualifiers(ui);
    }
  });
  test(site+': Start again clears the recovery handoff and cannot reopen the original client request',()=>{
    const ui=fresh();ui.navigate(plan.food);ui.choose('region',plan.recoveryRegion);
    ui.click('request-help','#help');
    assert.ok(ui.run('handoff'));
    assert.match(ui.root.innerHTML,/data-action="return-to-request"/);
    ui.nativeButton('reset').click();assertRestarted(ui);
    ui.navigate('#help');
    assert.equal(ui.run('handoff'),null);
    assert.doesNotMatch(ui.root.innerHTML,/data-action="return-to-request"|class="handoff-context"/);
    assertFreshQualifiers(ui);
  });
  test(site+': Back and Forward through old same-URL steps cannot restore pre-reset qualifications',()=>{
    const ui=fresh();ui.navigate(plan.multistep);
    for(const step of plan.steps)ui.choose(...step);
    ui.back(); // Keep an old result in Forward history, then reset from its question.
    ui.nativeButton('reset').click();assertRestarted(ui);
    ui.back();
    assert.equal(ui.question(),plan.steps[0][0]);assertFreshQualifiers(ui);
    ui.back(); // The URL has not changed, so this exercises popstate without hashchange.
    assert.equal(ui.question(),plan.steps[0][0]);assertFreshQualifiers(ui);
    ui.forward();assert.equal(ui.question(),plan.steps[0][0]);assertFreshQualifiers(ui);
    ui.forward();assert.equal(ui.location.hash,'#home');assert.equal(ui.question(),undefined);
    ui.forward(); // The former result URL still exists, but its answer snapshot does not.
    assert.equal(ui.location.hash,plan.multistep);
    assert.equal(ui.question(),plan.steps[0][0]);assertFreshQualifiers(ui);
    ui.choose(...plan.steps[0]);
    assert.equal(ui.question(),plan.steps[1][0],'New choices still advance immediately');
    ui.back();assert.equal(ui.question(),plan.steps[0][0]);assert.equal(ui.selected(plan.steps[0][0]),undefined);
    ui.forward();assert.equal(ui.question(),plan.steps[1][0],'New post-reset history remains usable');
  });
  test(site+': reset clears resource filters and named deep links later open fresh valid flows',()=>{
    const ui=fresh();ui.navigate(plan.multistep);
    for(const step of plan.steps)ui.choose(...step);
    ui.navigate('#directory');
    ui.filterDirectory('directory-region','alice');
    assert.equal(ui.run('directoryChoice.region'),'alice');
    ui.nativeButton('reset').click();assertRestarted(ui);
    ui.navigate(plan.named);
    assert.equal(ui.question(),plan.namedSteps[0][0]);
    assertFreshQualifiers(ui);
    for(const step of plan.namedSteps)ui.choose(...step);
    assert.equal(ui.question(),undefined);assert.match(ui.root.innerHTML,/Contact a service/);
  });
}

for(const site of ['homelessness','defence'])registerResetTests(site,()=>renderer(site,globals[site]),plans[site]);
test('homelessness: Start again clears refuge community qualifications and their recovery snapshot',()=>{
  const ui=renderer('homelessness',globals.homelessness);
  ui.navigate('#task/violence/1');ui.choose('refugeFor','first-nations-child');ui.choose('region','topend');
  const community=ui.run('currentFlow().nextQuestion.options[0].value');
  ui.choose('community',community);
  ui.click('request-help','#help');
  assert.equal(ui.run('handoff.answers.community'),community);
  ui.nativeButton('reset').click();assertRestarted(ui);
  ui.navigate('#task/violence/1');
  assert.equal(ui.question(),'refugeFor');assertFreshQualifiers(ui);
});
test('defence: Start again clears patient, treatment-cover and service-connection qualifications',()=>{
  const ui=renderer('defence',globals.defence);
  ui.navigate('#task/health/3');ui.choose('connection','serving');ui.choose('role','other');ui.choose('dvaTravel','yes');
  assert.equal(ui.question(),undefined);
  ui.nativeButton('reset').click();assertRestarted(ui);
  ui.navigate('#task/health/3');
  assert.equal(ui.question(),'connection');assertFreshQualifiers(ui);
});

test('defence: an ineligible serving-family scheme shows its actual reason and recovers to a published navigation contact',()=>{
 const ui=renderer('defence',globals.defence);ui.navigate('#task/home-help/1');ui.choose('connection','former');
 assert.equal(ui.question(),undefined);assert.equal(ui.run('currentResults().ids.length'),0);
 assert.doesNotMatch(ui.root.innerHTML,/class="primary-service-heading"/);
 assert.match(ui.root.querySelector('.notice')?.textContent||'',/serving-family Emergency Support scheme does not fit the Defence connection selected/);
 assert.match(ui.root.innerHTML,/data-action="request-help"/);
 ui.click('request-help','#help');
 assert.equal(ui.run('handoff.answers.need'),'family-crisis');assert.equal(ui.run('handoff.answers.connection'),'former');
 assert.equal(ui.question(),undefined);assert.ok(ui.run('currentResults().ids.length')>0,'Recovery uses an actual published navigation route');
 assert.ok(ui.root.querySelector('.service-card-primary'));
 assert.ok(ui.root.querySelector('.service-card-primary .service-source a'));
 assert.doesNotMatch(ui.root.innerHTML,/data-action="request-help"/,'The navigation contact cannot loop back to itself');
});
