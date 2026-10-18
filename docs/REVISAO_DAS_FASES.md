# A FLORESTA MENTE — Guia de revisão após a Etapa 20

## Referência de recuperação

Versão preservada antes do polimento: branch `backup/etapa19-estavel-20261018`,
commit `129fdccb7ad7424fae293a1f38f067c7676e5a64`.
A implementação e a publicação seguem pela branch `main`. Este ramo de backup
não deve ser sobrescrito nas revisões seguintes.

## Quatro biomas, independentes

| Aventura | Geometria, perigos e regras | Cena e apresentação | Efeitos e auxiliares |
|---|---|---|---|
| 01 — A Boca da Noite | `src/forestLoop.ts` | `src/forestLoopScene.ts` / `src/visuals.ts` | `src/loopWind.ts`, `src/forestLoopUI.ts` |
| 02 — A Floresta Temporal | `src/temporalForest.ts` | `src/temporalForestScene.ts` / `src/visuals.ts` | `src/temporalRain.ts`, `src/temporalGuidance.ts` |
| 03 — Caminho das Árvores | `src/treetopForest.ts` | `src/treetopForestScene.ts` / `src/treetopArt.ts` | `src/treetopWindAudio.ts` |
| 04 — Floresta em Chamas | `src/burningForest.ts` | `src/burningForestScene.ts` / `src/burningForestArt.ts` | `src/burningForestAudio.ts` |

**Compartilhados:** `src/network.ts` controla progressão 01→02→03→04,
o anfitrião e as mensagens de sincronização; `src/main.ts` controla a interface
e as opções; `src/sharedCharacterArt.ts` desenha Téo, Lia e Nino; `src/pipoGuide.ts`
e `src/pipoHints.ts` fornecem dicas; `src/loopVitals.ts` contém vida/estamina;
`src/mobileControls.ts` contém os controles touch; `src/audioSettings.ts` e
`src/sharedAudio.ts` implementam preferências e áudio procedural.

Os **quatro mundos da nova aventura** são distintos dos protótipos
**FASE CLÁSSICA 1–4**. Alterações na nova Fase 04 não devem modificar o protótipo
clássico Fase 4.

## Como revisar sem misturar versões

1. Menu → **Ferramentas de Desenvolvimento** → **TESTAR FASE 0X**.
2. Os testes iniciam no modo solo, em estado inicial válido: 1=Téo, 2=Lia, 3=Nino.
3. Opções (⚙) → **PAINEL DE TESTES**: coordenadas do personagem, ciclo/estado e
   conclusão dos mecanismos. Comandos **Reiniciar** e **Adiantar ciclo/apagão**
   estão disponíveis apenas para uma partida solo iniciada pelo painel de desenvolvimento.
4. Testar na prática cada sequência cooperativa com troca manual de personagem;
   o painel não conclui puzzles automaticamente.
5. Depois de cada modificação, executar `npm run build` e
   `npm run test:logic`; revisar o GitHub Actions antes de publicar.
6. Validar desktop e Android horizontal, toque múltiplo, som após gesto,
   fullscreen com e sem permissão, morrer/reiniciar e progressão online.

## Limites e pendências declaradas

Os testes automáticos validam contratos, lógica e geometria, mas **não**
comprovam que as quatro fases são concluíveis numa partida completa. É
necessário playtest manual contínuo em modo solo e com três navegadores,
principalmente para latência do PeerJS, colisões, distância real de interações,
travas de progressão, quedas, controles e FPS em Android.

O áudio consiste em **ambientes e efeitos procedurais leves**; não há
trilha sonora musical completa nem pacotes externos de efeitos.
`src/treetopWindAudio.ts` e `src/burningForestAudio.ts` usam as mesmas
preferências de efeitos, mas são camadas sonoras próprias de cada fase.
As configurações funcionam sem recarregar a partida. Algumas políticas do
navegador impedem autoplay e fullscreen.

**Nesta etapa de polimento não são alteradas geometrias, dificuldades ou puzzles.**
Cada próxima revisão deve tratar **uma fase por vez**, preservando os mundos
das outras três e o jogo clássico. 
