# A FLORESTA MENTE — MAS O VENTO NÃO

## Etapa 22 — Fase 1 expandida e plataforma suspensa

A Fase 01, **A Boca da Noite**, mede agora **11.400 pixels**. O grupo nasce
na clareira central (x=5600–5720), podendo explorar ambos os sentidos.
Árvore oca (x=1300), pedra rachada (x=3450) e arco de madeira (x=4750)
ficaram separados por segmentos de terreno, pequenas fendas com apoios,
galhos opcionais e obstáculos que alternam nos estados A/B/C.
A ordem da Etapa 21 (Téo → Lia → Nino) continua exigida pela autoridade.
Após os marcos, **os três** devem alcançar juntos a trilha verdadeira
(árvore oca no estado B, pedra rachada nos estados A/C); a rota incorreta
continua devolvendo a equipe à clareira.

**Novo desafio (x≈7780–8750):** na margem inicial de um abismo de 700 px,
Lia sobe em Nino com E e Téo sobe em Lia. A partir do apoio, Téo precisa
saltar duas vezes, aterrissar no galho superior e acionar E na alavanca.
A plataforma suspensa desliza até uma posição parcial. Lia acerta a trava
suspensa com J; o tronco desliza novamente. Nino usa dash + E na fixação
da **mesma margem**, e o tronco chega à posição final, oferecendo colisão
somente quando estabiliza. Todos atravessam para a **árvore-ponte original**
(x≈9465–9825), que preserva seu puzzle de amarras. Os últimos mecanismos
e a saída ficam no setor x≈10520–11360.

As transformações de 60 segundos preservam as etapas resolvidas.
A posição e os booleanos da plataforma são estados do anfitrião, enviados
aos convidados/reconexões. O rastreamento de dano por queda foi alinhado
aos mesmos segmentos e plataformas físicos desenhados na cena.

**Interface compartilhada:** 🦜 DICA e ⚙ OPÇÕES agora fazem parte de uma
barra única, no canto inferior direito do desktop e em uma linha abaixo
de tela cheia nos celulares em modo horizontal. Tecla H e configurações
de áudio/desenvolvimento foram preservadas.

**Arquivos principais:** `src/forestLoop.ts`, `src/forestLoopScene.ts`,
`src/forestLoopUI.ts`, `src/fallDamage.ts`,
`src/missionChapters.ts`, `src/pipoHints.ts`, `src/network.ts`,
`src/main.ts`, `src/style.css`.
**Testes:** `tests/forestLoop.test.ts`, `tests/loopEnvironment.test.ts`,
`tests/stage15.test.ts`, `tests/stage21Missions.test.ts`,
`tests/pipoHints.test.ts`, `tests/interface.test.ts`,
`tests/stage22Expansion.test.ts`.

**Limitação:** `npm run build` e `npm run test:logic` verificam
compilação, estados, colisões teóricas e regras do anfitrião. Não substituem
partidas completas num navegador, teste manual da temporização do salto,
3 clientes PeerJS simultâneos e desempenho num celular real.

---

## Etapa 21 — Missões cooperativas encadeadas

**Fase 01:** os marcos de descoberta agora exigem Téo (árvore oca) → Lia (pedra rachada) → Nino (arco, dash + E). A autoridade do anfitrião valida cada ação. Fora de ordem, o mecanismo não conclui nem aparece como o objetivo atual. Após os três, o grupo deve se reunir na trilha correta indicada pelo vento: **árvore oca no estado B e pedra rachada nos estados A/C**. A travessia é simultânea; rotas falsas e mudanças A/B/C permanecem funcionando. Elementos de raízes e folhagens passam a revelar visualmente a passagem física, em vez de um portal mágico.

**Todas as fases:** `src/missionChapters.ts` deriva sequências de objetivos e falas a partir de `LoopWorld`, `TemporalWorld`, `TreeWorld` e `FireWorld` reais. `src/missionDirector.ts` compara snapshots autorizados, marca a conclusão com reação do personagem perto dele, partículas leves e um destaque discreto no próximo mecanismo. Pipo anuncia a próxima tarefa em fila, depois da reação do personagem, e os avisos urgentes de perigo continuam prioritários. `src/main.ts` mostra o objetivo atual no HUD. Nenhum banco de dados, IA extra, teleporte individual ou autoridade paralela foi criado.

**Multiplayer e reconexão:** o progresso é carregado dos estados já sincronizados pelo anfitrião; ao ingressar ou reconectar, o snapshot inicial é hidratado silenciosamente, sem reapresentar todas as falas antigas. O modo solo conserva os três personagens e a troca manual entre eles.

**Limites:** missões secundárias das fases 2–4 seguem as regras de dificuldade e ordem já estabelecidas; a Etapa 21 adiciona ações/repercussões narrativas, não substitui os mecanismos. Não há confirmação de conclusão por um percurso manual de cada fase ou por partida online com três dispositivos. Testes automatizados e validações de código são executados no GitHub Actions. É necessário testar em navegador e Android antes de considerar todas as fases integralmente jogáveis.

---

## Etapa 20 — base visual e técnica para revisar as quatro fases

A aventura principal mantém **01 A Boca da Noite → 02 A Floresta Temporal →
03 Caminho das Árvores → 04 Floresta em Chamas**, com encerramento cooperativo.
A implementação da **Etapa 20 não altera as geometrias nem as regras dos puzzles**.

- **Menu:** duas entradas principais (Jogar Sozinho / Multiplayer Online), convite
  com código, Como Jogar, Configurações, Créditos e ferramentas de desenvolvimento
  recolhidas em uma seção secundária. Fundo animado com folhas e névoa.
- **Personagens:** `src/sharedCharacterArt.ts` centraliza formas, proporções e
  animações dos três amigos nas quatro fases e no prólogo. Os retângulos da
  física Arcade continuam com as dimensões originais.
- **Pipo:** dicas de todas as fases, prioridade para alertas de perigo,
  progressão de ajuda e redução de mensagens repetidas.
