import release, {rows, serviceView, regionLabels, safeHouseCommunities} from './support-catalog.mjs';

// Task associations retain the reviewed source routes. These describe intent,
// not a questionnaire; refinements never pass through the earlier flow model.
const issueFor = {'safe-tonight':1,'longer-term-housing':2,'keep-tenancy':3,'violence-safety':4,'return-home':5,'children-youth-family':6,'food-essentials':7,'money-benefits':8,'identity-digital':9,'health-medical-travel':10,'health-wellbeing':11,'alcohol-drugs':12,'disability-ageing':13,'legal-transition':14,'legal-help':15,'access-culture-disability':16};
const taskRows = {
 housingGoal:{social:[1,2,6,7,8],family:[3,5,6,9,10],private:[5,11],mental:[4,5],unsure:[1]},
 tenancyNeed:{advice:[1],repairs:[2,9],support:[1,3,4,5,6,7,8]},
 returnNeed:{travel:[1,5],stay:[2,3,4,6,7]},
 safetyNeed:{support:[2,7,8,12,13,16,31],refuge:[2,5,6,10,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],assault:[2,3,11],older:[4],pets:[2,9],behaviour:[17]},
 familyNeed:{family:[1,12,13],housing:[1,4,5,6,7,8,9,10,14],'young-parent':[1,11],school:[1,3,15],safety:[2]},
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
const detailFor = {'longer-term-housing':'housingGoal','keep-tenancy':'tenancyNeed','return-home':'returnNeed','violence-safety':'safetyNeed','children-youth-family':'familyNeed','food-essentials':'essentialNeed','money-benefits':'moneyNeed','identity-digital':'digitalNeed','health-medical-travel':'medicalNeed','alcohol-drugs':'aodNeed','disability-ageing':'careNeed','legal-transition':'transitionNeed','legal-help':'legalNeed','access-culture-disability':'accessNeed'};
const sourceByCatalogue = id => rows.find(row => row.catalogue_id === id);
const finder = sourceByCatalogue('ask-izzy');
const unique = items => [...new Map(items.map(row => [row.appearance_id,row])).values()];
const ageRanges = {
 'nt-private-rental-bond':[18,null], 'salvos-house-49':[25,null],
 'salvos-sunrise-homelessness':[18,null], 'mission-katherine-accommodation':[18,null],
 'salvos-todd-street-men':[18,null], 'teamhealth-community-housing':[18,null],
 'teamhealth-rent-to-live':[18,null], 'chca-private-rental-liaison':[18,null],
 'ywca-casy-house':[15,18], 'anglicare-yass':[15,21], 'anglicare-yhopp':[10,25],
 'anglicare-reconnect':[12,18], 'catholiccare-assertive-outreach':[10,25],
 'asyass-crisis-refuge':[13,17], 'asyass-youth-housing':[16,24],
 'asyass-ampe-akweke':[14,23], 'waltja-youth-family':[12,18],
 'anglicare-youth-emergency-relief':[12,25], 'kids-helpline':[5,25],
 'headspace-nt-youth':[12,25], 'caaps-strong-steps':[13,null],
 'caaps-youth-treatment':[12,17], 'banyan-residential-recovery':[18,null],
 'caaps-aod-residential':[18,null], 'amity-counselling':[14,null],
 'kalano-venndale':[18,null], 'dasa-sobering-up':[14,null],
 'bushmob-youth-aod':[12,25], 'ndis-access':[null,64],
 'anglicare-moving-on':[16,25], 'teamhealth-pathways-strong-foundations':[18,null],
 'teamhealth-subacute':[18,64], 'dasa-transitional-aftercare':[18,null],
 'dasa-alternative-custody':[18,null], 'naaja-adult-throughcare':[18,null],
 'mhaca-drop-in-pathways':[18,null], 'catherine-booth-crisis':[19,null]
};
const adultAccommodation = new Set(['salvos-house-49','salvos-sunrise-homelessness','vinnies-darwin-housing','mission-katherine-accommodation','vinnies-katherine-housing','salvos-todd-street-men']);
const youthCrisis = new Set(['ywca-casy-house','asyass-crisis-refuge']);
const youthHousing = new Set(['ywca-casy-house','asyass-crisis-refuge','asyass-youth-housing','anglicare-yass','anglicare-yhopp','catholiccare-assertive-outreach']);
const singleAccommodation = new Set(['salvos-sunrise-homelessness','mission-katherine-accommodation']);
const womenOnly = new Set(['dawn-house','daiws','catherine-booth-crisis','katherine-womens-crisis-centre','tennant-creek-womens-refuge','nt-remote-violence-safe-houses','npy-dfv','asyass-ampe-akweke','teamhealth-ladybird-house','cawls-central-barkly','dasa-alternative-custody']);
const womenDiverse = new Set(['ywca-keeping-women-safe','ywca-dfv-centre','wossca','ywca-homesafe','tewls-legal','kwils-legal']);
const restrictedCatchments = new Set(['laynhapuy-homeland-housing','npy-dfv','npy-child-family-youth','waltja-youth-family','catholiccare-santa-teresa-school','waltja-emergency-money','anglicare-east-arnhem-money-hub','katherine-west-health','sunrise-health-clinics','urapuntja-health','ampilatwatja-health','congress-primary-health','purple-house-practical','miwatj-primary-health','laynhapuy-health','pintupi-health','red-lily-clinics','malala-health-community','barkly-council-aged','laynhapuy-aged-disability','npy-tjungu','waltja-remote-connectors','central-desert-aged','macdonnell-aged','east-arnhem-aged-disability','barkly-council-night-patrol','east-arnhem-community-patrol','macdonnell-community-safety']);
const firstNationsOnly = new Set(['daiws','larrakia-return-to-country','ahl-nt-multipurpose','centrelink-indigenous','naaja-legal','naafls-family-legal','caaflu-family-legal','naaja-adult-throughcare','dasa-alternative-custody','forwaard-rehab','caaapu-residential','barkly-council-aged','larrakia-day-night-patrol','east-arnhem-community-patrol']);
const assessedNotes = {
 'teamhealth-subacute':'TEMHS involvement and treating-team referral or case management are required; not walk-in housing.',
 'ywca-homesafe':'Family-violence criteria, Central Intake referral and allocation assessment apply; this is transitional housing.',
 'teamhealth-ladybird-house':'Referral, household and child-age rules require assessment; this is non-crisis transitional housing.',
 'casa-disability-housing':'SIL funding, support needs and housemate fit must be assessed; not general emergency housing.',
 'naaja-adult-throughcare':'For Aboriginal/Torres Strait Islander adults in the listed prisons; confirm the release pathway.',
 'dasa-alternative-custody':'Aboriginal NT women 18+ with assessed justice arrangements; not a walk-in bed.',
 'chca-apmere-urlte':'NT Housing waiting-list and ongoing-support criteria apply; not emergency accommodation.',
 'anglicare-garaworra':'NT Housing referral and public-housing waiting-list eligibility apply; not a confirmed place tonight.',
 'anglicare-alice-transitional':'NT Housing referral and public-housing waiting-list eligibility apply; not a confirmed place tonight.'
};
function task(choice={}) {
 const value = choice && typeof choice === 'object' ? choice : {};
 return {need:value.need || '', ...(value.answers && typeof value.answers === 'object' ? value.answers : {})};
}
function exactAge(value) {
 if(typeof value !== 'string' || !/^\d{1,3}$/.test(value.trim()))return null;
 const age=Number(value.trim());
 return Number.isInteger(age)&&age>=0&&age<=120?age:null;
}
function facts(choice, refinements={}) {
 const a=task(choice), r=refinements && typeof refinements==='object'?refinements:{};
 const composition=['one','couple','family','other'].includes(r.composition)?r.composition:'';
 // An old answer about one person cannot become a fact about their children.
 const personScoped = composition!=='family' || a.familyNeed==='young-parent';
 return {...a,region:Object.hasOwn(regionLabels,r.region)?r.region:'unsure',
  age:personScoped?exactAge(r.age):null,composition,
  gender:personScoped&&composition!=='couple'&&['woman','man','other'].includes(r.gender)?r.gender:'',
  firstNations:['yes','no'].includes(r.firstNations)?r.firstNations:'',
  community:typeof r.community==='string'?r.community:'',
  contactMode:r.contactMode==='no-phone' || r.noPhone===true?'no-phone':'standard'};
}
function candidateRows(choice) {
 const a=task(choice), issue=issueFor[a.need], key=detailFor[a.need];
 let candidates=rows.filter(row=>row.issue_number===issue&&row.catalogue_id!=='emergency-000');
 if(taskRows[key]?.[a[key]])candidates=candidates.filter(row=>taskRows[key][a[key]].includes(row.row_order));
 if(a.need==='identity-digital'&&a.digitalNeed==='id')candidates.push(...rows.filter(row=>row.issue_number===5&&[1,5].includes(row.row_order)));
 if(a.need==='access-culture-disability'&&a.accessNeed==='language'&&a.languageNeed){
  const order={aboriginal:1,'other-language':2,relay:3}[a.languageNeed];
  if(order)candidates=candidates.filter(row=>row.row_order===order);
 }
 if(a.need==='access-culture-disability'&&a.accessNeed==='transport'&&a.transportNeed){
  const orders={bus:[6],community:[10],patrol:[5,9,11,12,13,14,15]}[a.transportNeed];
  if(orders)candidates=candidates.filter(row=>orders.includes(row.row_order));
 }
 if(a.need==='safe-tonight')candidates.push(...rows.filter(row=>row.issue_number===6&&youthHousing.has(row.catalogue_id)));
 return unique(candidates);
}
const field=(id,label,type,entries=[],hint='')=>({id,label,type,options:entries.map(([value,label])=>({value,label})),hint});
export function discoveryFields(choice, refinements={}) {
 const a=facts(choice,refinements), candidates=candidateRows(choice), fields=[];
 const hasLocal=candidates.some(row=>row.geography.rank>0);
 const regionalOffice=['longer-term-housing','keep-tenancy','identity-digital'].includes(a.need)||a.moneyNeed==='bond'||a.medicalNeed==='travel';
 if(hasLocal||regionalOffice)fields.push(field('region','Where is support needed?','radio',Object.entries(regionLabels),'Optional. Choose a place to see local contacts.'));
 const accommodation=a.need==='safe-tonight'||a.safetyNeed==='refuge';
 if(accommodation)fields.push(field('composition','Who needs a place to stay?','radio',[
  ['','Not sure / prefer not to say'],['one','One person'],['couple','A couple without children'],
  ['family','A family or household including children'],['other','Another arrangement']
 ],'Optional. This helps find support for everyone needing accommodation.'));
 const ageUseful=a.need==='safe-tonight'||a.housingGoal==='social'||a.need==='health-wellbeing'||['housing','young-parent'].includes(a.familyNeed)||a.essentialNeed==='youth'||a.moneyNeed==='bond'||['private','mental'].includes(a.housingGoal)||['aged','disability','rights'].includes(a.careNeed)||['care','temporary','custody'].includes(a.transitionNeed)||a.aodNeed==='residential'||a.safetyNeed==='refuge';
 if(ageUseful&&(a.composition!=='family'||a.familyNeed==='young-parent')){
  const label=a.familyNeed==='young-parent'?'Age of the young parent (optional)':a.composition==='couple'?'Age of the younger person in the couple (optional)':'Age of the person needing support (optional)';
  fields.push({...field('age',label,'number',[],'Use whole years. Leave blank if you are not sure or prefer not to say.'),min:0,max:120,step:1});
 }
 const genderUseful=(a.need==='safe-tonight'&&(a.age===null||a.age>=18))||a.safetyNeed==='refuge'||a.transitionNeed==='temporary'||a.legalNeed==='women';
 if(genderUseful&&!['family','couple'].includes(a.composition))fields.push(field('gender','Gender of the person needing support (optional)','radio',[
  ['','Not sure / prefer not to say'],['woman','Woman'],['man','Man'],['other','Another gender']
 ],'This can help narrow services with published gender criteria.'));
 if(a.safetyNeed==='refuge'&&a.region!=='unsure'){
  const communities=Object.entries(safeHouseCommunities).filter(([,entry])=>entry[1]===a.region);
  if(communities.length)fields.push(field('community','Community needing a safe place (optional)','radio',[
   ['','Another place / not sure'],...communities.map(([order,[id]])=>[id,rows.find(row=>row.issue_number===4&&row.row_order===Number(order)).display.location.replace(/\n/g,' ')])
  ],'Named safe houses have local entry rules. Call before travelling.'));
 }
 const contacts=candidates.map(row=>qualify(row,a)).filter(Boolean).map(entry=>serviceView(entry.row,{region:a.region}).contactOptions);
 const nonPhone=contacts.some(options=>options.some(option=>['email','form','chat','text'].includes(option.channel)));
 if(nonPhone&&contacts.some(options=>options.some(option=>option.channel==='phone')))fields.push(field('contactMode','How can you make contact? (optional)','radio',[
  ['standard','Show all contact methods'],['no-phone','I cannot use a phone']
 ],'Email and forms may take time. A website alone does not confirm online intake.'));
 return fields;
}
function qualify(row,a) {
 const id=row.catalogue_id, notes=[];
 let conditional=false, deferred=false, accommodationFit=false;
 const condition=text=>{notes.push(text);conditional=true;};
 const remoteLaundry=id==='orange-sky-top-end'&&a.essentialNeed==='washing'&&['katherine','arnhem','topend'].includes(a.region);
 if(!row.region_ids.includes(a.region)&&!remoteLaundry)return null;
 if(remoteLaundry)condition('Enquiry for the listed remote laundry communities only; confirm your local shift and whether showers are offered.');
 if(id==='nt-remote-violence-safe-houses'){
  const [community]=safeHouseCommunities[row.row_order];
  if(a.community&&a.community!==community)return null;
  if(!a.community){condition('This safe house serves '+row.display.location.replace(/\n/g,' ')+'. Local household and entry rules must be confirmed before travel.');deferred=true;}
 }
 if(restrictedCatchments.has(id))condition('For the named communities or service catchment only; ask the service to confirm your community, referral and current local delivery.');
 if(firstNationsOnly.has(id)){
  if(a.firstNations==='no')return null;
  if(a.firstNations!=='yes')condition('Published Aboriginal or Torres Strait Islander criteria apply; identity eligibility is not established by these choices.');
 }
 if(womenOnly.has(id)){
  const childPath=a.age!==null&&a.age<18&&/children/.test(row.display.who);
  if((a.gender==='man'||a.gender==='other')&&!childPath)return null;
  if(childPath)condition('Children’s access and safe adult or referral arrangements must be assessed; this does not establish independent admission.');
  if(!a.gender)condition('Published women’s or women-and-children criteria apply; gender and household fit must be confirmed.');
 }else if(womenDiverse.has(id)){
  const childPath=a.age!==null&&a.age<18&&/children/.test(row.display.who);
  if(a.gender==='man'&&!childPath)return null;
  if(childPath)condition('Children’s access and safe adult or referral arrangements must be assessed; this does not establish independent admission.');
  if(!a.gender)condition('Published women’s and gender-diverse eligibility applies; ask the service to check the relevant programme.');
 }
 if(id==='ruby-gaea-counselling'){
  if(a.age!==null&&a.age<5)return null;
  if(a.age!==null&&a.age>=18&&a.gender==='man')return null;
  if(a.age===null||a.age>=18&&!a.gender)condition('Children aged 5–17 of all genders; adults must meet the published women’s or gender-diverse criteria. Confirm the relevant counselling programme.');
 }
 if(id==='tangentyere-dfv-specialist'){
  if(a.safetyNeed==='behaviour'&&a.gender&&a.gender!=='man')return null;
  condition('The behaviour programme is for men using violence; the separate Aboriginal young-people programme supports those affected by violence. Ask for the relevant team.');
 }
 if(['salvos-towards-independence-top-end','salvos-towards-independence-alice'].includes(id)){
  if(a.composition&&a.composition!=='family'&&a.composition!=='other')return null;
  condition('Family programme; staff must assess the household, catchment, referral and accommodation availability.');
 }
 if(id==='chca-apmere-urlte'&&a.composition==='one'&&a.gender==='man')return null;
 if(id==='yilli-homes-together')condition('Targets Aboriginal adults/families and young people 16+; other local tenants may qualify. Ask about the relevant tenancy-support pathway.');
 if(id==='salvos-todd-street-men'){
  if(a.gender==='woman'||a.gender==='other')return null;
  if(!a.gender)condition('Men aged 18+ programme; gender eligibility is not established.');
  if(['couple','family','other'].includes(a.composition)){condition('Accommodation for a whole couple or household is not established by the published men’s programme; ask about support and a suitable pathway.');deferred=true;}
 }
 if(singleAccommodation.has(id)){
  if(a.composition&&a.composition!=='one')return null;
  if(!a.composition)condition('Accommodation is for single adults; the number of people needing accommodation is not established.');
 }
 if(id==='salvos-house-49'){
  if(a.composition==='family')return null;
  if(!a.composition||a.composition==='other')condition('Accommodation is for single people or couples aged 25+ without children; household eligibility needs confirmation.');
 }
 if(id==='dawn-house'&&a.composition&&a.composition!=='family'){
  // The published record expressly offers other households a suitable pathway.
  condition('Accommodation is published for women with children. Ask for the suitable pathway offered to other households.');
  deferred=true;
 }
 let range=ageRanges[id];
 if(id==='bushmob-youth-aod'&&a.aodNeed==='residential')range=[12,17];
 if(id==='dasa-aranda-outreach'){
  if(a.age!==null&&a.age<18){condition('Residential admission requires adults 18+. This is an enquiry about separately assessed outreach, not adult residential accommodation.');deferred=a.aodNeed==='residential';}
  else if(a.age===null)condition('Residential admission requires adults 18+; outreach is assessed separately.');
 }
 if(id==='my-aged-care')range=[50,null];
 if(['dcls-seniors-rights','anglicare-commonwealth-home-support'].includes(id))range=[50,null];
 if(id==='anglicare-care-finder')range=[51,null];
 if(id==='nt-social-housing')range=[15,null];
 if(range){
  if(a.age!==null&&((range[0]!==null&&a.age<range[0])||(range[1]!==null&&a.age>range[1])))return null;
  if(a.age===null)condition('Published age limits apply; age eligibility has not been established. Ask the service to check before referral or admission.');
 }
 if(['my-aged-care','dcls-seniors-rights','anglicare-commonwealth-home-support'].includes(id)&&a.age!==null&&a.age<65){
  if(id!=='my-aged-care'&&a.firstNations==='no')return null;
  condition(id==='my-aged-care'?'Below 65, the published 50+ Aboriginal/Torres Strait Islander or homelessness/at-risk pathway requires care needs and assessment.':'Below 65, Aboriginal or Torres Strait Islander eligibility and the published aged-care requirements apply.');
 }
 if(id==='anglicare-care-finder'&&a.age!==null&&a.age<=65){
  if(a.firstNations==='no')return null;
  condition('The general age rule is over 65; the over-50 pathway requires Aboriginal or Torres Strait Islander eligibility, aged-care eligibility and no suitable trusted support.');
 }
 if(id==='nt-social-housing'){
  if(a.age!==null&&a.age===15)condition('Applications can begin at 15; a tenancy requires age 16. Other eligibility and assessment rules still apply.');
  else condition('Application and tenancy have separate age, residency, income and assessment rules; no allocation is established.');
 }
 if(id==='anglicare-yass')condition('Published age limits conflict: 15–19 / 15–21. Confirm the current intake rule; this is not an established age fit.');
 if(id==='anglicare-youth-emergency-relief'&&a.age===25)condition('The published age wording conflicts at age 25; confirm the current intake limit.');
 if(id==='teamhealth-community-housing')condition('Adult mental-health and supported-independent-living criteria apply; the upper age limit requires confirmation.');
 if(id==='anglicare-moving-on'){
  if(a.age!==null&&a.age<18)condition('Moving On aftercare is for care leavers 16–25. Housing for Young People requires 18–25; rental-programme eligibility is not established.');
  else condition('Moving On aftercare and Housing for Young People have different eligibility; private-rental support is for Greater Darwin and needs assessment.');
 }
 if(id==='asyass-crisis-refuge'&&a.age!==null&&a.age<15)condition('Unaccompanied under-15s require a prior Departmental exception; referral and entry approval must be confirmed.');
 if(id==='asyass-ampe-akweke')condition('For young women 14–23 who are pregnant or caring for a baby under two and unable to stay with family; approved referral and any under-15 exception are required.');
 if(id==='dasa-sobering-up'&&a.age!==null&&a.age<=18)condition('The published ages 14–18 pathway is only through ASYASS; confirm the entry route, including at age 18.');
 if(['vinnies-darwin-housing','vinnies-katherine-housing'].includes(id)){
  if(a.age!==null&&a.age<18)return null;
  const darwin=id==='vinnies-darwin-housing';
  const units=darwin?'Ted Collins units':'Bernard Complex units';
  const hostel=darwin?'Bakhita/Park Lodge hostels':'Ormonde House hostel';
  const hostelFits=a.composition==='one'&&a.age!==null&&a.age>18&&(darwin||a.gender==='man');
  const unitsFits=a.age!==null&&a.age>=18&&['one','couple'].includes(a.composition);
  if(hostelFits)notes.push(hostel+': single '+(darwin?'adults':'men')+' over 18. Units have a separate adult/couple/family intake.');
  else if(unitsFits)notes.push('Ask about '+units+'; hostels require single '+(darwin?'adults':'men')+' over 18. Units allow up to two people per room.');
  else condition('Ask about '+units+' for adults, couples or families; adult applicant and household fit need assessment. '+hostel+(darwin?' require single ':' requires single ')+(darwin?'adults':'men')+' over 18. Units allow up to two people per room.');
  accommodationFit=hostelFits||unitsFits;
 }
 if(id==='anglicare-katherine-family-accommodation')condition('Public-housing waiting-list eligibility is required for accommodation; family outreach and referral support are separately assessed.');
 if(assessedNotes[id])condition(assessedNotes[id]);
 if(a.need==='safe-tonight'&&youthHousing.has(id)){
  if(a.composition&&a.composition!=='one'){condition('This is a youth programme; accommodation for every member of a couple or household needs separate confirmation.');deferred=true;}
  if(!youthCrisis.has(id))notes.push('Supported housing or outreach enquiry; this record does not establish same-night accommodation.');
 }
 if(adultAccommodation.has(id)&&!conditional)accommodationFit=true;
 if(youthCrisis.has(id)&&!conditional)accommodationFit=true;
 if(a.composition==='couple'&&range?.[1]!==null&&range?.[1]!==undefined)condition('The supplied age is the younger person’s age; the service must check both people’s ages and household eligibility.');
 return {row,qualification:notes.join(' '),conditional,deferred,accommodationFit};
}
function score(entry,a) {
 const {row,conditional,deferred,accommodationFit}=entry,id=row.catalogue_id;
 if(deferred)return 90;
 if(a.need==='safe-tonight'){
  if(id==='nt-central-intake')return 80;
  if(id==='ask-izzy')return a.region==='unsure'?0:70;
  if(accommodationFit)return youthCrisis.has(id)?0:5;
  if(!adultAccommodation.has(id)&&!youthHousing.has(id))return 10;
  return 30;
 }
 if(a.safetyNeed==='refuge'){
  if(id==='1800respect')return 0;
  if(id==='nt-remote-violence-safe-houses'&&a.community)return 2;
 }
 if(a.need==='food-essentials'&&['vinnies-ozanam-house','salvos-katherine-doorways-hub','salvos-waterhole'].includes(id))return 0;
 if(id==='ask-izzy')return 75;
 if(conditional)return 40;
 return row.geography.rank===0?20:10;
}
function resultNote(a,entries) {
 if(a.need==='safe-tonight'){
  const confirmed=entries.some(entry=>entry.accommodationFit);
  const gap={tennant:'Barkly',arnhem:'East Arnhem'}[a.region];
  const scope=a.region==='unsure'?'Search by place to find local services.':gap?'General crisis and youth beds in '+gap+' are not confirmed here; specialist services have separate entry rules.':confirmed?'Call to discuss accommodation assessment, vacancies, costs and household fit.':'Ask the listed services about current support and suitable accommodation; a matching place is not established.';
  return scope+(a.contactMode==='no-phone'?' No immediate non-phone intake is confirmed here.':'');
 }
 if(a.accessNeed==='veteran')return 'For veterans and families facing housing difficulties, the agency can help navigate housing services. It is not a crisis service or accommodation provider.';
 return release.issues.find(issue=>issue.issue_number===issueFor[a.need])?.note||'';
}
export function discover(choice, refinements={}) {
 const a=facts(choice,refinements);
 let candidates=candidateRows(choice);
 if(a.need==='safe-tonight'&&a.region==='unsure')candidates.push(finder);
 let entries=unique(candidates).map(row=>qualify(row,a)).filter(Boolean);
 if(!entries.length)entries=[{row:finder,qualification:'Online service search; it does not arrange intake or confirm availability. Contact a provider to check its eligibility and catchment.',conditional:true,deferred:false,accommodationFit:false}];
 entries.sort((x,y)=>score(x,a)-score(y,a)||x.row.geography.rank-y.row.geography.rank||x.row.row_order-y.row.row_order);
 const views=entries.map(entry=>{
  const view=serviceView(entry.row,{contactMode:a.contactMode,qualification:entry.qualification,region:a.region});
  view.fitNote='';
  if(entry.row.catalogue_id==='ask-izzy'){
   view.contactOptions=[{channel:'search',href:entry.row.display.url,label:'Search local services'}];
   view.contactNotice='Online service search; it does not arrange intake or confirm availability. Contact a listed provider to check its entry rules and catchment.';
  }
  if(entry.row.catalogue_id==='nt-central-intake'&&a.need==='safe-tonight')view.fitNote='Online enquiry is not support for tonight.';
  if(entry.row.catalogue_id==='lhere-artepe-outreach-patrol'){
   view.contactOptions=view.contactOptions.map(option=>option.href==='tel:1800953090'?{...option,label:'Call Foot Patrol 1800 953 090'}:option.href==='tel:0889537240'?{...option,label:'Call outreach / office 08 8953 7240'}:option);
   if(a.need==='safe-tonight')view.fitNote='Foot Patrol offers safety support and safer-place links; it does not provide or guarantee a bed or emergency response.';
  }
  if(entry.row.catalogue_id==='vinnies-nt-emergency-relief'&&a.region==='alice')view.fitNote='For Alice Springs, confirm sessions and venue. Malak/Palmerston hours are for Darwin/Palmerston.';
  return view;
 });
 const allIds=views.map(view=>view.id);
 const ids=entries.filter(entry=>!entry.deferred).slice(0,3).map(entry=>entry.row.appearance_id);
 const primaryIds=ids.length?ids:[allIds[0]];
 return {ids:primaryIds,moreIds:allIds.filter(id=>!primaryIds.includes(id)),allIds,
  servicesById:Object.fromEntries(views.map(view=>[view.id,view])),note:resultNote(a,entries),
  noteBefore:a.need==='violence-safety',
  say:a.accessNeed==='veteran'?'I am a veteran or family member facing housing difficulties. Can you help me find a suitable housing service?':'I need help with '+String(choice?.title||'this situation').toLowerCase()+'. Can you check the service’s eligibility, next contact, costs and what I need to bring?'};
}
