# A FLORESTA MENTE — Ninguém fica para trás

Jogo cooperativo 2D para três pessoas, desenvolvido para Game Jam Plus 2026/2027. Temas: **Better Together** e **Something's Off**.

**Tecnologias:** Phaser 3, TypeScript, Vite, PeerJS Cloud (sinalização) e WebRTC DataChannels (jogabilidade P2P entre cada convidado e anfitrião). Não possui Socket.IO, Express, backend de gameplay, banco de dados ou servidor multiplayer próprio.

## Como jogar

1. No navegador, abra: https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/
2. Um jogador escolhe **CRIAR SALA**; compartilha código de 6 caracteres com dois amigos.
3. Ambos entram em **ENTRAR EM SALA**, todos escolhem **ESTOU PRONTO** e o anfitrião inicia.
4. Assistam à **introdução de 24 segundos** (4 cenas em Phaser). Qualquer jogador pode solicitar **PULAR INTRODUÇÃO**, mas o anfitrião avança as três telas juntas.
5. Na **Fase 01 — A Boca da Noite**, coletem cada habilidade: Téo (salto duplo), Lia (estilingue), Nino (dash). Destravem ponte, cipós e porta final; os três devem chegar juntos à saída.
6. Após **FASE CONCLUÍDA**, o anfitrião conduz a transição visual. Todos carregam a **Fase 02 — A Ponte Quebrada** com habilidades preservadas.
7. No rio, Téo usa salto duplo e E na alavanca elevada para descer a primeira parte da ponte; Lia usa Q no alvo para soltar a segunda; Nino usa E no temporizador, pula, usa Q para dash e aperta E junto ao interruptor oposto para fixar a terceira.
8. Mecanismo final simultâneo: Téo fica sobre a placa de pressão na outra margem, Lia acerta o alvo com Q, Nino usa Q para dash e E no último interruptor **antes de o tempo acabar**. Depois todos chegam juntos à saída.
9. A fase termina com **VOCÊS ATRAVESSARAM O RIO!** e **A floresta ainda guarda seus segredos...**. As fases 03, 04 e 05 ainda não são jogáveis.

**Controles:** A/D ou setas para andar, Espaço/↑ para pular e salto duplo, E para interagir, Q para disparo/dash. Celular: direção, botão PULAR e botões E e Q; usar orientação horizontal.

## Desenvolvimento e testes

Requisito: Node 20.19+ ou 22+.

```bash
npm install
npm run dev
npm run build
npm run test:logic
```

O GitHub Actions executa build TypeScript/Vite, testes de lógica das duas fases e publica no GitHub Pages. O workflow disponibiliza ZIP HTML5 em **Actions → Publicar jogo no GitHub Pages → Artifacts**. Para itch.io, compactar o **conteúdo** de `dist/` incluindo `index.html` e `assets/` (o Vite já configura caminhos relativos com `base: './'`).

## Organização

- `src/main.ts`: menu, lobby, controles móveis e renderização sincronizada de intro, fases, transição e epílogo.
- `src/network.ts`: PeerJS, salas, mensagens tipadas e validadas, autorização do anfitrião, 20 Hz, fases e restauração após reconexão.
- `src/intro.ts`: intro de 4 cenas ilustradas em Phaser (sem MP4, sem downloads de arte).
- `src/game.ts`: primeira fase, personagens e puzzles legados preservados.
- `src/puzzles.ts`: autoridade e regras da primeira fase.
- `src/riverScene.ts`: segunda fase no rio, cenário e controles do jogo.
- `src/river.ts`: autoridade dos puzzles, tempo, checkpoints, mistério sincronizado e conclusão da segunda fase.
- `src/levels.ts`: registro das 5 fases planejadas.
- `tests/puzzles.test.ts`, `tests/river.test.ts`: testes de regras de ambos os mapas.

## Multiplayer e reconexão

O anfitrião recebe intenções dos convidados e valida a vaga, a habilidade, a distância ao mecanismo e o estado do desafio. Somente o anfitrião pode atualizar o estado compartilhado e autorizar transições e conclusão. A sincronização envia posições ~20 vezes/segundo e atualizações de puzzle **apenas quando o estado muda**, não o mapa inteiro.

A reconexão do convidado com vaga reservada restaura a fase corrente, posição e estado dos mecanismos; a desconexão pausa a partida cooperativa. Janela de reconexão: até 30 segundos. Não há migração de anfitrião.

## Limitações e créditos

- É necessário testar manualmente os três aparelhos, os controles por toque, os temporizadores com latência real, a reconexão e a execução do itch.io em iframe; testes automatizados não provam isso.
- PeerJS Cloud é um serviço público de sinalização; o P2P pode falhar sob CGNAT/firewall sem servidor TURN adicional.
- Movimentação de cada convidado é simulada localmente e reportada ao host; mecanismos são validados pelo anfitrião, mas não há sistema antifraude determinístico.
- O efeito de ilusão da ponte utiliza um marcador de evento definido pelo anfitrião; a animação não desloca a colisão física, para evitar bloqueios.
- Gráficos e efeitos visuais desta fase são formas geométricas procedurais desenhadas em Phaser, sem arquivos de imagem, vídeo ou áudio externos nem recursos de arte gerados por IA. A biblioteca de fonte pode ser carregada do Google Fonts; a fonte alternativa do sistema funciona sem ela.
- A conclusão no rio é temporária; não existe fim definitivo nem Fases 03–05 nesta versão.

## Fase 04 do desenvolvimento — Capítulos 03 e 04

- **03 — Olhos na Mata:** onça controlada pelo anfitrião, patrulha/perseguição, distração pelo estilingue, alavanca elevada de Téo, corrida cronometrada de Nino, combinação final dos três e checkpoints de queda/colisão.
- **04 — A Trilha que Mente:** placas mutáveis e caminho enganoso com retorno ao checkpoint, pistas personalizadas (Lua, Folha, Estrela), totens na ordem Téo → Lia → Nino, plataformas que alternam por mensagens de mundo do anfitrião e sequência final de placa/alvo móvel/dash.
- **Transições:** Fase 01 → 02 → 03 → 04, todas determinadas pelo anfitrião. Somente os três juntos liberam a conclusão temporária; capítulo 05 continua reservado.
- **Câmera:** adaptação do tamanho lógico do canvas para janelas estreitas e câmera Phaser seguindo o jogador nas fases jogáveis; mundo permanece em coordenadas 1200×700.
- **Efeitos:** estilingue e dash continuam usando eventos compartilhados e animação local; pré-requisitos das habilidades persistem entre fases.
- **Segurança e conectividade:** quartos do PeerJS/WebRTC, 20 Hz de poses, atualizações de puzzles por alteração e posição da onça em snapshots compactos; não há backend próprio.

**Limitações:** ainda é obrigatória uma rodada manual completa com três aparelhos/redes, inclusive dinâmica da onça, alvos e dash em condições reais de latência. O movimento dos convidados continua simulado localmente, com validação de puzzle pelo anfitrião. A plataforma de observação no capítulo 03 é fixa na física; o alvo visual móvel do capítulo 04 é determinístico por relógio local e a validação ocorre no relógio do anfitrião.
