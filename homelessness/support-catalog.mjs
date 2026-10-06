import release from './release-data.mjs?v=20261006-housing-scope';

export const sourceCatalog=release;
export const regionLabels={unsure:'NT-wide contacts / not sure',darwin:'Darwin / Palmerston',katherine:'Katherine / Big Rivers',tennant:'Tennant Creek / Barkly',alice:'Alice Springs',arnhem:'East Arnhem / Nhulunbuy',topend:'Other Top End / remote communities',central:'Other Central Australia / remote communities',npy:'NPY Lands / border communities'};
const localByRank={0:['unsure'],1:['darwin'],2:['katherine'],3:['tennant'],4:['alice']};
// Deliberate catchment mappings, from the final display locations. Geography
// ranks retain the handoff order; they are never used as a coverage claim.
const catchments={
 'anglicare-intensive-housing-support':['darwin','katherine','alice'],
 'catholiccare-tenancy-barkly':['darwin','katherine','tennant'],
 'anglicare-east-arnhem-hopp':['arnhem'],'laynhapuy-homeland-housing':['arnhem'],
 'npy-dfv':['npy','central'],'npy-child-family-youth':['npy','central'],'npy-tjungu':['npy','central'],
 'tangentyere-identity-banking-return-country':['alice','central'],
 'waltja-youth-family':['central'],'catholiccare-santa-teresa-school':['central'],
 'anglicare-yhopp':['darwin','katherine','alice','arnhem'],'anglicare-reconnect':['darwin','arnhem'],
 'catholiccare-assertive-outreach':['katherine','tennant'],
 'anglicare-yass':['darwin','katherine'],
 'anglicare-youth-emergency-relief':['darwin','katherine','arnhem'],
 'catholiccare-emergency-relief':['darwin','katherine','tennant'],
 'vinnies-nt-emergency-relief':['darwin','alice'],
 'anglicare-financial-counselling':['darwin','katherine'],
 'waltja-emergency-money':['central'],'anglicare-east-arnhem-money-hub':['arnhem'],
 'katherine-west-health':['katherine'],'sunrise-health-clinics':['katherine'],
 'urapuntja-health':['tennant','central'],'ampilatwatja-health':['tennant'],
 'congress-primary-health':['alice','central'],'purple-house-practical':['alice','central'],
 'miwatj-primary-health':['arnhem'],'laynhapuy-health':['arnhem'],
 'pintupi-health':['central'],'red-lily-clinics':['topend'],'malala-health-community':['arnhem'],
 'headspace-nt-youth':['darwin','katherine','alice'],'mifant-mitrack':['tennant','alice'],
 'sandstone-counselling':['alice','central'],'ntahc-harm-reduction-support':['darwin','alice'],
 'east-arnhem-sobering-up':['arnhem'],
 'anglicare-care-finder':['darwin','katherine','alice','arnhem'],
 'dcls-seniors-rights':['darwin','katherine','arnhem','topend'],
 'anglicare-commonwealth-home-support':['darwin','alice','arnhem'],
 'barkly-council-aged':['tennant'],'catholiccare-central-aged-advocacy':['tennant','alice','central'],
 'das-central-barkly':['alice','tennant'],'laynhapuy-aged-disability':['arnhem'],
 'waltja-remote-connectors':['central'],'central-desert-aged':['central'],
 'macdonnell-aged':['central'],'east-arnhem-aged-disability':['arnhem'],
 'anglicare-outcare':['darwin','alice'],'naaja-adult-throughcare':['darwin','alice'],
 'naafls-family-legal':['darwin','katherine','arnhem','topend'],'tewls-legal':['darwin','topend'],
 'cawls-central-barkly':['tennant','alice','central'],'caaflu-family-legal':['tennant','alice','central'],
 'nt-free-public-buses':['darwin','alice'],'barkly-council-night-patrol':['tennant'],
 'east-arnhem-community-patrol':['arnhem'],'macdonnell-community-safety':['central']
};
export const safeHouseCommunities={
 14:['ali-curung','tennant'],15:['elliott','tennant'],18:['nhulunbuy','arnhem'],
 19:['galiwinku','arnhem'],20:['angurugu','arnhem'],21:['ramingining','arnhem'],
 22:['wurrumiyanga','topend'],23:['milikapiti','topend'],24:['borroloola','katherine'],
 25:['ngukurr','katherine'],26:['gunbalanya','topend'],27:['wadeye','topend'],
 28:['ntaria','central'],29:['ti-tree','central'],30:['yuendumu','central'],
 32:['beswick','katherine'],33:['lajamanu','katherine'],34:['nauiyu','topend'],
 35:['kalkarindji','katherine'],36:['maningrida','arnhem'],37:['yarralin','katherine']
};
export function regionsFor(row){
 if(row.catalogue_id==='nt-remote-violence-safe-houses')return [safeHouseCommunities[row.row_order][1]];
 if(row.catalogue_id==='ahl-nt-multipurpose')return row.geography.rank===5?['arnhem']:localByRank[row.geography.rank];
 if(row.geography.rank===0)return Object.keys(regionLabels);
 return catchments[row.catalogue_id]||localByRank[row.geography.rank]||[];
}
export const rows=release.issues.flatMap(issue=>issue.rows.map(row=>({...row,issue_id:issue.issue_id,issue_number:issue.issue_number,issue_note:issue.note||'',region_ids:regionsFor(row)})));
export const rowsById=Object.fromEntries(rows.map(row=>[row.appearance_id,row]));
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:','tel:','mailto:','sms:'].includes(u.protocol)?value:'';}catch{return '';}}
// Numbers are selected from this appearance's published contact text, never
// borrowed from a sibling programme or a provider's generic contact page.
const regionalPhones={
 'nt-social-housing':{'0889998814':['darwin'],'0889738513':['katherine'],'0889624497':['tennant'],'0889515344':['alice','central'],'0889870533':['arnhem'],'0889955122':['topend']},
 'anglicare-intensive-housing-support':{'0889464800':['darwin'],'0889636100':['katherine'],'0889518000':['alice']},
 'catholiccare-tenancy-barkly':{'0889442000':['darwin'],'0889710777':['katherine'],'0889623065':['tennant']},
 'nt-sexual-assault-referral-centres':{'0889226472':['darwin'],'0889738524':['katherine'],'0889624361':['tennant'],'0889554500':['alice','central']},
 'anglicare-yass':{'0889464800':['darwin'],'0889317100':['darwin'],'0889636100':['katherine']},
 'anglicare-yhopp':{'0889464800':['darwin'],'0889317100':['darwin'],'0889636100':['katherine'],'0889518000':['alice'],'0889393400':['arnhem']},
 'anglicare-reconnect':{'0889464800':['darwin'],'0889317100':['darwin'],'0889393400':['arnhem']},
 'catholiccare-assertive-outreach':{'0889710777':['katherine'],'0889623065':['tennant']},
 'catholiccare-emergency-relief':{'0889442000':['darwin'],'0889329977':['darwin'],'0889710777':['katherine'],'0889623065':['tennant']},
 'anglicare-youth-emergency-relief':{'0889464800':['darwin'],'0889317100':['darwin'],'0889636100':['katherine'],'0889393400':['arnhem']},
 'anglicare-financial-counselling':{'0889850000':['darwin'],'0889317100':['darwin'],'0889636100':['katherine']},
 'nt-pats':{'0889228135':['darwin'],'0889739215':['katherine'],'0889624647':['tennant'],'0889517846':['alice','central'],'0889870201':['arnhem']},
 'headspace-nt-youth':{'0889315999':['darwin'],'0889315900':['darwin'],'0889124000':['katherine'],'0889584544':['alice']},
 'ntahc-harm-reduction-support':{'0889447777':['darwin'],'0889313676':['darwin'],'0889533172':['alice']},
 'nt-alcohol-drug-treatment-entry':{'0889228399':['darwin','topend'],'0889738403':['katherine'],'0889517580':['alice','central']},
 'anglicare-commonwealth-home-support':{'0889850000':['darwin'],'0889518000':['alice'],'0889393400':['arnhem']},
 'catholiccare-central-aged-advocacy':{'0889623065':['tennant'],'0889582400':['alice','central']},
 'nt-hospital-social-work':{'0889228888':['darwin'],'0889739211':['katherine'],'0889624399':['tennant'],'0889517777':['alice','central'],'0889870382':['arnhem']},
 'anglicare-outcare':{'0889850000':['darwin'],'0889594400':['alice']},
 'naaja-adult-throughcare':{'0889317400':['darwin'],'0879029311':['alice']},
 'naaja-legal':{'1800898251':['darwin','topend'],'1800897728':['katherine'],'0889621332':['tennant'],'1800636079':['alice','central']},
 'caaflu-family-legal':{'0889622100':['tennant'],'0889536355':['alice','central']}
};
export function contactOptionsFor(row,{noPhone=false,region=''}={}){
 const d=row.display,options=[];
 // Outage/fault notices remain beside the action. A displayed unavailable
 // number is preserved as text and never promoted to an active call button.
 if(!noPhone&&row.catalogue_id!=='nt-central-intake'){
  const seen=new Set();
  for(const line of d.contact.split('\n')){
   const matches=line.match(/\b(?:0[2378]\s?\d{4}\s?\d{4}|04\d{2}(?:\s?\d){6}|1800\s?\d{3}\s?\d{3}|1300\s?\d{3}\s?\d{3}|13\s?\d{2}\s?\d{2}|000)\b/g)||[];
   for(const phone of matches){
    const digits=phone.replace(/\D/g,''),scope=regionalPhones[row.catalogue_id]?.[digits];
    if(seen.has(digits)||(region&&scope&&!scope.includes(region)))continue;
    seen.add(digits);
    const text=/\btext\b|\bsms\b/i.test(line);
    options.push({channel:text?'text':'phone',href:(text?'sms:':'tel:')+digits,label:(text?'Text ':'Call ')+phone});
   }
  }
 }
 if(d.form&&safeUrl(d.form))options.push({channel:'form',href:d.form,label:'Open supplied enquiry form'});
 if(d.email)options.push({channel:'email',href:'mailto:'+d.email,label:d.email_label||'Email '+d.email});
 for(const [label,url]of d.extra_links||[])if(safeUrl(url))options.push({channel:/chat/i.test(label)?'chat':'web',href:url,label});
 if(d.url&&safeUrl(d.url))options.push({channel:'web',href:d.url,label:'Official service information'});
 return options;
}
export function serviceView(row,{contactMode='standard',qualification='',region=''}={}){
 const d=row.display;
 const sourceUrls=[...new Set([d.url,...d.urls||[],...d.extra_links?.map(x=>x[1])||[]].filter(safeUrl))];
 return {id:row.appearance_id,routeId:row.route_id,catalogueId:row.catalogue_id,name:d.name,area:d.location,
  offer:d.help||d.offers||'',audience:d.who,eligibility:d.who,access:d.access,cost:'',
  publishedContact:d.contact,contactOptions:contactOptionsFor(row,{noPhone:contactMode==='no-phone',region}),
  contactNotice:qualification,phone:'',url:d.url||'',sources:sourceUrls,checked:d.checked||release.information_checked_on,
  hours:'',needs:[row.issue_id],recordType:'Published enquiry route',raw:row,
  issueNote:row.issue_note,availabilityStatus:release.availability_status,
  regions:row.region_ids.map(region=>({region,label:regionLabels[region],service_available:true,local_delivery_confirmed:false,channels:[],access_notes:d.location})),regionalContacts:[],address:''};
}
export const services=Object.fromEntries(rows.map(row=>[row.appearance_id,serviceView(row)]));
export default release;
