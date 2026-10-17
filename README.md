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

## Correção de sincronização visual multiplayer

- Disparos de Lia e dash de Nino são animados localmente e sincronizados por eventos P2P validados pelo anfitrião nas fases 1 e 2.
- O host retransmite apenas um evento curto por uso, sem replicar partículas a cada frame. Cada navegador desenha projétil, impacto e rastro com os mesmos parâmetros.
- A posição do efeito remoto usa o último snapshot de movimento recebido pelo anfitrião. A simulação física, os puzzles, o lobby e a restauração após reconexão permanecem inalterados.
- O emissor não recebe o efeito de volta, evitando animações duplicadas. Testes automatizados cobrem identidade do personagem, cooldown, validação e fases.
- **Validação em três aparelhos permanece necessária**; o build e os testes de lógica não reproduzem latência de redes diferentes.
