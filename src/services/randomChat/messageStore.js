const messageStore = new Map();

function storeMessage(groupId, message, sender) {
  if (!messageStore.has(groupId)) {
    messageStore.set(groupId, []);
  }
  messageStore.get(groupId).push({
    text: message,
    sender: sender,
    timestamp: new Date()
  });

  // Limitar o armazenamento a 1000 mensagens por grupo
  if (messageStore.get(groupId).length > 1000) {
    messageStore.get(groupId).shift();
  }
}

function getRecentMessages(groupId, count) {
  const messages = messageStore.get(groupId) || [];
  return messages.slice(-count);
}

export { storeMessage, getRecentMessages };