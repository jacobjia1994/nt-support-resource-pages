import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import release,{rows,services,contactOptionsFor} from '../homelessness/support-catalog.mjs';
import {questionsFor,getResults,recoveryResults,preferencesFor,noPhoneHasEffect} from '../homelessness/support-paths.mjs';
import {getFlowState,applyAnswer} from '../homelessness/support-flow.mjs';
import {journeys} from '../homelessness/support-journeys.mjs';
const catalogues=r=>r.allIds.map(id=>services[id].catalogueId);
const card=(r,catalogue)=>r.servicesById[r.allIds.find(id=>services[id].catalogueId===catalogue)];

test('location precedes consequential age; useful age-inclusive contacts need no age step',()=>{
 for(const [topic,answers]of [
  ['health',{need:'alcohol-drugs',aodNeed:'harm'}],
  ['health',{need:'alcohol-drugs',aodNeed:'advice'}],
  ['health',{need:'alcohol-drugs',aodNeed:'withdrawal'}],
  ['health',{need:'health-wellbeing'}],
  ['housing',{need:'longer-term-housing',housingGoal:'private'}],
  ['family',{need:'children-youth-family',familyNeed:'young-parent'}],
  ['access',{need:'legal-transition',transitionNeed:'hospital'}]])assert.equal(getFlowState(topic,answers).nextQuestion.id,'region');
 for(const [topic,answers,expected]of [
  ['health',{need:'alcohol-drugs',aodNeed:'harm',region:'darwin'},'ntahc-harm-reduction-support'],
  ['health',{need:'alcohol-drugs',aodNeed:'advice',region:'darwin'},'nt-alcohol-drug-treatment-entry'],
  ['health',{need:'alcohol-drugs',aodNeed:'withdrawal',region:'darwin'},'nt-alcohol-drug-treatment-entry'],
  ['health',{need:'health-wellbeing',region:'darwin'},'darwin-medicare-mental-health'],
  ['housing',{need:'longer-term-housing',housingGoal:'private',region:'katherine'},'ask-izzy'],
  ['family',{need:'children-youth-family',familyNeed:'young-parent',region:'darwin'},'territory-faces'],
  ['access',{need:'legal-transition',transitionNeed:'hospital',region:'darwin'},'nt-hospital-social-work'],
  ['essentials',{need:'food-essentials',essentialNeed:'youth',region:'tennant'},'ask-izzy']]){
  const f=getFlowState(topic,answers);assert(f.complete,JSON.stringify(answers));assert(!f.questions.some(q=>q.id==='age'));
  assert.equal(catalogues(getResults(topic,f.answers))[0],expected);
 }
 for(const [topic,answers]of [
  ['health',{need:'alcohol-drugs',aodNeed:'residential',region:'darwin'}],
  ['access',{need:'legal-transition',transitionNeed:'temporary',region:'darwin'}],
  ['access',{need:'legal-transition',transitionNeed:'treatment',region:'alice'}],
  ['money',{need:'money-benefits',moneyNeed:'bond'}]])assert.equal(getFlowState(topic,answers).nextQuestion.id,'age');
});

test('explicit adult-only programmes exclude known minors and remain reachable for adults',()=>{
 for(const [topic,base,catalogue]of [
  ['health',{need:'alcohol-drugs',aodNeed:'residential',region:'darwin'},'caaps-aod-residential'],
  ['access',{need:'legal-transition',transitionNeed:'custody',region:'darwin'},'naaja-adult-throughcare'],
  ['health',{need:'health-wellbeing',region:'alice'},'mhaca-drop-in-pathways'],
  ['access',{need:'legal-transition',transitionNeed:'temporary',region:'darwin'},'teamhealth-pathways-strong-foundations']]){
  assert(!catalogues(getResults(topic,{...base,age:'under15'})).includes(catalogue));
  assert(catalogues(getResults(topic,{...base,age:'25-49'})).includes(catalogue));
 }
 const child=getFlowState('health',{need:'alcohol-drugs',aodNeed:'residential',region:'darwin',age:'under15'});
 assert(child.complete);assert(!catalogues(getResults('health',child.answers)).includes('caaps-aod-residential'));
});

