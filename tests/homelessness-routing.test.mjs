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
  if(['darwin','katherine'].includes(region)){
   assert.match(r.note,/vacancies, costs, household\/carer fit, disability access and pets/);
   assert.match(r.note,/After hours or if full.*none is guaranteed/);
  }else{
   assert.match(r.note,/No matching accommodation route is listed here/);
   assert.match(r.note,/48 business hours.*not support for tonight/);
   if(region==='alice')assert.match(r.note,/Foot Patrol.*does not provide or guarantee a bed/);
  }
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
 assert(questionsFor('housing',{need:'safe-tonight',region:'darwin'}).some(q=>q.id==='age'));
 assert(questionsFor('housing',{need:'safe-tonight',region:'darwin'}).some(q=>q.id==='household'));
 const youthNeed={need:'children-youth-family',familyNeed:'housing'};
 assert.equal(getFlowState('family',youthNeed).nextQuestion.id,'region');
 const youthFlow=getFlowState('family',{...youthNeed,region:'darwin'});
 assert(youthFlow.complete);assert(!youthFlow.questions.some(q=>q.id==='age'));
 const youthResult=result('family',youthFlow.answers);
 assert.equal(services[youthResult.ids[0]].catalogueId,'territory-faces');
 const youthRoute=youthResult.allIds.find(id=>services[id].catalogueId==='anglicare-yhopp');
 assert.match(youthResult.servicesById[youthRoute].audience,/10.*25/);
 assert.match(youthResult.servicesById[youthRoute].contactNotice,/Published age limits apply/);
 assert.equal(getFlowState('access',{need:'legal-transition',transitionNeed:'temporary',region:'darwin'}).nextQuestion.id,'age');
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

test('tonight asks region first and retains only route-changing fit questions',()=>{
 const seed={need:'safe-tonight'};
 assert.equal(getFlowState('housing',seed).nextQuestion.id,'region');
 const ageValues=['under15','15-18','19-21','22-24','25-49','50-64','65+','unsure'];
 const householdValues=['single-man','single','couple','family','unsure'];
 const signature=r=>r.allIds.map(id=>[id,r.servicesById[id].contactNotice]);
 for(const region of ['unsure','tennant','arnhem','topend','central','npy']){
  const flow=getFlowState('housing',{...seed,region});assert(flow.complete,region);
  assert.deepEqual(flow.questions.map(q=>q.id),['need','region']);
  const basic=signature(result('housing',flow.answers));
  for(const age of ageValues)for(const household of householdValues)assert.deepEqual(signature(result('housing',{...seed,region,age,household})),basic);
 }
 for(const region of ['darwin','katherine']){
  assert.equal(getFlowState('housing',{...seed,region}).nextQuestion.id,'age');
  const young=getFlowState('housing',{...seed,region,age:'under15'});assert(young.complete);
  assert(!young.questions.some(q=>q.id==='household'));
  for(const household of householdValues)assert.deepEqual(signature(result('housing',{...young.answers,household})),signature(result('housing',young.answers)));
  assert.equal(getFlowState('housing',{...seed,region,age:'25-49'}).nextQuestion.id,'household');
 }
 assert.equal(getFlowState('housing',{...seed,region:'alice'}).nextQuestion.id,'household');
 for(const household of ['single','couple','family','unsure']){
  const flow=getFlowState('housing',{...seed,region:'alice',household});assert(flow.complete);
  assert(!flow.questions.some(q=>q.id==='age'));
  for(const age of ageValues)assert.deepEqual(signature(result('housing',{...flow.answers,age})),signature(result('housing',flow.answers)));
 }
 assert.equal(getFlowState('housing',{...seed,region:'alice',household:'single-man'}).nextQuestion.id,'age');
 assert(!catalogues(result('housing',{...seed,region:'alice',household:'single-man',age:'under15'})).includes('salvos-todd-street-men'));
 assert(catalogues(result('housing',{...seed,region:'alice',household:'single-man',age:'25-49'})).includes('salvos-todd-street-men'));
 const moved=applyAnswer('housing',{...seed,region:'darwin',age:'25-49',household:'family'},'region','tennant','darwin');
 assert(moved.complete);assert(!('age'in moved.answers));assert(!('household'in moved.answers));
});

