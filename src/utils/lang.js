const menu = `
*🤖 Comandos Gerais:*
• *coiso [pergunta]*: Faça perguntas ao assistente AI (versão politicamente correta).
• *!fig*: Cria uma figurinha a partir de uma imagem ou vídeo de até 5 segundos.
• *!img*: Envia a imagem original de uma figurinha (responda a uma figurinha com este comando).
• *!transcribe*: Transcreve o áudio de uma mensagem de voz (responda a um áudio com este comando).
• *!delete*: Solicita a exclusão da mensagem enviada pelo bot.

*🎮 Sistema de Níveis:*
• *!levelsystem [on/off]*: Ativa ou desativa o sistema de níveis no grupo.
• *!level*: Mostra seu nível atual e estatísticas.
• *!toprank*: Exibe os 5 usuários de maior nível com detalhes e fotos de perfil.

*🐾 Sistema Pokémon:*
• *!pokemon*: Captura um Pokémon aleatório.
• *!poggerdex*: Para ver todos os seus Pokémon capturados pelo site.
• *!companion [nome]*: Escolhe um Pokémon como seu companheiro.
• *!trade @usuário [pokémon]*: Inicia uma troca de Pokémon.
• *!accepttrade [pokémon]*: Aceita uma proposta de troca.
• *!rejecttrade*: Recusa uma proposta de troca.
• *!pendingtrades*: Lista suas trocas pendentes.
• *!sacrificar [pokémon]*: Sacrifica um Pokémon para reduzir o tempo de espera.
• *!sacrificiostatus*: Verifica seu status de sacrifícios.
• *!captureall*: Captura todos os Pokémon disponíveis de uma vez.
• *!stats [pokémon]*: Exibe as estatísticas de um Pokémon específico.
• *!pokerarity [tipo]*: Lista seus Pokémon por raridade (legendary, mythical, normal).


*ℹ️ Informações:*
• *!pokesystem*: Exibe informações detalhadas sobre o sistema de Pokémon.
• *!menu*: Mostra esta lista de comandos.

*🔞 Conteúdo NSFW:*
• *!nsfw*: Exibe os comandos NSFW disponíveis (use com responsabilidade).

*Nota:* Alguns comandos podem ter restrições de uso ou cooldowns. Use-os com moderação!
`;

const menuNSFW = `
*🔞 Comandos NSFW:*
• *!dick*: Envia uma imagem aleatória de pênis.
• *!pussy*: Envia uma imagem aleatória de vagina.
• *!ass*: Envia uma imagem aleatória de bunda.
• *!futa*: Envia uma imagem aleatória de futanari.
• *!hentai*: Envia uma imagem aleatória de hentai.
• *!gay*: Envia uma imagem aleatória de conteúdo gay.
• *!boobs*: Envia uma imagem aleatória de seios.
• *!r34 [tag]*: Busca uma imagem específica no Rule34.
• *!r34random*: Envia uma imagem aleatória do Rule34.

*Aviso:* Estes comandos são apenas para maiores de 18 anos. Use com responsabilidade e apenas em chats apropriados.
`;

const pokemonSystemInfo = `
*🌟 Sistema de Pokémon - Informações Detalhadas*

1. *📊 Capturas:*
   • Limite diário de 20 capturas.
   • Use *!pokemon* para capturar aleatoriamente.
   • Chance de 1/4096 para Pokémon shiny.
   • 5% de chance para lendários e míticos.

2. *📱 Pokédex:*
   • *!pokedex* mostra seus Pokémon capturados.
   • 40 Pokémon por página.
   • Exibe nome, status shiny e quantidade.

3. *🐾 Companheiro:*
   • *!companion [nome]* para escolher um companheiro.
   • Evolui a cada 50 capturas.
   • Evolução adiciona o Pok��mon à sua Pokédex.

4. *🔄 Sistema de Trocas:*
   • *!trade @usuário [pokémon]* para iniciar troca.
   • *!accepttrade [pokémon]* para aceitar.
   • *!rejecttrade* para recusar.
   • *!pendingtrades* para ver trocas pendentes.
   • Trocas expiram após 24 horas.

5. *💠 Sistema de Sacrifício:*
   • *!sacrificar [pokémon]* sacrifica um Pokémon.
   • Cada sacrifício dá 2 capturas extras.
   • Máximo de 5 sacrifícios por dia.
   • *!sacrificiostatus* para ver seu status.

6. *🎭 Raridades:*
   • Comuns: 100% de chance.
   • Lendários/Míticos: 5% de chance.

7. *📊 Estatísticas:*
   • *!stats [pokémon]* para ver detalhes de um Pokémon.

8. *🗂 Listagem por Raridade:*
   • *!pokerarity [tipo]* lista Pokémon por raridade.
   • Tipos: legendary, mythical, normal.

9. *🔄 Captura em Massa:*
   • *!captureall* captura todos os Pokémon disponíveis de uma vez.

10. *🌐 PoggerDex Manager:*
   • *!poggerdex* gera código de acesso ao site.
   • Código válido por 24 horas.
   • Acesse: https://poggerdex.vercel.app
   • Gerencie sua Pokédex online.
   • Visualize estatísticas detalhadas.
   • Interface web amigável.

Divirta-se capturando, trocando e evoluindo seus Pokémon! 🎉
`;

export { menu, menuNSFW, pokemonSystemInfo };
