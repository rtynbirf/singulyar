import assert from 'node:assert/strict';
import { CapabilityModel, AdapterRegistry, MeaningRouter, STATUS } from '../src/core.mjs';
import { textOutput, ttsOutput } from '../adapters/basic.mjs';
import { ocrContract, gazeContract } from '../adapters/contracts.mjs';

const c = new CapabilityModel(); c.setPreference('output.preferred','output.text'); assert.equal(c.getPreference('output.preferred'),'output.text');
const r = new AdapterRegistry(); r.register(textOutput); r.register(ttsOutput); r.register(ocrContract); r.register(gazeContract); assert.equal(r.get('output.text'),textOutput); assert.equal(r.get('input.ocr').status().state,STATUS.EXPERIMENTAL);
const router = new MeaningRouter({capabilities:c,registry:r}); const out=router.route({text:'hello'},{direction:'output',preferred:['output.text']}); assert.equal(out.selected,'output.text');
const states=r.statuses().map(x=>x.state); assert.ok(states.includes(STATUS.EXPERIMENTAL));
console.log('PASS 4/4');
