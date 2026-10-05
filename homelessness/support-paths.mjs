import release,{rows,rowsById,serviceView,regionLabels,safeHouseCommunities} from './support-catalog.mjs';
export const regionIds=Object.keys(regionLabels);
const options=entries=>entries.map(([value,label,detail])=>({value,label,...detail?{detail}:{}}));
const question=(id,label,entries,hint)=>({id,label,options:options(entries),...hint?{hint}:{}});
const issue=(number)=>release.issues.find(x=>x.issue_number===number);
export const topics=[
 {id:'housing',title:'Housing & a place tonight',hint:'Nowhere safe to stay, a stable home, a tenancy or returning home',links:[{label:'An unsafe home because of violence',href:'#safety/violence-safety'}]},
 {id:'safety',title:'Safety from violence',hint:'Safety, refuge, sexual assault, older-person abuse or pets'},
 {id:'essentials',title:'Food, essentials & ID',hint:'Meals, washing, documents, a phone or online access'},
 {id:'money',title:'Income, bills & debt',hint:'Payments, electricity, debt advice or private-rental set-up costs'},
 {id:'health',title:'Health & alcohol or drugs',hint:'Medical care and travel, mental health or alcohol and other drugs'},
 {id:'family',title:'Children, young people & families',hint:'Youth accommodation, parenting, school or child safety'},
 {id:'access',title:'Legal help, culture & care',hint:'Leaving a service, legal rights, disability, ageing, transport or language'}
];
export const needIssues={'safe-tonight':1,'longer-term-housing':2,'keep-tenancy':3,'violence-safety':4,'return-home':5,'children-youth-family':6,'food-essentials':7,'money-benefits':8,'identity-digital':9,'health-medical-travel':10,'health-wellbeing':11,'alcohol-drugs':12,'disability-ageing':13,'legal-transition':14,'legal-help':15,'access-culture-disability':16};
const topicNeeds={housing:['safe-tonight','longer-term-housing','keep-tenancy','return-home'],safety:['violence-safety'],essentials:['food-essentials','identity-digital'],money:['money-benefits'],health:['health-medical-travel','health-wellbeing','alcohol-drugs'],family:['children-youth-family'],access:['disability-ageing','legal-transition','legal-help','access-culture-disability']};
const needTitles={'safe-tonight':'No safe place to stay tonight','longer-term-housing':'A more stable home','keep-tenancy':'A tenancy problem or unsafe housing','return-home':'Visiting town or returning home','violence-safety':'Safety from violence','children-youth-family':'A child, young person or family','food-essentials':'Food, washing or everyday essentials','money-benefits':'Income, bills, debt or electricity','identity-digital':'ID, a phone or help applying','health-medical-travel':'Medical care or travel for treatment','health-wellbeing':'Mental health or trauma','alcohol-drugs':'Alcohol or drug support','disability-ageing':'Disability, ageing or daily living','legal-transition':'Leaving hospital, care, custody or temporary housing','legal-help':'Legal advice or making a complaint','access-culture-disability':'Transport, interpreting or service access'};
const regions=question('region','Where is support needed?',Object.entries(regionLabels));
const ages=question('age','How old is the person needing support?',[['under15','Under 15'],['15-18','15–18'],['19-21','19–21'],['22-24','22–24'],['25-49','25–49'],['50-64','50–64'],['65+','65 or older'],['unsure','Not sure / rather not say']]);
const household=question('household','Who needs accommodation?',[['single-man','One adult man'],['single','One person — another situation'],['couple','A couple without children'],['family','A household with children'],['unsure','Not sure / rather not say']]);
const subquestions={
 'longer-term-housing':question('housingGoal','What kind of housing help?',[['social','Public housing application or waiting list'],['family','Supported housing for a family'],['private','Help moving into private rental'],['mental','Housing with mental-health support'],['unsure','Not sure — housing advice']]),
 'keep-tenancy':question('tenancyNeed','What is the problem?',[['advice','Notice, eviction, rent or a tenancy dispute'],['repairs','Public or remote housing repairs'],['support','Practical support to keep a tenancy']]),
 'return-home':question('returnNeed','What would help?',[['travel','Returning home / to Country'],['stay','A First Nations hostel while away from home']]),
 'violence-safety':question('safetyNeed','What support is needed?',[['support','Safety advice and support'],['refuge','A safe place because of violence'],['assault','Support after sexual assault'],['older','Older-person abuse'],['pets','Temporary help with pets'],['behaviour','Help for someone using violence']]),
 'children-youth-family':question('familyNeed','What would help?',[['family','Family or parenting support'],['housing','Youth housing or risk of leaving home'],['young-parent','A young pregnant woman or young mum'],['school','School enrolment or attendance'],['safety','Concern about harm to a child']]),
 'food-essentials':question('essentialNeed','What is needed?',[['food','Food, vouchers or everyday essentials'],['washing','Showers or laundry'],['youth','Emergency relief for a young person']]),
 'money-benefits':question('moneyNeed','What would help?',[['payments','Payments or social-work help'],['debt','Debt or financial counselling'],['electricity','Electricity bills or prepaid credit'],['bond','Private-rental bond or advance rent'],['concessions','NT concessions']]),
 'identity-digital':question('digitalNeed','What is needed?',[['birth','A birth certificate'],['id','Help getting ID or documents'],['online','Computers, internet or help applying'],['find','Find a local service']]),
 'health-medical-travel':question('medicalNeed','What would help?',[['advice','Health advice for anyone'],['clinic','An Aboriginal community health clinic'],['travel','Travel for specialist treatment'],['renal','Practical support for an Aboriginal renal patient']]),
 'alcohol-drugs':question('aodNeed','What kind of help?',[['advice','Advice, counselling or treatment entry'],['residential','Residential treatment / rehabilitation'],['withdrawal','Withdrawal assessment'],['sobering','Supported sobering care'],['harm','Harm reduction or blood-borne-virus support']]),
 'disability-ageing':question('careNeed','What would help?',[['disability','Disability access, advocacy or daily support'],['aged','Finding aged care or daily living help'],['rights','Aged-care rights or advocacy'],['carer','Support for an unpaid carer']]),
 'legal-transition':question('transitionNeed','What is the person leaving?',[['hospital','Hospital'],['custody','Prison or custody'],['care','Out-of-home care'],['temporary','Temporary or supported housing'],['treatment','Alcohol or drug treatment']]),
 'legal-help':question('legalNeed','What is the problem?',[['general','General legal advice'],['housing','NT Housing complaint or appeal'],['discrimination','Discrimination'],['children','Children and Families complaint'],['government','Government / police complaint'],['identity','An LGBTQIASB+ identity-related legal issue'],['violence','Family or sexual-violence legal help'],['women','A women’s or gender-specific legal service']]),
 'access-culture-disability':question('accessNeed','What would help?',[['language','Interpreting or communication access'],['transport','Transport or local safety patrol'],['settlement','Refugee or migrant settlement support'],['veteran','Veteran or Defence-family navigation']])
};
function needsAge(a){
 if(a.need==='health-wellbeing'||a.need==='alcohol-drugs')return true;
 if(a.need==='longer-term-housing')return ['private','mental'].includes(a.housingGoal);
 if(a.need==='children-youth-family')return ['housing','young-parent'].includes(a.familyNeed);
 if(a.need==='food-essentials')return a.essentialNeed==='youth';
 if(a.need==='money-benefits')return a.moneyNeed==='bond';
 if(a.need==='disability-ageing')return a.careNeed!=='carer';
 return a.need==='legal-transition'&&['custody','care','treatment'].includes(a.transitionNeed);
}
export function regionModeFor(topic,a={}){
 if(topic==='help')return 'none';
 const n=a.need;
 if(n==='keep-tenancy')return a.tenancyNeed==='advice'?'none':'full';
 if(n==='violence-safety')return a.safetyNeed==='older'||a.safetyNeed==='refuge'&&a.refugeFor==='other'?'none':'full';
 if(n==='children-youth-family')return a.familyNeed==='safety'?'none':'full';
 if(n==='money-benefits')return a.moneyNeed==='debt'?'full':'none';
 if(n==='identity-digital')return ['id','online'].includes(a.digitalNeed)?'full':'none';
 if(n==='health-medical-travel')return a.medicalNeed==='advice'?'none':'full';
 if(n==='disability-ageing')return a.careNeed==='carer'?'none':'full';
 if(n==='legal-transition')return a.transitionNeed==='care'?'none':'full';
 if(n==='legal-help')return ['women','violence'].includes(a.legalNeed)?'full':'none';
 if(n==='access-culture-disability')return ['language','veteran'].includes(a.accessNeed)?'none':'full';
 return 'full';
}
const communities=Object.entries(safeHouseCommunities).map(([order,[value,region]])=>({value,region,label:issue(4).rows.find(row=>row.row_order===Number(order)).display.location.replace(/\n/g,' ')}));
function tonightQuestions(a){
 const qs=[regions];
 const local=rows.filter(row=>row.issue_number===1&&directAccommodation.has(row.catalogue_id)&&row.region_ids.includes(a.region));
 // No age or household answer changes the sole intake route in catchments
 // without a listed local accommodation programme.
 if(!local.length)return qs;
 if(local.every(row=>row.catalogue_id==='salvos-todd-street-men')){
  qs.push(household);
  // A men's programme is the only age-limited accommodation route here.
  if(a.household==='single-man'||!household.options.some(o=>o.value===a.household))qs.push(ages);
 }else{
  qs.push(ages);
  // Do not ask about adult household fit when no listed programme overlaps
  // the selected age. Outreach and intake retain their published scope.
  if(local.some(row=>ageMatch(row,a).match))qs.push(household);
 }
 return qs;
}
export function questionsFor(topic,a={}){
 if(topic==='help')return [];
 const allowed=topicNeeds[topic]||[],qs=[question('need','What would help?',allowed.map(id=>[id,needTitles[id]]))];
 if(!allowed.includes(a.need))return qs;
 if(a.need==='safe-tonight')return [...qs,...tonightQuestions(a)];
 if(subquestions[a.need])qs.push(subquestions[a.need]);
 if(a.need==='violence-safety'&&a.safetyNeed==='refuge')qs.push(question('refugeFor','Who needs a safe place?',[['woman-child','A woman with children'],['woman','A woman without children'],['first-nations-child','An Aboriginal or Torres Strait Islander woman with children'],['first-nations-woman','An Aboriginal or Torres Strait Islander woman without children'],['other','Another situation / not sure']]));
 if(a.need==='access-culture-disability'&&a.accessNeed==='language')qs.push(question('languageNeed','What communication support?',[['aboriginal','An Aboriginal-language interpreter'],['other-language','An interpreter for another language'],['relay','Relay for hearing or speech difficulty']]));
 if(a.need==='access-culture-disability'&&a.accessNeed==='transport')qs.push(question('transportNeed','What kind of transport help?',[['bus','Public buses'],['community','Community transport'],['patrol','A local safety patrol']]));
 if(needsAge(a))qs.push(ages);
 if(regionModeFor(topic,a)==='full')qs.push(regions);
 if(a.need==='violence-safety'&&a.safetyNeed==='refuge'&&a.refugeFor!=='other'&&a.region&&a.region!=='unsure'){
  const local=communities.filter(c=>c.region===a.region);
  if(local.length)qs.push(question('community','Which community needs a refuge?',[...local.map(c=>[c.value,c.label]),['other','Another place / not sure']]));
 }
 return qs;
}
export function preferencesFor(){return options([['no-phone','I cannot use a phone']]);}
const bands={'under15':[0,14],'15-18':[15,18],'19-21':[19,21],'22-24':[22,24],'25-49':[25,49],'50-64':[50,64],'65+':[65,120]};
const ageRules={'nt-private-rental-bond':[18,null],'salvos-house-49':[25,null],'salvos-sunrise-homelessness':[18,null],'mission-katherine-accommodation':[18,null],'salvos-todd-street-men':[18,null],'vinnies-darwin-housing':[18,null],'vinnies-katherine-housing':[18,null],'teamhealth-community-housing':[18,null],'teamhealth-rent-to-live':[18,null],'chca-private-rental-liaison':[18,null],'ywca-casy-house':[15,18],'anglicare-yass':[15,21],'anglicare-yhopp':[10,25],'anglicare-reconnect':[12,18],'catholiccare-assertive-outreach':[10,25],'asyass-crisis-refuge':[13,17],'asyass-youth-housing':[16,24],'asyass-ampe-akweke':[14,23],'waltja-youth-family':[12,18],'anglicare-youth-emergency-relief':[12,25],'kids-helpline':[5,25],'headspace-nt-youth':[12,25],'caaps-strong-steps':[13,null],'caaps-youth-treatment':[12,17],'banyan-residential-recovery':[18,null],'amity-counselling':[14,null],'kalano-venndale':[18,null],'dasa-aranda-outreach':[18,null],'dasa-sobering-up':[14,null],'bushmob-youth-aod':[12,25],'ndis-access':[null,64],'my-aged-care':[50,null],'anglicare-care-finder':[50,null],'dcls-seniors-rights':[50,null],'anglicare-commonwealth-home-support':[50,null],'anglicare-moving-on':[16,25],'teamhealth-pathways-strong-foundations':[18,null],'teamhealth-subacute':[18,64],'dasa-transitional-aftercare':[18,null],'dasa-alternative-custody':[18,null]};
const subsets={
 housingGoal:{social:[1,2,6,7,8],family:[3,5,6,9,10],private:[5,11],mental:[4,5],unsure:[1]},
 tenancyNeed:{advice:[1],repairs:[2,9],support:[1,3,4,5,6,7,8]},
 returnNeed:{travel:[1,5],stay:[2,3,4,6,7]},
 safetyNeed:{support:[2,7,8,12,13,16,31],refuge:[2,5,6,10,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],assault:[2,3,11],older:[4],pets:[2,9],behaviour:[17]},
 familyNeed:{family:[1,12,13],housing:[1,4,5,6,7,8,9,10,14], 'young-parent':[1,11],school:[1,3,15],safety:[2]},
 essentialNeed:{food:[1,2,3,5,6,8,9,10],washing:[1,7,8,9],youth:[4]},
 moneyNeed:{payments:[1,2],debt:[3,7,8,9,10,11],electricity:[4],bond:[6],concessions:[5]},
 digitalNeed:{birth:[1],id:[1],online:[2,3,4,5,6],find:[2]},
 medicalNeed:{advice:[1],clinic:[1,3,4,5,6,7,8,9,10,12,13,14,15,16],travel:[2],renal:[11]},
 aodNeed:{advice:[1,3,8],residential:[4,5,6,7,11,13,15,16,19],withdrawal:[1,2,18],sobering:[9,12,14,17,20],harm:[10]},
 careNeed:{disability:[1,4,8,11,13,14,15,16,18,19],aged:[2,5,7,8,9,12,14,15,17,18,19],rights:[6,10],carer:[3]},
 transitionNeed:{hospital:[1,6],custody:[3,4,5,10],care:[2],temporary:[5,7,8],treatment:[9]},
 legalNeed:{general:[1,2,3],housing:[4],discrimination:[5],children:[6],government:[7],identity:[8],violence:[1,9,11,14],women:[10,12,13]},
 accessNeed:{language:[1,2,3],transport:[5,6,9,10,11,12,13,14,15],settlement:[7,8],veteran:[4]}
};
const directAccommodation=new Set(['salvos-house-49','salvos-sunrise-homelessness','vinnies-darwin-housing','mission-katherine-accommodation','vinnies-katherine-housing','salvos-todd-street-men']);
const remoteLaundryEnquiryRegions=new Set(['katherine','arnhem','topend']);
function remoteLaundryEnquiry(row,a){
 return row.catalogue_id==='orange-sky-top-end'&&a.need==='food-essentials'&&a.essentialNeed==='washing'&&remoteLaundryEnquiryRegions.has(a.region);
}
function ageMatch(row,a){
 let rule=ageRules[row.catalogue_id];
 if(row.catalogue_id==='bushmob-youth-aod'&&a.aodNeed==='residential')rule=[12,17];
 if(!rule)return {match:true,conditional:false};
 const b=bands[a.age];if(!b)return {match:true,conditional:true};
 const [lo,hi]=rule;return {match:(lo==null||b[1]>=lo)&&(hi==null||b[0]<=hi),conditional:lo!=null&&b[0]<lo||hi!=null&&b[1]>hi};
}
export function matchRow(row,a={}){
 const region=a.region||'unsure';
 // The source's Darwin list placement also publishes named remote laundry
 // communities. This exception is an enquiry, never area-wide availability.
 if(!row.region_ids.includes(region)&&!remoteLaundryEnquiry(row,a))return null;
 const age=ageMatch(row,a);if(!age.match)return null;
 if(a.need==='safe-tonight'){
  if(['couple','family'].includes(a.household)&&['salvos-sunrise-homelessness','mission-katherine-accommodation','salvos-todd-street-men'].includes(row.catalogue_id))return null;
  if(a.household==='family'&&row.catalogue_id==='salvos-house-49')return null;
  if(row.catalogue_id==='salvos-todd-street-men'&&a.household!=='single-man')return null;
 }
 if(a.need==='violence-safety'&&a.safetyNeed==='refuge'){
  if(a.refugeFor==='other'&&row.catalogue_id!=='1800respect')return null;
  if(row.catalogue_id==='dawn-house'&&!['woman-child','first-nations-child'].includes(a.refugeFor))return null;
  if(row.catalogue_id==='daiws'&&!['first-nations-child','first-nations-woman'].includes(a.refugeFor))return null;
  if(row.catalogue_id==='catherine-booth-crisis'&&!['woman','first-nations-woman'].includes(a.refugeFor))return null;
  if(row.catalogue_id==='nt-remote-violence-safe-houses'&&safeHouseCommunities[row.row_order][0]!==a.community)return null;
 }
 if(row.catalogue_id==='asyass-ampe-akweke'&&a.familyNeed!=='young-parent')return null;
 let qualification=age.conditional?'Ask the service to check the precise age rule for this selected age range.':'';
 if(a.need==='safe-tonight'&&a.household==='unsure'&&directAccommodation.has(row.catalogue_id))qualification+=' Household eligibility is not established; ask for an assessment or another route.';
 if(row.catalogue_id==='anglicare-yass')qualification+=' Published age limits conflict; confirm the current intake rule.';
 if(row.catalogue_id==='purple-house-practical'&&a.region==='central')qualification+=' This is a patient-support enquiry for participating remote communities. Ask the programme to assess your renal care and catchment; local delivery is not confirmed.';
 return {row,qualification,ageConditional:age.conditional};
}
function rowChoices(a){
 const number=needIssues[a.need],selected=rows.filter(row=>row.issue_number===number);
 const key=Object.keys(subsets).find(k=>subsets[k][a[k]]&&subquestions[a.need]?.id===k);
 let candidates=key?selected.filter(row=>subsets[key][a[key]].includes(row.row_order)):selected;
 if(a.need==='identity-digital'&&a.digitalNeed==='id')candidates.push(...rows.filter(row=>row.issue_number===5&&[1,5].includes(row.row_order)));
 if(a.need==='access-culture-disability'&&a.accessNeed==='language'&&a.languageNeed){
  const order={aboriginal:1,'other-language':2,relay:3}[a.languageNeed];candidates=candidates.filter(row=>row.row_order===order);
 }
 if(a.need==='access-culture-disability'&&a.accessNeed==='transport'&&a.transportNeed){
  const orders={bus:[6],community:[10],patrol:[5,9,11,12,13,14,15]}[a.transportNeed];candidates=candidates.filter(row=>orders?.includes(row.row_order));
 }
 return candidates;
}
function resultNote(a){
 const published=issue(needIssues[a.need])?.note||'Published eligibility, fees and catchments apply. No bed, appointment or acceptance has been checked live.';
 if(a.need==='violence-safety')return 'Immediate danger: call 000. '+published;
 if(a.need!=='safe-tonight')return published;
 const gap={tennant:'Barkly',arnhem:'East Arnhem'}[a.region];
 return 'Confirm vacancies, costs, household/carer fit, disability access and pets.'+(gap?' General crisis and youth beds in '+gap+' are not confirmed here; specialist services have separate entry rules.':'')+' After hours or if full, ask for a safe alternative; none is guaranteed.';
}
export function getResults(topic,a={}){
 const contactMode=a.preferences?.includes('no-phone')?'no-phone':'standard';
 if(topic==='help'){
  const row=rows.find(r=>r.catalogue_id==='ask-izzy');
  return buildResult([matchRow(row,{...a,region:a.region||'unsure'})].filter(Boolean),a,contactMode,'Ask Izzy is a search route; it does not arrange or confirm a service.');
 }
 let matched=rowChoices(a).map(row=>matchRow(row,a)).filter(Boolean);
 if(a.need==='safe-tonight')matched.sort((x,y)=>Number(directAccommodation.has(y.row.catalogue_id)&&!y.qualification)-Number(directAccommodation.has(x.row.catalogue_id)&&!x.qualification)||x.row.geography.rank-y.row.geography.rank||x.row.row_order-y.row.row_order);
 if(a.need==='health-wellbeing'){
  const local=new Set(['darwin-medicare-mental-health','strongbala-minds-katherine','headspace-nt-youth','mhaca-drop-in-pathways','sandstone-counselling','mifant-mitrack']);
  matched.sort((x,y)=>Number(local.has(y.row.catalogue_id)&&!y.ageConditional)-Number(local.has(x.row.catalogue_id)&&!x.ageConditional));
 }
 if(a.need==='identity-digital'&&a.digitalNeed==='online')matched.sort((x,y)=>Number(x.row.catalogue_id==='ask-izzy')-Number(y.row.catalogue_id==='ask-izzy'));
 if(a.need==='food-essentials'&&a.essentialNeed==='food'){
  const dayFood=new Set(['vinnies-ozanam-house','salvos-katherine-doorways-hub','salvos-waterhole']);
  const priority=row=>dayFood.has(row.catalogue_id)?0:a.region==='alice'&&row.catalogue_id==='vinnies-nt-emergency-relief'?2:1;
  matched.sort((x,y)=>priority(x.row)-priority(y.row));
 }
 if(a.need==='food-essentials'&&a.essentialNeed==='washing')matched.sort((x,y)=>Number(remoteLaundryEnquiry(x.row,a))-Number(remoteLaundryEnquiry(y.row,a)));
 // A partially overlapping age band is a qualified enquiry. Put known age
 // fits before it, including in the first three contacts.
 matched.sort((x,y)=>Number(x.ageConditional)-Number(y.ageConditional));
 if(contactMode==='no-phone')matched.sort((x,y)=>Number(contactOptionsForNoPhone(y.row))-Number(contactOptionsForNoPhone(x.row)));
 let note=resultNote(a);
 if(!matched.length)note+=' No direct route is matched for these choices. The service finder below can help you search locally; change your choices or ask a worker about another route.';
 if(contactMode==='no-phone')note+=' Only supplied non-phone links are offered. Forms and email may take time; a website alone is not confirmed online intake.';
 if(a.region==='npy')note+=' NPY community and border coverage must be assessed by the programme; NT-wide enquiries do not establish SA or WA entitlements.';
 return buildResult(matched,a,contactMode,note);
}
function contactOptionsForNoPhone(row){const d=row.display;return !!(d.email||d.form||d.extra_links?.some(([label])=>/chat/i.test(label)));}
function contextFitNote(row,a){
 if(remoteLaundryEnquiry(row,a))return 'Remote enquiry covers listed laundry communities; confirm your local shift and whether showers are offered.';
 if(a.need==='food-essentials'&&row.catalogue_id==='vinnies-nt-emergency-relief'&&a.region==='alice')return 'For Alice Springs, ask about sessions and venue. Malak/Palmerston hours are for Darwin/Palmerston.';
 if(a.need!=='safe-tonight'||!['family','couple'].includes(a.household))return '';
 if(row.catalogue_id==='vinnies-darwin-housing')return 'Ask about Ted Collins units (up to two people per room); Bakhita/Park Lodge hostels are listed for single adults over 18.';
 if(row.catalogue_id==='vinnies-katherine-housing')return 'Ask about Bernard Complex units (up to two people per room); Ormonde House hostel is listed for single men over 18.';
 return '';
}
function buildResult(matched,a,contactMode,note){
 const fallback=rows.find(r=>r.catalogue_id==='ask-izzy'),noDirectMatch=!matched.length;
 if(noDirectMatch)matched=[{row:fallback,qualification:'Help searching for another service; no direct local match is established.'}];
 const views=matched.map(({row,qualification})=>{
  const view={...serviceView(row,{contactMode,qualification,region:a.region||'unsure'}),fitNote:contextFitNote(row,a)};
  // A regional choice does not establish that the user is in Maningrida.
  // Keep its published partner number as source text; use national enquiry.
  if(row.catalogue_id==='orange-sky-top-end'&&a.community!=='maningrida')view.contactOptions=view.contactOptions.filter(o=>o.href!=='tel:0889795772');
  return view;
 });
 const ids=views.map(v=>v.id);
 return {ids:ids.slice(0,3),moreIds:ids.slice(3),allIds:ids,totalMatches:ids.length,noDirectMatch,servicesById:Object.fromEntries(views.map(v=>[v.id,v])),note,noteBefore:['safe-tonight','violence-safety'].includes(a.need),say:'I need help with '+(needTitles[a.need]||'finding a service').toLowerCase()+'. Can you check whether this service fits, the next contact, any costs and what I need to bring?',contextLabel:questionsFor(Object.keys(topicNeeds).find(k=>topicNeeds[k].includes(a.need))||'help',a).flatMap(q=>q.options.filter(o=>o.value===a[q.id]).map(o=>o.label)).join(' · '),preferenceGroups:[],contactMode,coverage:{issueGroups:16,routes:219,sourceCatalogueIds:194,liveAvailabilityChecked:false}};
}
export function recoveryResults(handoff,a={}){
 // Re-run the original fit and regional contact logic. Recovery never converts
 // raw multi-region records into unfiltered contact cards.
 const result=getResults(handoff.topicId,{...handoff.answers,...a,need:handoff.answers.need});
 const ids=result.allIds.filter(id=>id!==handoff.previousPrimaryId);
 const fallback=rows.find(r=>r.catalogue_id==='ask-izzy');
 if(!ids.includes(fallback.appearance_id))ids.push(fallback.appearance_id);
 return {...result,ids:ids.slice(0,3),moreIds:ids.slice(3),allIds:ids,servicesById:{...result.servicesById,[fallback.appearance_id]:serviceView(fallback,{contactMode:result.contactMode,region:a.region||handoff.answers.region||'unsure'})},note:'These contacts retain your original need, regional catchment and eligibility choices. Ask Izzy gives a separate way to search locally.'};
}
const aliases={stay:'safe-tonight',housing:'longer-term-housing','keep-home':'keep-tenancy',essentials:'food-essentials',money:'money-benefits',identity:'identity-digital',safety:'violence-safety',health:'health-wellbeing',aod:'alcohol-drugs',family:'children-youth-family',transition:'legal-transition',access:'access-culture-disability'};
export function legacyRoute(hash){const p=hash.replace(/^#/,'').split('/'),need=aliases[p[1]||p[0]]||p[1]||p[0],topicId=Object.keys(topicNeeds).find(k=>topicNeeds[k].includes(need));return topicId?{topicId,need}:null;}
