import {reconcileQuestions,preserveChoicePosition} from './support-progressive.mjs?v=20261006-continuous-final';
import {journeys} from './support-journeys.mjs?v=20261006-housing-scope';
import {topics, questionsFor, preferencesFor, getResults, recoveryResults, legacyRoute} from './support-paths.mjs?v=20261006-continuous-final';
import {services,serviceView} from './support-catalog.mjs?v=20261006-continuous-final';
import {getFlowState, applyAnswer} from './support-flow.mjs?v=20261006-continuous-final';
import {handbookDirectory,handbookNeeds,handbookRegions,catalogueMetadata,handbookLinks} from './support-handbook.mjs?v=20261006-housing-scope';

const root = document.getElementById('finder');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
// Keep providers out of a host iframe: some official services reject framing.
const isEmbedded = window.self !== window.top;
// Restore only our saved views; stale browser scroll positions must not hide a fresh flow.
if ('scrollRestoration' in history) history.scrollRestoration='manual';
const externalTarget = url => isEmbedded && /^https?:\/\//i.test(url);
const link = (url, label, className='') => `<a class="${className}" href="${esc(url)}" rel="${externalTarget(url)?'noopener noreferrer':'noreferrer'}"${externalTarget(url)?` target="_blank" aria-label="${esc(label+' (opens in a new tab)')}"`:''}>${esc(label)}</a>`;
function prepareEmbeddedWebLinks() {
  if (!isEmbedded) return;
  // Static urgent links live outside the dynamic finder.
  document.querySelector('.page-shell')?.querySelectorAll('a[href]').forEach(anchor => {
    if (!externalTarget(anchor.getAttribute('href'))) return;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('aria-label',anchor.textContent.trim()+' (opens in a new tab)');
  });
}
const telephone = phone => `tel:${phone.replace(/\D/g,'')}`;
const topicById = id => topics.find(topic => topic.id === id) || (id === 'help' ? {id:'help',title:'Help finding support',hint:''} : null);
const ntRegions = new Set(['darwin','katherine','alice','tennant','arnhem','topend','central','npy','unsure']);
const topicAnswers = new Map();
const journeyAnswers = new Map();
const historyViews = new Map();
let viewCounter=0;
let restoredHistoryURL=null;
let activeJourney=null;
let state = {topicId:null,answers:{}};
let savedRegion = '';
let started = false;
let handoff = null;
const directoryChoice={need:'',region:''};

