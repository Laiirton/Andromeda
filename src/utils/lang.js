const menu = `
Você pode perguntar coisas ao coiso, tipo o chat gpt(Essa versão de modelo é politicamente correta). Basta digitar "coiso" e a pergunta. Exemplo: "coiso qual é a cor do céu?".
Se você tentar pedir algo que seja considerado contra os direitos humanos ele não vai responder.

*!fig*: 'Cria uma figurinha a partir de uma imagem ou vídeo de até 5 segundos.'
*!pokesystem*: 'Mostra informações detalhadas sobre o sistema de Pokémon.'
*!transcribe*: 'Use esse comando em um audio para transcrever o audio em texto.'
*!r34*: 'Busca uma imagem R34 aleatória ou com a tag especificada.'
*!nsfw*: 'Para exibir os comandos NSFW.'
*!img*: 'Envia a imagem original de uma figurinha. Responda a uma figurinha com este comando.'
*!delete*: 'Para pedir que ele delete a mensagem enviada.'

*Sistema de Níveis:*
*!levelsystem [on/off]*: 'Ativa ou desativa o sistema de níveis no grupo.'
*!level*: 'Mostra seu nível atual e estatísticas.'
*!rank*: 'Exibe o ranking dos top 10 usuários do grupo.'

`;

const menuNSFW = `
*!dick*: 
*!pussy*: 
*!ass*: 
*!ass*: 
*!futa*: 
*!hentai*: 
*!gay*: 
`;

const pokemonSystemInfo = `
*Sistema de Pokémon - Informações Detalhadas*

1. *Capturas:*
   - Você tem um limite diário de 20 capturas.
   - Use o comando !pokemon para capturar um Pokémon aleatório.
   - Há uma chance de 1/4096 de capturar um Pokémon shiny.
   - Pokémon lendários e míticos têm uma chance de 5% de aparecer.

2. *Pokedex:*
   - Use !pokedex para ver seus Pokémon capturados.
   - A Pokedex mostra 40 Pokémon por página.
   - Cada entrada mostra o nome do Pokémon, se é shiny, e quantos você tem.

3. *Companheiro:*
   - Use !companion [nome do Pokémon] para escolher um companheiro.
   - Seu companheiro evolui a cada 50 capturas.
   - A evolução adiciona o Pokémon evoluído à sua Pokedex.

4. *Sistema de Trocas:*
   - Inicie uma troca com !trade @usuário [nome do Pokémon].
   - Aceite uma troca com !accepttrade [nome do Pokémon].
   - Recuse uma troca com !rejecttrade.
   - Veja trocas pendentes com !pendingtrades.
   - As trocas expiram após 24 horas.

5. *Sistema de Sacrifício:*
   - Use !sacrificar [nome do Pokémon] para sacrificar um Pokémon.
   - Cada sacrifício concede 2 capturas extras.
   - Você pode fazer até 5 sacrifícios por dia.
   - Verifique seu status de sacrifícios com !sacrificiostatus.

6. *Raridades:*
   - Pokémon comuns: 100% de chance de aparecer.
   - Pokémon lendários/míticos: 5% de chance de aparecer.

Lembre-se: Divirta-se capturando, trocando e evoluindo seus Pokémon!
`;

export { menu, menuNSFW, pokemonSystemInfo };