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
  getUserPokemon,
} from "../services/pokemon.js";
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;

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
        const pokemon = await getRandomPokemonNameAndImage(senderName);
        if (pokemon) {
          const media = await MessageMedia.fromUrl(pokemon.imageUrl);
          await client.sendMessage(message.from, media, {
            caption: `Parabéns, você capturou: ${pokemon.name}`,
          });
        } else {
          message.reply(
            "Desculpe, ocorreu um erro ao buscar o Pokémon aleatório."
          );
        }
      } catch (error) {
        console.error("Erro ao obter Pokémon aleatório:", error);
        message.reply(
          "Desculpe, ocorreu um erro ao buscar o Pokémon aleatório."
        );
      }
      break;

    case "pokedex":
      try {
        const pokedex = await getUserPokemon(senderName); // Adicionado 'await' aqui
        let pokemonList;

        if (typeof pokedex === "string") {
          // Se for uma string, vamos converter para array
          pokemonList = pokedex.replace(/[\[\]']/g, "").split(", ");
        } else if (Array.isArray(pokedex)) {
          // Se já for um array, usamos diretamente
          pokemonList = pokedex;
        } else {
          throw new Error("Formato de Pokédex inválido");
        }

        const sortedPokedex = pokemonList.sort();
        const formattedPokedex = sortedPokedex
          .map((pokemon, index) => `${index + 1}. ${pokemon}`)
          .join("\n");
        const responseMessage = `Sua Pokédex:\n${formattedPokedex}`;
        await client.sendMessage(message.from, responseMessage);
      } catch (error) {
        console.error("Erro ao enviar Pokédex:", error);
        await client.sendMessage(
          message.from,
          "Desculpe, ocorreu um erro ao buscar sua Pokédex."
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