function copyAnswers(answers) {
  return {...answers,...(Array.isArray(answers.preferences) ? {preferences:[...answers.preferences]} : {})};
}
function rememberAnswers() {
  if (state.topicId) topicAnswers.set(state.topicId,copyAnswers(state.answers));
  if(state.entryKey)journeyAnswers.set(state.entryKey,copyAnswers(state.answers));
}
function focusHeading() {
  root.querySelector('h1')?.focus();
  window.scrollTo({top:0,behavior:'instant'});
}
function startAgain() {
  state = {topicId:null,answers:{}};
  topicAnswers.clear();
  journeyAnswers.clear();
  historyViews.clear();
  savedRegion = '';
  handoff = null;
  activeJourney = null;
  restoredHistoryURL = null;
  directoryChoice.need = '';
  directoryChoice.region = '';
  // Browser history keeps its URLs, but no pre-reset answer snapshot survives.
  // Keep viewCounter monotonic so a stale history key cannot name a new view.
  history.replaceState(null,'','#home');
  showHome();
  started = true;
  focusHeading();
}
function initialiseTopic(topicId, need) {
  if (state.topicId !== topicId) {
    rememberAnswers();
    state = {topicId,answers:copyAnswers(topicAnswers.get(topicId) || (savedRegion ? {region:savedRegion} : {}))};
  }
  if (need) {
    // A named related link starts its intended need, never another person's eligibility.
    state.answers = {...(savedRegion ? {region:savedRegion} : {}),need};
  }
}
function entryChoice(){
 const [id,index]=String(state.entryKey||'').split('/');
 return journeys.find(task=>task.id===id)?.choices[Number(index)];
}
function seedEntryAnswers(answers){
 const choice=entryChoice();
 return choice?{...answers,need:choice.need,...choice.answers}:answers;
}
function currentFlow() {
  let flow = getFlowState(state.topicId,seedEntryAnswers(state.answers),savedRegion);
  while(flow.nextQuestion?.options.length===1)flow=applyAnswer(state.topicId,flow.answers,flow.nextQuestion.id,flow.nextQuestion.options[0].value,savedRegion);
  state.answers = flow.answers;
  rememberAnswers();
  return flow;
}
function taskLink(task,compact=false) {
 return `<li><a class="${compact?'extra-task-link':'task-link'}" href="#task/${esc(task.id)}"><span><strong>${esc(task.title)}</strong>${!compact&&task.hint?`<small>${esc(task.hint)}</small>`:''}</span>${compact?'':arrow}</a></li>`;
}
const homeEntries=[{"title":"A place to stay tonight","href":"#task/tonight","tasks":["tonight"]},{"title":"Safety from violence","href":"#task/violence","tasks":["violence"]},{"id":"housing","title":"Keep or find a home","tasks":["keep-home","stable-home","young-person-housing","return-home","leaving-service"]},{"id":"everyday","title":"Food, money and practical help","tasks":["food-washing","money-bills","id-online","transport"]},{"id":"health-care","title":"Health and care","tasks":["mental-health","medical","alcohol-drugs","disability","aged-care","carer"]},{"id":"family","title":"Family and school support","href":"#task/family-school","tasks":["family-school"]},{"id":"rights","title":"Legal advice and complaints","tasks":["legal","complaint"]},{"id":"access","title":"Interpreting and settlement help","tasks":["communication","settlement"]}];
function showHome() {
 rememberAnswers();activeJourney=null;
 root.innerHTML=`<h1 tabindex="-1">NT housing & homelessness support</h1><ul class="home-links home-entry-grid" aria-label="Choose the help you need">${homeEntries.map(entry=>`<li><a class="task-link" href="${esc(entry.href||'#start/'+entry.id)}"><span><strong>${esc(entry.title)}</strong></span>${arrow}</a></li>`).join('')}</ul><p class="human-link home-help"><a href="#help">Not sure where to start? Get help finding a service</a></p>`;
 document.title='NT housing & homelessness support | Lutheran Care';
}
function showStartMenu(entry) {
 rememberAnswers();activeJourney=null;
 root.innerHTML=`<nav class="back-nav" aria-label="Support navigation"><a href="#home">All housing help</a><button type="button" class="text-button" data-action="reset">Start again</button></nav><h1 tabindex="-1">${esc(entry.title)}</h1><ul class="home-links" aria-label="Choose the help you need">${entry.tasks.map(id=>taskLink(journeys.find(task=>task.id===id))).join('')}</ul>`;
 document.title=`${entry.title} | NT housing & homelessness support | Lutheran Care`;
}

function showTaskMenu(task) {
 rememberAnswers();activeJourney=task;state={topicId:null,answers:{}};
 showFlow(null);rememberView();
}
function initialiseJourney(task,choice,key) {
 rememberAnswers(); activeJourney=task;
 if(state.entryKey!==key){
  state={topicId:choice.topicId,entryKey:key,answers:copyAnswers(journeyAnswers.get(key)||{...(savedRegion?{region:savedRegion}:{}),need:choice.need,...choice.answers})};

 }
}