test('secondary assessed programmes carry their actual prerequisites without extra survey fields',()=>{
 const hospital=getFlowState('access',{need:'legal-transition',transitionNeed:'hospital',region:'darwin'});
 const subacute=card(getResults('access',hospital.answers),'teamhealth-subacute');
 assert.match(subacute.contactNotice,/TEMHS.*treating-team/);assert.match(subacute.audience,/18-64/);
 const disability=getFlowState('access',{need:'disability-ageing',careNeed:'disability',region:'alice',age:'25-49'});
 assert.match(card(getResults('access',disability.answers),'casa-disability-housing').contactNotice,/SIL-funded NDIS/);
 const custody=getResults('access',{need:'legal-transition',transitionNeed:'custody',region:'alice',age:'25-49'});
 assert.match(card(custody,'dasa-alternative-custody').contactNotice,/Aboriginal NT women 18\+/);
 const clinic=getFlowState('health',{need:'health-medical-travel',medicalNeed:'clinic',region:'topend'});
 assert(clinic.complete);assert.match(card(getResults('health',clinic.answers),'red-lily-clinics').contactNotice,/named West Arnhem communities only/);
 for(const flow of [hospital,disability,clinic])assert(!flow.questions.some(q=>/firstNations|funding|TEMHS|clinicCommunity/.test(q.id)));
});

test('aged-care homelessness exception stays useful while secondary cohort limits remain explicit',()=>{
 const answers={need:'disability-ageing',careNeed:'aged',region:'darwin',age:'50-64'},flow=getFlowState('access',answers);
 assert(flow.complete);assert(!flow.questions.some(q=>q.id==='firstNations'));
 const r=getResults('access',flow.answers);assert.equal(catalogues(r)[0],'my-aged-care');
 for(const id of ['anglicare-care-finder','anglicare-commonwealth-home-support'])assert.match(card(r,id).contactNotice,/Below 65.*Aboriginal or Torres Strait Islander/);
 assert.match(card(r,'anglicare-care-finder').contactNotice,/precise age rule/);
 assert.match(card(r,'anglicare-care-finder').audience,/Over 65, or over 50/);
 assert.match(card(r,'my-aged-care').audience,/homeless\/at-risk people with care needs/);
});

test('DASA youth sobering remains an ASYASS-only enquiry rather than ordinary adult access',()=>{
 const base={need:'alcohol-drugs',aodNeed:'sobering',region:'alice'};
 assert.match(card(getResults('health',{...base,age:'15-18'}),'dasa-sobering-up').contactNotice,/14–18.*only through ASYASS/);
 assert.doesNotMatch(card(getResults('health',{...base,age:'25-49'}),'dasa-sobering-up').contactNotice,/only through ASYASS/);
});

test('no-phone appears only for concrete differences and survives a finder-only detour',()=>{
 const base={need:'alcohol-drugs',aodNeed:'harm',region:'darwin',preferences:['no-phone']};
 assert(noPhoneHasEffect('health',base));assert.equal(preferencesFor('health',base)[0].value,'no-phone');
 const away=applyAnswer('health',base,'region','katherine','darwin');
 assert(away.complete);assert.deepEqual(away.answers.preferences,['no-phone']);assert.deepEqual(preferencesFor('health',away.answers),[]);
 const standard=getResults('health',{...away.answers,preferences:[]}),withoutPhone=getResults('health',away.answers);
 assert.equal(standard.note,withoutPhone.note);assert.deepEqual(standard.servicesById,withoutPhone.servicesById);
 const back=applyAnswer('health',away.answers,'region','darwin','katherine');
 assert.deepEqual(back.answers.preferences,['no-phone']);const returned=getResults('health',back.answers);
 assert(returned.allIds.every(id=>returned.servicesById[id].contactOptions.every(o=>!['phone','text'].includes(o.channel))));
 assert(card(returned,'ntahc-harm-reduction-support').contactOptions.some(o=>o.channel==='email'));
});

