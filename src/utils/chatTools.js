export async function deleteMessage(client, message, senderName) {
  try {
    const quotedMessage = await message.getQuotedMessage();

    if (quotedMessage) {
      // Ensure the quoted message exists
      if (quotedMessage.fromMe) {
        // Check if you sent the quoted message
        await quotedMessage.delete(true); // Delete for everyone
        console.log(
          `[${new Date().toLocaleString()}] Mensagem citada deletada para todos por ${senderName}`
        );
      } else {
        // If you didn't send the quoted message, delete for yourself
        await quotedMessage.delete(false); // Delete for me
        console.log(
          `[${new Date().toLocaleString()}] Mensagem citada deletada para mim por ${senderName}`
        );
      }
    } else {
      console.log(
        `[${new Date().toLocaleString()}] Nenhuma mensagem citada para deletar`
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toLocaleString()}] Erro ao deletar mensagem: ${error.message}`
    );
  }
}
