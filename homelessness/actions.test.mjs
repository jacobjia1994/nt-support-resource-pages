import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import release,{rows,contactOptionsFor} from './support-catalog.mjs';
import {entrances,places,stayPages,primaryPages} from './actions-content.mjs';
import {pages,topicPages,sectionRows,stayRows,directoryRows,resolveRoute,serviceCard} from './actions.mjs';
const byId=id=>rows.find(r=>r.catalogue_id===id);

test('all 219 exact source routes remain discoverable without a personal profile',()=>{
 assert.deepEqual(release,JSON.parse(fs.readFileSync(new URL('./data/catalog.json',import.meta.url))));
 assert.equal(directoryRows().length,219);assert.equal(new Set(directoryRows().map(r=>r.route_id)).size,219);
 assert.equal(new Set(directoryRows().map(r=>r.catalogue_id)).size,194);
 for(const row of rows)assert.deepEqual(resolveRoute('#service/'+encodeURIComponent(row.appearance_id)),{type:'service',id:row.appearance_id});
 for(const [key,page] of Object.entries(pages))for(const section of page.sections){assert(sectionRows(page,section).length>0,`${key}: ${section.title}`);for(const order of section.orders||[])assert(sectionRows(page,section).some(r=>r.row_order===order));}
});

test('every source topic and historical task link has an authored destination',()=>{
 assert.equal(Object.keys(topicPages).length,16);assert.equal(entrances.length,7);assert.equal(places.length,9);
 for(const n of Object.keys(topicPages)){assert(topicPages[n]==='tonight'||pages[topicPages[n]]);assert.equal(resolveRoute('#need/'+n).id,topicPages[n]);}
 for(const id of ['tonight','keep-home','stable-home','food-washing','money-bills','id-online','violence','young-person-housing','return-home','medical','mental-health','leaving-service','legal','communication','settlement']){const r=resolveRoute('#task/'+id+'/0');assert(r.id==='tonight'||pages[r.id],id);}
 assert.equal(resolveRoute('#housing/safe-tonight').id,'tonight');assert.equal(resolveRoute('#housing/longer-term-housing').id,'stable-home');
 assert.equal(resolveRoute('#unknown').type,'missing');
});

test('Darwin and Katherine units are distinct from single-adult hostel guidance',()=>{
 for(const [place,id,unitName] of [['darwin','vinnies-darwin-housing','Ted Collins'],['katherine','vinnies-katherine-housing','Bernard Complex']]){
  assert.equal(stayPages[place].sections[0].programme,'units');assert.equal(stayPages[place].sections[0].ids[0],id);
  const unit=serviceCard(byId(id),{programme:'units'});assert(unit.includes(unitName));assert(unit.includes('Adults, couples and families'));assert(unit.includes('over 18; confirm with intake'));assert(!unit.includes('Hostels: single'));
  assert(serviceCard(byId(id),{programme:'hostels'}).includes('over 18'));assert(serviceCard(byId(id),{full:true}).includes(byId(id).display.who));
 }
});

test('women and age-boundary cases retain enquiries without global exclusion',()=>{
 const adults=stayRows('darwin').map(r=>r.catalogue_id),youth=stayRows('darwin','youth').map(r=>r.catalogue_id);
 assert(adults.includes('salvos-sunrise-homelessness'));assert(adults.includes('catherine-booth-crisis'));assert(youth.includes('ywca-casy-house'));
 assert.match(byId('ywca-casy-house').display.who,/15-18, any gender/);assert.match(byId('salvos-sunrise-homelessness').display.who,/18\+/);
 assert.match(byId('salvos-house-49').display.who,/25\+ without children/);assert.match(byId('anglicare-yass').display.who,/15-21 \/ 15-19/);
 assert.match(byId('asyass-crisis-refuge').display.who,/under-15s.*Departmental exception/);assert(stayRows('alice','youth').some(r=>r.catalogue_id==='asyass-ampe-akweke'));
 assert(!stayRows('alice').some(r=>r.catalogue_id==='dawn-house'));assert.match(stayPages.alice.intro,/other households.*outreach/);
});

test('outreach, referrals and supported housing keep their material limits',()=>{
 assert(stayRows('katherine','outreach').some(r=>r.catalogue_id==='anglicare-katherine-family-accommodation'));assert.match(stayPages.katherine.outreachNote,/crisis outreach.*separately requires/);
 assert.match(serviceCard(byId('caaps-homelessness-outreach')),/No direct accommodation/);
 assert.match(serviceCard(byId('orange-sky-top-end')),/Remote services do not all provide showers/);
 const refuge=primaryPages.violence.sections.find(s=>s.title==='Refuges and safe houses');assert(!refuge.orders.includes(31));
 assert(primaryPages.violence.sections.find(s=>s.title==='Home safety and ongoing support').orders.includes(31));
 const ci=byId('nt-central-intake');assert.match(ci.display.help,/48 business hours/);assert.match(ci.display.access,/phone-outage/);assert(!contactOptionsFor(ci).some(a=>a.channel==='phone'));assert(contactOptionsFor(ci).some(a=>a.channel==='form'));
});

test('local pages do not broaden the interpreted published catchments',()=>{
 for(const place of places.map(p=>p[0]).filter(p=>p!=='unsure'))for(const kind of ['sections','youth','outreach'])for(const row of stayRows(place,kind))assert(row.region_ids.includes(place),`${place}: ${row.catalogue_id}`);
 assert.match(stayPages.tennant.intro,/not verified/);assert.match(stayPages.arnhem.intro,/not verified/);assert.match(stayPages.unsure.intro,/listing does not confirm a bed/);
});

test('web contacts support embedding and exact public source details remain available',()=>{
 for(const row of rows){const full=serviceCard(row,{full:true});assert(full.includes(row.display.access.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));assert(full.includes('Information checked'));if(row.display.url)assert(full.includes('target="_blank" rel="noopener noreferrer"'));}
 const housing=serviceCard(byId('nt-social-housing'));assert(housing.includes('Call 08 8999 8814 · Darwin / Palmerston'));assert(housing.includes('Call 08 8973 8513 · Katherine'));
});