test('safety household and exact-community rules remain available and enforced',()=>{
 const answers={need:'violence-safety',safetyNeed:'refuge',refugeFor:'woman-child',region:'arnhem',community:'galiwinku'};
 const flow=getFlowState('safety',answers);assert(flow.complete);
 assert(flow.questions.some(q=>q.id==='refugeFor'));assert(flow.questions.some(q=>q.id==='community'));
 const r=getResults('safety',flow.answers);const houses=r.allIds.filter(id=>services[id].catalogueId==='nt-remote-violence-safe-houses');
 assert.equal(houses.length,1);assert.equal(r.servicesById[houses[0]].area,'Galiwin’ku');
 const other=getFlowState('safety',{need:'violence-safety',safetyNeed:'refuge',refugeFor:'other'});
 assert(other.complete);assert(!other.questions.some(q=>q.id==='region'));
});

test('all published issues and routes retain a task path with exact source displays',()=>{
 assert.deepEqual(release,JSON.parse(fs.readFileSync(new URL('../homelessness/data/catalog.json',import.meta.url),'utf8')));
 const found=new Set(),issues=new Set();let paths=0;
 function walk(topic,answers){const f=getFlowState(topic,answers);if(f.nextQuestion){for(const o of f.nextQuestion.options)walk(topic,{...f.answers,[f.nextQuestion.id]:o.value});return;}paths++;const r=getResults(topic,f.answers);for(const id of r.allIds){found.add(id);issues.add(services[id].raw.issue_number);const v=r.servicesById[id];assert.equal(v.audience,v.raw.display.who);assert.equal(v.access,v.raw.display.access);}}
 for(const j of journeys)for(const c of j.choices)walk(c.topicId,{need:c.need,...c.answers});
 assert(paths>0);assert.equal(issues.size,16);assert.equal(rows.length,219);
 assert.deepEqual(rows.filter(r=>!found.has(r.appearance_id)).map(r=>r.catalogue_id),['emergency-000']);
});


test('Alice tonight without a matching bed leads to the published on-call patrol before delayed intake',()=>{
 const base={need:'safe-tonight',region:'alice',household:'family'},f=getFlowState('housing',base),r=getResults('housing',f.answers);
 assert(f.complete);assert.equal(catalogues(r)[0],'lhere-artepe-outreach-patrol');
 assert(catalogues(r).indexOf('nt-central-intake')>0);assert(!catalogues(r).includes('salvos-todd-street-men'));
 const patrol=card(r,'lhere-artepe-outreach-patrol');
 assert.equal(patrol.contactOptions[0].href,'tel:1800953090');assert.match(patrol.contactOptions[0].label,/Foot Patrol/);
 assert.equal(patrol.contactOptions.find(o=>o.href==='tel:0889537240').label,'Call outreach / office 08 8953 7240');
 assert.match(patrol.fitNote,/on-call safety line/);assert.match(patrol.fitNote,/No bed or emergency response is guaranteed/);
 assert.match(r.note,/No matching accommodation route is listed here.*Alice Springs/);assert.match(r.note,/48 business hours.*not support for tonight/);
 const intake=card(r,'nt-central-intake');assert.match(intake.access,/phone-outage.*unconfirmed/);assert(!intake.contactOptions.some(o=>o.channel==='phone'));
 const noPhone=getResults('housing',{...f.answers,preferences:['no-phone']});
 assert.equal(catalogues(noPhone)[0],'lhere-artepe-outreach-patrol');assert(card(noPhone,'lhere-artepe-outreach-patrol').contactOptions.every(o=>!['phone','text'].includes(o.channel)));
});

