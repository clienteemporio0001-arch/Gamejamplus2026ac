# A FLORESTA MENTE — Roteiro definitivo de quatro fases

**Game Jam Plus 2026/2027**, multiplayer cooperativo para três jogadores, Phaser 3 + TypeScript + Vite + PeerJS/WebRTC. A quinta etapa de desenvolvimento não cria uma quinta fase de aventura.

## Jogar

https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/

Abrir em três navegadores, um jogador cria a sala e compartilha o código de seis caracteres. Todos marcam PRONTO e o host inicia. A introdução é sincronizada. A/D ou setas para andar; Espaço ou seta ↑ para pular (inclusive salto duplo); **E** para interagir/apoio; **J** para a baladeira de Lia e **Shift** para o dash de Nino. Celulares possuem botões touch.

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

**Obrigatório testar em três navegadores/aparelhos reais:** escalada sincronizada e salto sobre amigos; progresso de cipós; abismo/ponte; perdas de vida e reinício; latência de ações E/J/Shift; reconexão e progressão para fases 2–4. Testes unitários validam regras, não garantem geometria ou experiência real. Não existe migração de anfitrião, backend próprio, persistência entre partidas nem simulação Arcade de colisão entre corpos remotos: o suporte usa vínculos verificados pelo anfitrião. As vidas foram implementadas no capítulo 1 e a base de estado pode ser reutilizada nas outras fases, mas os perigos das fases 2–4 não utilizam corações nesta versão.

Arte/áudio: visuais vetoriais desenhados proceduralmente no Phaser, sem vídeo externo, sem arquivos de arte gerados por IA ou áudio de terceiros nesta etapa.

## Etapa 06 — Segunda fase ampliada: A Travessia dos Cipós

O roteiro definitivo continua tendo QUATRO fases. A primeira fase permanece com 4.300 pixels, Caboquim, salto duplo, apoio dos três personagens, árvore-ponte e sobrevivência. Foi acrescentado um degrau natural intermediário na Árvore Gigante para viabilizar a subida aos galhos altos.

A Fase 2 agora carrega JourneyScene (Phaser) e JourneyAuthority, separando a exploração das antigas regras compactas de RiverScene/RiverAuthority, que continuam no repositório para regressão.

O novo mapa possui 4.300 pixels e seis regiões: Margem do Rio, Árvore dos Cipós, Primeira Travessia, Ilha das Raízes, Ponte Suspensa e Outra Margem.

Os objetivos são: Téo usa salto duplo e apoio dos amigos para pegar material na copa; Lia solta cipó com estilingue; Nino busca o último cipó usando dash; os três coletam 3/3 materiais. Téo fixa uma ponta no alto, Lia solta o contrapeso, Nino ativa a passagem temporária com E, atravessa usando dash e fixa a outra ponta com E. As cordas e madeiras descem em 2,1 segundos, e a ponte recebe colisão física apenas quando o encaixe está concluído.

Na Ilha das Raízes, dois troncos flutuantes recebem posições calculadas e transmitidas pelo anfitrião. A correnteza é fatal. Cobras e galhos causam um coração de dano com invulnerabilidade breve. O desafio final exige Nino segurando a placa, Lia acertando o alvo distante com J e Téo acionando a corda superior com E. A ponte final desce antes de tornar-se sólida; após a conclusão todos podem sair da posição de cooperação.

As fases 1 e 2 compartilham o módulo src/survival.ts para dano, invulnerabilidade e reinício coletivo. Morrer reinicia apenas a fase corrente, restaurando corações, materiais, posições, checkpoints e pontes; as habilidades permanentes permanecem desbloqueadas após o primeiro capítulo. O anfitrião valida os puzzles, controla os riscos e autoriza a passagem Fase 2 para Fase 3.

As novas regras estão em src/riverJourney.ts; o cenário em src/journeyScene.ts. O protocolo em src/network.ts aceita coordenadas até x=4300 nas duas primeiras fases, mantém WebRTC/PeerJS e sincroniza materiais, vida, pontes, reconexão e posições dos troncos em mensagens tipadas. src/effects.ts mantém estilingue e dash visíveis nos demais aparelhos inclusive fora do limite x=1200.

### Build e qualidade

Executar npm install, npm run build e npm run test:logic. O GitHub Actions verifica build e suítes de lógica antes do deploy automático. O conteúdo estático da pasta dist permanece compatível com empacotamento HTML5 do itch.io.

Importante: os testes de autoridade, percurso e cálculo de alcance não substituem o teste da Fase 2 com três pessoas/navegadores. Validar especialmente apoio físico, colisão das tábuas temporárias, troncos móveis com latência, morte na correnteza, reinício simultâneo, mobile e transição para Olhos na Mata. O apoio usa vínculo de posição simplificado pelo anfitrião; não simula rigidbodies remotos completos. Sem migração de host ou backend próprio.

## Correção após teste real — cipós sem reação (Etapa 06.1)

