import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import release,{rows,services,contactOptionsFor,regionsFor} from '../homelessness/support-catalog.mjs';
import {topics,questionsFor,getResults,recoveryResults,needIssues} from '../homelessness/support-paths.mjs';
import {journeys} from '../homelessness/support-journeys.mjs';
import {getFlowState,applyAnswer} from '../homelessness/support-flow.mjs';
const catalogues=r=>r.allIds.map(id=>services[id].catalogueId);
const result=(t,a)=>getResults(t,a);

test('public display identity, counts and supplied geographic order stay exact',()=>{
 const json=JSON.parse(fs.readFileSync(new URL('../homelessness/data/catalog.json',import.meta.url),'utf8'));
 assert.deepEqual(release,json);
 assert.equal(release.issues.length,16);assert.equal(rows.length,219);
 assert.equal(new Set(rows.map(r=>r.appearance_id)).size,219);
 assert.equal(new Set(rows.map(r=>r.route_id)).size,219);
 assert.equal(new Set(rows.map(r=>String(r.catalogue_id))).size,194);
 for(const issue of release.issues){
  assert(issue.rows.every((r,i,a)=>!i||r.geography.rank>=a[i-1].geography.rank));
  assert(issue.rows.every(r=>rows.find(x=>x.appearance_id===r.appearance_id).display===r.display));
 }
 assert(rows.every(row=>regionsFor(row).length));
});

test('every issue has a reachable task choice and complete offered paths resolve',()=>{
 assert.deepEqual(new Set(Object.values(needIssues)),new Set(Array.from({length:16},(_,i)=>i+1)));
 const seenIssues=new Set(),seenRoutes=new Set();let complete=0;
 function walk(topic,a={}){
  const q=questionsFor(topic,a).find(q=>!q.options.some(o=>o.value===a[q.id]));
  if(q){for(const o of q.options)walk(topic,{...a,[q.id]:o.value});return;}
  complete++;const r=result(topic,a);
  assert(r.ids.length>=1&&r.ids.length<=3);
  for(const id of [...r.ids,...r.moreIds]){assert(services[id]);seenRoutes.add(id);seenIssues.add(services[id].raw.issue_number);}
 }
 for(const topic of topics)walk(topic.id);
 assert(complete>0);assert.equal(seenIssues.size,16);
 // Emergency services remain always visible through the page's 000 action,
 // rather than being suggested for every non-emergency violence enquiry.
 const unreachable=rows.filter(row=>!seenRoutes.has(row.appearance_id));
 assert.deepEqual(unreachable.map(r=>r.catalogue_id),['emergency-000']);
});

test('family accommodation excludes adult-only programmes and retains prerequisites',()=>{
 const a={need:'safe-tonight',age:'25-49',household:'family',region:'darwin'};
 assert(!catalogues(result('housing',a)).some(id=>['salvos-house-49','salvos-sunrise-homelessness'].includes(id)));
 const k=result('housing',{...a,region:'katherine'});
 assert(!catalogues(k).includes('mission-katherine-accommodation'));
 assert(catalogues(k).includes('vinnies-katherine-housing'));
 const stable=result('housing',{need:'longer-term-housing',housingGoal:'family',age:'25-49',region:'katherine'});
 assert(stable.ids.some(id=>/public-housing waiting list/i.test(stable.servicesById[id].audience)));
 for(const region of ['tennant','arnhem']){
  const r=result('housing',{...a,region});
  assert.match(r.note,new RegExp('General crisis and youth beds in '+(region==='tennant'?'Barkly':'East Arnhem')+' are not confirmed'));
  assert.deepEqual(catalogues(r),['nt-central-intake']);
 }
});

test('tonight notices retain fit and availability caution for the selected region only',()=>{
 const answers={need:'safe-tonight',age:'25-49',household:'family'};
 for(const region of ['darwin','katherine','alice','topend','central','npy','unsure']){
  const r=result('housing',{...answers,region});
  assert.doesNotMatch(r.note,/Barkly|East Arnhem|000/);
  assert.match(r.note,/vacancies, costs, household\/carer fit, disability access and pets/);
  assert.match(r.note,/After hours or if full.*none is guaranteed/);
 }
 const barkly=result('housing',{...answers,region:'tennant'}).note;
 const arnhem=result('housing',{...answers,region:'arnhem'}).note;
 assert.match(barkly,/Barkly/);assert.doesNotMatch(barkly,/East Arnhem/);
 assert.match(arnhem,/East Arnhem/);assert.doesNotMatch(arnhem,/Barkly/);
 for(const note of [barkly,arnhem])assert.match(note,/specialist services have separate entry rules/);
 assert.match(result('safety',{need:'violence-safety',safetyNeed:'support',region:'darwin'}).note,/000/);
 assert.match(release.issues.find(i=>i.issue_number===1).note,/Barkly and East Arnhem/);
});