test('family and couple housing notes name the relevant units without changing published details',()=>{
 for(const [region,catalogue,units,hostels]of [['darwin','vinnies-darwin-housing','Ted Collins','Bakhita/Park Lodge'],['katherine','vinnies-katherine-housing','Bernard Complex','Ormonde House']])for(const household of ['family','couple']){
  const r=result('housing',{need:'safe-tonight',region,age:'25-49',household});
  if(household==='family')assert.equal(services[r.ids[0]].catalogueId,catalogue);
  const card=r.servicesById[r.allIds.find(id=>services[id].catalogueId===catalogue)];
  assert(card.fitNote.includes(units));assert(card.fitNote.includes(hostels));assert(card.fitNote.includes('up to two people per room'));
  assert.equal(card.audience,card.raw.display.who);assert.equal(card.offer,card.raw.display.help);assert.equal(card.access,card.raw.display.access);
  assert.doesNotMatch(card.fitNote,/available|vacancy|accepted|guaranteed/);
 }
});

test('online access leads with an exact local library route before the search directory',()=>{
 const expected={darwin:['darwin-library-digital','palmerston-library-digital','ask-izzy'],tennant:['tennant-library-digital','ask-izzy'],alice:['alice-library-digital','ask-izzy']};
 for(const [region,ids]of Object.entries(expected))assert.deepEqual(catalogues(result('essentials',{need:'identity-digital',digitalNeed:'online',region})),ids);
 for(const region of ['unsure','katherine','arnhem','topend','central','npy'])assert.deepEqual(catalogues(result('essentials',{need:'identity-digital',digitalNeed:'online',region})),['ask-izzy']);
});

test('food leads with actual local day services and qualifies the Alice Vinnies enquiry',()=>{
 const food=region=>result('essentials',{need:'food-essentials',essentialNeed:'food',region});
 const expected={darwin:['vinnies-ozanam-house','vinnies-nt-emergency-relief','catholiccare-emergency-relief','foodbank-darwin-hub','baptist-food-for-life'],katherine:['salvos-katherine-doorways-hub','catholiccare-emergency-relief'],tennant:['catholiccare-emergency-relief'],alice:['salvos-waterhole','lc-alice-emergency-relief','vinnies-nt-emergency-relief']};
 for(const [region,ids]of Object.entries(expected))assert.deepEqual(catalogues(food(region)),ids);
 for(const region of ['unsure','arnhem','topend','central','npy']){
  const r=food(region);assert(r.noDirectMatch);assert.deepEqual(catalogues(r),['ask-izzy']);
 }
 const alice=food('alice'),aliceVinnies=alice.servicesById[alice.allIds.find(id=>services[id].catalogueId==='vinnies-nt-emergency-relief')];
 assert.match(aliceVinnies.fitNote,/Alice Springs, ask about sessions and venue/);
 assert.match(aliceVinnies.fitNote,/Malak\/Palmerston hours are for Darwin\/Palmerston/);
 assert.equal(aliceVinnies.access,aliceVinnies.raw.display.access);
 assert.equal(aliceVinnies.audience,aliceVinnies.raw.display.who);
 assert.equal(aliceVinnies.publishedContact,aliceVinnies.raw.display.contact);
 assert(aliceVinnies.contactOptions.some(o=>o.href==='tel:131812'));
 const darwin=food('darwin'),darwinVinnies=darwin.servicesById[darwin.allIds.find(id=>services[id].catalogueId==='vinnies-nt-emergency-relief')];
 assert.equal(darwinVinnies.fitNote,'');assert.equal(darwinVinnies.access,aliceVinnies.access);
 const barkly=food('tennant'),barklyCard=barkly.servicesById[barkly.ids[0]];
 assert.deepEqual(barklyCard.contactOptions.filter(o=>o.channel==='phone').map(o=>o.href),['tel:0889623065']);
 const recover=recoveryResults({topicId:'essentials',answers:{need:'food-essentials',essentialNeed:'food',region:'alice'},previousPrimaryId:alice.ids[0]});
 const recoveredVinnies=recover.allIds.find(id=>services[id].catalogueId==='vinnies-nt-emergency-relief');
 assert.equal(recover.servicesById[recoveredVinnies].fitNote,aliceVinnies.fitNote);
});

