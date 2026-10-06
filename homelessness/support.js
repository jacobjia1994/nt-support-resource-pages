import {resolveLegacyIntent} from './support-legacy.mjs?v=20261006-results-final';
import {createSupportApp} from './support-app.mjs?v=20261006-results-final';
import {journeys} from './support-journeys.mjs?v=20261006-housing-scope';
import {discover,discoveryFields} from './support-discovery.mjs?v=20261006-results-final';
import {services,serviceView} from './support-catalog.mjs?v=20261006-continuous-final';
import {handbookDirectory,handbookNeeds,handbookRegions} from './support-handbook.mjs?v=20261006-continuous-final';
const home=[{"title":"A place to stay tonight","href":"#task/tonight","tasks":["tonight"]},{"title":"Safety from violence","href":"#task/violence","tasks":["violence"]},{"id":"housing","title":"Keep or find a home","tasks":["keep-home","stable-home","young-person-housing","return-home","leaving-service"]},{"id":"everyday","title":"Food, money and practical help","tasks":["food-washing","money-bills","id-online","transport"]},{"id":"health-care","title":"Health and care","tasks":["mental-health","medical","alcohol-drugs","disability","aged-care","carer"]},{"id":"family","title":"Family and school support","href":"#task/family-school","tasks":["family-school"]},{"id":"rights","title":"Legal advice and complaints","tasks":["legal","complaint"]},{"id":"access","title":"Interpreting and settlement help","tasks":["communication","settlement"]}];
createSupportApp({identity:'NT housing & homelessness support',allHelp:'All housing help',journeys,home,discover,discoveryFields,services,
 contactsFor:s=>s.contactOptions||[],sourcesFor:s=>s.sources||[s.url],
 legacyChoice:value=>resolveLegacyIntent('homelessness',journeys,value),
 directory:{title:'Housing & homelessness resource details',entries:handbookDirectory,needs:handbookNeeds,regions:handbookRegions,needMatches:(s,id)=>s.needs?.includes(id),regionMatches:(s,id)=>s.raw.region_ids.includes(id),view:(s,region)=>region?serviceView(s.raw,{region}):s}
});
