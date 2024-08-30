# Andromeda WhatsApp Bot

Meu projeto pessoal ❤️

Andromeda é um bot para WhatsApp que oferece diversas funcionalidades, incluindo a criação de figurinhas, transcrição de áudios, busca de imagens NSFW, e muito mais.

## Funcionalidades

- **Criação de Figurinhas**: Cria figurinhas a partir de imagens ou vídeos de até 5 segundos.
- **Transcrição de Áudios**: Transcreve áudios em texto usando a API Whisper.
- **Busca NSFW**: Busca imagens NSFW de diversas categorias.
- **Busca Rule34**: Busca imagens no site rule34.xxx.
- **Envio de Imagens**: Envia a imagem original de uma figurinha.
- **Deleção de Mensagens**: Deleta mensagens enviadas.
- **Agendamento de Mensagens**: Envia mensagens agendadas para um grupo específico.

## Estrutura do Projeto

- `src/index.js`: Ponto de entrada do bot. Inicializa o cliente do WhatsApp e configura os eventos.
- `src/services/mediaService.js`: Contém funções para manipulação de mídia, como criação de figurinhas e envio de imagens.
- `src/services/whisper.js`: Contém a função para transcrição de áudios usando a API Whisper.
- `src/services/googleAIService.js`: Contém funções para interação com a API do Google Generative AI.
- `src/services/ollama.js`: Contém a função para gerar respostas usando a API Ollama.
- `src/utils/whatsappClient.js`: Inicializa o cliente do WhatsApp.
- `src/utils/lang.js`: Contém os menus de comandos.
- `src/utils/chatTools.js`: Contém funções utilitárias para manipulação de mensagens.
- `src/utils/messageScheduler.js`: Configura o agendamento de mensagens.
- `src/controllers/messageController.js`: Processa as mensagens recebidas e executa os comandos apropriados.

## Comandos Disponíveis

- `!fig`: Cria uma figurinha a partir de uma imagem ou vídeo de até 5 segundos.
- `!transcribe`: Use esse comando em um áudio para transcrever o áudio em texto.
- `!r34 [termo]`: Para buscar imagens no site rule34.xxx.
- `!nsfw [categoria]`: Para buscar imagens NSFW de uma categoria específica.
- `!img`: Envia a imagem original de uma figurinha. Responda a uma figurinha com este comando.
- `!delete`: Para pedir que ele delete a mensagem enviada.
- `!menu`: Exibe o menu de comandos.
- `!groups`: Exibe a lista de grupos.



## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
