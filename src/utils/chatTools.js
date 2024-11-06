/**
 * Deletes a quoted message.
 * @param {object} message - The message object.
 * @param {string} senderName - The name of the sender.
 */
export async function deleteMessage(message, senderName) {
  try {
    const quotedMessage = await message.getQuotedMessage();

    if (quotedMessage) {
      // Ensure the quoted message exists
      if (quotedMessage.fromMe) {
        // Check if you sent the quoted message
        await quotedMessage.delete(true); // Delete for everyone
        console.log(
          `Quoted message deleted for everyone by ${senderName} [${new Date().toLocaleString()}]`
        );
      } else {
        // If you didn't send the quoted message, delete for yourself
        await quotedMessage.delete(false); // Delete for me
        console.log(
          `Quoted message deleted for me by ${senderName} [${new Date().toLocaleString()}]`
        );
      }
    } else {
      console.log(
        `No quoted message to delete [${new Date().toLocaleString()}]`
      );
    }
  } catch (error) {
    console.error(
      `Error deleting message: ${error.message} [${new Date().toLocaleString()}]`
    );
    throw new Error("Failed to delete the message. Please try again later.");
  }
}

/**
 * Logs a received message.
 * @param {object} message - The message object.
 * @param {string} senderName - The name of the sender.
 */
export async function messageLog(message, senderName) {
  try {
    const chat = await message.getChat(); // Get the chat object
    const chatName = chat.isGroup ? chat.name : senderName; // Get chat name or sender name
    const isGroup = chat.isGroup; // Check if the chat is a group

    console.log(
      `Mensagem recebida ${
        isGroup ? 'no grupo' : 'em chat individual'
      } ${chatName} de ${senderName}: ${message.body} [${new Date().toLocaleString()}]`
    );
  } catch (error) {
    console.error(
      `Erro ao registrar mensagem: ${error.message} [${new Date().toLocaleString()}]`
    );
    throw new Error("Failed to log the message. Please try again later.");
  }
}

/**
 * Retrieves the list of groups.
 * @param {object} client - The WhatsApp client instance.
 * @returns {Array} - List of groups.
 */
async function getGroupList(client) {
  try {
    // Obtém todos os chats
    const chats = await client.getChats();

    // Filtra apenas os grupos
    const groups = chats.filter((chat) => chat.isGroup);

    // Mapeia os grupos para um array de objetos com nome e id
    const groupList = groups.map((group) => ({
      name: group.name,
      id: group.id._serialized,
    }));

    return groupList;
  } catch (error) {
    console.error("Erro ao obter lista de grupos:", error);
    throw new Error("Failed to retrieve the group list. Please try again later.");
  }
}

/**
 * Prints the list of groups.
 * @param {object} client - The WhatsApp client instance.
 */
export async function printGroupList(client) {
  try {
    const groups = await getGroupList(client);

    console.log("Lista de Grupos:");
    groups.forEach((group) => {
      console.log(`Nome: ${group.name}`);
      console.log(`ID: ${group.id}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Erro ao imprimir lista de grupos:", error);
    throw new Error("Failed to print the group list. Please try again later.");
  }
}

/**
 * Tags all members in a WhatsApp group.
 * @param {object} client - The WhatsApp client instance.
 * @param {object} message - The message object.
 * @param {string} senderName - The name of the sender.
 */
export async function handleTagAll(client, message, senderName) {
  try {
    // Check if message is from a group
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply('Este comando só pode ser usado em grupos.');
      return;
    }

    // Get all participants in the group
    const participants = await chat.participants;
    
    // Create mention text and mentions array using string format
    let mentionedJidList = [];
    let mentionText = 'Atenção niggas 🤭\n';
    
    for (let participant of participants) {
      mentionedJidList.push(participant.id._serialized);
      mentionText += `@${participant.id.user} `;
    }

    // Send message with simplified mentions format
    await client.sendMessage(chat.id._serialized, mentionText, {
      mentions: mentionedJidList
    });

  } catch (error) {
    console.error(`Error tagging all members: ${error.message} [${new Date().toLocaleString()}]`);
    await message.reply("Falha ao marcar todos os membros. Por favor, tente novamente mais tarde.");
  }
}