test('remote laundry enquiries use the exact community list and national contact only',()=>{
 const source=rows.find(row=>row.catalogue_id==='orange-sky-top-end');
 assert.deepEqual(source.geography,{rank:1,group:'Darwin'});
 assert.equal(source.display.location,'Darwin /\nnamed remote communities');
 assert.equal(source.display.help,'Free laundry; Darwin also has showers. Remote services do not all provide showers.');
 const access='Check official shift locator/local partner. Remote laundry includes Bulla, Gapuwiyak, Kalkaringi/Daguragu, Maningrida, Nganmarriyanga, Nitjpurru, Wadeye, Wurrumiyanga and Yarralin.';
 assert.equal(source.display.access,access);
 for(const region of ['katherine','arnhem','topend']){
  const a={need:'food-essentials',essentialNeed:'washing',region},r=result('essentials',a);
  assert(catalogues(r).includes('orange-sky-top-end'));
  if(region==='katherine')assert.equal(services[r.ids[0]].catalogueId,'salvos-katherine-doorways-hub');
  const card=r.servicesById[source.appearance_id];
  assert.equal(card.access,access);assert.equal(card.offer,source.display.help);assert.equal(card.publishedContact,source.display.contact);
  assert.match(card.fitNote,/listed laundry communities/);assert.match(card.fitNote,/confirm your local shift and whether showers are offered/);
  assert.deepEqual(card.contactOptions.filter(o=>o.channel==='phone').map(o=>o.href),['tel:0730675800']);
  assert(!card.contactOptions.some(o=>o.href==='tel:0889795772'));
  const noPhone=result('essentials',{...a,preferences:['no-phone']}).servicesById[source.appearance_id];
  assert(!noPhone.contactOptions.some(o=>['phone','text'].includes(o.channel)));
  assert.equal(noPhone.access,access);
 }
 for(const region of ['unsure','tennant','central','npy']){
  const r=result('essentials',{need:'food-essentials',essentialNeed:'washing',region});
  assert(r.noDirectMatch);assert.deepEqual(catalogues(r),['ask-izzy']);
 }
 for(const region of ['katherine','arnhem','topend'])assert(!catalogues(result('essentials',{need:'food-essentials',essentialNeed:'food',region})).includes('orange-sky-top-end'));
 const darwin=result('essentials',{need:'food-essentials',essentialNeed:'washing',region:'darwin'}).servicesById[source.appearance_id];
 assert.equal(darwin.fitNote,'');assert.equal(darwin.offer,source.display.help);
 assert.deepEqual(darwin.contactOptions.filter(o=>o.channel==='phone').map(o=>o.href),['tel:0730675800']);
});

test('veteran referral remains housing-specific and cannot enter general housing or food results',()=>{
 const r=result('access',{need:'access-culture-disability',accessNeed:'veteran'});
 assert.deepEqual(catalogues(r),['veteran-family-wellbeing-navigation']);
 const card=r.servicesById[r.ids[0]];
 assert.equal(card.audience,card.raw.display.who);
 assert.equal(card.offer,card.raw.display.help);
 assert.equal(card.access,card.raw.display.access);
 assert.match(r.note,/housing difficulties/);assert.match(r.note,/not a crisis service/);
 assert.doesNotMatch(r.note+r.say+r.contextLabel,/transport|interpreters|Defence-family support/i);
 assert.equal(r.preferenceLink.href,'https://www.veteranwellbeing.gov.au/whatwedo');
 for(const region of ['darwin','katherine','tennant','alice','arnhem','topend','central','npy','unsure']){
  for(const [topic,a]of [['housing',{need:'safe-tonight',age:'25-49',household:'family'}],['housing',{need:'longer-term-housing',housingGoal:'unsure'}],['essentials',{need:'food-essentials',essentialNeed:'food'}]]){
   assert(!catalogues(result(topic,{...a,region})).includes('veteran-family-wellbeing-navigation'));
  }
 }
});
