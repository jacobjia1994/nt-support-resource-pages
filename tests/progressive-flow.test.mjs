import assert from 'node:assert/strict';
import test from 'node:test';
import * as defence from '../defence/support-flow.mjs';
import * as homelessness from '../homelessness/support-flow.mjs';
import {getResults as housingResults, preferencesFor as housingPreferences} from '../homelessness/support-paths.mjs';

const ids=flow=>flow.visibleQuestions.map(question=>question.id);
const offered=(question,value)=>question.options.some(option=>option.value===value);
function assertDisclosure(flow) {
  const disclosed=flow.questions.filter(question=>offered(question,flow.answers[question.id])||question===flow.nextQuestion);
  assert.deepEqual(flow.visibleQuestions,disclosed,
    'Keep valid answered groups and only the first missing group in stable canonical order');
  assert.equal(new Set(ids(flow)).size,ids(flow).length,'A question is rendered once');
  if(!flow.complete) {
    assert.ok(flow.visibleQuestions.includes(flow.nextQuestion));
    assert.ok(!offered(flow.nextQuestion,flow.answers[flow.nextQuestion.id]));
  }
}
const defenceTonight={
  need:'tonight',connection:'former',accommodationFor:'single-adult',
  housingAge:'25+',region:'katherine',adultAccommodation:'men'
};

test('Defence: a newly required housing reason keeps the valid answered accommodation groups',()=>{
  assert.ok(defence.getFlowState('money',defenceTonight,'katherine').complete);
  const changed=defence.applyAnswer('money',defenceTonight,'connection','serving','katherine');
  assert.equal(changed.nextQuestion.id,'housingReason');
  assert.deepEqual(ids(changed),['need','connection','housingReason','accommodationFor','housingAge','adultAccommodation','region']);
  assertDisclosure(changed);
  assert.equal(changed.visibleQuestions.find(question=>question.id==='accommodationFor').options.length,5,
    'The selected answer does not replace the full accommodation choices');
  const completed=defence.applyAnswer('money',changed.answers,'housingReason','other','katherine');
  assert.ok(completed.complete);
  for(const key of ['accommodationFor','housingAge','adultAccommodation','region'])assert.equal(completed.answers[key],defenceTonight[key]);
  assert.deepEqual(ids(completed),ids(changed),'Completing an inserted prerequisite cannot reorder retained groups');
  assertDisclosure(completed);
});

test('Defence: an answered downstream group remains directly editable while the new prerequisite is missing',()=>{
  const changed=defence.applyAnswer('money',defenceTonight,'connection','serving','katherine');
  const edited=defence.applyAnswer('money',changed.answers,'housingAge','19-24','katherine');
  assert.equal(edited.answers.housingAge,'19-24');
  assert.equal(edited.answers.accommodationFor,'single-adult');
  assert.equal(edited.answers.adultAccommodation,'men');
  assert.equal(edited.nextQuestion.id,'housingReason');
  assertDisclosure(edited);
  const completed=defence.applyAnswer('money',edited.answers,'housingReason','other','katherine');
  assert.ok(completed.complete);
  assert.equal(completed.answers.housingAge,'19-24');
});

test('Housing: moving an Alice Springs family to Darwin keeps household while asking the new age question',()=>{
  const original={need:'safe-tonight',region:'alice',household:'family'};
  assert.ok(homelessness.getFlowState('housing',original,'alice').complete);
  const changed=homelessness.applyAnswer('housing',original,'region','darwin','alice');
  assert.equal(changed.answers.household,'family');
  assert.equal(changed.nextQuestion.id,'age');
  assert.deepEqual(ids(changed),['need','region','age','household']);
  assertDisclosure(changed);
  const completed=homelessness.applyAnswer('housing',changed.answers,'age','25-49','darwin');
  assert.ok(completed.complete);
  assert.equal(completed.answers.household,'family');
  assert.equal(completed.answers.region,'darwin');
  assert.deepEqual(ids(completed),ids(changed),'Completing the new age group cannot move the retained household group');
  assertDisclosure(completed);
});

test('Housing: the retained household group can be reselected before the new age prerequisite',()=>{
  const moved=homelessness.applyAnswer('housing',{need:'safe-tonight',region:'alice',household:'family'},'region','darwin','alice');
  const edited=homelessness.applyAnswer('housing',moved.answers,'household','couple','darwin');
  assert.equal(edited.answers.household,'couple');
  assert.equal(edited.nextQuestion.id,'age');
  assertDisclosure(edited);
  const completed=homelessness.applyAnswer('housing',edited.answers,'age','25-49','darwin');
  assert.ok(completed.complete);
  assert.equal(completed.answers.household,'couple');
});

