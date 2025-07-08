async function handleGardenStock(message, category) {
  try {
    if (category === 'all') {
      const data = await fetchStock();
      await message.reply(JSON.stringify(data, null, 2));
      return;
    }
    const stock = await getCategoryStock(category);
    if (!stock || stock.length === 0) {
      await message.reply('Nenhum item encontrado para esta categoria.');
      return;
    }
    let text = stock.map(item => {
      let str = `${item.name} (x${item.value})`;
      if (item.image) str += `\n${item.image}`;
      return str;
    }).join('\n\n');
    await message.reply(text);
  } catch (e) {
  }
}
import fetch from 'node-fetch';

const API_URL = 'https://grow-a-garden-api-omega.vercel.app/api/stock';

async function fetchStock() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Erro ao buscar dados da API');
  return response.json();
}

async function getCategoryStock(category) {
  const data = await fetchStock();
  return data[category];
}

async function getRestockTimers() {
  const data = await fetchStock();
  return data.restockTimers;
}

async function getLastSeen() {
  const data = await fetchStock();
  return data.lastSeen;
}

export default {
  fetchStock,
  getCategoryStock,
  getRestockTimers,
  getLastSeen,
  handleGardenStock
};
