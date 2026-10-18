# A FLORESTA MENTE — Créditos e licenças

## Projeto

**A FLORESTA MENTE — MAS O VENTO NÃO.**
Proposta cooperativa original do projeto, desenvolvida com apoio de ferramentas
de inteligência artificial na programação e elaboração de efeitos procedurais.
Este documento registra tecnologias e fontes identificadas no repositório,
sem atribuir a autoria a pessoas não verificadas.

## Bibliotecas utilizadas

- **Phaser 3** — motor de jogo, licenciado sob MIT.
- **PeerJS** — rede/WebRTC, licenciado sob MIT.
- **TypeScript** — linguagem/ferramentas, licenciado sob Apache-2.0.
- **Vite** — ferramentas de build, licenciado sob MIT.
- **Nunito** — fonte utilizada pelo CSS via Google Fonts, família
  distribuída sob SIL Open Font License; verificar avisos da versão efetivamente
  recebida pelo navegador.

Licenças e avisos de copyright das dependências permanecem aplicáveis.
A ausência de uma pasta de licenças consolidada neste repositório **não**
substitui a obrigação de manter os avisos exigidos em eventual distribuição.

## Visuais e sons

Os elementos vetoriais de personagens, árvores, plataformas e efeitos dos
quatro biomas são desenhados/gerados pelo próprio código do projeto. Existem
também SVGs em `public/assets`. Os efeitos de áudio adicionados usam
**Web Audio API** e síntese local, sem importar gravações de terceiros.

## Trilha sonora original — Etapa 25 (18/10/2026)

Cinco composições instrumentais **criadas especificamente para este jogo**
por síntese programática e arranjo de notas no código-fonte
`scripts/compose_soundtrack.py`. As faixas finais são arquivos MP3
reproduzíveis, gravados em `public/audio/`, não nomes ou caminhos vazios.

| Arquivo | Cena | Duração musical aproximada |
|---|---|---|
| `boca_da_noite.mp3` | Fase 1 — fantasia misteriosa | 96 s |
| `floresta_temporal.mp3` | Fase 2 — piano e texturas de chuva | 87,3 s |
| `caminho_das_arvores.mp3` | Fase 3 — aventura e percussão | 69,8 s |
| `floresta_em_chamas.mp3` | Fase 4 — cordas graves, coral sintetizado sem palavras, percussão | 76,8 s |
| `depois_das_cinzas.mp3` | Encerramento — melodia lenta e esperançosa | 82,3 s |

**Origem:** geração determinística original em Python/NumPy,
instrumentos de síntese implementados no próprio script, codificação
por FFmpeg/LAME. Nenhuma gravação, loop, sample, melodia de terceiros,
música de filme ou jogo foi incorporado à composição.

**Licença de uso:** utilização, exibição e redistribuição dessas faixas
como parte de **A FLORESTA MENTE** e das versões oficiais do jogo,
incluindo GitHub Pages e itch.io, autorizadas para este projeto.
Esta autorização **não** inclui direitos sobre músicas comerciais
ou materiais não incorporados. Os créditos pessoais de composição
não são atribuídos a terceiros sem comprovação.

Os parâmetros e tamanhos de cada peça estão em
`public/audio/manifest.json`. O código da geração fica disponível no
repositório e a produção é repetível no workflow
`.github/workflows/soundtrack.yml`. O gerenciador centralizado
`src/soundtrack.ts` carrega arquivos sob demanda, preservando
fade-in/fade-out, loop e controles locais.

Os efeitos de vento, chuva, fogo, passos e habilidades continuam
sintetizados via Web Audio API e **não** fazem parte dos MP3;
a mixagem de música, ambiente e SFX usa volumes separados.

## Fontes externas / cuidados

Não foi encontrada trilha comercial pré-existente no projeto.
Ao incorporar futuras imagens, músicas, vozes ou efeitos externos,
registrar a fonte, autor, licença e condições de redistribuição aqui.

Não usar cópias de sprites de jogos comerciais, arquivos com marca-d'água
ou gravações sem direitos de uso demonstráveis.
