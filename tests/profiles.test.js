import test from 'node:test';
import assert from 'node:assert/strict';
import {profiles,findProfile,resolveRoute} from '../profiles.js';
test('learner grades and subjects match the family configuration',()=>{
 assert.equal(findProfile('ubay').grade,7);assert.equal(findProfile('bian').grade,2);
 assert.equal(profiles[0].subjects.length,8);assert.equal(profiles[1].subjects.length,6);
 assert.ok(profiles[0].subjects.some(s=>s[0]==='pai'));
 assert.ok(profiles[1].subjects.some(s=>s[0]==='paibp'));
});
test('a learner cannot navigate to the other learner’s exclusive subject',()=>{
 assert.equal(resolveRoute('#/bian/informatika').page,'home');
 assert.equal(resolveRoute('#/ubay/informatika').page,'subject');
 assert.equal(resolveRoute('#/bian/pai').page,'home');
});
test('invalid or unknown routes return to a safe screen',()=>{
 for(const h of ['','#/unknown','#/<script>'])assert.equal(resolveRoute(h).page,'profiles');
 assert.equal(resolveRoute('#/ubay/unknown').page,'home');
});
