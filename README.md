# A FLORESTA MENTE — Roteiro definitivo de quatro fases

**Game Jam Plus 2026/2027**, multiplayer cooperativo para três jogadores, Phaser 3 + TypeScript + Vite + PeerJS/WebRTC. A quinta etapa de desenvolvimento não cria uma quinta fase de aventura.

## Jogar

https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/

Abrir em três navegadores, um jogador cria a sala e compartilha o código de seis caracteres. Todos marcam PRONTO e o host inicia. A introdução é sincronizada. A/D ou setas para andar; Espaço/↑ para pular; **E** para interagir/apoio; **Q** para habilidade especial. Celulares possuem botões touch.

## Os quatro capítulos

1. **A Boca da Noite — mapa expandido 4.300px:** os três entram na mata, conversam com Caboquim da Mata (botão CONTINUAR ou E), e Téo adquire salto duplo. Lia já começa com estilingue e Nino com dash. Na Árvore Gigante, Nino fica na base, Lia se apoia nele por E e Téo se apoia em Lia por E; Téo salta para as plataformas superiores. Os jogadores coletam os três cipós (Téo na copa, Lia por disparo, Nino por dash). Na região final, Téo solta cipó no alto, Lia corta a amarra com o estilingue e Nino libera raiz com dash+E. A árvore cai por 1,9 segundos e vira ponte **com colisão física**. Três jogadores vivos atravessam juntos e avançam.
2. **A Ponte Quebrada / Travessia dos Cipós:** rio, mecanismos de Téo, Lia e Nino e ponte coletiva.
3. **Olhos na Mata:** onça, distração, mecanismos temporizados e checkpoints.
4. **A Trilha que Mente:** totens Lua→Folha→Estrela, placas enganosas, plataformas alternadas e saída cooperativa. O guardião final e a cinematografia de retorno para casa serão desenvolvidos mais tarde, *dentro da Fase 4*.

## Sistema de sobrevivência (primeira fase)

Todos têm três corações, controlados pelo anfitrião e sincronizados em `ForestWorld`. Cobras e galhos causam um coração de dano com 1,2s de invulnerabilidade. O aviso de galhos precede a queda. Cair no abismo provoca morte imediata. Ao zerar qualquer personagem: **UM AMIGO CAIU NA FLORESTA**, pausa cooperativa por ~3,2s e reinício coletivo da fase com três corações e habilidades iniciais de Lia/Nino. Téo reconquista o salto duplo ao falar novamente com Caboquim; depois da Fase 1, o salto duplo permanece habilitado.

## Apoio cooperativo

Vínculos simplificados **autoritativos pelo anfitrião**: Lia usa E perto de Nino parado na região de escalada, e Téo usa E perto de Lia já apoiada; os pés/corpos são posicionados a 44px de diferença vertical de forma estável em todos os aparelhos. O host valida identidade, posição, ordem, e não permite ciclos. Espaço solta o vínculo e inicia salto; E solta manualmente. O marco da escalada tríplice é necessário para coletar o cipó no alto. Não é uma simulação rígida geral de colisões entre três Arcade Bodies: suporte e posicionamento são vinculados e sincronizados; a robustez precisa ser confirmada manualmente com três dispositivos.

## Sincronização

- `src/network.ts`: PeerJS Cloud só para sinalização; jogabilidade P2P em WebRTC DataChannels. Slots com reconexão, lobby, habilidade e progresso autoritativos. Posições de x=0 até **4300** no nível 1; níveis 2–4 usam x até 1200; 20 snapshots/segundo.
- `src/forest.ts`: regras puras de Caboquim, estado de vida, invulnerabilidade, cadeia de apoios, cipós, árvore, checkpoints, reinício e vitória.
- `src/forestScene.ts`: cenário Phaser 4300px, câmera local, plataformas, física da ponte, Caboquim, cobras e galhos, HUD de corações.
- `src/game.ts` e `src/puzzles.ts`: implementação anterior preservada para regressão, não utilizada na primeira fase atual.
- `src/riverScene.ts`, `src/river.ts`: Fase 2; `src/lateScene.ts`, `src/chapters.ts`: Fases 3 e 4; `src/effects.ts` e `src/skillVfx.ts`: efeitos compartilhados de estilingue e dash.

## Build, testes e itch.io

Com Node.js 22+:

```bash
npm install
npm run build
npm run test:logic
```

GitHub Actions executa build TypeScript/Vite e todas as suítes antes de publicar em GitHub Pages. O artefato ZIP HTML5 está disponível em Actions. O `dist/` mantém `index.html` e `assets/` com caminhos relativos para itch.io.

## Limitações ainda a verificar

**Obrigatório testar em três navegadores/aparelhos reais:** escalada sincronizada e salto sobre amigos; progresso de cipós; abismo/ponte; perdas de vida e reinício; latência de ações E/Q; reconexão e progressão para fases 2–4. Testes unitários validam regras, não garantem geometria ou experiência real. Não existe migração de anfitrião, backend próprio, persistência entre partidas nem simulação Arcade de colisão entre corpos remotos: o suporte usa vínculos verificados pelo anfitrião. As vidas foram implementadas no capítulo 1 e a base de estado pode ser reutilizada nas outras fases, mas os perigos das fases 2–4 não utilizam corações nesta versão.

Arte/áudio: visuais vetoriais desenhados proceduralmente no Phaser, sem vídeo externo, sem arquivos de arte gerados por IA ou áudio de terceiros nesta etapa.