function directoryRegionalDetails(service) {
  const region=directoryChoice.region;
  const matching=service.regions.filter(r=>!region||r.region===region);
  return `<p class="quiet"><strong>Published catchment:</strong> ${esc(service.area).replace(/\n/g,'<br>')}. These are enquiry routes; local delivery and admission are assessed by the provider.</p>${service.issueNote?`<p class="notice">${esc(service.issueNote)}</p>`:''}`;
}
function directoryServiceFor(service) { return directoryChoice.region ? serviceView(service.raw,{region:directoryChoice.region}) : service; }
function directoryCard(service,open=false) {
  const needNames=(service.needs||[]).map(id=>handbookNeeds.find(n=>n.id===id)?.title).filter(Boolean);
  const shown=directoryServiceFor(service);
  return `<details class="directory-card" id="record-${esc(service.id)}"${open?' open':''}><summary>${esc(service.name)}</summary><div>${serviceDetails(shown)}${service.eligibility&&service.eligibility!==service.audience?`<p><strong>Eligibility:</strong> ${esc(service.eligibility)}</p>`:''}${directoryRegionalDetails(service)}<p><strong>Support needs:</strong> ${esc(needNames.join(' · '))}</p><p>${link('#directory/'+service.id,'Link to this handbook record')}</p></div></details>`;
}
function refreshDirectory(selectedId='') {
  const items=handbookDirectory.filter(s=>(!directoryChoice.need||(s.needs||[]).includes(directoryChoice.need))&&(!directoryChoice.region||(s.regions||[]).some(r=>r.region===directoryChoice.region&&r.service_available)));
  document.getElementById('directory-count').textContent=`${items.length} matching entries`;
  document.getElementById('directory-records').innerHTML=items.map(s=>directoryCard(s,s.id===selectedId)).join('')||'<p>No resource route matches both filters. <a href="#directory" data-action="clear-filters">Clear filters</a> or <a href="#help">get help finding another service</a>.</p>';
}
function showDirectory(selectedId='') {
  rememberAnswers();
  const selected=handbookDirectory.find(s=>s.id===selectedId);
  if(selected){directoryChoice.need='';directoryChoice.region='';}
  root.innerHTML=`<nav class="back-nav" aria-label="Support navigation"><a href="#home">All help</a>${state.topicId?`<a href="#${esc(state.topicId)}">Back to your support choices</a>`:''}<button type="button" class="text-button" data-action="reset">Start again</button></nav><h1 tabindex="-1">Housing & homelessness resource details</h1><div class="directory-filters"><label for="directory-need">Need<select id="directory-need"><option value="">All ${catalogueMetadata.needs} issues</option>${handbookNeeds.map(n=>`<option value="${esc(n.id)}"${n.id===directoryChoice.need?' selected':''}>${esc(n.title)}</option>`).join('')}</select></label><label for="directory-region">Region<select id="directory-region"><option value="">All NT regions</option>${Object.entries(handbookRegions).map(([id,name])=>`<option value="${esc(id)}"${id===directoryChoice.region?' selected':''}>${esc(name)}</option>`).join('')}</select></label></div><p id="directory-count" class="directory-count" role="status" aria-live="polite"></p><div id="directory-records"></div><p class="quiet">Information checked ${esc(catalogueMetadata.verifiedDate)}.</p>`;
  refreshDirectory(selectedId);
  document.title='Housing & homelessness resource details | Lutheran Care';
  if(selected)requestAnimationFrame(()=>{const record=document.getElementById('record-'+selected.id);record?.scrollIntoView({block:'start'});record?.querySelector('summary')?.focus({preventScroll:true});});
}
function safetyNotice(topic) {
  if (topic.id !== 'safety' || state.answers.need !== 'violence-safety') return '';
  return `<p class="notice safety-note">In immediate danger, call <a href="tel:000">000</a>. For violence or sexual assault, <a href="tel:1800737732">1800RESPECT: 1800 737 732</a> and ${link('https://www.1800respect.org.au/','online chat')} are available 24/7. Use a safe device if someone may monitor this one.</p>`;
}
function questionMarkup(question) {
  const prefix = `question-${question.id==='journey-choice'?'task-'+activeJourney.id:state.topicId}-${question.id}`;
  const value=renderedAnswers()[question.id];
  const compact = question.options.every(option=>!option.detail && option.label.length<=26);
  return `<fieldset class="choice-fieldset flow-question" id="${prefix}" data-question-id="${esc(question.id)}" data-signature="${esc(prefix+JSON.stringify(question))}"${question.hint ? ` aria-describedby="${prefix}-hint"` : ''}><legend><h2>${esc(question.label)}</h2></legend>${question.hint ? `<p class="question-hint" id="${prefix}-hint">${esc(question.hint)}</p>` : ''}<div class="choice-list${compact ? ' choice-list-compact' : ''}">${question.options.map((option,i)=>`<label class="choice-row" for="${prefix}-${i}"><input type="radio" id="${prefix}-${i}" name="${esc(question.id)}" value="${esc(option.value)}"${value===option.value ? ' checked' : ''}${option.detail ? ` aria-describedby="${prefix}-detail-${i}"` : ''}><span><strong>${esc(option.label)}</strong>${option.detail ? `<small id="${prefix}-detail-${i}">${esc(option.detail)}</small>` : ''}</span></label>`).join('')}</div></fieldset>`;
}
function relatedMarkup(topic) {
  return !state.answers.need && topic.links?.length ? `<nav class="related-needs" aria-label="Related help">${topic.links.map(item=>link(item.href,item.label)).join('')}</nav>` : '';
}
function actionBlock(service, primary) {
  if (Array.isArray(service.contactOptions)) {
    const options=service.contactOptions.filter(option=>option.href&&option.label);
    const direct=options.find(option=>['phone','email','form','chat','visit','text','search'].includes(option.channel))||null;
    const other=options.filter(option=>option!==direct);
    return `${direct?link(direct.href,direct.channel==='form'&&direct.label==='Open supplied enquiry form'?'Use online enquiry form':direct.label,primary?'button':''):'<p class="quiet">No direct contact route is published for this option.</p>'}${other.map(option=>link(option.href,option.label,primary&&['chat','form'].includes(option.channel)?'button button-secondary':'official')).join('')}`;
  }
  const action = service.phone ? link(telephone(service.phone), `Call ${service.phone}`, primary ? 'button' : '') : link(service.url,service.action || 'Visit official website',primary ? 'button' : '');
  const chat = chatAction(service);
  return `${action}${chat ? link(chat.url,chat.label,primary ? 'button button-secondary' : '') : ''}${service.phone ? link(service.url,service.action || 'Official website',primary ? 'official' : '') : ''}`;
}
function chatAction(service) {
  if (Array.isArray(service.contactOptions)) {
    const item=service.contactOptions.find(option=>option.channel==='chat');
    return item?{url:item.href,label:item.label}:null;
  }
  if (service.chatUrl) return {url:service.chatUrl,label:service.chatLabel || 'Use webchat'};
  // Availability pages are not a chat action. Only promote explicitly labelled chat links.
  if (service.extraUrl && /^(use (webchat|online chat)|chat with)/i.test(service.extraLabel || '')) return {url:service.extraUrl,label:service.extraLabel};
  return null;
}
function extraAction(service) {
  if (Array.isArray(service.contactOptions)) return '';
  return service.extraUrl && service.extraUrl !== chatAction(service)?.url ? link(service.extraUrl,service.extraLabel || 'More ways to contact','official') : '';
}
function chatOptions(result, primaryId) {
  const ids = [...new Set([...(result.ids || []),...(result.moreIds || []),...(result.preferenceGroups || []).flatMap(group => group.ids || [])])];
  const options = ids.filter(id => id !== primaryId && serviceFor(id,result) && chatAction(serviceFor(id,result)));
  if (!options.length) return '';
  return `<div class="chat-options"><p><strong>Prefer to chat online?</strong></p><ul>${options.map(id => {const service=serviceFor(id,result);return `<li>${link(chatAction(service).url,service.name)}${service.hours ? `<small>${esc(service.hours)}</small>` : ''}</li>`}).join('')}</ul></div>`;
}
function serviceFor(id,result) { return result?.servicesById?.[id] || services[id]; }
function sourceDetails(service) {
  const urls = [...new Set(service.sources || [service.url])];
  const date = service.checked ? new Date(`${service.checked}T12:00:00Z`).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}) : 'See provider';
  const records=handbookLinks[service.id]||[];
  return `<details class="service-source"><summary>Information checked ${esc(date)}</summary><ul>${urls.map((url,index)=>`<li>${link(url,urls.length===1 ? 'Official source' : `Official source ${index+1}`)}</li>`).join('')}${records.map(id=>`<li>${link('#directory/'+id,'Service record, eligibility and regional access')}</li>`).join('')}</ul></details>`;
}
function serviceDetails(service,primary=false,beforeAction='',chats='',nextAction='') {
 const intake=service.catalogueId==='nt-central-intake';
 const offer=intake?'Housing-risk assessment and referrals; not a housing provider.':service.offer;
 const intakeNotice=intake?'<p class="notice">The published phone outage notice is still posted; current status is unconfirmed. Use the online enquiry form and allow 48 business hours. This is not help for tonight.</p>':'';
 return `<article class="service-card${primary?' service-card-primary':' alternative'}"><div class="service-card-head"><h3${primary?' class="primary-service-heading"':''}>${esc(service.name)}</h3><p class="offer">${esc(offer)}</p><p class="area">${esc(service.area)}</p>${service.fitNote?`<p class="fit-note">${esc(service.fitNote)}</p>`:''}</div><div class="contact-panel" aria-label="Contact ${esc(service.name)}">${intakeNotice}${beforeAction}<div class="service-actions">${actionBlock(service,primary)}${extraAction(service)}</div>${service.contactNotice?`<p class="contact-details">${esc(service.contactNotice)}</p>`:''}${service.publishedContact?`<p class="contact-details">${esc(service.publishedContact).replace(/\n/g,'<br>')}</p>`:''}${nextAction}${primary?`<div id="chat-options">${chats}</div>`:chats}</div><div class="service-information"><p class="fit"><strong>Who can use it:</strong> ${esc(service.audience).replace(/\n/g,'<br>')}</p><p class="access"><strong>How to access it:</strong> ${esc(service.access).replace(/\n/g,'<br>')}</p></div>${sourceDetails(service)}</article>`;
}

