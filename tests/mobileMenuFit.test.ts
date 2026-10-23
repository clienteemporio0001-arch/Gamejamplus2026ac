import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {viewportMenuScale} from '../src/mobileMenuFit';

assert.equal(viewportMenuScale(300,650),1,'não reduz desktop ou painel pequeno');
assert.ok(viewportMenuScale(520,355)<.70,'reduz tela que excede celular horizontal');
assert.ok(viewportMenuScale(600,750)===1,'preserva dimensão confortável');
assert.equal(viewportMenuScale(0,350),1,'proteção contra divisão por zero');
assert.equal(viewportMenuScale(900,300),.55,'limite seguro em janela extremamente pequena');

const main=readFileSync('src/main.ts','utf8');
const css=readFileSync('src/mobileMenuFit.css','utf8');
const fit=readFileSync('src/mobileMenuFit.ts','utf8');
for(const s of ["import './mobileMenuFit.css'","installMobileMenuFit(ui)"]){
 assert.ok(main.includes(s),'mobile auto-fit integrado: '+s);
}
for(const fragment of [
 '(pointer:coarse) and (orientation:landscape)',
 '(pointer:coarse) and (orientation:portrait)',
 '#ui:not(.in-game) > .menu-panel',
 '#ui:not(.in-game) > .phase-map',
 '#ui:not(.in-game) > .skin-select-panel',
 '#ui:not(.in-game) > .rank-panel',
 '.overlay-sheet:has(.guide-grid)',
 '.first-play-guide .first-play-sheet',
 '.mission-context-step',
 '.menu-panel #select-phase,.menu-panel #show-ranking',
 '.skin-select-panel .avatar-grid',
 '.rank-panel #ranking-back',
 '.phase-map #phase-back'
]){
 assert.ok(css.includes(fragment),'responsividade do componente: '+fragment);
}
assert.ok(css.includes('overflow:hidden'),
 'a navegação não deve exigir scroll vertical para clicar nos botões');
assert.ok(!css.includes('nth-child(n+4)')&&!css.includes('nth-child(n+5)'),
 'recordes não devem ser ocultados para caber na tela');
assert.ok(fit.includes('MutationObserver')&&fit.includes("window.visualViewport?.addEventListener('resize'"),
 'renderização e rotação devem disparar novo cálculo');
assert.ok(fit.includes("ui.classList.contains('in-game')"),
 'o ajuste nunca deve mudar a tela de gameplay');
console.log('MOBILE: menus, fases, personagens, ranking, tutoriais, rotação e HUD verificados');
