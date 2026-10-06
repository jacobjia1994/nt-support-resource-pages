import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import release,{rows,regionLabels,safeHouseCommunities} from '../homelessness/support-catalog.mjs';
import {journeys} from '../homelessness/support-journeys.mjs';
import {discover,discoveryFields} from '../homelessness/support-discovery.mjs';

const choice=(journey,index=0)=>journeys.find(item=>item.id===journey).choices[index];
const tonight=choice('tonight');
const catalogues=result=>result.allIds.map(id=>result.servicesById[id].catalogueId);
const primary=result=>result.ids.map(id=>result.servicesById[id].catalogueId);
const card=(result,id)=>Object.values(result.servicesById).find(service=>service.catalogueId===id);
const result=(refinements={})=>discover(tonight,refinements);

test('blank and unknown choices immediately expose real contact actions',()=>{
 for(const c of journeys.flatMap(journey=>journey.choices)){
  for(const refinements of [{},{region:'unsure',age:'',composition:'',gender:''}]){
   const r=discover(c,refinements);
   assert(r.ids.length>0&&r.ids.length<=3);
   assert(r.ids.every(id=>r.servicesById[id].contactOptions.length));
  }
 }
 const blank=result();
 assert.deepEqual(primary(blank),['ask-izzy','nt-central-intake']);
 assert.deepEqual(card(blank,'ask-izzy').contactOptions,[{channel:'search',href:'https://askizzy.org.au/',label:'Search local services'}]);
 assert.match(card(blank,'ask-izzy').contactNotice,/does not arrange intake or confirm availability/);
 assert.match(card(blank,'nt-central-intake').fitNote,/not support for tonight/);
 assert.match(card(blank,'nt-central-intake').offer,/48 business hours/);
 assert.match(card(blank,'nt-central-intake').access,/phone-outage notice.*current status unconfirmed/);
 assert.match(card(blank,'nt-central-intake').publishedContact,/Phone outage alert/);
 assert.deepEqual(primary(discover({topicId:'help',need:'default',title:'Help finding a service'})),['ask-izzy']);
});

test('optional person details are neutral, exact and correctly scoped',()=>{
 const fields=discoveryFields(tonight,{region:'darwin'});
 const composition=fields.find(field=>field.id==='composition');
 assert.deepEqual(composition.options.map(option=>option.value),['','one','couple','family','other']);
 assert.equal(composition.options.find(option=>option.value==='one').label,'One person');
 assert.equal(composition.options.find(option=>option.value==='couple').label,'A couple without children');
 assert.equal(fields.find(field=>field.id==='age').type,'number');
 assert.deepEqual(fields.find(field=>field.id==='age').options,[]);
 assert.match(fields.find(field=>field.id==='age').hint,/whole years/);
 assert(fields.some(field=>field.id==='gender'));
 const family=discoveryFields(tonight,{composition:'family'});
 assert(!family.some(field=>field.id==='age'||field.id==='gender'));
 const couple=discoveryFields(tonight,{composition:'couple'});
 assert.match(couple.find(field=>field.id==='age').label,/younger person/);
 assert(!couple.some(field=>field.id==='gender'));
 assert(!fields.some(field=>field.id==='firstNations'));
 assert(!discoveryFields(choice('money-bills',0)).some(field=>field.id==='age'||field.id==='composition'||field.id==='gender'));
});

test('unknown age and household keep accommodation enquiries conditional',()=>{
 const darwin=result({region:'darwin'});
 assert.deepEqual(primary(darwin).slice(0,2),['larrakia-heal','caaps-homelessness-outreach']);
 for(const id of ['salvos-house-49','salvos-sunrise-homelessness','vinnies-darwin-housing']){
  assert(card(darwin,id));
  assert.match(card(darwin,id).contactNotice,/not.*established|needs?.*assessment|needs confirmation/);
 }
 const alice=result({region:'alice'});
 assert.equal(primary(alice)[0],'lhere-artepe-outreach-patrol');
 assert(card(alice,'salvos-todd-street-men'),'Unknown gender must not remove a useful qualified enquiry');
 assert.match(card(alice,'salvos-todd-street-men').contactNotice,/gender eligibility is not established/);
});

