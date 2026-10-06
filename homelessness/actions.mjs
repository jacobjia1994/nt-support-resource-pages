import release,{rows,rowsById,contactOptionsFor,regionLabels,safeUrl} from './support-catalog.mjs';
import {entrances,places,stayPages,primaryPages} from './actions-content.mjs';
import {secondaryPages} from './actions-secondary.mjs';

export const pages={...primaryPages,...secondaryPages};
export const topicPages={1:'tonight',2:'stable-home',3:'keep-home',4:'violence',5:'visiting',6:'youth-housing',7:'food-washing',8:'money-bills',9:'id-online',10:'health-medical',11:'mental-health',12:'alcohol-drugs',13:'disability-ageing',14:'leaving-service',15:'legal',16:'transport-communication'};
const legacy={tonight:'tonight',violence:'violence','food-washing':'food-washing','keep-home':'keep-home','stable-home':'stable-home','money-bills':'money-bills','mental-health':'mental-health',medical:'health-medical','id-online':'id-online','young-person-housing':'youth-housing','family-school':'family-school','return-home':'visiting','alcohol-drugs':'alcohol-drugs',disability:'disability-ageing','aged-care':'disability-ageing',carer:'disability-ageing','leaving-service':'leaving-service',legal:'legal',complaint:'legal',communication:'transport-communication',transport:'transport-communication',settlement:'transport-communication','veteran-family':'transport-communication'};
const oldNeeds={'safe-tonight':'tonight','longer-term-housing':'stable-home','keep-tenancy':'keep-home','food-essentials':'food-washing','money-benefits':'money-bills','identity-digital':'id-online','violence-safety':'violence','health-wellbeing':'mental-health','health-medical-travel':'health-medical','alcohol-drugs':'alcohol-drugs','children-youth-family':'family-school','legal-transition':'leaving-service','legal-help':'legal','access-culture-disability':'transport-communication','disability-ageing':'disability-ageing','return-home':'visiting'};
const legacyAliases={stay:'safe-tonight',housing:'longer-term-housing','keep-home':'keep-tenancy',essentials:'food-essentials',money:'money-benefits',identity:'identity-digital',safety:'violence-safety',health:'health-wellbeing',aod:'alcohol-drugs',family:'children-youth-family',transition:'legal-transition',access:'access-culture-disability'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hrefFor=row=>'#service/'+encodeURIComponent(row.appearance_id);
const issueRows=n=>rows.filter(r=>r.issue_number===n);
export function sectionRows(page,section){return section.orders?issueRows(page.issue).filter(r=>section.orders.includes(r.row_order)):section.catalogueIds?section.catalogueIds.map(id=>rows.find(r=>r.catalogue_id===id)).filter(Boolean):[];}
export function stayRows(place,kind='sections'){
 const page=stayPages[place];if(!page)return [];
 const ids=kind==='sections'?page.sections.flatMap(s=>s.ids):page[kind]||[];
 return ids.map(id=>rows.find(r=>r.catalogue_id===id)).filter(Boolean);
}
export function directoryRows(query='',issue=''){
 const q=query.trim().toLocaleLowerCase();
 return rows.filter(r=>(!issue||r.issue_number===Number(issue))&&(!q||[r.display.name,r.display.location,r.display.who,r.display.help,r.display.access,r.display.contact].join(' ').toLocaleLowerCase().includes(q)));
}
export function resolveRoute(hash){
 let parts;try{parts=(hash||'#home').replace(/^#/,'').split('/').map(decodeURIComponent);}catch{return {type:'missing'};}
 if(parts[0]==='task'&&legacy[parts[1]])return {type:'page',id:legacy[parts[1]]};
 if(parts[0]==='menu'||parts[0]==='start')return {type:'topics'};
 if(parts[0]==='need'&&topicPages[Number(parts[1])])return {type:'page',id:topicPages[Number(parts[1])]};
 const historicalNeed=legacyAliases[parts[1]||parts[0]];
 if(historicalNeed)return {type:'page',id:oldNeeds[historicalNeed]};
 if(oldNeeds[parts[1]]||oldNeeds[parts[0]])return {type:'page',id:oldNeeds[parts[1]]||oldNeeds[parts[0]]};
 if(parts[0]==='issue'){const n=Number(parts.at(-1));return topicPages[n]?{type:'page',id:topicPages[n]}:{type:'topics'};}
 if(parts[0]==='directory')return parts[1]&&rowsById[parts.slice(1).join('/')]?{type:'service',id:parts.slice(1).join('/')}:{type:'directory'};
 if(parts[0]==='service')return {type:'service',id:parts.slice(1).join('/')};
 if(parts[0]==='stay')return {type:'stay',id:parts[1]};
 if(parts[0]==='page')return {type:'page',id:parts[1]};
 if(parts[0]==='topics')return {type:'topics'};
 if(parts[0]==='urgent-help'||parts[0]==='urgent')return {type:'urgent'};
 if(parts[0]==='help')return {type:'page',id:'id-online'};
 if(parts[0]==='main')return {type:'home'};
 if(parts[0]==='home'||!parts[0])return {type:'home'};
 return {type:'missing'};
}
const link=(href,title,cls='')=>`<a href="${esc(href)}"${cls?` class="${cls}"`:''}${/^https?:/.test(href)?' target="_blank" rel="noopener noreferrer"':''}>${esc(title)}</a>`;
const sourceLinks=row=>[...new Set([row.display.url,...row.display.urls||[],...row.display.extra_links?.map(x=>x[1])||[]].filter(safeUrl))];
function actions(row,region=''){
 const options=contactOptionsFor(row,{region});
 const labels=option=>{
  if(option.channel!=='phone')return option.label.replace('Open supplied enquiry form','Open enquiry form');
  const lines=row.display.contact.split('\n'),digits=option.href.slice(4),index=lines.findIndex(line=>line.replace(/\D/g,'').includes(digits));
  const line=lines[index]||'',prefix=line.slice(0,line.search(/\d/)).trim();
  const previous=lines[index-1]||'';
  const context=prefix||(/^(Darwin|Palmerston|Katherine|Tennant|Alice|Nhulunbuy|Top End remote|East Arnhem|Barkly)/i.test(previous)&&!/[0-9]/.test(previous)?previous:'');
  return option.label+(context?' · '+context:'');
 };
 return `<div class="actions${options.filter(a=>a.channel==='phone').length>2?' regional-actions':''}">${options.map(a=>link(a.href,labels(a),'action')).join('')}</div>`;
}
function sourceDetail(row){const d=row.display;return `<details class="source-details"><summary>Hours, contact details and sources</summary><p class="published-contact">${esc(d.contact)}</p><p>${esc(d.help||d.offers||'')}</p><div class="sources">${sourceLinks(row).map((url,i)=>link(url,i?'Additional source '+i:'Official service information')).join('')}</div><p class="checked">Information checked ${esc(d.checked||release.information_checked_on)}</p></details>`;}
function foldedService(row,region=''){return `<details class="programme-choice"><summary>${esc(row.display.name)}<span>${esc(row.display.location.replace(/\n/g,' '))} · ${esc(row.display.who)}</span></summary>${serviceCard(row,{region})}</details>`;}
export function serviceCard(row,{region='',full=false,programme=''}={}){
 if(!row)return '';
 const d=row.display;
 if(full)return `<article class="service"><h1 tabindex="-1">${esc(d.name)}</h1><p class="where">${esc(d.location.replace(/\n/g,' '))}</p><dl class="facts"><dt>Who it is for</dt><dd>${esc(d.who)}</dd><dt>What it provides</dt><dd>${esc(d.help||d.offers||'')}</dd><dt>How to access it</dt><dd>${esc(d.access)}</dd><dt>Published contact</dt><dd>${esc(d.contact)}</dd></dl>${actions(row,region)}<div class="sources">${sourceLinks(row).map((url,i)=>link(url,i?'Additional source '+i:'Official service information')).join('')}</div><p class="checked">Information checked ${esc(d.checked||release.information_checked_on)}</p></article>`;
 const unit=programme==='units',hostel=programme==='hostels';
 const name=unit?(row.catalogue_id==='vinnies-darwin-housing'?'Ted Collins units · Vinnies':'Bernard Complex units · Vinnies'):hostel?(row.catalogue_id==='vinnies-darwin-housing'?'Bakhita / Park Lodge · Vinnies':'Ormonde House hostel · Vinnies'):d.name;
 const who=unit?'Adults, couples and families. Applicant age: over 18; confirm with intake.':hostel?d.who.split('. Units:')[0]:d.who;
 const access=hostel?d.access.split(' Units:')[0]:d.access;
 return `<article class="service" data-record="${esc(row.appearance_id)}"><p class="where">${esc(d.location.replace(/\n/g,' '))}</p><h3>${esc(name)}</h3><p class="who">${esc(who)}</p>${unit||hostel?actions(row,region):`<p class="offer">${esc(d.help||d.offers||'')}</p>`}<p class="access"><strong>Access:</strong> ${esc(access)}</p>${unit||hostel?'':actions(row,region)}${link(hrefFor(row),'Full programme details','details-link')}${sourceDetail(row)}</article>`;
}
const heading=title=>`<h1 tabindex="-1">${esc(title)}</h1>`;
const navigation=()=>'';
function related(items){return items?.length?`<aside class="related"><h2>Related help</h2><ul>${items.map(x=>`<li>${link(x.href,x.title)}</li>`).join('')}</ul></aside>`:'';}
const shortPlaces={darwin:'Darwin / Palmerston',katherine:'Katherine',tennant:'Barkly',alice:'Alice Springs',arnhem:'East Arnhem',topend:'Other Top End',central:'Other Central Australia',npy:'NPY Lands',unsure:'Another place / not sure'};
function placeList(current=''){return `<nav aria-label="Places"><ul class="place-list${current?' compact-places':''}">${places.map(([id,title])=>`<li><a href="#stay/${id}" aria-label="${esc(title)}"${current===id?' aria-current="page"':''}>${esc(current?shortPlaces[id]:title)}</a></li>`).join('')}</ul></nav>`;}
function centralIntake(){const row=rows.find(r=>r.catalogue_id==='nt-central-intake');return `<details class="section-choice"><summary>Later: housing assessment and referrals<span class="count">Central Intake is not accommodation for tonight</span></summary><div class="notice"><p>The published phone-outage notice remains posted. The online form says a response within 48 business hours. Use a safe alternative contact if you do not have a phone.</p></div>${serviceCard(row)}</details>`;}
function renderStay(id){const page=stayPages[id];if(!page)return missing();
 const find=key=>rows.find(r=>r.catalogue_id===key);
 const youth=stayRows(id,'youth');const outreach=stayRows(id,'outreach');
 return heading('A place tonight: who to contact')+placeList(id)+`${page.sections.length&&!['unsure','alice'].includes(id)?'<p class="lead">Call before travelling.</p>':`<p class="lead">${esc(page.intro)}</p>`}`+
 page.sections.map((s,index)=>index===0?`<section class="step"><h2>${esc(s.title)}</h2>${s.ids.map(key=>serviceCard(find(key),{region:id==='unsure'?'':id,programme:s.programme})).join('')}</section>`:`<details class="section-choice"><summary>${esc(s.title)}<span class="count">${esc(s.ids.map(key=>s.programme==='hostels'?find(key).display.who.split('. Units:')[0]:find(key).display.who).join(' '))}</span></summary>${s.note?`<p>${esc(s.note)}</p>`:''}${s.ids.map(key=>serviceCard(find(key),{region:id,programme:s.programme})).join('')}</details>`).join('')+
 (youth.length?`<section id="youth"><details class="section-choice"><summary>Young people: accommodation and outreach<span class="count">${esc(youth.map(r=>r.display.name).join(' · '))}</span></summary>${youth.map(row=>serviceCard(row,{region:id})).join('')}${link('#page/youth-housing','All youth housing and support')}</details></section>`:'')+
 (outreach.length?`<section id="outreach"><details class="section-choice"${page.sections.length?'':' open'}><summary>Outreach and practical help<span class="count">${esc(outreach.map(r=>r.display.name).join(' · '))}</span></summary>${page.outreachNote?`<p>${esc(page.outreachNote)}</p>`:''}${outreach.map(row=>serviceCard(row,{region:id})).join('')}</details></section>`:'')+
 `<div class="notice"><p>${esc(page.sections.length?'After hours or if full, ask for a safe alternative; none is guaranteed.':'An outreach or patrol contact is not a confirmed bed. Ask about today’s operation and a safe alternative.')} ${link('#page/violence','If violence is why you need safety')}</p></div><section id="later">${centralIntake()}</section>`+
 related((page.related||[]).map(([slug,title])=>({title,href:'#page/'+slug})));
}
function renderPage(id){
 if(id==='tonight')return navigation()+heading('A place to stay tonight')+`<p class="lead">Choose the place where you need help.</p>${placeList()}<p>${link('#page/youth-housing','Youth accommodation and support')}</p>`;
 const page=pages[id];if(!page)return missing();
 return navigation()+heading(page.title)+`<p class="lead">${esc(page.intro)}</p>`+page.sections.map(s=>`<details class="section-choice"${s.open?' open':''}><summary>${esc(s.title)}<span class="count">${sectionRows(page,s).length} service${sectionRows(page,s).length===1?'':'s'} · view entry rules and contacts</span></summary>${s.note?`<p>${esc(s.note)}</p>`:''}${sectionRows(page,s).map(r=>sectionRows(page,s).length>2?foldedService(r):serviceCard(r)).join('')}</details>`).join('')+related(page.related);
}
function home(){return heading('NT housing & homelessness support')+`<ul class="entrances">${entrances.map(([id,title,hint])=>`<li><a href="#page/${id}"><strong>${esc(title)}</strong><span>${esc(hint)}</span></a></li>`).join('')}</ul><nav class="home-tools" aria-label="More support">${link('#topics','All support topics')}${link('#directory','Find a service')}</nav>`;}
function topics(){return navigation()+heading('All support topics')+`<ul class="topic-list">${release.issues.map(i=>`<li>${link('#page/'+topicPages[i.issue_number],i.heading.replace(/^\d+\.\s*/,''))}</li>`).join('')}<li>${link('#page/family-school','Family support and school')}</li></ul>`;}
let directory={query:'',issue:''},returnTo='#directory';
function recordList(){const list=directoryRows(directory.query,directory.issue);return `<p class="directory-count" role="status">${list.length} service entries</p>${list.length?`<ul class="record-list">${list.map(r=>`<li>${link(hrefFor(r),r.display.name)}<p>${esc(r.display.location.replace(/\n/g,' '))} · ${esc(r.display.who)}</p></li>`).join('')}</ul>`:`<p>Try a service name, place or a shorter search. You can also ${link('#topics','browse all support topics')}.</p>`}`;}
function directoryPage(){return navigation()+heading('Find a service')+`<form class="directory-form" role="search"><label>Service name, place or keyword<input type="search" name="query" autocomplete="off" value="${esc(directory.query)}"></label><label>Support topic<select name="issue"><option value="">All topics</option>${release.issues.map(i=>`<option value="${i.issue_number}"${directory.issue===String(i.issue_number)?' selected':''}>${esc(i.heading.replace(/^\d+\.\s*/,''))}</option>`).join('')}</select></label><button type="button" class="clear" data-clear>Clear search</button></form><div id="records">${recordList()}</div>`;}
function missing(){return navigation()+heading('Find housing support')+`<p>This link does not identify a service. ${link('#topics','Browse support topics')} or ${link('#directory','find a service by name or place')}.</p>`;}
function urgent(){return navigation()+heading('Urgent help')+`<ul class="urgent-list"><li><h2>Immediate danger or medical emergency</h2>${link('tel:000','Call 000','action')}</li><li><h2>Mental health advice · 24/7</h2>${link('tel:1800682288','NT Mental Health Line 1800 682 288','action')}</li><li><h2>Crisis support · 24/7</h2>${link('tel:131114','Lifeline 13 11 14','action')}${link('sms:0477131114','Text 0477 13 11 14','action')}${link('https://www.lifeline.org.au/chat','Lifeline online chat','action')}</li><li><h2>Domestic, family or sexual violence · 24/7</h2>${link('tel:1800737732','1800RESPECT 1800 737 732','action')}${link('https://www.1800respect.org.au/','1800RESPECT online chat','action')}</li></ul>`;}

if(typeof document!=='undefined'){
 const root=document.getElementById('content');
 function render(focus=false){const r=resolveRoute(location.hash);root.innerHTML=r.type==='home'?home():r.type==='stay'?renderStay(r.id):r.type==='page'?renderPage(r.id):r.type==='topics'?topics():r.type==='directory'?directoryPage():r.type==='urgent'?urgent():r.type==='service'&&rowsById[r.id]?`<p class="return-link">${link(returnTo,returnTo==='#directory'?'Back to service search':'Back to contacts')}</p>`+serviceCard(rowsById[r.id],{full:true}):missing();document.title=(root.querySelector('h1')?.textContent||'Housing support')+' | Lutheran Care';if(focus){root.querySelector('h1')?.focus();window.scrollTo(0,0);}}
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-reset]')){directory={query:'',issue:''};returnTo='#directory';history.replaceState(null,'','#home');render(true);return;}
  if(event.target.closest('[data-clear]')){directory={query:'',issue:''};render();root.querySelector('input')?.focus();return;}
  const a=event.target.closest('a[href^="#"]');if(!a||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  if(['#youth','#outreach','#later'].includes(a.hash)){event.preventDefault();const target=document.querySelector(a.hash);target?.querySelector('details')?.setAttribute('open','');target?.scrollIntoView();return;}
  if(a.hash==='#main'){event.preventDefault();root.querySelector('h1')?.focus();root.scrollIntoView();return;}event.preventDefault();if(a.hash.startsWith('#service/')&&!location.hash.startsWith('#service/'))returnTo=location.hash||'#home';if(location.hash!==a.hash)history.pushState(null,'',a.hash);render(true);
 });
 root.addEventListener('input',event=>{if(event.target.name==='query'){directory.query=event.target.value;root.querySelector('#records').innerHTML=recordList();}});
 root.addEventListener('change',event=>{if(event.target.name==='issue'){directory.issue=event.target.value;root.querySelector('#records').innerHTML=recordList();}});
 root.addEventListener('submit',event=>event.preventDefault());
 window.addEventListener('popstate',()=>render(true));window.addEventListener('hashchange',()=>render(true));render();
}