No teste com três navegadores, o HUD de Téo ainda dizia **Procure Caboquim** e o grupo chegou ao abismo com **CIPÓS 0/3**. A regra existente só habilitava a coleta dos cipós após os três jogadores concluírem o diálogo com Caboquim, mas a floresta não bloqueava a passagem até o abismo nem explicava por que os itens não podiam ser coletados.

Agora há **barreiras físicas visíveis**: uma após Caboquim, liberada quando o diálogo termina, e outra antes dos mecanismos da árvore final, removida quando os três cipós forem coletados. Os checkpoints respeitam o progresso, impedindo salvamento além de tarefas incompletas. Os itens usam cores de seus donos (verde Téo, laranja Lia, azul Nino), um marcador mostra onde Nino deve iniciar o dash, e uma dica contextual em tela acompanha a tarefa atual.

**Passo a passo:** reúna os três no Caboquim próximo da entrada e avance as falas com CONTINUAR/E; Téo ganha o salto duplo. Na árvore, Nino fica como base, Lia sobe com E, Téo sobe em Lia com E, salta e alcança o cipó alto. Lia deve atirar J olhando para a DIREITA, à esquerda de seu cipó. Nino inicia SHIFT+→ sobre a marca azul **antes** do cipó e corre através dele; a janela de coleta aceita até 1,75s de latência. O contador deve subir para 3/3; só então a barreira das raízes desaparece e os três podem ativar os mecanismos da árvore-ponte.

Os testes de lógica cobrem desbloqueio, pré-requisitos de checkpoints, instruções, distância e tempo do dash de Nino. A abertura real das barreiras no Phaser e o percurso físico continuam exigindo reteste nos três navegadores.

## Controles corrigidos (17/10/2026)

No computador: **Espaço OU ↑ = pular/salto duplo**, **Shift esquerdo/direito = dash de Nino**, **J = baladeira de Lia**, **E = interagir** e **A/D ou ←/→ = movimentar**. Q deixou de ativar habilidades; W deixou de pular. Para o celular permanecem os botões virtuais, com rótulo J ou SHIFT conforme o personagem.

As teclas de ação usam captura pelo window antes do foco dos botões HTML, com proteção contra auto-repeat (um keydown gera no máximo um salto). Ao trocar de fase ou perder o foco, comandos pendentes são limpos. A introdução tem botão **PULAR INTRODUÇÃO** fixo no canto superior direito, coordenando o avanço pelo anfitrião para os três jogadores.


## ETAPA 07-A — Overhaul visual dark (sem alterar gameplay)

As fases 1 e 2 receberam cenário noturno com quatro planos visuais, céu cinematográfico, lua e feixes de luz discretos, silhuetas de árvores gigantes com raízes, vegetação densa, cipós e folhagens de primeiro plano, sombras, névoa, vagalumes e folhas caindo. As fases 3 e 4 reutilizam o mesmo núcleo artístico com variações de clima; não foram recriados os puzzles nem o mapa jogável.

O código de decoração está em src/visuals.ts e os auxiliares matemáticos sem dependência de Phaser em src/visualMath.ts. Camadas distantes usam scrollFactor 0.23/0.49/0.76, a camada física mantém scrollFactor 1. Árvores e solo são desenhados em lotes Phaser Graphics (sem imagens gigantes), mantendo até 24 pontos de luz, 14 folhas e 6 bancos de névoa no PC; em tela touch/estreita, no máximo 10 vagalumes, 6 folhas e 3 bancos de névoa. Coordenadas cosméticas seguem seeds estáveis. Nenhum dado visual passa pela conexão P2P.

Colisão conservada: os retângulos de Phaser Arcade Physics continuam exatamente no mesmo tamanho e posição; um Graphics é desenhado SOBRE cada plataforma/ponte/corpo e segue seu x/y, ângulo, opacidade e visibilidade, incluindo pontes temporárias e troncos móveis. Os personagens têm silhuetas distintas (chapéu verde de Téo; cabelo e traje laranja de Lia; capuz azul de Nino), mas os retângulos de colisão permanecem 30×44. O primeiro plano tem transparência baixa e fica atrás dos personagens e dos elementos principais do HUD. Os alertas de galhos ganharam marcação pulsante de chão; cobras, rio e onça ganharam contraste e contorno.

Nenhum asset externo foi importado, nenhuma dependência adicional foi criada, e não há recursos de arte gerados por IA incorporados nessa etapa. A geometria, narrativa, checkpoints, desbloqueios, rede WebRTC, controles, transições e build itch.io continuam sob os mesmos contratos.

Os testes automatizados incluem matemática/limites de partículas e inspeção de integração das cenas; o resultado da build não comprova desempenho de GPU, legibilidade perfeita ou FPS mobile. Ainda é indispensável verificar visualmente as quatro fases em PC e celular, inclusive neblina sobre objetivos, plataformas móveis, colisões habilitadas e ações dos três personagens em redes diferentes.
