import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {FIRST_PLAY_GUIDE_KEY,gameGuideMarkup} from '../src/gameGuide';

const html=gameGuideMarkup();
assert.equal(FIRST_PLAY_GUIDE_KEY,'afm_tutorial_seen_v4');
for(const word of ['TÉO','LIA','NINO','VERDE','LARANJA','AZUL',
 'Shift','J','E','baladeira','escada humana','Pipo','celular']){
 assert.ok(html.toLowerCase().includes(word.toLowerCase()),'missing concise guide: '+word);
}
assert.ok(html.length<1600,'consultation guide must remain brief');
const main=readFileSync('src/main.ts','utf8');
const css=readFileSync('src/style.css','utf8');
const gate=readFileSync('src/gameGuide.ts','utf8');
const director=readFileSync('src/missionDirector.ts','utf8');
const bird=readFileSync('src/pipoGuide.ts','utf8');
const forest=readFileSync('src/forestLoop.ts','utf8');
assert.equal((main.match(/beforeFirstPlay\(/g)||[]).length,3,
 'solo, multiplayer ready and host start use short first-play tutorial');
assert.ok(main.includes("kind==='how'?gameGuideMarkup()"),
 'how-to-play stays accessible as concise consultation');
assert.ok(gate.includes('INTRO_STEPS')&&gate.includes("CONTINUAR")&&
 gate.includes("OK · COMEÇAR"),'step-by-step onboarding with explicit continue');
assert.ok(!gate.includes('proceed.disabled=!sawEnd||!check.checked'),
 'do not force the player to scroll a long manual');
assert.ok(gate.includes("FIRST_PLAY_GUIDE_KEY,'yes'"),
 'completed onboarding remembered on device');
assert.ok(gate.includes("ev.key==='Escape'"),
 'cannot bypass first-play steps accidentally');
assert.ok(main.includes('loop-step')&&main.includes('OBJETIVO')&&
 main.includes('PROGRESSO'), 'HUD contains objective step and progress');
assert.ok(director.includes('actionPrompt')&&director.includes('pending')&&
 director.includes('PRESSIONE E PARA INTERAGIR'),
 'current interactables have colored markers and accessible action prompts');
assert.ok(bird.includes('lastMovedAt')&&bird.includes('lastProgress')&&
 bird.includes('needsHelp'),'Pipo offers proactive contextual hints');
assert.ok(forest.includes('checkpointX')&&forest.includes('w.safeUntil=[now+2900'),
 'first phase has forgiving checkpoints without discarding puzzle flags');
assert.ok(css.includes('.mission-context-step')&&css.includes('.first-play-step-icon'),
 'compact tutorial and contextual prompts are styled');
console.log('Playtest: onboarding, HUD, interactables, hints and checkpoint safety OK');