test('Defence: changing mental-health need preserves the same valid person, service connection and town',()=>{
  const original={need:'feelings',age:'26+',counselling:'partner',region:'palmerston'};
  const changed=defence.applyAnswer('mental',original,'need','treatment','palmerston');
  assert.ok(changed.complete);
  assert.deepEqual(changed.answers,{...original,need:'treatment'});
  assertDisclosure(changed);
});

test('Housing: changing the need keeps the relevant town while asking only the new support type',()=>{
  const original={need:'health-wellbeing',age:'50-64',region:'darwin'};
  const before=homelessness.getFlowState('health',original,'darwin');
  assert.ok(before.complete);
  assert.ok(!('age' in before.answers),'A historical age qualifier with no effect on this first contact is irrelevant');
  const changed=homelessness.applyAnswer('health',before.answers,'need','alcohol-drugs','darwin');
  assert.equal(changed.nextQuestion.id,'aodNeed');
  assert.equal(changed.answers.region,'darwin');
  assert.deepEqual(ids(changed),['need','aodNeed','region']);
  assert.ok(!('age' in changed.answers));
  assertDisclosure(changed);
  const completed=homelessness.applyAnswer('health',changed.answers,'aodNeed','advice','darwin');
  assert.ok(completed.complete);
  assert.equal(completed.answers.region,'darwin');
  assert.deepEqual(ids(completed),ids(changed));
  assert.ok(!('age' in completed.answers));
});

test('Defence: changing adult accommodation to a family clears only the now-irrelevant adult qualifications',()=>{
  const changed=defence.applyAnswer('money',defenceTonight,'accommodationFor','household','katherine');
  assert.ok(changed.complete);
  assert.equal(changed.answers.connection,'former');
  assert.equal(changed.answers.region,'katherine');
  assert.equal(changed.answers.accommodationFor,'household');
  assert.ok(!('housingAge' in changed.answers));
  assert.ok(!('adultAccommodation' in changed.answers));
  assert.ok(!changed.visibleQuestions.some(question=>['housingAge','adultAccommodation'].includes(question.id)));
  assertDisclosure(changed);
});

test('Housing: an age that removes adult accommodation also removes the now-invalid household group',()=>{
  const moved=homelessness.applyAnswer('housing',{need:'safe-tonight',region:'alice',household:'family'},'region','darwin','alice');
  const changed=homelessness.applyAnswer('housing',moved.answers,'age','under15','darwin');
  assert.ok(changed.complete);
  assert.equal(changed.answers.age,'under15');
  assert.equal(changed.answers.region,'darwin');
  assert.ok(!('household' in changed.answers));
  assert.ok(!changed.visibleQuestions.some(question=>question.id==='household'));
  assertDisclosure(changed);
});

test('Housing: a region without a direct accommodation programme removes irrelevant age and household answers',()=>{
  const changed=homelessness.applyAnswer('housing',{need:'safe-tonight',region:'darwin',age:'25-49',household:'family'},'region','tennant','darwin');
  assert.ok(changed.complete);
  assert.deepEqual(changed.answers,{need:'safe-tonight',region:'tennant'});
  assert.deepEqual(ids(changed),['need','region']);
  assertDisclosure(changed);
});

test('Defence: changing the patient clears treatment cover even when the answer would still be structurally offered',()=>{
  const original={need:'travel',connection:'serving',role:'other',dvaTravel:'yes',region:'katherine'};
  const changed=defence.applyAnswer('care',original,'role','partner','katherine');
  assert.equal(changed.answers.connection,'serving');
  assert.equal(changed.answers.region,'katherine');
  assert.equal(changed.answers.role,'partner');
  assert.ok(!('dvaTravel' in changed.answers));
  assert.equal(changed.nextQuestion.id,'dvaTravel');
  assert.ok(changed.nextQuestion.options.some(option=>option.value==='yes'));
  assertDisclosure(changed);
});

test('Defence: a different patient cannot inherit remote-posting or NT-residency qualifications',()=>{
  const original={need:'travel',connection:'serving',role:'other',dvaTravel:'no',remotePosting:'yes',ntResidence:'yes',region:'alice'};
  assert.ok(defence.getFlowState('care',original,'alice').complete);
  const changed=defence.applyAnswer('care',original,'role','partner','alice');
  for(const key of ['dvaTravel','remotePosting','ntResidence'])assert.ok(!(key in changed.answers),key+' belongs to the previous patient');
  assert.equal(changed.answers.region,'alice');
  assert.equal(changed.nextQuestion.id,'dvaTravel');
  assertDisclosure(changed);
});

