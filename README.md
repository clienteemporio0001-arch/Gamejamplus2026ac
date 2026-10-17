# A FLORESTA MENTE — Ninguém fica para trás

Protótipo cooperativo Phaser 3 + TypeScript + Vite para a **Game Jam Plus 2026/2027**.
Temas oficiais: Better Together e Something's Off.

## Fase 02: primeira fase cooperativa

A fase **A Boca da Noite** agora tem três personagens, cada um com habilidade que precisa ser coletada:
- **Téo (verde)**: salto duplo. Coletar energia verde e pressionar PULAR novamente durante um salto.
- **Lia (laranja)**: estilingue. Coletar item laranja e usar Q para atingir o alvo acima dos cipós.
- **Nino (azul)**: dash +40% durante 0,8 segundo e cooldown de 2 segundos. Coletar energia azul e usar Q.

Três desafios precisam ser resolvidos para a vitória:
1. **A Passagem Suspensa:** Téo alcança plataforma alta com salto duplo e aciona alavanca com E para abrir ponte.
2. **Os Cipós da Floresta:** Lia atira no alvo com Q; os cipós se recolhem.
3. **A Porta do Tempo:** Nino aciona o pedestal com E, atravessa com Q (dash) e aciona o interruptor final com E antes da porta fechar. A passagem se abre permanentemente.

O anfitrião valida posição, personagem, habilidade e progresso. Apenas ele pode decidir que os três desafios foram concluídos e que todos estão na saída. A vitória mostra **NINGUÉM FICA PARA TRÁS!**

Há checkpoints cooperativos compartilhados. Quem cai no abismo volta ao checkpoint mais recente.

## Arquitetura

- `src/network.ts` — PeerJS, três vagas, lobby, sincronização de movimento, autorização de ações, broadcast do estado de puzzles, reconexão por até 30 s, vitória autoritativa
- `src/puzzles.ts` — geometria e regras puras dos três desafios, timers, cooldowns e validação de progresso
- `src/game.ts` — cena Phaser com habilidades e obstáculos, física, gráficos, efeitos, plataformas e HUD
- `src/main.ts` — telas iniciais, lobby, HUD, direcional móvel multitoque, botões E e Q
- `src/style.css` — layout, cores e aviso de orientação
- `src/levels.ts` — estrutura nominal das cinco fases, com somente a primeira implementada
- `tests/puzzles.test.ts` — verificações automatizadas de permissões, habilidades, idempotência, timer e vitória
- `.github/workflows/pages.yml` — compile, test, build HTML5, artifact ZIP e GitHub Pages

**Sem Socket.IO, Express, backend próprio ou banco de dados.** PeerJS Cloud é usado só para sinalização; o gameplay usa WebRTC DataChannels com topologia estrela (anfitrião → dois convidados).

## Execução local

Requisito: Node.js 20.19+ ou 22+.

~~~bash
npm install
npm run dev
npm run build
npm run test:logic
~~~

A build estática `dist/` contém `index.html` e `assets/`; Vite está configurado com caminho relativo `./`.
Para o itch.io, compacte **o conteúdo** de `dist/` em ZIP e selecione projeto do tipo HTML. HTTPS é necessário para distribuição remota.

## Teste com três computadores ou celulares

1. Entre em https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/ nos três aparelhos.
2. Uma pessoa cria sala e envia o código de seis caracteres às outras duas.
3. Os outros escolhem ENTRAR EM SALA; todos marcam ESTOU PRONTO e o anfitrião inicia.
4. Coletem cada habilidade individual e ativem os três mecanismos cooperativamente.
5. Movimentação: A/D ou setas. PULAR: Espaço ou seta para cima. E: interagir. Q: usar habilidade. Controles virtuais E, Q, PULAR e direcional funcionam em celulares na horizontal.
6. Confiram que a ponte, os cipós, a porta, as habilidades e os checkpoints sincronizam nos três aparelhos. Façam os três entrar na região CASA para finalizar.
7. Testem o quarto navegador, desconexões de convidados, reconexão em até 30 segundos e redes móveis diferentes.

No GitHub, acesse Actions → Publicar jogo no GitHub Pages para ver resultados de compilação, teste de lógica, ZIP e deploy.

## Limitações e critérios de QA

- Testes automatizados de TypeScript, build e lógica não substituem testes reais de WebRTC em três dispositivos.
- O serviço PeerJS Cloud e o NAT de cada rede afetam conectividade; não há servidor TURN próprio.
- Os convidados simulam seu movimento localmente; o anfitrião valida ações conforme posições recebidas. Não é um sistema antitrapaça completo.
- A sincronização usa snapshots de posições a ~20 Hz e mensagens de mudança de puzzle; não transmite o cenário inteiro.
- Não há migração de anfitrião, persistência ou matchmaking.
- A compatibilidade do ZIP no iframe do itch.io depende de validação depois do upload.
- Nenhuma fase 03, inimigo ou habilidade além das três previstas foi implementada.