test('specific needs do not spill unrelated programmes into results',()=>{
 const hospital=result('access',{need:'legal-transition',transitionNeed:'hospital',age:'25-49',region:'darwin'});
 assert(!catalogues(hospital).some(id=>['anglicare-outcare','naaja-adult-throughcare','anglicare-moving-on'].includes(id)));
 const language=result('access',{need:'access-culture-disability',accessNeed:'language',region:'darwin'});
 assert.deepEqual(catalogues(language),['nt-aboriginal-interpreter-service','tis-national','national-relay']);
 const senior=result('health',{need:'health-wellbeing',age:'65+',region:'darwin'});
 assert(!catalogues(senior).some(id=>['kids-helpline','headspace-nt-youth'].includes(id)));
});

test('refuge household and exact remote community are respected',()=>{
 const a={need:'violence-safety',safetyNeed:'refuge',refugeFor:'first-nations-woman',region:'darwin'};
 const r=result('safety',a);
 assert(!catalogues(r).includes('dawn-house'));assert(catalogues(r).includes('daiws'));
 assert.deepEqual(catalogues(result('safety',{...a,refugeFor:'other'})),['1800respect']);
 const remote=result('safety',{...a,refugeFor:'woman-child',region:'arnhem',community:'galiwinku'});
 const houses=remote.allIds.filter(id=>services[id].catalogueId==='nt-remote-violence-safe-houses');
 assert.equal(houses.length,1);assert.equal(services[houses[0]].area,'Galiwin’ku');
});

test('reviewed remote routes can be enquired about without claiming local delivery',()=>{
 assert(catalogues(result('health',{need:'alcohol-drugs',aodNeed:'sobering',age:'25-49',region:'arnhem'})).includes('east-arnhem-sobering-up'));
 assert(catalogues(result('access',{need:'legal-help',legalNeed:'women',region:'central'})).includes('cawls-central-barkly'));
 const r=result('health',{need:'health-medical-travel',medicalNeed:'renal',region:'central'});
 assert(catalogues(r).includes('purple-house-practical'));assert.match(r.servicesById[r.ids[0]].contactNotice,/local delivery is not confirmed/);
});

test('contact actions use this appearance, disable outage calls and respect regions',()=>{
 for(const row of rows)for(const option of contactOptionsFor(row)){
  assert.match(option.href,/^(https?:|tel:|mailto:|sms:)/);
  if(/^(tel:|sms:)/.test(option.href))assert(row.display.contact.replace(/\D/g,'').includes(option.href.split(':')[1]));
 }
 const intake=rows.find(r=>r.catalogue_id==='nt-central-intake');
 assert(!contactOptionsFor(intake).some(o=>o.channel==='phone'));
 assert.equal(contactOptionsFor(intake)[0].href,intake.display.form);
 const life=rows.find(r=>r.catalogue_id==='lifeline');assert(contactOptionsFor(life).some(o=>o.href==='sms:0477131114'));
 const pats=rows.find(r=>r.catalogue_id==='nt-pats');
 assert.deepEqual(contactOptionsFor(pats,{region:'katherine'}).filter(o=>o.channel==='phone').map(o=>o.href),['tel:0889739215']);
 const relief=rows.find(r=>r.catalogue_id==='lc-alice-emergency-relief');assert.match(relief.display.access,/closed|closure|venue|location/i);
});

test('recovery keeps regional contact actions and no-phone preference',()=>{
 const answers={need:'legal-transition',transitionNeed:'hospital',age:'25-49',region:'katherine'};
 const original=result('access',answers);
 const handoff={topicId:'access',answers,previousPrimaryId:'not-a-matched-route'};
 const r=recoveryResults(handoff,{region:'katherine'});
 const hospital=r.allIds.find(id=>services[id].catalogueId==='nt-hospital-social-work');
 assert.deepEqual(r.servicesById[hospital].contactOptions.filter(o=>o.channel==='phone').map(o=>o.href),['tel:0889739211']);
 const noPhone=recoveryResults(handoff,{region:'katherine',preferences:['no-phone']});
 assert(noPhone.allIds.every(id=>noPhone.servicesById[id].contactOptions.every(o=>!['phone','text'].includes(o.channel))));
 assert(original.ids.length);
});

test('repeated selections keep same-page state and clear stale qualifications',()=>{
 let answers={need:'legal-transition',transitionNeed:'hospital',age:'25-49',region:'katherine'};
 const flow=getFlowState('access',answers,'katherine');assert(flow.complete);
 assert.deepEqual(applyAnswer('access',answers,'transitionNeed','hospital','katherine'),flow);
 const changed=applyAnswer('access',answers,'need','access-culture-disability','katherine');
 assert(!('transitionNeed'in changed.answers));assert(!('age'in changed.answers));assert.equal(changed.answers.region,'katherine');
 const refuge={need:'violence-safety',safetyNeed:'refuge',refugeFor:'woman-child',region:'arnhem',community:'galiwinku'};
 const moved=applyAnswer('safety',refuge,'region','topend','arnhem');assert(!('community'in moved.answers));
});