test('known adult bed fits stay first and regional gaps do not become accommodation promises',()=>{
 for(const [region,household,expected]of [['alice','single-man','salvos-todd-street-men'],['darwin','family','vinnies-darwin-housing'],['katherine','family','vinnies-katherine-housing']]){
  const r=getResults('housing',{need:'safe-tonight',region,household,age:'25-49'});assert.equal(catalogues(r)[0],expected);assert.doesNotMatch(r.note,/No matching accommodation route/);
  const nonPhone=getResults('housing',{need:'safe-tonight',region,household,age:'25-49',preferences:['no-phone']});assert.equal(catalogues(nonPhone)[0],expected);assert.match(nonPhone.note,/48 business hours.*not support for tonight/);assert.match(nonPhone.note,/No immediate non-phone intake is confirmed/);
 }
 const child=getResults('housing',{need:'safe-tonight',region:'darwin',age:'under15'});assert.equal(catalogues(child)[0],'larrakia-heal');assert(catalogues(child).indexOf('nt-central-intake')>0);
 for(const region of ['tennant','arnhem','topend','central','npy']){
  const r=getResults('housing',{need:'safe-tonight',region});assert(!catalogues(r).some(id=>/housing|accommodation|todd-street|house-49|sunrise/.test(id)));
  assert.match(r.note,/not confirmed here|No matching accommodation route is listed here/);assert.match(r.note,/48 business hours.*not support for tonight/);
 }
});


test('age-free secondary enquiries use published eligibility and Kids Helpline retains its exact usable phone',()=>{
 const a={need:'health-wellbeing',region:'darwin'},f=getFlowState('health',a);assert(f.complete);assert(!f.questions.some(q=>q.id==='age'));
 const r=getResults('health',f.answers),kids=card(r,'kids-helpline');
 assert.equal(kids.contactOptions[0].href,'tel:1800551800');assert.equal(kids.contactOptions[0].label,'Call 1800 55 1800');
 assert.equal(kids.contactOptions.filter(o=>o.href==='tel:1800551800').length,1);
 assert(contactOptionsFor(kids.raw).some(o=>o.href==='tel:1800551800'));assert(!contactOptionsFor(kids.raw,{noPhone:true}).some(o=>o.href==='tel:1800551800'));
 assert(kids.contactOptions.some(o=>o.href===kids.raw.display.url));assert.match(kids.access,/Webchat connection issues/);
 for(const id of ['kids-helpline','headspace-nt-youth']){const v=card(r,id);assert.match(v.contactNotice,/Published age limits apply/);assert.doesNotMatch(v.contactNotice,/selected age range/);}
 const hospital=getResults('access',{need:'legal-transition',transitionNeed:'hospital',region:'darwin'}),subacute=card(hospital,'teamhealth-subacute');
 assert.match(subacute.contactNotice,/Published age limits apply/);assert.doesNotMatch(subacute.contactNotice,/selected age range/);assert.match(subacute.contactNotice,/TEMHS/);
 const noPhone=getResults('health',{...a,preferences:['no-phone']});assert(card(noPhone,'kids-helpline').contactOptions.every(o=>!['phone','text'].includes(o.channel)));
 const known=getResults('health',{...a,age:'25-49'});assert.match(card(known,'kids-helpline').contactNotice,/selected age range/);
});


test('a no-match finder offers the supplied online search without directional or intake promises',()=>{
 const a={need:'alcohol-drugs',aodNeed:'harm',region:'katherine'},r=getResults('health',a),finder=card(r,'ask-izzy');
 assert(r.noDirectMatch);assert.match(r.note,/supplied service finder/);assert.doesNotMatch(r.note,/finder below/);
 assert.deepEqual(finder.contactOptions,[{channel:'search',href:finder.raw.display.url,label:'Search local services'}]);
 assert.match(finder.contactNotice,/Online service search.*does not arrange intake or confirm availability/);
 assert.deepEqual(preferencesFor('health',a),[]);assert.deepEqual(finder.contactOptions,card(getResults('health',{...a,preferences:['no-phone']}),'ask-izzy').contactOptions);
 const original=getResults('housing',{need:'safe-tonight',region:'alice',household:'family'});
 const recovery=recoveryResults({topicId:'housing',answers:{need:'safe-tonight',region:'alice',household:'family'},previousPrimaryId:original.ids[0]});
 assert.equal(card(recovery,'ask-izzy').contactOptions[0].channel,'search');assert.equal(card(recovery,'ask-izzy').contactOptions[0].label,'Search local services');
});
