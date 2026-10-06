// Authored actions refer to the preserved source records, not a client profile.
export const entrances = [
 ['tonight','A place to stay tonight','Accommodation enquiries and local outreach'],
 ['keep-home','Keep my home','Rent, eviction, repairs or tenancy support'],
 ['stable-home','Find a more stable home','Housing applications and supported housing'],
 ['food-washing','Food, showers and essentials','Practical help for today'],
 ['money-bills','Money, bills and income','Payments, debt and rental costs'],
 ['id-online','ID, phone and online access','Documents, charging and help applying'],
 ['violence','Safety from violence','Safety advice, refuges and support after assault']
];
export const places = [
 ['darwin','Darwin / Palmerston'],['katherine','Katherine / Big Rivers'],
 ['tennant','Tennant Creek / Barkly'],['alice','Alice Springs'],
 ['arnhem','East Arnhem / Nhulunbuy'],['topend','Other Top End communities'],
 ['central','Other Central Australia communities'],['npy','NPY Lands'],['unsure','Another place / not sure']
];
export const stayPages = {
 darwin:{title:'Stay tonight in Darwin / Palmerston',
  intro:'Call the accommodation service about intake before travelling. Tell them who needs to stay together.',
  sections:[
   {title:'Units for adults, couples and families',ids:['vinnies-darwin-housing'],programme:'units'},
   {title:'Bakhita / Park Lodge: single-adult hostels',ids:['vinnies-darwin-housing'],programme:'hostels'},
   {title:'Single adults',ids:['salvos-sunrise-homelessness']},
   {title:'Single people or couples aged 25+',ids:['salvos-house-49']},
   {title:'Crisis accommodation for women',ids:['catherine-booth-crisis'],note:'Catherine Booth House includes crisis homelessness; a violence concern is not assumed.'}
  ],youth:['ywca-casy-house'],outreach:['caaps-homelessness-outreach','larrakia-heal']},
 katherine:{title:'A place to stay in Katherine / Big Rivers',
  intro:'Call housing intake about the household that needs to stay. Hostel and unit entry rules differ.',
  sections:[
   {title:'Units for adults, couples and families',ids:['vinnies-katherine-housing'],programme:'units'},
   {title:'Ormonde House: single-men hostel',ids:['vinnies-katherine-housing'],programme:'hostels'},
   {title:'Single adults of any gender',ids:['mission-katherine-accommodation']}
  ],youth:['anglicare-yhopp','catholiccare-assertive-outreach'],outreach:['anglicare-katherine-family-accommodation','salvos-katherine-doorways-hub'],
  outreachNote:'Anglicare offers family crisis outreach. Its accommodation pathway separately requires a public-housing waitlist place.',
  related:[['stable-home','Longer-term housing and family accommodation']]},
 alice:{title:'A place to stay in Alice Springs',
  intro:'The listed general accommodation programme is for men. Youth crisis accommodation has separate entry rules; other households can ask outreach about a suitable local pathway.',
  sections:[{title:'Men aged 18+',ids:['salvos-todd-street-men']}],
  youth:['asyass-crisis-refuge','asyass-ampe-akweke'],outreach:['lhere-artepe-outreach-patrol'],
  related:[['stable-home','Housing pathways for families and women'],['visiting','First Nations hostels while away from home']]},
 tennant:{title:'A place to stay in Tennant Creek / Barkly',intro:'General crisis and youth beds in Barkly are not verified in these records. The contacts below provide local safety or support; they do not establish an overnight place.',sections:[],youth:['catholiccare-assertive-outreach'],outreach:['julalikari-night-patrol']},
 arnhem:{title:'A place to stay in East Arnhem / Nhulunbuy',intro:'General crisis and youth beds in East Arnhem are not verified in these records. Ask local outreach about housing options; the Nhulunbuy hostel has separate First Nations entry rules and advance payment.',sections:[],youth:['anglicare-yhopp','anglicare-reconnect'],outreach:['east-arnhem-community-patrol'],related:[['visiting','Nhulunbuy Hostel: book before travelling']]},
 topend:{title:'A place to stay in other Top End communities',intro:'A general overnight accommodation route for every community is not established here. Ask your local clinic or council about a safe local contact.',sections:[],youth:[],outreach:[],related:[['transport-communication','Find a community patrol or communication support']]},
 central:{title:'A place to stay in other Central Australia communities',intro:'A general overnight accommodation route for every community is not established here. Ask your local clinic or council about a safe local contact.',sections:[],youth:['npy-child-family-youth','waltja-youth-family'],outreach:['macdonnell-community-safety']},
 npy:{title:'A place to stay in the NPY Lands',intro:'These records do not establish general overnight accommodation in every NPY community. NPY family and youth workers can discuss local support and referrals.',sections:[],youth:['npy-child-family-youth'],outreach:[]},
 unsure:{title:'A place to stay: another place / not sure',intro:'Ask a local service about the place where you are now. Ask Izzy can help you or a worker look up nearby services; a listing does not confirm a bed.',sections:[{title:'Look up nearby support',ids:['ask-izzy']}],youth:[],outreach:[]}
};
export const primaryPages = {
 'keep-home':{title:'Keep my home',intro:'If you have an eviction notice or a hearing date, contact tenancy advice and tell them the deadline. You can ask for help even if you cannot find the lease or notice.',issue:3,sections:[
  {title:'Rent, eviction, bond or a tenancy dispute',orders:[1],open:true},
  {title:'Public or remote housing repairs',orders:[2,9]},
  {title:'Practical help to maintain a tenancy',orders:[3,4,5,6,7,8]}
 ],related:[{title:'I have nowhere safe to stay tonight',href:'#page/tonight'}]},
 'stable-home':{title:'Find a more stable home',intro:'Start with the housing pathway you need. Transitional housing, public housing and private rental have different application and referral rules.',issue:2,sections:[
  {title:'Apply for public housing',orders:[1],open:true,note:'Applications can take years. Priority assessment is a separate step; it does not promise an immediate home.'},
  {title:'Transitional housing and family support',orders:[2,3,6,7,8,9,10],note:'Some programmes need a public-housing waitlist place or an agency referral before accommodation can be considered.'},
  {title:'Private rental and rent-to-live support',orders:[5,11]},
  {title:'Housing with mental-health support',orders:[4]}
 ],related:[{title:'Youth housing and young parents',href:'#page/youth-housing'},{title:'Plan housing before leaving a service',href:'#page/leaving-service'},{title:'Housing-service navigation for veterans and families',href:'#service/homelessness%3Aissue%3A16%3Arow%3A004'}]},
 'food-washing':{title:'Food, showers and essentials',intro:'Check whether you can visit directly or need a voucher or registration first.',issue:7,sections:[
  {title:'Day centres, meals, showers and laundry',orders:[1,7,8,9],open:true},
  {title:'Food and emergency relief',orders:[2,3,4,5,6,10]}
 ],related:[{title:'ID, charging or help applying online',href:'#page/id-online'}]},
 'money-bills':{title:'Money, bills and income',intro:'Choose the problem you need help with. Payment eligibility, emergency relief and repayable loans have different rules.',issue:8,sections:[
  {title:'Payments or Centrelink social work',orders:[1,2],open:true},
  {title:'Debt and financial counselling',orders:[3,7,8,9,10,11]},
  {title:'Electricity bills or prepaid credit',orders:[4]},
  {title:'Private rental bond assistance',orders:[6]},
  {title:'NT concessions',orders:[5]}
 ]},
 'id-online':{title:'ID, phone and online access',intro:'Missing ID, a phone or a fixed address can make applying harder. Ask the relevant service about an alternative way to contact you or supply documents.',issue:9,sections:[
  {title:'Birth certificate or document help',orders:[1],open:true},
  {title:'Computers, charging and help online',orders:[3,4,5,6]},
  {title:'Look up a local service',orders:[2]}
 ],related:[{title:'Local ID and return-to-Country assistance',href:'#page/visiting'},{title:'Interpreting, relay and settlement support',href:'#page/transport-communication'}]},
 violence:{title:'Safety from violence',intro:'Use a safe device and agree a safe way for the service to contact you. For immediate danger, call 000.',issue:4,sections:[
  {title:'Talk to someone about safety',orders:[2],open:true},
  {title:'Refuges and safe houses',orders:[5,6,10,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,34,35,36,37],note:'Read the exact household and community rules. Call before travelling.'},
  {title:'Support after sexual assault',orders:[3,11]},
  {title:'Home safety and ongoing support',orders:[7,8,31]},
  {title:'Older-person abuse',orders:[4]},
  {title:'Temporary pet care',orders:[9]},
  {title:'Help for someone using violence',orders:[17]}
 ],related:[{title:'Family or violence-related legal help',href:'#page/legal'}]}
};