- **HUD:** estado A/B/C, ciclo, vento, objetivo, três corações e estamina de
  cada amigo; no solo, o personagem ativo é destacado. A Fase 4 mostra seu
  ciclo de fogo e não inventa apagões ausentes no bioma.
- **Áudio:** síntese procedural de ambientes e efeitos via Web Audio API,
  com volumes de música ambiente, efeitos e botão de silenciar. Não há
  trilha comercial nem necessidade de API externa. Respeita gesto de autoplay.
- **Mobile:** joystick analógico multitouch já existente, botões e safe areas
  preservados. O prólogo agora adapta zoom à tela sem distorcer sua proporção.
- **Desenvolvimento:** ao iniciar uma fase pelo painel de testes, surge uma
  opção interna com posição, estado/ciclo e status dos mecanismos. Reinício,
  troca de personagem e avanço de ciclo são restritos ao solo de teste.
- **Créditos e revisão:** consulte
  `docs/CREDITOS_E_LICENCAS.md` e `docs/REVISAO_DAS_FASES.md`.

**Ponto de restauração anterior:** branch `backup/etapa19-estavel-20261018`,
commit `129fdccb7ad7424fae293a1f38f067c7676e5a64`.
Esta referência fica intacta para permitir comparação futura.

**Validação automatizada:** `npm run build` e `npm run test:logic`, exigidos
pela publicação em `.github/workflows/pages.yml`.
**Pendente:** percurso manual completo nas quatro fases, multiplayer real com
três dispositivos, validação visual, FPS e controles em Android horizontal.
Passar nos testes automáticos não comprova ausência de softlocks.

**Versão HTML5:** https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/

---

# A FLORESTA MENTE — MAS O VENTO NÃO

## Etapa 15 — joystick analógico, escalada em dois galhos e queda perigosa

**Controles:** o mobile substituiu os botões direcionais por joystick analógico virtual à esquerda, com raio limitado e zona morta de 15%. A manopla acompanha o dedo, gera `TouchInput.moveX` normalizado entre −1 e +1 e volta ao centro ao soltar, cancelar ou perder foco. Outro dedo continua podendo pressionar PULAR, E ou a habilidade. Téo não tem botão de habilidade redundante. O teclado continua digital e tem prioridade quando há A/D ou setas. O joystick não aumenta a velocidade máxima e os botões de habilidade continuam sujeitos à autoridade. Os protótipos clássicos mantêm compatibilidade via flags left/right sintetizadas a partir do eixo.

**Escalada:** na Boca da Noite e na Floresta Temporal, Téo precisa do apoio Nino→Lia→Téo, depois salto duplo ao galho intermediário e outra sequência de salto duplo ao galho superior. O segundo patamar é uma plataforma Arcade real, com colisão de cima e verificações autoritativas separadas. Nenhum único salto ou salto duplo partindo diretamente do chão chega ao topo. A amarra só pode ser liberada com E em cima do galho superior, validado no anfitrião. A fase 1 moveu o alvo distante de Lia para x2560, do outro lado do canal, alcançável por um disparo a partir da margem esquerda em x≈2220, sem alterar alcance nem custo de estamina. Não há novos cenários, AI ou alterações na física.

**Dano por queda:** `src/fallDamage.ts` deriva o limite seguro das constantes atuais de física: velocidade inicial 465, gravidade 850, alcance vertical por salto ≈127px; a referência de duas sequências completas é ≈509px. O host acompanha a posição mínima no ar e só considera dano quando ocorre contato estável com solo/galho/ponte realmente ativa. Cada aterrissagem perigosa tira **um coração**, com invulnerabilidade de 1,2s já existente, efeitos locais discretos e reinício coletivo quando chega a zero. Água profunda e abismo continuam fatais independentemente dos corações. Sem dano técnico depois de blackout, teleporte, reconexão ou reset: a trajetória de queda é invalidada nesses casos; suportes humanos não criam queda falsa. Nenhuma estamina adicional é cobrada no pouso. Todas as três poses são observadas no solo e nas sessões online; convidados não enviam campos arbitrários de dano.

**Limitação:** o anfitrião observa as poses autorizadas pelas conexões, mas não replica integralmente o Arcade remoto; um cliente modificado ainda poderia manipular seu movimento reportado. A solução atual evita aceitar valores de dano declarados pelo convidado e usa a geometria conhecida do servidor. As mudanças de escalada e joystick exigem playtest visual em Android e em três navegadores para confirmar a ergonomia e ausência de softlocks.

Verificações: `npm run build` e `npm run test:logic`, com `tests/stage15.test.ts` e regressões adaptadas para os novos galhos.

---


## Etapa 14 — hotfix de controle e clareza da Floresta Temporal

Foi removido o listener destrutivo de troca de personagem em src/main.ts. O touch pad tem estado de montagem explícito: ensureMobileControls() verifica integridade e remonta somente se não existir; updateMobileCharacter() altera o botão de habilidade e a seleção sem destruir os botões de movimentação, pulo e E; unmountMobileControls() encerra os listeners somente no menu, prólogo ou transição. A função mountMobilePad usa event delegation nos botões, captura IDs de toque individuais e remove listeners em shutdown, evitando vazamentos na troca de cena/reinício. A mesma instância de controle serve às Fases 1 e 2. Fullscreen e rotação atualizam o viewport sem reload.

A transição Fase 01 → Fase 02 usa painel fixo ao viewport com margens seguras, fontes responsivas e altura máxima; não utiliza mais porcentagens sobre o container de jogo de altura zero. Em paisagem, Opções e ⛶ Tela Cheia são dois ícones com alturas iguais na mesma faixa superior direita; o menu de opções abre abaixo, dentro do viewport, e pode rolar caso necessário.

Os três primeiros marcos da Floresta Temporal agora possuem arte própria de **ÁRVORE ENCHARCADA** (Téo usa E numa plataforma de madeira molhada), **PEDRA FENDIDA** (Lia precisa atirar J a partir da esquerda, na fenda) e **ARCO DE RAÍZES** (Nino dá dash desde a esquerda e pressiona E perto da raiz). Os indicadores são ancorados às coordenadas reais da autoridade e exibem rótulo/dica apenas quando o personagem correto está próximo. Um ✓ discreto permanece no mecanismo já concluído, enquanto a missão superior mostra Marcos 0/3 a 3/3. Isso não altera física, estamina, chuva, apagões ou cooperação.

