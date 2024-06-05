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
  }
}

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
  }
}
