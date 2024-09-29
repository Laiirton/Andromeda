import {
  sendSticker,
  sendImage,
  sendNSFWImage,
  searchRule34,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import { menu, menuNSFW } from "../utils/lang.js";
import {
  deleteMessage,
  messageLog,
  printGroupList,
} from "../utils/chatTools.js";
import { ollamaGenerate } from "../services/ollama.js";
import { whisperTranscription } from "../services/whisper.js";
import {
  getRandomPokemonNameAndImage,
  getUserPokemon
} from "../services/pokemon.js";
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import { addToQueue } from "../utils/requestQueue.js";

const EMPTY_PROMPT_ERROR = "O prompt não pode estar vazio.";
const PROMPT_REPLY = "Oi, você precisa me dizer o que deseja.";

async function handleGenerativeAI(
  message,
  senderName,
  keyword,
  generateResponse
) {
  try {
    let prompt;
    const quotedMessage = await message.getQuotedMessage();

    if (quotedMessage) {
      prompt = `${quotedMessage.body.trim()} ${message.body
        .replace(new RegExp(keyword, "i"), "")
        .trim()}`;
    } else {
      prompt = message.body.replace(new RegExp(keyword, "i"), "").trim();
    }

    if (!prompt) {
      message.reply(PROMPT_REPLY);
      throw new Error(EMPTY_PROMPT_ERROR);
    }

    console.log(
      `[${new Date().toLocaleString()}] Gerando resposta para o prompt: ${prompt}`
    );
    const response = await generateResponse(prompt);

    console.log(
      `[${new Date().toLocaleString()}] Úsuario ${senderName} solicitou uma resposta para o prompt: ${prompt} e recebeu a resposta: ${response}`
    );
    message.reply(response);
  } catch (error) {
    console.error(
      `[${new Date().toLocaleString()}] Erro ao gerar resposta: ${
        error.message
      }`
    );
  }
}

async function handleCommand(client, message, command) {
  const contact = await message.getContact();
  const senderName = contact.pushname;

  switch (command) {
    case "transcribe":
      const quotedMessage = await message.getQuotedMessage();
      const media = await quotedMessage.downloadMedia();
      const audioBuffer = Buffer.from(media.data, "base64");
      const transcription = await whisperTranscription(audioBuffer);
      console.log("Transcription result:", transcription);
      await message.reply(transcription);
      break;

    case "fig":
      await sendSticker(client, message, senderName);
      break;

    case "img":
      await sendImage(client, message);
      break;

    case "delete":
      await deleteMessage(message, senderName);
      break;

    case "pussy":
    case "ass":
    case "dick":
    case "futa":
    case "hentai":
    case "yaoi":
    case "boobs":
    case "gay":
      await sendNSFWImage(client, message, senderName, command);
      break;

    case "r34":
      let prompt = message.body.slice(5).trim();
      await searchRule34(client, message, senderName, [prompt]);
      break;

    case "menu":
      message.reply(menu);
      break;

    case "nsfw":
      message.reply(menuNSFW);
      break;

    case "groups":
      await printGroupList(client);
      break;

    case "pokemon":
      try {
        const result = await addToQueue(() => getRandomPokemonNameAndImage(senderName));
        if (result.error) {
          message.reply(result.error);
        } else {
          const media = await MessageMedia.fromUrl(result.imageUrl);
          await client.sendMessage(message.from, media, {
            caption: `Parabéns, ${senderName}! Você capturou um ${result.name}!\nCapturas restantes: ${result.capturesRemaining}`,
          });
        }
      } catch (error) {
        console.error("Erro ao obter Pokémon aleatório:", error);
        message.reply(
          "Desculpe, ocorreu um erro inesperado. Tente novamente mais tarde."
        );
      }
      break;

    case "pokedex":
      try {
        const result = await addToQueue(() => getUserPokemon(senderName));
        if (result.error) {
          message.reply(result.error);
        } else {
          const media = new MessageMedia('image/png', result.pokedexImage.toString('base64'), 'pokedex.png');
          const caption = `Essa é a sua Pokédex, ${senderName}! Você já capturou ${result.pokemonCount} Pokémon!`;
          await client.sendMessage(message.from, media, { caption });
        }
      } catch (error) {
        console.error("Erro ao enviar Pokédex:", error);
        message.reply(
          "Desculpe, ocorreu um erro ao buscar sua Pokédex. Tente novamente mais tarde."
        );
      }
      break;

    default:
      message.reply(
        "Invalid command, try !menu to see the available commands."
      );
  }
}

export async function processMessage(client, message) {
  const contact = await message.getContact();
  const senderName = contact.pushname;

  // Log the all messages sended
  messageLog(message, senderName);

  // Generative AI Sistem
  if (message.body.toLowerCase().includes("coiso")) {
    await handleGenerativeAI(message, senderName, "coiso", getGeminiResponse);
  }

  if (message.body.toLowerCase().includes("porrinha")) {
    await handleGenerativeAI(message, senderName, "porrinha", ollamaGenerate);
  }

  // Command Handler
  if (message.body.startsWith("!")) {
    const [command] = message.body.toLowerCase().slice(1).split(" ");
    await handleCommand(client, message, command);
  }
}