function preferenceGroups(result) {
  const coreIds = new Set([...(result.ids || []), ...(result.moreIds || [])]);
  return (result.preferenceGroups || []).map(group => {
    const ids = [...new Set(group.ids || [])].filter(id => services[id] && !coreIds.has(id));
    if (!ids.length && !group.note) return '';
    return `<section class="preference-group"><h2>${esc(group.title)}</h2>${group.note ? `<p class="preference-note">${esc(group.note)}</p>` : ''}${ids.map(id => serviceDetails(serviceFor(id,result))).join('')}${group.link ? `<p>${link(group.link.href,group.link.label)}</p>` : ''}</section>`;
  }).join('');
}
function preferenceChoices(topic, result) {
  const options = preferencesFor(topic.id,state.answers);
  if (!options.length) return '';
  const selected = Array.isArray(state.answers.preferences) ? state.answers.preferences : [];
  return `<section class="support-preferences"><fieldset class="preference-fieldset"><legend>Support preferences (optional)</legend><div class="preference-list">${options.map((option,i) => `<label class="choice-row" for="preference-${i}"><input type="checkbox" id="preference-${i}" name="support-preference" value="${esc(option.value)}"${selected.includes(option.value) ? ' checked' : ''}${option.detail ? ` aria-describedby="preference-detail-${i}"` : ''}><span><strong>${esc(option.label)}</strong>${option.detail ? `<small id="preference-detail-${i}">${esc(option.detail)}</small>` : ''}</span></label>`).join('')}</div></fieldset><p id="preference-status" class="sr-only" role="status"></p><div id="preference-results">${preferenceGroups(result)}</div></section>`;
}
function answerSummary(topicId, answers) {
  return questionsFor(topicId,answers).filter(question => !(question.id === 'age' && answers.childAge)).map(question => question.options.find(option => option.value === answers[question.id])?.label).filter(Boolean).join(' · ');
}

