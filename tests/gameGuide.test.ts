import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {FIRST_PLAY_GUIDE_KEY,gameGuideMarkup} from '../src/gameGuide';

const html=gameGuideMarkup();
assert.equal(FIRST_PLAY_GUIDE_KEY,'afm_tutorial_seen_v3');
for(const expected of ['TÉO','LIA','NINO','VERDE','LARANJA','AZUL','Shift',
 'salto duplo','baladeira','Dash','círculos','listras','A, B ou C',
 'tempo','escada humana','PIPO','celular','os três na saída']){
 assert.ok(html.toLowerCase().includes(expected.toLowerCase()),'missing guide tip: '+expected);
}
assert.ok(html.includes('Não é necessário apertar E junto com Shift'),
 'Nino uses Dash alone for his signals');
const main=readFileSync('src/main.ts','utf8');
const css=readFileSync('src/style.css','utf8');
const gate=readFileSync('src/gameGuide.ts','utf8');
assert.ok(!main.includes('GAME JAM PLUS • BETTER TOGETHER / SOMETHING’S OFF'),
 'old promotional line removed');
assert.ok(main.includes('forest-logo')&&main.includes('O VENTO REVELA O CAMINHO'),
 'modern menu headline is present');
assert.ok(main.includes("kind==='how'?gameGuideMarkup()"),
 'how-to-play modal and first-play popup share the same rules');
assert.equal((main.match(/beforeFirstPlay\(/g)||[]).length,3,
 'solo, multiplayer READY and host START use mandatory tutorial gate');
assert.ok(gate.includes("proceed.disabled=!sawEnd||!check.checked"),
 'must scroll to the bottom AND affirm before entering');
assert.ok(gate.includes("FIRST_PLAY_GUIDE_KEY,'yes'"),
 'confirmation is remembered on device');
assert.ok(gate.includes("ev.key==='Escape'"),'escape cannot bypass mandatory guide');
assert.ok(css.includes('.first-play-scroll')&&css.includes('.forest-logo'),
 'layout includes mobile friendly guide and forest logo');
console.log('Menu impact, full instructions and forced first-play tutorial: OK');