Verificar com `npm run build` e `npm run test:logic`, incluindo `tests/mobile14.test.ts`. Testes automatizados de código não substituem a validação visual de 915×412, 844×390, 740×360 e 1280×720 nem o teste físico em Android.

---


## Etapa 13 — mobile responsivo (Fases 01 e 02)

O Phaser agora utiliza `Phaser.Scale.RESIZE` com o viewport real (por exemplo 844×390, 915×412 ou 740×360). O canvas ocupa a tela inteira em vez de encaixar uma renderização fixa de 1200×700 com faixas laterais. A câmera ajusta SOMENTE o zoom e suas legendas fixas ao resize; os mundos, gravidade (850), salto (-465), velocidade, colisões, poses e puzzles permanecem nas coordenadas originais. O mesmo ajuste atua na Boca da Noite e na Floresta Temporal.

O novo componente compartilhado `src/mobileControls.ts` desenha direção esquerda/direita no canto inferior esquerdo e E/PULAR/habilidade contextual no canto inferior direito; não há botão de habilidade separado para Téo. Para Lia aparece TIRO; para Nino aparece DASH. IDs de pointer independentes permitem segurar uma direção enquanto outro dedo pula/atira/dá dash. Eventos pointerup, pointercancel, lostpointercapture e pointerleave, além de blur, orientação e perda de visibilidade, limpam os dedos presos; pulos rápidos são armazenados até consumo da próxima atualização física. Troca solo pelos pequenos botões T/L/N junto à borda inferior; no multiplayer esses botões não existem.

No celular paisagem, os três mini-cards de vida/estamina ficam no topo entre estado/relógio e objetivo; o personagem ativo fica destacado. Vento/chuva e avisos continuam disponíveis, mas o centro da tela fica livre de interface permanente. O menu mantém rolagem vertical; a gameplay bloqueia gestos de scroll somente na superfície jogável. Posicionamento considera safe-area do aparelho.

O botão TELA CHEIA faz a solicitação nativa somente mediante toque. A trava de orientação paisagem é solicitada de forma opcional, quando compatível; o browser pode negar fullscreen/orientation lock. A tela permanece responsiva mesmo nessa situação e o aviso GIRE O CELULAR PARA JOGAR aparece em retrato sem desconectar a sessão. A barra do navegador não pode ser escondida forçadamente em todos os aparelhos.

Valide com `npm run build` e `npm run test:logic`. A suíte `tests/mobile13.test.ts` verifica as dimensões, isolamento de ponteiros, ações simultâneas, HUD, câmera, fullscreen e regressão de rede em código. A aprovação dessa suíte não equivale a verificar screenshots ou FPS em um aparelho real.

---


## Etapa 12 — Fase 02: A Floresta Temporal

**Aventura principal:** Fase 01 — A Boca da Noite → transição cinematográfica de 5 segundos → Fase 02 — A Floresta Temporal. Ao entrar todos os três na saída do mapa 1, o anfitrião sincroniza a transição e carrega o segundo mundo em vez de encerrar a partida. Os jogadores mantêm as personagens e habilidades; no início da Fase 2, todos recebem três corações e 100 de estamina. Morrer na tempestade reinicia só o novo mapa, não a Boca da Noite.

**Início direto para testes:** menu principal → Ferramentas de desenvolvimento → **TESTAR FASE 02 · FLORESTA TEMPORAL**. As fases clássicas continuam listadas em separado como protótipos antigos. Em solo: 1=Téo, 2=Lia, 3=Nino; Espaço/↑ para pular, E para interação/apoio, J para baladeira, Shift para dash. Sob ⚙ Opções: reiniciar Fase 2, adiantar apagão e voltar. Multiplayer entra pela sala padrão, iniciando na Boca da Noite e avançando com os três jogadores.

**Mapa independente:** `src/temporalForest.ts` contém autoridades e geometria de 4200px, e `src/temporalForestScene.ts` contém uma nova cena Phaser. Região A: Clareira Encharcada; B: Mata Alagada; C: Bosque dos Troncos; D: Grande Correnteza; E: Passagem da Tempestade. Os três começam no centro do terreno inicial, com exploração nos dois sentidos. A direita, uma barreira só libera o caminho depois das três leituras de marcos na esquerda.

**Chuva e vento:** `src/temporalRain.ts` define chuva permanente em três camadas, respingos e ondulações. As gotas são calculadas em coordenadas do mundo, não com x/facing do personagem; `tempWind` orienta a inclinação a partir da próxima ação cooperativa e do estado A/B/C. Objetos gráficos são desenhados em lote, com orçamento reduzido quando a tela é estreita. Chuva mais forte no estado C; ilustrações Phaser originais de troncos gigantes, névoa azulada, canais, raízes, madeira molhada e reflexos. Visual e colisão são componentes separados.

**Transformação:** layout A → B → C a cada 60 segundos, seguido de apagão de 2 segundos. Obstáculos saltáveis e portões de colisão realmente se alteram por layout; algumas poças aumentam/deslocam-se, uma plataforma temporária fica acessível em C e os três não ficam dentro de uma parede recém-ativada. Progresso dos marcos, amarras e raízes persiste depois de cada transformação. Lama desacelera para 145px/s; chão molhado tem desaceleração gradual, enquanto chão normal mantém o deslocamento padrão. Poças rasas não dão dano; a correnteza profunda (x2610–2970) é fatal abaixo da margem segura.

**Primeiro puzzle:** três marcos entre x870 e x1630, usando Téo/E em patamar, Lia/J em alvo e Nino/Shift+E após dash. A região seguinte libera a árvore encharcada sobre o canal profundo. Lia sobe em Nino e Téo sobe em Lia (E). Téo usa salto duplo da torre para pousar no galho alto em (2440,325) e soltar a amarra; Lia dispara num cipó distante; Nino usa dash para soltar a raiz. Após as três ações, a árvore cai durante 1,9 segundo, cria uma ponte com colisão e libera a travessia real.