test('known minors receive actual youth crisis routes without adult placement fits',()=>{
 for(const [region,age,expected]of [['darwin','15','ywca-casy-house'],['darwin','17','ywca-casy-house'],['alice','16','asyass-crisis-refuge'],['alice','17','asyass-crisis-refuge']]){
  const r=result({region,age,composition:'one'});
  assert.equal(primary(r)[0],expected);
  assert(!catalogues(r).some(id=>['salvos-house-49','salvos-sunrise-homelessness','vinnies-darwin-housing','mission-katherine-accommodation','vinnies-katherine-housing','salvos-todd-street-men'].includes(id)));
 }
 const younger=result({region:'alice',age:'13',composition:'one'});
 assert.match(card(younger,'asyass-crisis-refuge').contactNotice,/prior Departmental exception/);
 assert.equal(primary(younger)[0],'lhere-artepe-outreach-patrol');
 assert(!card(result({region:'alice',age:'12'}),'asyass-crisis-refuge'));
 assert(card(result({region:'darwin',age:'18',composition:'one'}),'ywca-casy-house'));
 assert(!card(result({region:'darwin',age:'19',composition:'one'}),'ywca-casy-house'));
});

test('Vinnies mixed programmes preserve over-18 hostel boundaries and unit enquiries',()=>{
 for(const region of ['darwin','katherine']){
  const id='vinnies-'+region+'-housing';
  const eighteen=card(result({region,age:'18',composition:'one',gender:'woman'}),id);
  assert(eighteen);
  assert.match(eighteen.contactNotice,/Ask about .* units/);
  assert.match(eighteen.contactNotice,/over 18/);
  assert.doesNotMatch(eighteen.contactNotice,/hostel: single/);
  assert(!card(result({region,age:'17',composition:'one'}),id));
  const family=card(result({region,composition:'family'}),id);
  assert(family);
  assert.match(family.contactNotice,/adult applicant and household fit need assessment/i);
  assert.match(family.contactNotice,/two people per room/);
 }
 const man=card(result({region:'katherine',age:'19',composition:'one',gender:'man'}),'vinnies-katherine-housing');
 assert.match(man.contactNotice,/Ormonde House hostel: single men over 18/);
 const woman=result({region:'katherine',age:'25',composition:'one',gender:'woman'});
 assert.equal(primary(woman)[0],'mission-katherine-accommodation');
 assert.match(card(woman,'vinnies-katherine-housing').contactNotice,/Ask about Bernard Complex units/);
});

test('couples use the younger age while families do not turn a remembered child age into an adult fact',()=>{
 assert(!card(result({region:'darwin',composition:'couple',age:'24'}),'salvos-house-49'));
 assert(card(result({region:'darwin',composition:'couple',age:'25'}),'salvos-house-49'));
 assert(!card(result({region:'darwin',composition:'family',age:'40'}),'salvos-house-49'));
 assert(!card(result({region:'darwin',composition:'family'}),'salvos-sunrise-homelessness'));
 assert.deepEqual(result({region:'darwin',composition:'family',age:'16',gender:'woman'}),result({region:'darwin',composition:'family'}));
 for(const age of ['15-18','25-49','-1','17.5','999','invalid']){
  assert.deepEqual(result({region:'darwin',age}),result({region:'darwin'}),'Malformed or legacy age must remain unknown: '+age);
 }
});

test('Catherine Booth respects strict age while its source does not invent a childless-only gate',()=>{
 const c=choice('violence',1);
 assert(!card(discover(c,{region:'darwin',composition:'one',gender:'woman',age:'18'}),'catherine-booth-crisis'));
 assert(card(discover(c,{region:'darwin',composition:'one',gender:'woman',age:'19'}),'catherine-booth-crisis'));
 const family=card(discover(c,{region:'darwin',composition:'family'}),'catherine-booth-crisis');
 assert(family);
 assert.equal(family.audience,'Women over 18 experiencing crisis or violence-related homelessness.');
 assert.doesNotMatch(family.contactNotice,/without children|childless/);
});

test('source conflicts and separate youth/aftercare programmes remain qualified',()=>{
 const youth=choice('young-person-housing');
 for(const age of ['19','20','21']){
  const service=card(discover(youth,{region:'darwin',age}),'anglicare-yass');
  assert(service);assert.match(service.contactNotice,/15–19.*15–21/);
 }
 assert(!card(discover(youth,{region:'darwin',age:'22'}),'anglicare-yass'));
 assert(!card(discover(youth,{region:'alice',age:'25'}),'asyass-youth-housing'));
 const aftercare=choice('leaving-service',2);
 const seventeen=card(discover(aftercare,{region:'alice',age:'17'}),'anglicare-moving-on');
 assert.match(seventeen.contactNotice,/Housing for Young People requires 18–25/);
 assert.match(seventeen.contactNotice,/rental-programme eligibility is not established/);
 assert.match(card(discover(aftercare,{region:'alice',age:'18'}),'anglicare-moving-on').contactNotice,/Greater Darwin/);
});