test('Housing: a changed catchment clears the refuge-community qualification, including a generic other answer',()=>{
  for(const community of ['galiwinku','other']) {
    const original={need:'violence-safety',safetyNeed:'refuge',refugeFor:'woman-child',region:'arnhem',community};
    assert.ok(homelessness.getFlowState('safety',original,'arnhem').complete);
    const changed=homelessness.applyAnswer('safety',original,'region','topend','arnhem');
    assert.ok(!('community' in changed.answers));
    assert.equal(changed.answers.refugeFor,'woman-child');
    assert.equal(changed.nextQuestion.id,'community');
    assertDisclosure(changed);
  }
});

for(const [name,model,topic,answers,questionId,value] of [
  ['Defence',defence,'mental',{need:'feelings'},'region','darwin'],
  ['Housing',homelessness,'housing',{need:'safe-tonight',region:'darwin'},'household','family']
])test(name+': unanswered future groups cannot be injected before the first missing prerequisite',()=>{
  const before=model.getFlowState(topic,answers);
  assert.ok(before.questions.some(question=>question.id===questionId),'The future group exists in the relevant model');
  assert.ok(!before.visibleQuestions.some(question=>question.id===questionId));
  assert.deepEqual(model.applyAnswer(topic,answers,questionId,value),before);
});

test('Defence: a stale adult-age event is rejected after the household choice removes that question',()=>{
  const family=defence.applyAnswer('money',defenceTonight,'accommodationFor','household','katherine');
  assert.deepEqual(defence.applyAnswer('money',family.answers,'housingAge','25+','katherine'),family);
  assert.ok(!('housingAge' in family.answers));
});

test('Both models reject stale values and keep repeated selections and normalization idempotent',()=>{
  const cases=[
    [defence,'money',defenceTonight,'accommodationFor','single-adult','katherine'],
    [homelessness,'housing',{need:'safe-tonight',region:'alice',household:'family'},'household','family','alice']
  ];
  for(const [model,topic,answers,id,value,region] of cases) {
    const original=structuredClone(answers);
    const before=model.getFlowState(topic,answers,region);
    assert.deepEqual(model.applyAnswer(topic,answers,id,'not-an-offered-value',region),before);
    assert.deepEqual(model.applyAnswer(topic,answers,id,value,region),before);
    assert.deepEqual(model.getFlowState(topic,before.answers,region),before);
    assert.deepEqual(answers,original,'The model cannot mutate a saved history snapshot');
    assertDisclosure(before);
  }
});


test('Housing: a hidden no-effect contact preference remains selected when useful actions return',()=>{
  const original={need:'alcohol-drugs',aodNeed:'harm',region:'darwin',preferences:['no-phone','unknown-preference','no-phone']};
  const before=homelessness.getFlowState('health',original,'darwin');
  assert.ok(before.complete);
  assert.deepEqual(before.answers.preferences,['no-phone'],'Unknown values and duplicates are removed');
  assert.ok(housingPreferences('health',before.answers).some(option=>option.value==='no-phone'));
  const darwin=housingResults('health',before.answers);
  const darwinActions=darwin.allIds.flatMap(id=>darwin.servicesById[id].contactOptions);
  assert.ok(darwinActions.some(option=>option.href.startsWith('mailto:')),'NTAHC supplies a usable email action');
  assert.ok(darwinActions.every(option=>!['phone','text'].includes(option.channel)));

  const hidden=homelessness.applyAnswer('health',before.answers,'region','katherine','darwin');
  assert.ok(hidden.complete);
  assert.deepEqual(housingPreferences('health',hidden.answers),[],'The finder-only branch has no useful contact-mode control');
  assert.deepEqual(hidden.answers.preferences,['no-phone'],'A hidden control cannot erase contact-ability memory');
  const fallback=housingResults('health',hidden.answers);
  assert.ok(fallback.noDirectMatch);
  assert.ok(fallback.allIds.every(id=>fallback.servicesById[id].contactOptions.every(option=>!['phone','text'].includes(option.channel))));
  assert.deepEqual(homelessness.getFlowState('health',hidden.answers,'katherine'),hidden,'Hidden preference normalization is idempotent');

  const restored=homelessness.applyAnswer('health',hidden.answers,'region','darwin','katherine');
  assert.ok(restored.complete);
  assert.deepEqual(restored.answers.preferences,['no-phone']);
  assert.ok(housingPreferences('health',restored.answers).some(option=>option.value==='no-phone'));
  const restoredResult=housingResults('health',restored.answers);
  const restoredActions=restoredResult.allIds.flatMap(id=>restoredResult.servicesById[id].contactOptions);
  assert.ok(restoredActions.some(option=>option.href.startsWith('mailto:')));
  assert.ok(restoredActions.every(option=>!['phone','text'].includes(option.channel)),'Returning to phone routes cannot silently restore Call or SMS actions');
  assert.deepEqual(original.preferences,['no-phone','unknown-preference','no-phone'],'History input is not mutated');
});