**Raízes da Tempestade:** na margem leste há três travas distintas em x3240, 3530 e 3800. Só podem ser ativadas no estado C: Téo alcança um patamar elevado, Lia dispara na segunda raiz e Nino executa dash antes de acionar a terceira. Uma passagem enganosa no estado A/B retorna os três à clareira segura; a chuva indica recuar. A última porta abre depois de todas as travas em C, e só então a equipe inteira pode alcançar a saída da Fase 2. Tela de conclusão: “VOCÊS VENCERAM A TEMPESTADE! Mas a floresta ainda não revelou todos os seus caminhos...”. Não há Fase 3 automática.

**Multiplayer:** `Network` mantém `experience='loop'`, agora usando `level=1|2` dentro da mesma aventura. O anfitrião controla timer, layouts, barreiras, puzzles, dano fatal, estamina, vidas e conclusão. Os convidados recebem snapshots tipados `temporal` e a fase/poses no login ou reconexão. O modo solo mantém três corpos físicos sem IA.

**Testes:** `npm run build` e `npm run test:logic`. A nova suíte `tests/temporalForest.test.ts` cobre os três layouts, danos, timing, portões, água, lama, vento, chuva, habilidades, escada humana, pontes, passagem falsa, restart na Fase 2, vitória, cena e protocolos. Testes automáticos não demonstram um percurso inteiro concluído manualmente, FPS de celular nem latência de WebRTC em três dispositivos; essas validações ainda requerem playtests. Alguns efeitos de tempestade e as indicações visuais de puzzle podem precisar de refinamento.

---


## Etapa 11-B — Vida, estamina e sobrevivência na floresta mutável

Os três personagens da **nova aventura** possuem três corações e 100 pontos de estamina individual. As vidas, os gastos, a recuperação e o reinício são controlados por LoopAuthority no anfitrião (ou na autoridade local do Modo Solo). Os protótipos clássicos continuam usando suas próprias regras anteriores.

A tabela de custos está centralizada em src/loopVitals.ts: caminhar/E/troca = 0; pulo = 10; salto duplo de Téo = +20; baladeira de Lia = 25; dash de Nino = 35. A regeneração inicia após 800 ms do último gasto, com 12 pontos/seg caminhando e 22 pontos/seg parado, sempre limitada a 100, usando deltas de tempo do host. Apagões, morte, desconexão ou pausa suspensa não fornecem energia grátis.

Pulos, tiros e dash agora passam pelo protocolo de solicitação individual (vital-action, vital-reply) e são autorizados pelo anfitrião **antes** da aplicação de movimento/efeito no cliente. A conexão autenticada determina o personagem, os valores de estamina não podem ser enviados pelo convidado, solicitações repetidas são rejeitadas e cooldowns não descontam energia. O anfitrião controla o estado de LoopWorld (health, stamina, safeUntil, lastSpent), sincronizado nos snapshots loop de qualquer sessão e também durante a reconexão.

O HUD compacto mostra os três nomes, três corações e barras proporcionais para os três personagens. O atual é destacado, níveis baixos ficam âmbar, falta de estamina gera feedback discreto junto ao personagem. Dano não fatal (API da autoridade para perigos compatíveis futuros) tira um coração e concede 1,2 segundo de invulnerabilidade, piscando o sprite. Não foram criados inimigos novos: na nova aventura o abismo é o perigo fatal já presente, e a queda da árvore em área de impacto também é fatal. Cobras, ataques de predadores e armadilhas comuns **não estão implementados na nova aventura**; suas regras antigas não foram transplantadas nem simuladas. Ao perder todos os corações ou sofrer fatalidade, os três aguardam breve transição e reiniciam com vida e energia restauradas, no estado A, na clareira central e com puzzles zerados. Apagões regulares preservam todos os recursos.

Para testar energia: abra JOGAR SOZINHO, selecione 1/2/3; use Espaço/↑, J e Shift. Cada recurso diminui apenas depois da autorização e se regenera ao descansar. Para testar dano fatal: alcance o abismo sem a ponte e caia; aparece UM AMIGO CAIU NA FLORESTA / NINGUÉM FICA PARA TRÁS e o mundo reinicia. Não há perigo não fatal na nova aventura que permita perder somente um coração durante um playtest normal nesta etapa; a API de dano gradual é coberta por testes unitários. Os três dispositivos devem mostrar o mesmo HUD graças às mensagens do host. Uma partida real com três navegadores e validação de barras no mobile continuam necessárias.

Validação: npm run build e npm test. Suite adicional tests/loopVitals.test.ts. Observação técnica: o host valida os pedidos de pulo usando as poses reportadas pelos convidados e verificações de janela temporal/velocidade, mas não reconstrói por completo a física Arcade remota; por isso um teste multiplayer real com latência ainda é necessário.

---


## Etapa 11 — marcos, vento ambiental e escalada obrigatória

Os marcos iniciais agora têm arte SVG original ancorada ao solo de y=638: árvore oca de 235×320 com raízes, pedra rachada 155×104 com colisão estática 120×91 e arco retorcido 244×182 com abertura livre. Seus brilhos de interação seguem as coordenadas da autoridade. Assets adicionais: public/assets/loop-stone.svg, public/assets/loop-arch.svg e public/assets/loop-elevated-tree.svg. A árvore oca existente tem base alinhada ao solo; sua plataforma de galho mantém colisão física.

O vento foi separado do movimento do jogador em src/loopWind.ts. Folhas, cipós e névoa utilizam âncoras de mundo e a direção determinística de windGuide para cada região. A direção não depende de x, facing, velocidade do jogador ou movimento da câmera. São objetos leves do Phaser que continuam animados com o personagem parado; clientes de uma mesma região compartilham a orientação lógica.

