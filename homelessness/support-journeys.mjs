const choice=(title,topicId,need,answers={})=>({title,topicId,need,answers});
export const journeys=[
 {id:'tonight',title:'A place to stay tonight',hint:'I have nowhere safe to stay',primary:true,choices:[choice('A place to stay tonight','housing','safe-tonight')]},
 {id:'violence',title:'Safety from violence',hint:'Safety, refuge or support after an assault',primary:true,choices:[
  choice('Safety advice and support','safety','violence-safety',{safetyNeed:'support'}),
  choice('A safe place because of violence','safety','violence-safety',{safetyNeed:'refuge'}),
  choice('Support after sexual assault','safety','violence-safety',{safetyNeed:'assault'}),
  choice('Older-person abuse','safety','violence-safety',{safetyNeed:'older'}),
  choice('Temporary help with pets','safety','violence-safety',{safetyNeed:'pets'}),
  choice('Help for someone using violence','safety','violence-safety',{safetyNeed:'behaviour'})]},
 {id:'food-washing',title:'Food, showers & essentials',hint:'Something to eat, wash or manage today',primary:true,choices:[
  choice('Food or everyday essentials','essentials','food-essentials',{essentialNeed:'food'}),
  choice('Showers or laundry','essentials','food-essentials',{essentialNeed:'washing'}),
  choice('Emergency relief for a young person','essentials','food-essentials',{essentialNeed:'youth'})]},
 {id:'keep-home',title:'Keep my home',hint:'Rent, eviction, repairs or an unsafe home',primary:true,choices:[
  choice('Rent, eviction or a tenancy dispute','housing','keep-tenancy',{tenancyNeed:'advice'}),
  choice('Public or remote housing repairs','housing','keep-tenancy',{tenancyNeed:'repairs'}),
  choice('Practical help to keep a tenancy','housing','keep-tenancy',{tenancyNeed:'support'})]},
 {id:'stable-home',title:'A more stable home',hint:'Overcrowding, couch surfing or finding housing',primary:true,choices:[
  choice('Apply for public housing','housing','longer-term-housing',{housingGoal:'social'}),
  choice('Supported housing for a family','housing','longer-term-housing',{housingGoal:'family'}),
  choice('Help moving into private rental','housing','longer-term-housing',{housingGoal:'private'}),
  choice('Housing with mental-health support','housing','longer-term-housing',{housingGoal:'mental'}),
  choice('I am not sure which housing help fits','housing','longer-term-housing',{housingGoal:'unsure'})]},
 {id:'money-bills',title:'Money, bills & income',hint:'Payments, debt, electricity or rental costs',primary:true,choices:[
  choice('Payments or Centrelink social work','money','money-benefits',{moneyNeed:'payments'}),
  choice('Debt or financial counselling','money','money-benefits',{moneyNeed:'debt'}),
  choice('Electricity bills or prepaid credit','money','money-benefits',{moneyNeed:'electricity'}),
  choice('Private-rental bond or advance rent','money','money-benefits',{moneyNeed:'bond'}),
  choice('NT concessions','money','money-benefits',{moneyNeed:'concessions'})]},
 {id:'mental-health',title:'Mental health & someone to talk to',hint:'Stress, distress or ongoing support',primary:true,choices:[choice('Mental-health support','health','health-wellbeing')]},
 {id:'medical',title:'Medical care & travel',hint:'Health advice, a clinic or specialist treatment',primary:true,choices:[
  choice('Health advice for anyone','health','health-medical-travel',{medicalNeed:'advice'}),
  choice('An Aboriginal community health clinic','health','health-medical-travel',{medicalNeed:'clinic'}),
  choice('Travel for specialist treatment','health','health-medical-travel',{medicalNeed:'travel'}),
  choice('Support for an Aboriginal renal patient','health','health-medical-travel',{medicalNeed:'renal'})]},
 {id:'id-online',title:'ID, phone & online access',hint:'Documents, internet, charging or help applying',primary:true,choices:[
  choice('A birth certificate','essentials','identity-digital',{digitalNeed:'birth'}),
  choice('Help getting ID or documents','essentials','identity-digital',{digitalNeed:'id'}),
  choice('Computers, internet or help applying','essentials','identity-digital',{digitalNeed:'online'})]},
 {id:'young-person-housing',title:'Housing for a young person',hint:'Leaving home, youth accommodation or a young parent',primary:false,choices:[
  choice('Youth housing or risk of leaving home','family','children-youth-family',{familyNeed:'housing'}),
  choice('A young pregnant woman or young mum','family','children-youth-family',{familyNeed:'young-parent'})]},
 {id:'family-school',title:'Family support & school',hint:'Parenting, attendance or a child’s safety',primary:false,choices:[
  choice('Family or parenting support','family','children-youth-family',{familyNeed:'family'}),
  choice('School enrolment or attendance','family','children-youth-family',{familyNeed:'school'}),
  choice('Concern about harm to a child','family','children-youth-family',{familyNeed:'safety'})]},
 {id:'return-home',title:'Visit town or return home',hint:'Returning to Country or staying away from home',primary:false,choices:[
  choice('Returning home or to Country','housing','return-home',{returnNeed:'travel'}),
  choice('A First Nations hostel while away from home','housing','return-home',{returnNeed:'stay'})]},
 {id:'alcohol-drugs',title:'Alcohol & drug support',hint:'Advice, treatment or safer support',primary:false,choices:[
  choice('Advice, counselling or treatment entry','health','alcohol-drugs',{aodNeed:'advice'}),
  choice('Residential treatment or rehabilitation','health','alcohol-drugs',{aodNeed:'residential'}),
  choice('Withdrawal assessment','health','alcohol-drugs',{aodNeed:'withdrawal'}),
  choice('Supported sobering care','health','alcohol-drugs',{aodNeed:'sobering'}),
  choice('Harm reduction or blood-borne-virus support','health','alcohol-drugs',{aodNeed:'harm'})]},
 {id:'disability',title:'Disability support',hint:'Access, advocacy or daily support',primary:false,choices:[choice('Disability support','access','disability-ageing',{careNeed:'disability'})]},
 {id:'aged-care',title:'Help as I get older',hint:'Daily living, aged care or rights',primary:false,choices:[
  choice('Find aged care or daily living help','access','disability-ageing',{careNeed:'aged'}),
  choice('Aged-care rights or advocacy','access','disability-ageing',{careNeed:'rights'})]},
 {id:'carer',title:'I care for someone',hint:'Practical and emotional support for an unpaid carer',primary:false,choices:[choice('Support for an unpaid carer','access','disability-ageing',{careNeed:'carer'})]},
 {id:'leaving-service',title:'Plan where to go after leaving a service',hint:'Hospital, care, custody, treatment or temporary housing',primary:false,choices:[
  choice('Leaving hospital','access','legal-transition',{transitionNeed:'hospital'}),
  choice('Leaving prison or custody','access','legal-transition',{transitionNeed:'custody'}),
  choice('Leaving out-of-home care','access','legal-transition',{transitionNeed:'care'}),
  choice('Leaving temporary or supported housing','access','legal-transition',{transitionNeed:'temporary'}),
  choice('Leaving alcohol or drug treatment','access','legal-transition',{transitionNeed:'treatment'})]},
 {id:'legal',title:'Legal advice',hint:'Rights, violence or a legal problem',primary:false,choices:[
  choice('General legal advice','access','legal-help',{legalNeed:'general'}),
  choice('Family or sexual-violence legal help','access','legal-help',{legalNeed:'violence'}),
  choice('A women’s or gender-specific legal service','access','legal-help',{legalNeed:'women'}),
  choice('An LGBTQIASB+ identity-related legal issue','access','legal-help',{legalNeed:'identity'})]},
 {id:'complaint',title:'Make a complaint',hint:'Housing, discrimination or a government service',primary:false,choices:[
  choice('NT Housing complaint or appeal','access','legal-help',{legalNeed:'housing'}),
  choice('Discrimination','access','legal-help',{legalNeed:'discrimination'}),
  choice('Children and Families complaint','access','legal-help',{legalNeed:'children'}),
  choice('Government or police complaint','access','legal-help',{legalNeed:'government'})]},
 {id:'communication',title:'An interpreter or communication help',hint:'Language, hearing or speech access',primary:false,choices:[
  choice('An Aboriginal-language interpreter','access','access-culture-disability',{accessNeed:'language',languageNeed:'aboriginal'}),
  choice('An interpreter for another language','access','access-culture-disability',{accessNeed:'language',languageNeed:'other-language'}),
  choice('Relay for hearing or speech difficulty','access','access-culture-disability',{accessNeed:'language',languageNeed:'relay'})]},
 {id:'transport',title:'Local transport or a safety patrol',hint:'Public buses, community travel or safer local support',primary:false,choices:[
  choice('Public buses','access','access-culture-disability',{accessNeed:'transport',transportNeed:'bus'}),
  choice('Community transport','access','access-culture-disability',{accessNeed:'transport',transportNeed:'community'}),
  choice('A local safety patrol','access','access-culture-disability',{accessNeed:'transport',transportNeed:'patrol'})]},
 {id:'settlement',title:'Refugee or migrant settlement help',hint:'Practical support after arriving',primary:false,choices:[choice('Settlement help','access','access-culture-disability',{accessNeed:'settlement'})]},
 {id:'veteran-family',title:'Veteran & Defence-family support',hint:'Help coordinating services',primary:false,choices:[choice('Veteran or Defence-family support','access','access-culture-disability',{accessNeed:'veteran'})]}
];
