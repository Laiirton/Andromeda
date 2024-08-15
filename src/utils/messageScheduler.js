import cron from 'node-cron';

export function initializeMessageScheduler(client) {
  const groupId = "120363186217488014@g.us";

  function sendMessageToGroup(message) {
    client.sendMessage(groupId, message);
    console.log(`Mensagem enviada para o grupo: ${message}`);
  }

  function scheduleMessages() {
    // Agenda para segunda a sexta (1-5 representa segunda a sexta no cron)
    
    // 08:00 - Início do expediente
    cron.schedule('0 8 * * 1-5', () => {
      sendMessageToGroup("Bom dia! Lembrete: Não se esqueça de bater o ponto de entrada. 💀");
    });

    // 12:00 - Saída para almoço
    cron.schedule('0 12 * * 1-5', () => {
      sendMessageToGroup("Hora do almoço! Lembre-se de bater o ponto. 😋");
    });

    // 13:00 - Retorno do almoço
    cron.schedule('0 13 * * 1-5', () => {
      sendMessageToGroup("Boa tarde! Não se esqueça de bater o ponto de retorno. 👾");
    });

    // 17:00 - Lembrete de fim de expediente se aproximando
    cron.schedule('0 17 * * 1-5', () => {
      sendMessageToGroup("Atenção: Falta uma hora para o fim do expediente. Prepare-se para bater o ponto de saída em breve. 🤟");
    });

    // 18:00 - Fim do expediente
    cron.schedule('0 18 * * 1-5', () => {
      sendMessageToGroup("Fim do expediente! Não se esqueça de bater o ponto de saída. Bom descanso! 😈");
    });
  }

  return {
    start: scheduleMessages
  };
}

export async function getGroupList(client) {
  try {
    // Obtém todos os chats
    const chats = await client.getChats();
    
    // Filtra apenas os grupos
    const groups = chats.filter(chat => chat.isGroup);
    
    // Mapeia os grupos para um array de objetos com nome e id
    const groupList = groups.map(group => ({
      name: group.name,
      id: group.id._serialized
    }));
    
    return groupList;
  } catch (error) {
    console.error('Erro ao obter lista de grupos:', error);
    return [];
  }
}

export async function printGroupList(client) {
  const groups = await getGroupList(client);
  
  console.log('Lista de Grupos:');
  groups.forEach(group => {
    console.log(`Nome: ${group.name}`);
    console.log(`ID: ${group.id}`);
    console.log('---');
  });
}