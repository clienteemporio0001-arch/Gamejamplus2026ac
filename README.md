# A FLORESTA MENTE — Ninguém fica para trás

Protótipo cooperativo 2D da Game Jam Plus 2026/2027, com **exatamente três jogadores**: Téo (verde), Lia (laranja) e Nino (azul). Temas: Better Together / Something's Off.

## Tecnologias

- Phaser 3, TypeScript, Vite
- WebRTC DataChannels com PeerJS
- PeerJS Cloud para sinalização, sem backend próprio de gameplay
- Topologia estrela: convidado → anfitrião → convidados
- Build estática com caminhos relativos (base configurada como ./), adequada ao ZIP HTML Game do itch.io

## Executar

Requisitos: Node.js 20.19+ ou 22+.

~~~bash
npm install
npm run dev
~~~

Abra o endereço exibido pelo Vite. Para testes em outros dispositivos na rede local, use o IP LAN do computador e a porta informada. A publicação remota deve ser servida via HTTPS.

~~~bash
npm run build
npm run preview
~~~

Saída: pasta dist/, com index.html e pasta assets/. Para itch.io, compacte o conteúdo de dist/ (não a pasta pai) em ZIP e marque o projeto como HTML. Não inclui Node.js em produção.

## GitHub Pages

O workflow .github/workflows/pages.yml cria a build no push da branch main. Em GitHub → Settings → Pages → Build and deployment, selecione GitHub Actions. Após o deploy concluído, a URL esperada será:

https://clienteemporio0001-arch.github.io/Gamejamplus2026ac/

O link só estará utilizável quando GitHub Pages tiver sido ativado e a ação executada com sucesso.

## Teste com três aparelhos

1. Anfitrião acessa o endereço HTTPS e seleciona CRIAR SALA. O código só aparece depois de o PeerJS Cloud registrar o ID.
2. Envie o código de seis caracteres aos convidados. Cada um acessa o mesmo endereço no próprio aparelho.
3. Convidados clicam ENTRAR EM SALA e digitam o código; ocupam Lia e Nino.
4. Os três clicam ESTOU PRONTO; o anfitrião clica INICIAR JOGO.
5. Cada um anda com A/D ou ←/→ e pula com Espaço/↑; no celular, controle virtual.
6. Confira que os personagens remotos se movem em todas as telas. Os três devem chegar juntos à área CASA.
7. Teste quarto navegador com o código para conferir sala cheia. Teste desconexão e reconexão antes de 30 segundos.

## Arquitetura

- src/network.ts: salas, vagas, validação, sincronização a 20 Hz, reconexão e conclusão pelo anfitrião
- src/game.ts: cena Phaser, colisões, física local, floresta temporária, objetivo, interpolação
- src/main.ts: menu, lobby, criação/entrada na sala, código, controles multitoque, HUD
- src/style.css: interface responsiva e aviso de rotação
- vite.config.ts: build estática com caminhos relativos
- .github/workflows/pages.yml: publicação automática

## Limitações conhecidas

- O PeerJS Cloud depende de sinalização pública. O P2P pode falhar em redes NAT/CGNAT ou firewalls, já que não há TURN configurado.
- O anfitrião é autoridade do estado compartilhado, mas as posições dos convidados vêm da simulação local (sem servidor antitrapaça).
- Não há migração de anfitrião, banco, persistência ou matchmaking.
- Vaga de convidado reservada por até 30 segundos, com página do anfitrião aberta.
- Controles móveis e iframe do itch.io precisam ser validados em dispositivos reais após a publicação.
- Esta é somente a fase demonstrativa, sem inimigos, chefes ou habilidades especiais.
