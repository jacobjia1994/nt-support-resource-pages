import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolveLegacyIntent as housingResolve} from '../homelessness/support-legacy.mjs';
import {resolveLegacyIntent as defenceResolve} from '../defence/support-legacy.mjs';
import {journeys as housingJourneys} from '../homelessness/support-journeys.mjs';
import {journeys as defenceJourneys} from '../defence/support-journeys.mjs';

const housing=value=>housingResolve('homelessness',housingJourneys,value);
const defence=value=>defenceResolve('defence',defenceJourneys,value);
function assertIntentOnly(result,journeys) {
 assert.ok(result,'A supported old link must retain a useful intent');
 assert.ok(Object.keys(result).every(key=>['id','index','menu','home','title','tasks'].includes(key)),'Legacy links must not carry answers or qualifications into a new session');
 if(result.id){assert.ok(result.id==='help'||journeys.some(t=>t.id===result.id));assert.ok(result.index===null||Number.isInteger(result.index));}
 if(result.tasks){assert.ok(result.tasks.length>=2,'A cross-task intent is a choice menu');for(const id of result.tasks)assert.ok(journeys.some(t=>t.id===id));assert.ok(result.title);assert.equal(result.index,undefined);}
}
function assertTask(result,id,index=null){assert.deepEqual(result,{id,index});}
function assertMenu(result,ids){assert.deepEqual(result.tasks,ids);assert.equal(result.id,undefined);assert.equal(result.index,undefined);assert.ok(result.title);}

test('both audiences deploy the same legacy intent resolver bytes',()=>{
 const read=site=>readFileSync(new URL('../'+site+'/support-legacy.mjs',import.meta.url),'utf8');
 assert.equal(read('homelessness'),read('defence'));
});

test('housing: historical aliases retain the original need without silently choosing a subtask',()=>{
 const tasks={stay:['tonight',0],housing:['stable-home',null],'keep-home':['keep-home',null],essentials:['food-washing',null],money:['money-bills',null],identity:['id-online',null],safety:['violence',null],health:['mental-health',0],aod:['alcohol-drugs',null],transition:['leaving-service',null]};
 for(const [alias,[id,index]] of Object.entries(tasks)){const result=housing('#'+alias);assertIntentOnly(result,housingJourneys);assertTask(result,id,index);}
 assertMenu(housing('#family'),['young-person-housing','family-school']);
 assertMenu(housing('#access'),['communication','transport','settlement','veteran-family']);
});

test('housing: broad source issue links show all relevant task alternatives',()=>{
 assertTask(housing('#housing/longer-term-housing'),'stable-home');
 assertTask(housing('#money/money-benefits'),'money-bills');
 assertTask(housing('#housing/keep-tenancy'),'keep-home');
 assertTask(housing('#safety/violence-safety'),'violence');
 assertTask(housing('#essentials/identity-digital'),'id-online');
 assertMenu(housing('#family/children-youth-family'),['young-person-housing','family-school']);
 assertMenu(housing('#access/disability-ageing'),['disability','aged-care','carer']);
 assertMenu(housing('#access/legal-help'),['legal','complaint']);
 assertMenu(housing('#access/access-culture-disability'),['communication','transport','settlement','veteran-family']);
});

const oldDefenceNeeds={
 1:['posting',3],2:['absence',null],3:['children-education',2],4:['work',3],5:['work',1],6:['money',0],7:{menu:'housing'},8:['posting',null],9:['children-education',null],10:['children-education',null],11:['baby',null],12:['parenting',null],13:['children-education',3],14:['children-education',4],15:{tasks:['mental-health','child-wellbeing']},16:['carers',0],17:['relationships',0],18:['relationships',null],19:['safety',0],20:{tasks:['mental-health','child-wellbeing']},21:{tasks:['mental-health','child-wellbeing']},22:{tasks:['mental-health','child-wellbeing']},23:['health',null],24:['health',3],25:['disability',null],26:['carers',0],27:['older',null],28:['groups',0],29:['groups',0],30:['help',0],31:['inclusive',0],32:['help',0],33:['private',0],34:['help',0],35:['help',0],36:['help',0],37:['transition',0],38:['bereavement',1],39:['bereavement',2]
};
for(const [number,expected] of Object.entries(oldDefenceNeeds))test('Defence: old need/'+number+' retains its task intent with no invented profile',()=>{
 const result=defence('#need/'+number);assertIntentOnly(result,defenceJourneys);
 if(Array.isArray(expected))assertTask(result,...expected);
 else if(expected.tasks)assertMenu(result,expected.tasks);
 else assert.deepEqual(result,expected);
 assert.deepEqual(defence('need/'+number+'/region/alice/age/17/connection/former'),result,'Additional old URL segments cannot import age, region or connection');
});

test('Defence: historical aliases and situation entrances retain useful full task menus',()=>{
 for(const [alias,id] of Object.entries({talk:'mental-health',children:'children-education',moving:'posting',connect:'groups',safety:'safety'}))assertTask(defence('#'+alias),id);
 for(const [situation,id] of Object.entries({moving:'posting',settle:'posting',apart:'absence',leaving:'transition'}))assertTask(defence('#situation/'+situation),id);
 assert.deepEqual(defence('#situation/concern'),{home:true});
});

test('Defence: old housing and care paths preserve alternatives instead of choosing a provider route',()=>{
 assert.deepEqual(defence('#money/housing'),{menu:'housing'});
 assertTask(defence('#money/defence-housing'),'posting');
 assertTask(defence('#care/health'),'health');
 assertTask(defence('#parenting/childcare'),'children-education');
 assertTask(defence('#relationships/separation'),'relationships');
 assertMenu(defence('#mental/feelings'),['mental-health','child-wellbeing']);
});

test('legacy resolver returns no fabricated intent for unknown links or invalid old need numbers',()=>{
 for(const value of ['unknown/unknown','#need/0','#need/40','#need/24.5','#need/24x'])assert.equal(defence(value),null);
 for(const value of ['unknown/unknown','#unknown','#task-that-never-existed'])assert.equal(housing(value),null);
});
