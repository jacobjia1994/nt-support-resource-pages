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
  const handlers = {}, documentHandlers = {}, windowHandlers = {};
  const pageTargets = {};
  let focused=null;
  const target = id => pageTargets[id] ||= {
    focused:false, scrolled:false, innerHTML:'', textContent:'',
    focus() { this.focused=true; focused=id; },
    scrollIntoView() { this.scrolled=true; },
    setAttribute(name,value) { this[name]=value; },
    matches() { return false; }
  };
  for(const id of ['main','urgent-help','preference-status','preference-results','chat-options'])target(id);
  pageTargets['preference-results'].querySelectorAll=()=>[...pageTargets['preference-results'].innerHTML.matchAll(/class="alternative"/g)];
  let html='', field=null, next=null, selectedPreferences=[];
  const root = {
    get innerHTML() { return html; },
    set innerHTML(value) {
      html=value;
      const group=html.match(/<fieldset[^>]*data-question-id="([^"]+)"[^>]*>([\s\S]*?)<\/fieldset>/);
      field=null;
      if(group) {
        const controls=[...group[2].matchAll(/<input type="radio"[^>]*name="([^"]+)" value="([^"]+)"([^>]*)>/g)]
          .map(match=>({
            type:'radio',name:match[1],value:match[2],checked:match[3].includes(' checked'),
            matches:selector=>selector==='input[type="radio"]',
            closest:selector=>selector==='input[type="radio"]'?controls.find(input=>input.value===match[2]):null,
            click:()=>activateControl(controls.find(input=>input.value===match[2]))
          }));
        field={id:group[1],controls,contains:control=>controls.includes(control),querySelector:selector=>selector==='input:checked'?controls.find(input=>input.checked)||null:null};
      }
      const button=html.match(/<button[^>]*id="flow-next"([^>]*)>/);
      next=button?{disabled:button[1].includes(' disabled')}:null;
    },
    addEventListener:(type,handler)=>{handlers[type]=handler;},
    querySelector(selector) {
      if(selector==='#flow-questions fieldset')return field;
      if(selector==='h1'&&html.includes('<h1'))return target('heading');
      if(selector==='#flow-questions legend h2'&&field)return target('question-heading');
      if(selector==='#support-contacts-heading'&&html.includes('id="support-contacts-heading"'))return target('contacts-heading');
      return null;
    },
    querySelectorAll(selector) {
      if(selector==='input[name="support-preference"]:checked')return selectedPreferences.map(value=>({value}));
      if(selector==='input[name="support-preference"]')return [...html.matchAll(/name="support-preference" value="([^"]+)"/g)].map(match=>({value:match[1],focus:()=>{target('preference-'+match[1]).focused=true;}}));
      return [];
    }
  };
  let href='https://example.test/support.html#home';
  const location={
    get href(){return href;},
    get hash(){return new URL(href).hash;},
    set hash(value){href=new URL(value,href).href;}
  };
  const historyEntries=[{state:null,url:href}];
  let historyIndex=0;
  const history={
    get state(){return historyEntries[historyIndex].state;},
    replaceState(state,_title,url){
      if(url)href=new URL(url,href).href;
      historyEntries[historyIndex]={state,url:href};
    },
    pushState(state,_title,url){
      if(url)href=new URL(url,href).href;
      historyEntries.splice(historyIndex+1);
      historyEntries.push({state,url:href});
      historyIndex++;
    }
  };
  const context=vm.createContext({
    ...globals,location,history,
    document:{
      getElementById:id=>id==='finder'?root:id==='flow-next'?next:pageTargets[id]||null,
      querySelector:()=>null,
      addEventListener:(type,handler)=>{documentHandlers[type]=handler;}
    },
    window:{
      addEventListener:(type,handler)=>{windowHandlers[type]=handler;},
      scrollTo:()=>{},print:()=>{}
    },
    localStorage:new Proxy({}, {get:()=>{throw new Error('No persistent answers');}}),
    sessionStorage:new Proxy({}, {get:()=>{throw new Error('No persistent answers');}})
  });
  const source=readFileSync(new URL('../'+site+'/support.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source,context);
  const run=code=>vm.runInContext(code,context);
  const render=hash=>{if(hash)location.hash=hash;run('render()');};
  function click(action,hash,question) {
    const element={dataset:{action,question},hash};
    handlers.click({
      target:{closest(selector){
        if(selector==='a[href^="#"]')return hash?element:null;
        const match=selector.match(/^\[data-action="([^"]+)"\]$/);
        return match&&match[1]===action?element:null;
      }},
      preventDefault:()=>{}
    });
  }
  const navigate=hash=>click(undefined,hash);
  function radio(questionId,value) {
    assert.equal(field?.id,questionId,'Choose only the current rendered question');
    const control=field.controls.find(input=>input.value===value);
    assert.ok(control,'Choose an offered radio value');
    return control;
  }
  function activateControl(control) {
    const priorField=field, wasChecked=control.checked;
    assert.ok(priorField?.contains(control),'Activate a current rendered control');
    handlers.pointerdown?.({target:control});
    for(const input of priorField.controls)input.checked=input===control;
    handlers.click({target:control,preventDefault:()=>{}});
    // A native re-selection emits click only. New selections emit change after
    // click; that event may refer to a now-detached control after progression.
    if(!wasChecked)handlers.change({target:control});
  }
  const choose=(id,value)=>activateControl(radio(id,value));
  function change(questionId,value) {
    const control=radio(questionId,value);
    for(const input of field.controls)input.checked=input===control;
    handlers.change({target:control});
  }
  function key(questionId,value,key) {
    const control=radio(questionId,value);
    let prevented=false;
    handlers.keydown?.({target:control,key,preventDefault:()=>{prevented=true;}});
    // Real browsers leave an already checked radio unchanged on Space.
    // Only unchecked Space has a native click/change default.
    if(!prevented&&(key===' '||key==='Spacebar')&&!control.checked)activateControl(control);
    return prevented;
  }
  function submit() {
    let prevented=false;
    handlers.submit({target:{id:'support-flow'},preventDefault:()=>{prevented=true;}});
    assert.equal(prevented,true,'A form event cannot submit personal information');
  }
  function edit(id) {
    assert.ok(html.includes('data-action="edit-answer" data-question="'+id+'"'),'Only visible editable answers have Change');
    click('edit-answer',undefined,id);
    assert.equal(field?.id,id);
  }
  function jump(targetId) {
    let prevented=false;
    documentHandlers.click({
      target:{closest:selector=>selector==='a[data-page-jump]'?{dataset:{pageJump:targetId}}:null},
      preventDefault:()=>{prevented=true;}
    });
    return {prevented,target:pageTargets[targetId]};
  }
  function prefer(values) {
    selectedPreferences=values;
    handlers.change({target:{value:values[0],matches:selector=>selector==='input[name="support-preference"]'}});
  }
  function traverse(offset) {
    const nextIndex=historyIndex+offset;
    assert.ok(nextIndex>=0&&nextIndex<historyEntries.length,'History entry exists');
    const oldHash=location.hash;
    historyIndex=nextIndex;
    href=historyEntries[historyIndex].url;
    windowHandlers.popstate?.({state:history.state});
    if(oldHash!==location.hash)windowHandlers.hashchange?.({});
  }
  return {root,run,render,navigate,click,change,submit,choose,edit,jump,prefer,
    location,pageTargets,back:()=>traverse(-1),forward:()=>traverse(1),
    question:()=>field?.id,selected:()=>field?.controls.find(input=>input.checked)?.value,next:()=>next,
    focus:()=>focused,key,radio,dispatchChange:control=>handlers.change({target:control}),historySize:()=>historyEntries.length};
}

const plans={
 homelessness:{
  food:'#task/food-washing/0',foodNeed:'food-essentials',
  multistep:'#task/tonight',steps:[['age','25-49'],['household','single-man'],['region','darwin']],
  named:'#health/health-wellbeing',namedSteps:[['age','25-49'],['region','darwin']],
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
 test(site+': each selected radio immediately reaches the next required question or final contacts',()=>{
  const ui=fresh();
  ui.navigate(plan.multistep);
  for(const [index,[id,value]] of plan.steps.entries()){
   assert.equal(ui.question(),id);
   const oldControl=ui.radio(id,value),beforeHistory=ui.historySize();
   ui.choose(id,value);
   assert.equal(ui.run('state.answers['+JSON.stringify(id)+']'),value);
   assert.equal(ui.historySize(),beforeHistory+1,'One choice creates one next-step history entry');
   ui.dispatchChange(oldControl);
   assert.equal(ui.historySize(),beforeHistory+1,'A detached old control cannot double advance');
   if(index<plan.steps.length-1){assert.equal(ui.question(),plan.steps[index+1][0]);assert.equal(ui.focus(),'question-heading');}
   else{assert.equal(ui.question(),undefined);assert.equal(ui.focus(),'contacts-heading');assert.match(ui.root.innerHTML,/Your support contacts/);}
   assert.doesNotMatch(ui.root.innerHTML,/id="flow-next"|type="submit"/);
  }
 });
 test(site+': Back replays the same checked answer by click and Forward restores results',()=>{
  const ui=fresh();
  ui.navigate(plan.food);
  ui.choose('region','alice');
  ui.back();
  assert.equal(ui.question(),'region');assert.equal(ui.selected(),'alice');
  ui.forward();
  assert.equal(ui.question(),undefined);
  ui.back();
  ui.choose('region','alice');
  assert.equal(ui.question(),undefined);assert.equal(ui.focus(),'contacts-heading');
 });
 test(site+': keyboard change, Enter and Space preserve immediate progression',()=>{
  const ui=fresh();
  ui.navigate(plan.food);
  ui.change('region','alice');
  assert.equal(ui.question(),undefined);
  ui.back();
  assert.equal(ui.key('region','alice','Enter'),true);
  assert.equal(ui.question(),undefined);
  ui.back();
  assert.equal(ui.key('region','alice',' '),true,'Checked Space explicitly activates the same answer');
  assert.equal(ui.question(),undefined);
  const unchecked=fresh();unchecked.navigate(plan.food);
  assert.equal(unchecked.key('region','alice',' '),false,'Unchecked Space keeps native activation');
  assert.equal(unchecked.question(),undefined);assert.equal(unchecked.run('state.answers.region'),'alice');
 });
 test(site+': editing region immediately recalculates visible local contacts without changing need',()=>{
  const ui=fresh();
  ui.navigate(plan.food);ui.choose('region','alice');
  const before=ui.run('JSON.stringify(currentResults().ids)');
  ui.edit('region');ui.choose('region','darwin');
  assert.equal(ui.run('state.answers.need'),plan.foodNeed);
  assert.equal(ui.run('state.answers.region'),'darwin');assert.equal(ui.question(),undefined);
  assert.notEqual(ui.run('JSON.stringify(currentResults().ids)'),before);
 });
 test(site+': urgent-help focus and return preserve the current unanswered flow',()=>{
  const ui=fresh();ui.navigate(plan.multistep);
  const state=ui.run('JSON.stringify(state)'),question=ui.question(),hash=ui.location.hash;
  for(const id of ['urgent-help','main']){
   const jump=ui.jump(id);assert.equal(jump.prevented,true);assert.equal(jump.target.focused,true);assert.equal(jump.target.scrolled,true);
   assert.equal(ui.run('JSON.stringify(state)'),state);assert.equal(ui.question(),question);assert.equal(ui.location.hash,hash);
  }
  ui.choose(...plan.steps[0]);assert.equal(ui.focus(),'question-heading');
 });
 test(site+': recovery retains original need and region with real Back, Forward and return links',()=>{
  const ui=fresh();ui.navigate(plan.food);ui.choose('region',plan.recoveryRegion);
  const original=ui.run('JSON.stringify(state)'),primary=ui.run('currentResults().ids[0]');
  ui.click('request-help','#help');
  ui.back();assert.equal(ui.run('JSON.stringify(state)'),original);assert.equal(ui.question(),undefined);
  ui.forward();
  assert.equal(ui.run('handoff.answers.need'),plan.foodNeed);assert.equal(ui.run('handoff.answers.region'),plan.recoveryRegion);
  if(site==='defence')ui.choose('connection','former');
  assert.equal(ui.question(),undefined);assert.equal(ui.run('currentResults().ids.includes('+JSON.stringify(primary)+')'),false);
  assert.doesNotMatch(ui.root.innerHTML,/data-action="request-help"/);
  ui.click('return-to-request',plan.food);
  assert.equal(ui.run('JSON.stringify(state)'),original);assert.equal(ui.question(),undefined);
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
}
test('homelessness: changing refuge region clears the old community qualification before showing contacts',()=>{
 const ui=renderer('homelessness',globals.homelessness);
 ui.navigate('#task/violence/1');ui.choose('refugeFor','first-nations-child');ui.choose('region','topend');
 assert.equal(ui.question(),'community');
 const community=ui.run("currentFlow().nextQuestion.options[0].value");
 ui.choose('community',community);assert.equal(ui.question(),undefined);
 ui.edit('region');ui.choose('region','alice');
 assert.notEqual(ui.run('state.answers.community'),community);
 assert.equal(ui.run('state.answers.region'),'alice');
});
test('defence: changing patient role clears former treatment answers and asks the new prerequisite',()=>{
 const ui=renderer('defence',globals.defence);
 ui.navigate('#task/health/3');ui.choose('connection','serving');ui.choose('role','other');ui.choose('dvaTravel','yes');
 assert.equal(ui.question(),undefined);
 ui.edit('role');ui.choose('role','member');
 assert.equal(ui.run('state.answers.dvaTravel'),undefined);assert.equal(ui.question(),'region');
 ui.choose('region','alice');ui.edit('role');ui.choose('role','other');
 assert.equal(ui.question(),'dvaTravel');assert.doesNotMatch(ui.root.innerHTML,/class="primary-service-heading"/);
});
