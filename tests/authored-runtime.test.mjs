import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import release,{rows,rowsById,contactOptionsFor,regionLabels,safeUrl} from '../homelessness/support-catalog.mjs';
import {entrances,places,stayPages,primaryPages} from '../homelessness/actions-content.mjs';
import {secondaryPages} from '../homelessness/actions-secondary.mjs';
import {pages,directoryRows,resolveRoute,serviceCard} from '../homelessness/actions.mjs';
import {verifiedDefence} from '../defence/support-verified-data.mjs';
import {journeys as defenceJourneys} from '../defence/support-journeys.mjs';
import {legacyTarget} from '../defence/support.js';

// Validate the actual authored deployments. Previous matcher/renderer modules
// are retained for history and are not exercised as shipped UI in this suite.
const base=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=value=>String(value).replace(/&(amp|lt|gt|quot|#39);/g,(_all,name)=>({'amp':'&','lt':'<','gt':'>','quot':'"','#39':"'"}[name]));
const hrefs=html=>[...html.matchAll(/\bhref="([^"]+)"/g)].map(m=>decode(m[1]));
const issueFile=number=>'defence/help/'+String(number).padStart(2,'0')+'.html';
function defenceFiles(){return ['index.html','support.html','lookup.html',...['help','topics'].flatMap(dir=>readdirSync(new URL('defence/'+dir+'/',base)).filter(name=>name.endsWith('.html')).map(name=>dir+'/'+name))];}
function recordFragment(html,row){const id=row.appearance_id.replaceAll(':','-'),records=[...html.matchAll(/<(?:section|details)\b[^>]*\bid="(defence-issue-[^"]+)"/g)],index=records.findIndex(m=>m[1]===id);assert.ok(index>=0,row.appearance_id+' has an authored source entry');return html.slice(records[index].index,records[index+1]?.index??html.length);}

function housingRuntime(hash){
 const events={},rootEvents={},calls={focus:0,scroll:0,push:0,replace:0};
 const heading={focus(){calls.focus++;},get textContent(){return decode(root.innerHTML.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1]||'');}};
 const root={innerHTML:'',querySelector:selector=>selector==='h1'?heading:null,addEventListener:(type,fn)=>{rootEvents[type]=fn;},scrollIntoView:()=>{calls.scroll++;}};
 const location={hash},document={title:'',getElementById:id=>id==='content'?root:null,addEventListener:(type,fn)=>{events[type]=fn;}};
 const window={addEventListener:()=>{},scrollTo:()=>{calls.scroll++;}};
 const history={pushState(_s,_t,value){location.hash=value;calls.push++;},replaceState(_s,_t,value){location.hash=value;calls.replace++;}};
 const context=vm.createContext({release,rows,rowsById,contactOptionsFor,regionLabels,safeUrl,entrances,places,stayPages,primaryPages,secondaryPages,document,window,location,history,URL});
 vm.runInContext(read('homelessness/actions.mjs').replace(/^import .*;\n/gm,'').replace(/^export /gm,''),context);
 return {root,location,calls,skip(){let prevented=false;events.click({target:{closest:selector=>selector==='a[href^="#"]'?{hash:'#main'}:null},preventDefault:()=>{prevented=true;}});return prevented;}};
}

test('authored homes keep distinct audience titles and a short entrance list',()=>{
 assert.equal(entrances.length,7);
 for(const [site,title] of [['homelessness','NT housing &amp; homelessness support'],['defence','NT Defence family support']]){
  for(const name of ['index.html','support.html']){const html=read(site+'/'+name);assert.ok(html.includes(title));assert.match(html,/lutheran-care-logo\.png/);assert.ok(hrefs(html).includes('tel:000'));assert.doesNotMatch(html,/name="(?:age|gender|composition|connection|recipient)"|type="radio"/);}
 }
 const home=read('defence/support.html'),list=home.match(/<ul class="home-entrances">(.*?)<\/ul>/s)?.[1];assert.ok(list);assert.equal((list.match(/<li>/g)||[]).length,7);assert.ok(hrefs(list).includes('help/01.html'));assert.ok(hrefs(list).includes('help/02.html'));
});

test('housing historical aliases and old entrances retain authored destinations without importing a profile',()=>{
 const expected={stay:'tonight',housing:'stable-home','keep-home':'keep-home',essentials:'food-washing',money:'money-bills',identity:'id-online',safety:'violence',health:'mental-health',aod:'alcohol-drugs',family:'family-school',transition:'leaving-service',access:'transport-communication'};
 for(const [alias,id] of Object.entries(expected))assert.deepEqual(resolveRoute('#'+alias),{type:'page',id});
 for(const entrance of ['housing','everyday','health-care','rights','access'])assert.deepEqual(resolveRoute('#start/'+entrance),{type:'topics'});
 assert.deepEqual(resolveRoute('#stay/darwin'),{type:'stay',id:'darwin'});
 for(const id of ['tonight','keep-home','stable-home','food-washing','money-bills','id-online','violence','mental-health','alcohol-drugs','leaving-service'])assert.deepEqual(resolveRoute('#task/'+id+'/0/age/17/region/alice'),resolveRoute('#task/'+id+'/0'),'Extra old task URL segments do not become personal facts');
 assert.equal(resolveRoute('#service/%E0%A4%A').type,'missing');
});

test('housing skip to content preserves the real authored contacts, route and history',()=>{
 const ui=housingRuntime('#stay/darwin'),before=ui.root.innerHTML;
 assert.match(before,/Ted Collins|Sunrise Centre/);assert.match(before,/href="tel:/);
 assert.equal(ui.skip(),true);assert.equal(ui.root.innerHTML,before);assert.equal(ui.location.hash,'#stay/darwin');assert.equal(ui.calls.push,0);assert.equal(ui.calls.replace,0);assert.equal(ui.calls.focus,1);assert.equal(ui.calls.scroll,1);
 assert.deepEqual(resolveRoute('#main'),{type:'home'});
});

test('housing source details and directory recovery keep actual programme limits and safe actions',()=>{
 assert.equal(directoryRows().length,219);
 assert.equal(directoryRows('a word that does not name any listed service').length,0);
 for(const row of rows){const route=resolveRoute('#service/'+encodeURIComponent(row.appearance_id));assert.deepEqual(route,{type:'service',id:row.appearance_id});const detail=serviceCard(row,{full:true});assert.ok(detail.includes(escape(row.display.who)));assert.ok(detail.includes(escape(row.display.access)));assert.ok(detail.includes(escape(row.display.contact)));assert.match(detail,/Information checked/);for(const href of hrefs(detail))assert.match(href,/^(?:#|https?:|tel:|sms:|mailto:)/);}
 const outage=rows.find(row=>row.catalogue_id==='nt-central-intake');assert.ok(contactOptionsFor(outage).every(a=>a.channel!=='phone'));assert.ok(contactOptionsFor(outage).some(a=>a.href.includes('/nt-cis-enquiries/')));
 for(const id of Object.keys(pages))assert.equal(resolveRoute('#page/'+id).type,'page');
});

test('Defence contacts and all source issue pages work in the static HTML without questionnaire completion',()=>{
 const routeIds=new Set();let appearances=0;
 for(const issue of verifiedDefence.issues){const html=read(issueFile(issue.issue_number));assert.match(html,/<h1\b/);assert.ok(hrefs(html).some(href=>/^(tel:|sms:|mailto:|https?:)/.test(href)));assert.doesNotMatch(html,/name="(?:age|connection|recipient|travelFunding)"|type="radio"/);
  for(const row of issue.rows){appearances++;routeIds.add(row.route_id);const fragment=recordFragment(html,row);for(const text of [row.display.name,row.display.who,row.display.offers,row.display.access,row.display.contact])assert.ok(fragment.includes(escape(text)),row.appearance_id+' retains its exact published source text');assert.ok(fragment.includes(escape(row.display.checked)),row.appearance_id+' retains its check date');for(const url of row.display.urls.filter(url=>/^https?:/.test(url)))assert.ok(fragment.includes(escape(url)),row.appearance_id+' retains its source URL');for(const href of hrefs(fragment))assert.match(href,/^(?:#|\.{0,2}\/|[a-z0-9][\w./?=#:%-]*\.html|https?:|tel:|sms:|mailto:)/i);}
 }
 assert.equal(verifiedDefence.issues.length,45);assert.equal(appearances,334);assert.equal(routeIds.size,189);
});

test('Defence travel visibly separates PATS, remote-family travel and DVA with material funding limits',()=>{
 const html=read('defence/help/24.html');
 for(const text of ['PATS','DVA','approved remote posting','covered/claimable','approval before booking','six-month residency'])assert.ok(decode(html).toLowerCase().includes(text.toLowerCase()),text);
 for(const phone of ['0889228135','0889739215','0889624647','0889517846','0889870201'])assert.ok(hrefs(html).includes('tel:'+phone));
 assert.doesNotMatch(html,/type="radio"|name="travelFunding"/);
});

test('Defence Central Intake outage preserves source text and the enquiry action without a call button',()=>{
 const issue=verifiedDefence.issues.find(i=>i.issue_number===7),row=issue.rows.find(r=>r.catalogue_id===86),html=recordFragment(read(issueFile(7)),row);
 assert.ok(html.includes(escape(row.display.contact)));assert.ok(hrefs(html).some(href=>href.includes('/nt-cis-enquiries/')));assert.equal(hrefs(html).some(href=>href.startsWith('tel:')),false);
});

test('all former Defence task links target real authored pages; this checks reachability rather than broad intent equivalence',()=>{
 assert.equal(defenceJourneys.length,44);
 for(const task of defenceJourneys)for(const index of task.choices.keys()){const target=legacyTarget('#task/'+task.id+'/'+index);assert.ok(target,task.id+'/'+index);assert.ok(existsSync(new URL('defence/'+target,base)),target);}
 for(let n=1;n<=39;n++){const target=legacyTarget('#need/'+n);assert.ok(target,'need/'+n);assert.ok(existsSync(new URL('defence/'+target,base)));}
 assert.equal(legacyTarget('#need/0'),null);assert.equal(legacyTarget('#need/40'),null);assert.equal(legacyTarget('#unrecognized'),null);
});

test('authorized Defence compatibility corrections retain the five precise authored destinations',()=>{
 for(const [hash,target] of Object.entries({'#money/youth-housing':'help/15.html','#money/acute-support':'help/06.html','#money/budgeting':'help/06.html','#connection/defence-child':'help/15.html','#task/posting/2':'help/07.html'}))assert.equal(legacyTarget(hash),target);
});

test('authored Defence local links and assets resolve; source actions use safe protocols',()=>{
 const files=defenceFiles();assert.equal(files.length,56);
 for(const file of files){const html=read('defence/'+file),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));assert.equal(ids.size,[...html.matchAll(/\bid="([^"]+)"/g)].length,file+' has no duplicate element IDs');
  for(const raw of [...hrefs(html),...[...html.matchAll(/\bsrc="([^"]+)"/g)].map(m=>decode(m[1]))]){if(/^(https?:|tel:|sms:|mailto:|data:)/.test(raw))continue;assert.doesNotMatch(raw,/^[a-z]+:/i);const target=new URL(raw,new URL('defence/'+file,base)),hash=target.hash;target.hash='';target.search='';assert.ok(existsSync(target),file+' -> '+raw);if(hash&&hash!=='#home'){const other=readFileSync(target,'utf8');assert.ok(other.includes('id="'+decodeURIComponent(hash.slice(1))+'"'),file+' -> '+raw);}}
 }
});

const legacyRoot=process.env.SUPPORT_LEGACY_ROOT;
test('authored Defence resource files and active enhancement are identical at the original Defence link',{skip:!legacyRoot},()=>{
 const legacy=new URL('file://'+legacyRoot.replace(/\/$/,'')+'/');
 const files=[...defenceFiles().filter(file=>file!=='index.html'),'support.js','support.css','support-verified-data.mjs','assets/lutheran-care-logo.png','assets/Karla-Variable.ttf','assets/support-icon.svg'];
 for(const file of files)assert.deepEqual(readFileSync(new URL('defence/'+file,base)),readFileSync(new URL(file,legacy)),file+' matches the original support deployment');
});