A árvore do abismo ganhou uma plataforma one-way em (2140,325) com tamanho 156×20. O galho só colide por cima, e o centro do personagem ao aterrissar fica em y=293. A gravidade é 850 e o impulso de salto -465; um salto atinge ≈127px e dois atingem ≈254px. Do chão em repouso y=616 até o galho são 323px, inalcançáveis com salto duplo sem cooperação. A torre Nino→Lia→Téo coloca Téo em y≈528; o salto duplo daí vence os 235px exigidos. O degrau antigo em (2108,550) foi removido.

A autoridade da partida só libera a primeira amarra após Nino apoiar Lia, Lia apoiar Téo, Téo se soltar de uma torre válida ao lado da árvore, e o host reconhecer pouso estável no alto. Além desses marcos, a interação E ainda exige corpo dentro da plataforma e muito próximo ao nó, com velocidade baixa. A memória de empilhamento sozinha não conclui a tarefa. Lia continua acertando sua amarra com J e Nino continua usando Shift e E. A árvore cai apenas após as três ações e a colisão da ponte permanece sincronizada.

A dica de Téo agora diferencia a formação (E), o salto duplo partindo dela (Espaço duas vezes) e a interação no galho (E). O menu e o HUD da Etapa 10 continuam preservados.

Teste manual: em JOGAR SOZINHO, conclua os três marcos e o portal correto. Na base da árvore do abismo, posicione Nino perto de x2160; selecione Lia (2) e pressione E perto de Nino. Selecione Téo (1), pressione E perto de Lia e depois Espaço para sair do apoio com o primeiro salto. Pressione Espaço novamente no ar, pouse no galho alto e use E na amarra. Depois complete as amarras de Lia (J) e Nino (Shift+E), aguarde a queda e atravessem juntos. A altura física é validada por simulação em testes, mas o percurso ainda precisa de confirmação jogada em navegadores reais.

Arquivos-chave: src/forestLoop.ts, src/forestLoopScene.ts, src/forestLoopUI.ts, src/loopWind.ts, tests/loopEnvironment.test.ts e tests/forestLoop.test.ts. Execute npm run build e npm run test:logic antes de publicar.

---


## Etapa 10 — interface enxuta e sessões de rede estáveis