test('individual community routes stay outside the shortlist until a community is chosen',()=>{
 const c=choice('violence',1);
 const unspecified=discover(c,{region:'arnhem'});
 assert.equal(primary(unspecified)[0],'1800respect');
 assert(!unspecified.ids.some(id=>unspecified.servicesById[id].catalogueId==='nt-remote-violence-safe-houses'));
 const selected=discover(c,{region:'arnhem',community:'galiwinku'});
 const safehouses=Object.values(selected.servicesById).filter(service=>service.catalogueId==='nt-remote-violence-safe-houses');
 assert.equal(safehouses.length,1);
 assert.equal(safehouses[0].area,'Galiwin’ku');
 assert(selected.ids.includes(safehouses[0].id));
 const moved=discover(c,{region:'topend',community:'galiwinku'});
 assert.equal(primary(moved)[0],'1800respect');
 assert(!Object.values(moved.servicesById).some(service=>service.catalogueId==='nt-remote-violence-safe-houses'));
});

test('care ages respect strict endpoints and conditional identity pathways',()=>{
 const aged=choice('aged-care');
 assert(!card(discover(aged,{region:'darwin',age:'50'}),'anglicare-care-finder'));
 assert.match(card(discover(aged,{region:'darwin',age:'65'}),'anglicare-care-finder').contactNotice,/over 65.*over-50/);
 assert(!card(discover(aged,{region:'darwin',age:'65',firstNations:'no'}),'anglicare-care-finder'));
 assert(card(discover(aged,{region:'darwin',age:'66',firstNations:'no'}),'anglicare-care-finder'));
 assert(card(discover(aged,{region:'darwin',age:'50'}),'my-aged-care'));
 assert.match(card(discover(aged,{region:'darwin',age:'50'}),'my-aged-care').contactNotice,/care needs and assessment/);
});

test('all verified task routes retain exact displays, checked dates and safe source contact actions',()=>{
 assert.deepEqual(release,JSON.parse(fs.readFileSync(new URL('../homelessness/data/catalog.json',import.meta.url),'utf8')));
 const found=new Set();
 for(const c of journeys.flatMap(journey=>journey.choices)){
  for(const region of Object.keys(regionLabels)){
   const r=discover(c,{region});
   for(const id of r.allIds){
    found.add(id);
    const v=r.servicesById[id];
    assert.equal(v.audience,v.raw.display.who);
    assert.equal(v.access,v.raw.display.access);
    assert.equal(v.offer,v.raw.display.help||v.raw.display.offers||'');
    assert.equal(v.checked,v.raw.display.checked||release.information_checked_on);
    assert(v.contactOptions.every(option=>/^(https?:|tel:|mailto:|sms:)/.test(option.href)));
   }
  }
 }
 for(const [community,region]of Object.values(safeHouseCommunities)){
  discover(choice('violence',1),{region,community}).allIds.forEach(id=>found.add(id));
 }
 assert.deepEqual(rows.filter(row=>!found.has(row.appearance_id)).map(row=>row.catalogue_id),['emergency-000']);
 const intake=card(result(),'nt-central-intake');
 assert(!intake.contactOptions.some(option=>option.channel==='phone'));
 assert.match(intake.publishedContact,/Phone outage alert/);
 const noPhone=result({region:'alice',age:'30',composition:'one',gender:'man',contactMode:'no-phone'});
 assert(Object.values(noPhone.servicesById).every(service=>service.contactOptions.every(option=>!['phone','text'].includes(option.channel))));
 assert.match(noPhone.note,/No immediate non-phone intake/);
});

test('regional groupings remain assessed enquiries for named clinics and remote delivery',()=>{
 const clinic=discover(choice('medical',1),{region:'topend'});
 const redLily=card(clinic,'red-lily-clinics');
 assert(redLily);
 assert.match(redLily.contactNotice,/named communities.*confirm your community/);
 const renal=card(discover(choice('medical',3),{region:'central'}),'purple-house-practical');
 assert.match(renal.contactNotice,/current local delivery/);
 assert(!card(discover(choice('medical',1),{region:'katherine'}),'red-lily-clinics'));
});