function currentResults() {
  return state.topicId==='help' && handoff ? recoveryResults(handoff,state.answers) : getResults(state.topicId,state.answers);
}
function changeChoicesLink(){
 const fixed=fixedQuestionIds();
 const choices=questionsFor(state.topicId,state.answers).some(q=>!fixed.has(q.id)&&state.answers[q.id]);
 if(choices)return '<a href="#support-answers" data-page-jump="support-answers">Change your choices</a>';
 return `<a href="${activeJourney&&activeJourney.choices.length>1?'#task/'+esc(activeJourney.id):'#home'}">Choose different help</a>`;
}
function resultsMarkup(topic) {
  const result = currentResults();
  const allIds = [...new Set(result.ids || [])].filter(id=>services[id]);
  const ids = allIds.slice(0,3);
  const more = [...new Set([...allIds.slice(3),...(result.moreIds || [])])].filter(id=>services[id] && !ids.includes(id));
  if (!ids.length) return `<h2 id="support-contacts-heading">Help finding a service</h2><p>There is no matched contact for these choices.</p>${result.note ? `<p class="notice">${esc(result.note)}</p>` : ''}${topic.id!=='help' ? '<a href="#help" data-action="request-help">Find another way to get help</a>' : ''}`;
  const summary = topic.id==='help' && handoff ? handoff.summary : activeJourney ? questionsFor(topic.id,state.answers).filter(q=>!fixedQuestionIds().has(q.id)).map(q=>q.options.find(o=>o.value===state.answers[q.id])?.label).filter(Boolean).join(' · ') : result.contextLabel || answerSummary(topic.id,state.answers) || topic.title;
  const say = topic.id==='help' && handoff ? handoff.say : result.say;
  // Omit page-level boilerplate; keep the provider and regional limits unchanged.
  const displayNote = String(result.note || '')
    .replace('Confirm vacancies, costs, household/carer fit, disability access and pets.', '')
    .replace('After hours or if full, ask for a safe alternative; none is guaranteed.', '')
    .replace('Published eligibility, fees and catchments apply. No bed, appointment or acceptance has been checked live.', '')
    .trim();
  const note = displayNote || result.preferenceLink ? `<p class="notice">${esc(displayNote).replace(/1800 737 732/g,'<a href="tel:1800737732">1800 737 732</a>').replace(/call 000/g,'call <a href="tel:000">000</a>')}${result.preferenceLink ? ` ${link(result.preferenceLink.href,result.preferenceLink.label)}` : ''}</p>` : '';
  const nextAction = ids.length>1 || more.length ? '<a class="another-contact" href="#other-contacts" data-page-jump="other-contacts">Try another contact</a>' : topic.id!=='help' ? '<a class="another-contact" href="#help" data-action="request-help">Help finding another service</a>' : '';
  const noteBefore = serviceFor(ids[0],result).catalogueId!=='nt-central-intake' && (result.noteBefore || (topic.id==='safety' && state.answers.need==='violence-safety'));
  return `<div class="contacts-heading"><h2 id="support-contacts-heading">Contact a service</h2></div>${serviceDetails(serviceFor(ids[0],result),true,noteBefore ? note : '',chatOptions(result,ids[0]),nextAction)}${!noteBefore ? note : ''}${say ? `<details class="say"><summary>What could I say when I contact them?</summary><p>“${esc(say)}”</p></details>` : ''}${ids.length>1 ? `<section class="alternate-list" id="other-contacts" tabindex="-1" aria-label="Other enquiry routes"><h2>Other ways to get help</h2>${ids.slice(1).map(id=>serviceDetails(serviceFor(id,result))).join('')}</section>` : ''}${more.length ? `<section class="more-services"${ids.length===1 ? ' id="other-contacts" tabindex="-1"' : ''}><h2>Other relevant contacts</h2>${more.map(id=>serviceDetails(serviceFor(id,result))).join('')}</section>` : ''}${preferenceChoices(topic,result)}<div class="result-bottom">${topic.id!=='help' ? '<a href="#help" data-action="request-help">Find another way to get help</a>' : ''}<button class="text-button" data-action="print">Print these contacts</button></div>`;
}
function fixedQuestionIds(){
 const [id,index]=String(state.entryKey||'').split('/');
 const choice=journeys.find(task=>task.id===id)?.choices[Number(index)];
 return choice?new Set(['need',...Object.keys(choice.answers||{})]):new Set();
}
function journeyQuestion() {
 return activeJourney?.choices.length>1 ? {
  id:'journey-choice',label:'What help do you need?',
  options:activeJourney.choices.map((choice,index)=>({value:String(index),label:choice.title}))
 } : null;
}
function visibleFlowQuestions(flow) {
 const fixed=fixedQuestionIds();
 return [...(journeyQuestion()?[journeyQuestion()]:[]),...flow.visibleQuestions.filter(q=>!fixed.has(q.id))];
}
function renderedAnswers() {
 const answers={...state.answers};
 if(state.entryKey)answers['journey-choice']=state.entryKey.split('/')[1];
 return answers;
}
function rememberView(push=false,url=location.href) {
 const key=`view-${++viewCounter}`;
 const focus=document.activeElement;
 historyViews.set(key,{url:new URL(url,location.href).href,state:{...state,answers:copyAnswers(state.answers)},journeyId:activeJourney?.id||null,savedRegion,handoff,focusId:root.contains(focus)?focus.id:'',scroll:window.scrollY});
 history[push?'pushState':'replaceState']({supportView:key},'',url);
}
function showFlow(topic) {
 const flow=topic?currentFlow():{visibleQuestions:[],complete:false,nextQuestion:null};
 const title=topic?.id==='help'&&handoff?'Find another suitable service':activeJourney?.title||topic?.title;
 const context=topic?.id==='help'&&handoff?`<p class="handoff-context">${esc(handoff.summary)}</p>`:'';
 root.innerHTML=`<nav class="back-nav" aria-label="Support navigation"><a href="#home">All housing help</a>${topic?.id==='help'&&handoff?`<a href="${handoff.entryKey?'#task/'+handoff.entryKey:'#'+handoff.topicId}" data-action="return-to-request">Your original contacts</a>`:''}<button type="button" class="text-button" data-action="reset">Start again</button></nav><h1 tabindex="-1">${esc(title)}</h1>${context}<div id="flow-safety">${topic?safetyNotice(topic):''}</div><div id="support-answers" tabindex="-1"><form id="support-flow" aria-label="Your support choices" novalidate><div id="flow-questions">${visibleFlowQuestions(flow).map(questionMarkup).join('')}</div></form></div><p id="flow-status" class="sr-only" role="status" aria-live="polite"></p><div id="flow-related">${flowRelated(topic)}</div><section id="support-contacts" class="flow-results" aria-labelledby="support-contacts-heading" tabindex="-1"${flow.complete?'':' hidden'}>${flow.complete?resultsMarkup(topic):''}</section>`;
 document.title=`${title} | NT housing & homelessness support | Lutheran Care`;
}
function flowRelated(topic) {
 const links=activeJourney?.relatedLinks||[];
 return `${topic?relatedMarkup(topic):''}${links.length?`<nav class="related-needs" aria-label="Related help">${links.map(item=>link(item.href,item.label)).join('')}</nav>`:''}`;
}
function focusStep(view) {
 const target=view?.focusId?document.getElementById(view.focusId):root.querySelector('h1');
 target?.focus({preventScroll:true});
 window.scrollTo({top:view?.scroll||0,behavior:'instant'});
}
function syncFlow(topic) {
 const flow=currentFlow();
 reconcileQuestions(root.querySelector('#flow-questions'),visibleFlowQuestions(flow),renderedAnswers(),questionMarkup);
 root.querySelector('#flow-safety').innerHTML=safetyNotice(topic);
 root.querySelector('#flow-related').innerHTML=flowRelated(topic);
 const contacts=root.querySelector('#support-contacts');
 contacts.hidden=!flow.complete;
 contacts.innerHTML=flow.complete?resultsMarkup(topic):'';
 root.querySelector('#flow-status').textContent=flow.complete?'Contacts updated below.':`${flow.nextQuestion.label} is shown below.`;
}
function selectJourney(selected) {
 const task=activeJourney,index=Number(selected.value),choice=task?.choices[index];
 if(!choice||selected.name!=='journey-choice')return;
 const key=`${task.id}/${index}`;
 if(state.entryKey===key)return;
 rememberView();
 const previous=entryChoice();
 const answers=state.topicId?copyAnswers(state.answers):copyAnswers(journeyAnswers.get(key)||(savedRegion?{region:savedRegion}:{}));
 for(const id of Object.keys(previous?.answers||{}))delete answers[id];
 rememberAnswers();
 state={topicId:choice.topicId,entryKey:key,answers:{...answers,need:choice.need,...choice.answers}};
 currentFlow();
 preserveChoicePosition(selected,()=>syncFlow(topicById(state.topicId)));
 rememberAnswers();rememberView(true,'#task/'+key);
}
function advanceQuestion(selected) {
 if(!selected||!root.querySelector('#flow-questions')?.contains(selected))return;
 if(selected.name==='journey-choice'){selectJourney(selected);return;}
 if(state.answers[selected.name]===selected.value)return;
 const before=currentFlow();
 if(!before.visibleQuestions.some(q=>q.id===selected.name&&q.options.some(o=>o.value===selected.value)))return;
 rememberView();
 const flow=applyAnswer(state.topicId,state.answers,selected.name,selected.value,savedRegion);
 state.answers=getFlowState(state.topicId,seedEntryAnswers(flow.answers),savedRegion).answers;
 if(selected.name==='region'&&state.answers.region===selected.value&&!(selected.value==='nt'&&ntRegions.has(savedRegion)))savedRegion=selected.value;
 preserveChoicePosition(selected,()=>syncFlow(topicById(state.topicId)));
 rememberAnswers();rememberView(true);
}