- **Menu principal:** apenas **JOGAR SOZINHO** (Network.startLoopSolo) e **MULTIPLAYER ONLINE** (Network.createRoom('loop')) como ações destacadas; **ENTRAR COM CÓDIGO** aparece secundariamente para convidados. As quatro fases antigas estão em **FERRAMENTAS DE DESENVOLVIMENTO**, dentro de uma seção recolhível, sem serem apresentadas como capítulos da floresta mutável. O multiplayer da versão clássica também permanece acessível nessa área técnica.
- **HUD principal:** estado A/B/C e tempo no canto superior esquerdo; objetivo progressivo de uma linha e progresso no canto superior direito; direção resumida do vento abaixo do relógio; personagem e habilidade no canto inferior. Téo/Lia/Nino podem ser trocados com 1/2/3 no solo (botões compactos também na tela touch).
- **Cenário limpo:** removidas dezenas de legendas permanentes e os avisos de grande comprimento da nova cena Phaser. A orientação é calculada por funções puras em \`src/forestLoopUI.ts\`, e só aparece no mundo se o personagem estiver perto de um mecanismo relevante. Os nomes das quatro regiões surgem durante 2 segundos após a entrada. As marcações de cor, colisões, árvores SVG originais, iluminação e parallax permanecem.
- **Painéis:** REINICIAR TENTATIVA, ADIANTAR APAGÃO e VOLTAR AO MENU só aparecem ao expandir **Opções** na floresta mutável solo. A barra solo das fases clássicas também foi compactada e as ações secundárias estão sob ⚙.
- **Rede e navegação:** \`Network.sessionEpoch\` identifica cada sessão e impede que handlers e promises pendentes de PeerJS publiquem eventos após saída, retorno ao menu ou troca de modo. Callbacks de host, guest e DataChannel conferem época/objeto e \`shuttingDown\`; shutdown limpa token temporário, timers e referências. Ao sair, o aviso da sessão anterior também é limpo na interface. Falhas reais durante uma sessão ativa continuam visíveis.
- **Build/testes:** execute \`npm run build\` e \`npm test\` (alias de \`npm run test:logic\`). O GitHub Actions usa os dois antes de publicar; \`tests/interface.test.ts\` valida modo principal, área técnica, HUD, dicas, câmera, proteção de sessão e regressões. A validação unitária não substitui screenshots de desktop/celular e uma partida com três redes reais.

---

## Etapa 09 — clareira central, geometria auditada e arte original

**Spawn da aventura mutável:** Téo (1840,606), Lia (1900,606), Nino (1960,606), sobre chão contínuo, com enquadramento central da câmera. É possível caminhar à esquerda para investigar ÁRVORE OCA (x=700), PEDRA RACHADA (x=1000) e TRONCO EM ARCO (x=1260). À direita, uma parede em x=2070 bloqueia o atalho até a árvore-ponte. Ela só é ultrapassada pelo portal correto, que deposita o grupo com segurança em x=2120/2159/2198, antes do abismo.

**Bifurcações reais:** portais separados em x=790 e x=1460 levam ao setor da árvore ou devolvem à clareira central (x=1840 etc.). A escolha certa é determinada pelos estados A/B/C; o vento indica o portal correto. As rochas baixas de cada configuração se alternam em x=1360/1540/875, com altura de 96px, inferior à altura alcançável de um salto (aproximadamente 127px), não impedindo a exploração. O apagão remove apoios temporários e reposiciona os três na clareira se alguém estiver dentro de um obstáculo recém-solidificado. Amarras, ponte, marcos e saída não são apagados.

**Física/cooperação:** alvo de Téo em x700 usa plataforma rebaixada em y546, acessível por salto. A marca do dash de Nino da árvore foi colocada em x≈2120 após a parede permanente. Os outros alvos continuam nos locais originais à direita para preservar a ponte física de x2265 a x2625. A condição de vitória continua exigindo os três na saída, com todas as travas resolvidas.

**Sincronização inicial do multiplayer:** anteriormente o host enviava um snapshot de estado antes de comunicar que a introdução havia acabado. Convidados que ainda estavam em `intro` descartavam essas posições. Agora, apenas na experiência mutável, o host comunica a fase `playing` primeiro, inicializa os convidados com `LOOP_START` central e envia as poses autorizadas em seguida. A versão clássica mantém a sequência original.

**Visual:** foram criados sprites SVG originais em `public/assets/clearing-tree.svg` (árvore monumental da clareira) e `public/assets/hollow-tree.svg` (marco reconhecível), carregados localmente pelo Phaser. A clareira recebeu brilho difuso; tintas, raízes, rochas físicas e atmosfera mudam de A para B e C. O céu, as árvores e a névoa do NightArt continuam usando planos de parallax. Essas artes são vetoriais manuais, sem recursos protegidos ou imagens de terceiros e sem imagens geradas por IA.

**Validação:** rode `npm run build` e `npm run test:logic`. O conjunto `tests/forestLoop.test.ts` testa nascimento, trajetos esquerda/direita, amplitude de salto, obstáculos e portal seguro, sequência A/B/C, vento, retorno aparente, cooperação, apagão, persistência e condições de vitória. Os testes de código verificam invariantes geométricos e não substituem um playtest completo em navegadores reais, incluindo performance mobile e três redes WebRTC. O som ambiente permanece como polimento futuro.

---



**Protótipo principal da Game Jam Plus 2026/2027.** Jogo cooperativo 2D de memória e desorientação ambiental, com Phaser 3, TypeScript, Vite e PeerJS/WebRTC.

**JOGAR:** https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/

## Aventura prioritária: uma fase, quatro setores

No menu, escolha **JOGAR SOZINHO** para controlar Téo, Lia e Nino manualmente, ou **MULTIPLAYER ONLINE** para criar uma sala de três participantes. A aventura ocupa um mundo único de 3800 pixels dividido em Entrada, Trilha Repetida, Abismo e Saída Real. **VERSÃO CLÁSSICA / TESTES** preserva as quatro fases antigas.

A floresta muda entre estados **A → B → C → A** a cada 60 segundos, precedidos de 10 segundos de vento mais forte e um apagão de aproximadamente 2 segundos. O anfitrião pausa a física, escolhe a próxima configuração predefinida e transmite o estado da floresta aos convidados. As barreiras têm colisão física que realmente muda; os outros jogadores nunca escolhem configuração por conta própria.

O vento indica a passagem correta conforme o estado e os desafios já resolvidos. Duas passagens especiais, da árvore oca e da pedra rachada, podem devolver os três amigos a regiões conhecidas. Uma rota falsa não mata ninguém, apenas consome tempo. Para atravessar, os três devem estar próximos, sobre chão seguro e sem impulso excessivo.

**Desafio de memória:** observe ÁRVORE OCA, PEDRA RACHADA e TRONCO EM ARCO antes do primeiro apagão. Depois, Téo confirma a árvore com E, Lia atinge a pedra com J e Nino realiza SHIFT seguido de E perto do arco. O progresso é preservado após as transformações.

**Árvore-ponte:** primeiro, Nino para na base da árvore, Lia se apoia nele com E, e Téo sobe em Lia com E. Téo se solta com Espaço para alcançar o patamar superior; o apoio é posicional e validado pela autoridade (não usa corpos remotos rígidos). Após esse marco cooperativo, Téo solta a primeira amarra com E, Lia atira na segunda com J e Nino solta a raiz com SHIFT + E. Uma árvore visível inclina e cai por 1,9 segundo antes de receber colisão de ponte sobre o rio. A correnteza e a queda no abismo são fatais: todos reiniciam a aventura no estado A.

**Saída:** no quarto setor, os mesmos três personagens liberam três mecanismos complementares. A saída verdadeira abre após as três ações quando a floresta está no estado C. A vitória exige os três na passagem final. Nenhum puzzle é completado automaticamente.

## Controles e teste solo

A/D ou ←/→ = mover; Espaço ou ↑ = pular (Téo tem salto duplo); E = interagir; J = baladeira de Lia; Shift = dash de Nino. No modo solo, 1/2/3 alternam personagens sem IA, com botões de troca no celular. REINICIAR TENTATIVA restaura a nova aventura; ADIANTAR APAGÃO acelera apenas o relógio de teste, sem completar desafios.

A lógica pura está em src/forestLoop.ts. O mundo físico e visual está em src/forestLoopScene.ts, utilizando NightArt e SoloBodies existentes. Network mantém uma escolha entre experiência nova e clássica, com estado autoritativo loop sincronizado por PeerJS/WebRTC quando online; solo não cria PeerJS.

O GitHub Actions executa npm run build e npm run test:logic antes de publicar HTML5 em GitHub Pages; a pasta dist permanece adequada para itch.io. Os testes unitários cobrem ciclos, rotas, vento, ações dos três jogadores, ponte, morte coletiva e vitória, mas não comprovam o percurso jogado em tempo real. Teste manual em PC e celular é necessário para avaliar FPS, navegação, portais e multiplayer sob latência. O áudio ainda pode ser aprimorado sem dependências de terceiros.

---

## Arquivo histórico — versão clássica das quatro fases

# A FLORESTA MENTE — Roteiro definitivo de quatro fases

**Game Jam Plus 2026/2027**, multiplayer cooperativo para três jogadores, Phaser 3 + TypeScript + Vite + PeerJS/WebRTC. A quinta etapa de desenvolvimento não cria uma quinta fase de aventura.

## Jogar

https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/

Abrir em três navegadores, um jogador cria a sala e compartilha o código de seis caracteres. Todos marcam PRONTO e o host inicia. A introdução é sincronizada. A/D ou setas para andar; Espaço ou seta ↑ para pular (inclusive salto duplo); **E** para interagir/apoio; **J** para a baladeira de Lia e **Shift** para o dash de Nino. Celulares possuem botões touch.

## Os quatro capítulos

1. **A Boca da Noite — mapa expandido 4.300px:** os três entram na mata, conversam com Guia Indígena (botão CONTINUAR ou E), e Téo adquire salto duplo. Lia já começa com estilingue e Nino com dash. Na Árvore Gigante, Nino fica na base, Lia se apoia nele por E e Téo se apoia em Lia por E; Téo salta para as plataformas superiores. Os jogadores coletam os três cipós (Téo na copa, Lia por disparo, Nino por dash). Na região final, Téo solta cipó no alto, Lia corta a amarra com o estilingue e Nino libera raiz com dash+E. A árvore cai por 1,9 segundos e vira ponte **com colisão física**. Três jogadores vivos atravessam juntos e avançam.
2. **A Ponte Quebrada / Travessia dos Cipós:** rio, mecanismos de Téo, Lia e Nino e ponte coletiva.
3. **Olhos na Mata:** onça, distração, mecanismos temporizados e checkpoints.
4. **A Trilha que Mente:** totens Lua→Folha→Estrela, placas enganosas, plataformas alternadas e saída cooperativa. O guardião final e a cinematografia de retorno para casa serão desenvolvidos mais tarde, *dentro da Fase 4*.

## Sistema de sobrevivência (primeira fase)

Todos têm três corações, controlados pelo anfitrião e sincronizados em `ForestWorld`. Cobras e galhos causam um coração de dano com 1,2s de invulnerabilidade. O aviso de galhos precede a queda. Cair no abismo provoca morte imediata. Ao zerar qualquer personagem: **UM AMIGO CAIU NA FLORESTA**, pausa cooperativa por ~3,2s e reinício coletivo da fase com três corações e habilidades iniciais de Lia/Nino. Téo reconquista o salto duplo ao falar novamente com Guia Indígena; depois da Fase 1, o salto duplo permanece habilitado.

## Apoio cooperativo

Vínculos simplificados **autoritativos pelo anfitrião**: Lia usa E perto de Nino parado na região de escalada, e Téo usa E perto de Lia já apoiada; os pés/corpos são posicionados a 44px de diferença vertical de forma estável em todos os aparelhos. O host valida identidade, posição, ordem, e não permite ciclos. Espaço solta o vínculo e inicia salto; E solta manualmente. O marco da escalada tríplice é necessário para coletar o cipó no alto. Não é uma simulação rígida geral de colisões entre três Arcade Bodies: suporte e posicionamento são vinculados e sincronizados; a robustez precisa ser confirmada manualmente com três dispositivos.

## Sincronização

- `src/network.ts`: PeerJS Cloud só para sinalização; jogabilidade P2P em WebRTC DataChannels. Slots com reconexão, lobby, habilidade e progresso autoritativos. Posições de x=0 até **4300** no nível 1; níveis 2–4 usam x até 1200; 20 snapshots/segundo.
- `src/forest.ts`: regras puras de Guia Indígena, estado de vida, invulnerabilidade, cadeia de apoios, cipós, árvore, checkpoints, reinício e vitória.
- `src/forestScene.ts`: cenário Phaser 4300px, câmera local, plataformas, física da ponte, Guia Indígena, cobras e galhos, HUD de corações.
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

O roteiro definitivo continua tendo QUATRO fases. A primeira fase permanece com 4.300 pixels, Guia Indígena, salto duplo, apoio dos três personagens, árvore-ponte e sobrevivência. Foi acrescentado um degrau natural intermediário na Árvore Gigante para viabilizar a subida aos galhos altos.

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

No teste com três navegadores, o HUD de Téo ainda dizia **Procure Guia Indígena** e o grupo chegou ao abismo com **CIPÓS 0/3**. A regra existente só habilitava a coleta dos cipós após os três jogadores concluírem o diálogo com Guia Indígena, mas a floresta não bloqueava a passagem até o abismo nem explicava por que os itens não podiam ser coletados.

Agora há **barreiras físicas visíveis**: uma após Guia Indígena, liberada quando o diálogo termina, e outra antes dos mecanismos da árvore final, removida quando os três cipós forem coletados. Os checkpoints respeitam o progresso, impedindo salvamento além de tarefas incompletas. Os itens usam cores de seus donos (verde Téo, laranja Lia, azul Nino), um marcador mostra onde Nino deve iniciar o dash, e uma dica contextual em tela acompanha a tarefa atual.

**Passo a passo:** reúna os três no Guia Indígena próximo da entrada e avance as falas com CONTINUAR/E; Téo ganha o salto duplo. Na árvore, Nino fica como base, Lia sobe com E, Téo sobe em Lia com E, salta e alcança o cipó alto. Lia deve atirar J olhando para a DIREITA, à esquerda de seu cipó. Nino inicia SHIFT+→ sobre a marca azul **antes** do cipó e corre através dele; a janela de coleta aceita até 1,75s de latência. O contador deve subir para 3/3; só então a barreira das raízes desaparece e os três podem ativar os mecanismos da árvore-ponte.

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


## ETAPA 07-B — Guia Indígena e árvore-ponte do abismo

- **Guia Indígena:** o antigo personagem com aparência fantástica foi substituído por um adulto humano desenhado com gráficos locais do Phaser, com cabelo escuro, rosto, braços, pernas, roupa de trilha e bolsa. Não utiliza indumentária específica ou referências estereotipadas. Respira discretamente e demonstra dois movimentos de salto como treinamento comum de Téo. As falas reais estão centralizadas em src/forestPresentation.ts, apresentadas no HTML e no Phaser conforme caboStep (nome da variável interna preservado por compatibilidade WebRTC).
- **Árvore única e persistente:** src/forestArt.ts desenha a árvore inteira em um container cujo pivô coincide com a margem esquerda (3528,645). Sempre visível antes da interação, ela mostra três cordas coloridas que desaparecem após a validação de Téo, Lia e Nino. Ao receber treeFallAt do anfitrião, gira suavemente em 1900ms. Quando bridge=true, fica deitada e visível sobre o rio, com a posição horizontal final alinhada ao collider Arcade 362×34 centrado em (3709,645). O retângulo físico existente ainda controla a colisão, mas sua imagem genérica fica oculta; não aparece uma segunda árvore.
- **Orientação clara:** HUD mostra CIPÓS 3/3 • AMARRAS 0/3, 1/3, 2/3 ou 3/3; depois da ativação mostra PONTE DE ÁRVORE PRONTA! ATRAVESSEM JUNTOS. Mensagens mudam pela progressão validada do anfitrião. Téo vê uma chamada E quando perto da alavanca verde (3310,390), Lia vê o alvo laranja para J (3460,574) e Nino recebe uma marca de arrancada SHIFT na faixa x=3260 antes da raiz azul (3425,590).
- **Alcance:** foi acrescentado um degrau natural em (3166,534) com tamanho 133×19, conectando o solo à plataforma da alavanca em (3298,428) sem alterar o collider original. A altura dos dois saltos cabe na física do Phaser (465px/s, gravidade 850px/s²). O disparo de Lia parte à esquerda do alvo, e Nino inicia o dash a x≈3260 e aciona E junto à raiz.
- **Persistência:** o desenho é derivado exclusivamente dos campos existentes treeSteps, treeFallAt e bridge. Uma reconexão recebe o snapshot do anfitrião e reconstrói a mesma árvore, inclusive a posição de ponte concluída. Nenhuma nova mensagem WebRTC, banco ou serviço foi necessário.
- **Requisitos preservados:** os controles são Espaço/↑ para pulo, J para o estilingue, Shift para o dash, E para interação, A/D ou ←/→ para movimentação e botões móveis equivalentes.

Verificações automatizadas: estado puro da árvore nas quatro situações, geometria alinhada ao retângulo Arcade, validação de ações pelos personagens, degrau acessível e referências públicas sem nome antigo. A árvore e o guia são produzidos com Phaser Graphics, sem assets baixados e sem alteração da lógica P2P.

Ainda é obrigatório testar visualmente em três navegadores e celular: antes/durante/depois da queda, posição da copa e cordas na câmera, latência das interações E/J/Shift, colisão real após 1900ms, avanço para a Fase 2 e renderização após reconexão. Testes unitários e build não substituem inspeção do canvas em execução.

## ETAPA 07-C — MODO SOLO DE TESTES, SEM IA

A página inicial permite escolher MULTIPLAYER ONLINE (inalterado) ou MODO SOLO — TESTES. Selecione diretamente qualquer uma das quatro fases ou assista à introdução antes da primeira fase. Não há código de sala, login nem conexão PeerJS no modo solo.

Controles no computador: 1 para controlar Téo, 2 para Lia, 3 para Nino; A/D ou setas esquerda/direita para mover; Espaço ou seta para cima para pular; E para interagir; J para o estilingue de Lia; Shift para o dash de Nino. Em telas móveis, existem botões individuais de seleção, movimento, PULAR, E e habilidade. O HUD identifica o personagem controlado e oferece REINICIAR FASE e VOLTAR AO MENU.

Cada personagem possui seu próprio Arcade Body, gravidade e colisões com as plataformas. Apenas o selecionado recebe comandos de movimento. Os outros não têm IA e não ativam habilidades por conta própria. A câmera passa a acompanhá-lo sem reiniciar a cena. O apoio dos amigos continua validado pelas mesmas regras cooperativas da partida online. As posições dos três são enviadas com seus próprios seats à autoridade local em vez de simular conexões WebRTC.

A sessão solo reutiliza as autoridades ForestAuthority, JourneyAuthority e ChapterAuthority por meio de Network.role solo. Não modifica as salas multiplayer. O seletor de fases, disponível exclusivamente fora de salas, restaura os puzzles e materiais corretos, dá as habilidades já obtidas no capítulo escolhido e bloqueia o salto duplo de Téo apenas no início da Fase 1. Ao morrer ou reiniciar, volta-se ao início da fase selecionada sem reiniciar o jogo inteiro.

Para um usuário alternando personagens, as janelas dos mecanismos temporizados foram ampliadas exclusivamente no modo solo por src/soloRules.ts (passagem da Fase 2: 18s; disparo final: 23s; Fases 3–4 também têm tempos maiores). O multiplayer continua usando seus valores anteriores. Os personagens ainda precisam realizar cada desafio com sua identidade correta.

Arquivos novos: src/soloBodies.ts, src/soloRules.ts e tests/solo.test.ts. Arquivos adaptados: src/network.ts, src/main.ts, src/forestScene.ts, src/journeyScene.ts, src/lateScene.ts, src/chapters.ts, src/riverJourney.ts, src/style.css, package.json.

Validação pendente: jogar manualmente os quatro capítulos em um navegador real para conferir colisões físicas dos três atores, troca durante o apoio, plataformas móveis, adequação dos temporizadores, checkpoints, morte e progressão. Um build ou teste de lógica aprovado não comprova conclusões jogáveis no browser.


## Etapa 07-C — Modo solo sem IA

No menu, clique MODO SOLO — TESTES e escolha uma das quatro fases, ou assista à introdução. Alterne manualmente com 1=Téo, 2=Lia e 3=Nino (também no celular). O personagem selecionado recebe os controles, a câmera segue seu corpo Arcade e os demais mantêm física, posição e colisões. Use A/D ou setas para mover; Espaço/↑ para pular; E para interagir; J para a baladeira de Lia; Shift para o dash de Nino.

O modo solo não cria PeerJS ou WebRTC. Reutiliza as autoridades das quatro fases, com temporizadores maiores exclusivamente para testes e botões REINICIAR FASE e VOLTAR AO MENU. A física local está em src/soloBodies.ts e o ajuste de tempo em src/soloRules.ts. A correção de atribuição em Network.act identifica o seat atualmente escolhido em modo solo, sem mudar o anfitrião online. Ainda é indispensável validar manualmente o percurso completo nas quatro fases com a troca de personagens, principalmente apoios e pontes móveis; build e testes de lógica não comprovam acessibilidade física dos desafios.