test('homepage journeys seed real tasks and retain all published route coverage',()=>{
 assert.equal(new Set(journeys.map(j=>j.id)).size,journeys.length);
 const seenIssues=new Set(),seenRows=new Set();
 function walk(topic,a){
  const flow=getFlowState(topic,a),q=flow.nextQuestion;
  if(q){for(const o of q.options)walk(topic,{...flow.answers,[q.id]:o.value});return;}
  const r=result(topic,flow.answers);assert(r.ids.length>=1&&r.ids.length<=3);
  for(const id of r.allIds){seenRows.add(id);seenIssues.add(services[id].raw.issue_number);}
 }
 for(const journey of journeys){
  assert(journey.title&&journey.choices.length>0);
  assert(journey.choices.length<=6);
  for(const choice of journey.choices){
   const seed={need:choice.need,...choice.answers};
   const flow=getFlowState(choice.topicId,seed);
   for(const [key,value]of Object.entries(seed))assert.equal(flow.answers[key],value,journey.id+' loses '+key);
   assert.notEqual(flow.nextQuestion?.id,'need');
   for(const key of Object.keys(choice.answers))assert.notEqual(flow.nextQuestion?.id,key);
   walk(choice.topicId,seed);
  }
 }
 assert.deepEqual(seenIssues,new Set(Array.from({length:16},(_,i)=>i+1)));
 assert.deepEqual(rows.filter(r=>!seenRows.has(r.appearance_id)).map(r=>r.catalogue_id),['emergency-000']);
});

test('irrelevant age and location questions are skipped; essential fit remains',()=>{
 for(const [topic,a]of [
  ['essentials',{need:'food-essentials',essentialNeed:'food'}],
  ['essentials',{need:'food-essentials',essentialNeed:'washing'}],
  ['family',{need:'children-youth-family',familyNeed:'family'}],
  ['family',{need:'children-youth-family',familyNeed:'school'}],
  ['access',{need:'disability-ageing',careNeed:'carer'}],
  ['access',{need:'legal-transition',transitionNeed:'hospital'}]])assert(!questionsFor(topic,a).some(q=>q.id==='age'));
 for(const [topic,a]of [
  ['money',{need:'money-benefits',moneyNeed:'payments'}],
  ['money',{need:'money-benefits',moneyNeed:'electricity'}],
  ['health',{need:'health-medical-travel',medicalNeed:'advice'}],
  ['essentials',{need:'identity-digital',digitalNeed:'birth'}],
  ['access',{need:'disability-ageing',careNeed:'carer'}],
  ['access',{need:'legal-help',legalNeed:'government'}],
  ['access',{need:'access-culture-disability',accessNeed:'language',languageNeed:'relay'}],
  ['safety',{need:'violence-safety',safetyNeed:'refuge',refugeFor:'other'}]]){
  assert(!questionsFor(topic,a).some(q=>['region','community'].includes(q.id)));
  assert(!result(topic,a).noDirectMatch);
 }
 assert(questionsFor('housing',{need:'safe-tonight'}).some(q=>q.id==='age'));
 assert(questionsFor('housing',{need:'safe-tonight'}).some(q=>q.id==='household'));
 assert(questionsFor('family',{need:'children-youth-family',familyNeed:'housing'}).some(q=>q.id==='age'));
});

test('adult mental-health contact is ahead of conditional youth programmes',()=>{
 const r=result('health',{need:'health-wellbeing',age:'25-49',region:'darwin'});
 assert.equal(services[r.ids[0]].catalogueId,'darwin-medicare-mental-health');
 assert(!r.ids.some(id=>['kids-helpline','headspace-nt-youth'].includes(services[id].catalogueId)));
 assert(r.moreIds.some(id=>services[id].catalogueId==='kids-helpline'));
});

test('ID, interpreter and transport tasks lead to the precise published route',()=>{
 const id=result('essentials',{need:'identity-digital',digitalNeed:'id',region:'darwin'});
 assert(catalogues(id).includes('larrakia-return-to-country'));
 assert.match(id.servicesById[id.allIds.find(i=>services[i].catalogueId==='larrakia-return-to-country')].access,/\$75/);
 const centralId=result('essentials',{need:'identity-digital',digitalNeed:'id',region:'central'});
 assert(catalogues(centralId).includes('tangentyere-identity-banking-return-country'));
 for(const [languageNeed,expected]of [['aboriginal','nt-aboriginal-interpreter-service'],['other-language','tis-national'],['relay','national-relay']])assert.deepEqual(catalogues(result('access',{need:'access-culture-disability',accessNeed:'language',languageNeed})),[expected]);
 assert.deepEqual(catalogues(result('access',{need:'access-culture-disability',accessNeed:'transport',transportNeed:'bus',region:'darwin'})),['nt-free-public-buses']);
 assert.deepEqual(catalogues(result('access',{need:'access-culture-disability',accessNeed:'transport',transportNeed:'community',region:'katherine'})),['kalano-katherine-community-transport']);
});