function render() {
  const rawHash = location.hash.slice(1);
  const segments = rawHash.split('/');
  if(segments[0]==='start'){
    const entry=homeEntries.find(item=>item.id&&item.id===segments[1]);
    if(entry)showStartMenu(entry);else showHome();
    if(started)focusHeading();started=true;return;
  }
  if(segments[0]==='task'){
    const task=journeys.find(t=>t.id===segments[1]);
    const index=segments[2]===undefined&&task?.choices.length===1?0:Number(segments[2]);
    const choice=task?.choices[index];
    if(task&&choice){initialiseJourney(task,choice,`${task.id}/${index}`);showFlow(topicById(choice.topicId));rememberView();}
    else if(task){showTaskMenu(task);}
    else{showHome();}
    if(started)focusHeading();started=true;return;
  }
  activeJourney=null;
  if(segments[0]==='directory'){
    showDirectory(segments[1]||'');
    if(started&&!segments[1])focusHeading();
    started=true;return;
  }
  let topic = topicById(segments[0]);
  let seededNeed;
  if (!topic && rawHash && segments[0]!=='home') {
    const legacy = legacyRoute(rawHash);
    if (legacy) { topic=topicById(legacy.topicId); seededNeed=legacy.need; }
  } else if (topic && segments[1] && !['q','results'].includes(segments[1])) {
    const legacy = legacyRoute(rawHash);
    seededNeed = legacy?.need || segments[1];
  }
  if (!topic) {
    showHome();
    document.title = 'NT housing & homelessness support | Lutheran Care';
  } else {
    if(state.entryKey){rememberAnswers();state={topicId:null,answers:{}};}
    initialiseTopic(topic.id,seededNeed);
    // Old question/result links still open the appropriate topic. Answers are
    // memory-only; each choice records a restorable step on the same page.
    // Keep named deep links intact; eligibility answers stay only in memory.
    showFlow(topic);
    rememberView();
  }
  if (started) focusHeading();
  started = true;
}
root.addEventListener('change', event => {
  if(event.target.id==='directory-need'||event.target.id==='directory-region'){
    directoryChoice[event.target.id==='directory-need'?'need':'region']=event.target.value;
    refreshDirectory();return;
  }
  if (event.target.matches('input[name="support-preference"]')) {
    const changedValue=event.target.value;
    state.answers.preferences = [...root.querySelectorAll('input[name="support-preference"]:checked')].map(input=>input.value);
    rememberAnswers();rememberView();
    syncFlow(topicById(state.topicId));
    const replacement=[...root.querySelectorAll('input[name="support-preference"]')].find(input=>input.value===changedValue);
    replacement?.focus({preventScroll:true});
    document.getElementById('preference-status').textContent='Contacts and available ways to reach them updated for your preferences.';
    return;
  }
  if (!event.target.matches('input[type="radio"]') || !root.querySelector('#flow-questions')?.contains(event.target)) return;
  advanceQuestion(event.target);
});
root.addEventListener('submit', event => { event.preventDefault(); });
root.addEventListener('keydown', event => {
 if(event.key==='Enter'&&event.target.matches('input[type="radio"]')&&root.querySelector('#flow-questions')?.contains(event.target)){
  event.preventDefault();event.target.click();
 }
});
root.addEventListener('click', event => {
  if(event.target.closest('[data-action="reset"]')) {
    event.preventDefault();startAgain();return;
  }
  if (event.target.closest('[data-action="print"]')) window.print();
  if(event.target.closest('[data-action="clear-filters"]')){event.preventDefault();directoryChoice.need='';directoryChoice.region='';showDirectory();return;}
  const anchor = event.target.closest('a[href^="#"]');
  if (!anchor || anchor.dataset.pageJump || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (anchor.dataset.action==='request-help' && state.topicId!=='help') {
    const region = questionsFor(state.topicId,state.answers).find(question=>question.id==='region')?.options.find(option=>option.value===state.answers.region)?.label;
    const result = getResults(state.topicId,state.answers);
    handoff = {entryKey:state.entryKey,topicId:state.topicId,previousPrimaryId:result.ids[0],otherIds:[...result.ids.slice(1),...(result.moreIds || [])],answers:copyAnswers(state.answers),summary:answerSummary(state.topicId,state.answers)||topicById(state.topicId)?.title||'Support',say:`${result.say||'I would like help finding support.'}${region ? ` Support is needed in ${region}.` : ''} Could you help me find another service for this need?`};
    topicAnswers.set(state.topicId,copyAnswers(state.answers));
    topicAnswers.set('help',{...(savedRegion ? {region:savedRegion} : {}),...(Array.isArray(state.answers.preferences) ? {preferences:[...state.answers.preferences]} : {})});
  } else if (anchor.hash==='#help' && state.topicId!=='help') {
    handoff=null;
    topicAnswers.delete('help');
  }
  if (anchor.dataset.action==='return-to-request' && handoff) {
    topicAnswers.set(handoff.topicId,copyAnswers(handoff.answers));
  }
  event.preventDefault();
  if(anchor.hash!==location.hash)history.pushState(null,'',anchor.hash);
  render();
});
document.querySelector('.skip-link')?.addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('main').focus();
  document.getElementById('main').scrollIntoView();
});
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[data-page-jump]');
  if (!anchor) return;
  const target = document.getElementById(anchor.dataset.pageJump);
  if (!target) return;
  event.preventDefault();
  if (target.matches?.('details')) target.open=true;
  target.focus({preventScroll:true});
  target.scrollIntoView({block:'start'});
});
window.addEventListener('hashchange',()=>{
 if(restoredHistoryURL===location.href){restoredHistoryURL=null;return;}
 restoredHistoryURL=null;render();
});
window.addEventListener('popstate',event=>{
 const view=historyViews.get(event.state?.supportView);
 if(!view||view.url!==location.href) {
   // Same-URL question entries have no hashchange, so render them fresh too.
   restoredHistoryURL=location.href;
   render();
   return;
 }
 restoredHistoryURL=location.href;
 state={...view.state,answers:copyAnswers(view.state.answers)};activeJourney=journeys.find(t=>t.id===view.journeyId)||null;savedRegion=view.savedRegion;handoff=view.handoff;
 if(topicById(state.topicId)||activeJourney){showFlow(topicById(state.topicId));focusStep(view);}
});
let printOpened = [];
window.addEventListener('beforeprint', () => {
  printOpened = [...root.querySelectorAll('details.more-services:not([open])')];
  for (const details of printOpened) details.open=true;
});
window.addEventListener('afterprint', () => {
  for (const details of printOpened) details.open=false;
  printOpened=[];
});
render();
prepareEmbeddedWebLinks();
