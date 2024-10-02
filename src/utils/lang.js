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


Observações sobre as trocas:
- As trocas só podem ser iniciadas em grupos.
- Você só pode ter uma proposta de troca pendente por vez.
- Você só pode trocar Pokémon que possui em sua coleção.
- Após iniciar uma troca, o outro usuário receberá uma notificação e poderá aceitar ou recusar.
- As trocas pendentes expiram após 24 horas.
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

5. *Trocas por Capturas:*
   - Use !tradecaptures para trocar um Pokémon por 2 capturas extras.
   - Você pode fazer até 5 trocas por dia.
   - Verifique seu status de trocas com !tradestatus.

6. *Raridades:*
   - Pokémon comuns: 100% de chance de aparecer.
   - Pokémon lendários/míticos: 5% de chance de aparecer.

Lembre-se: Divirta-se capturando, trocando e evoluindo seus Pokémon!
`;

export { menu, menuNSFW, pokemonSystemInfo };