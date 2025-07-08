async function handleRestockTimers(message) {
  try {
    const timers = await getRestockTimers();
    if (!timers || Object.keys(timers).length === 0) {
      await message.reply('Nenhum timer de restock encontrado.');
      return;
    }
    let text = Object.entries(timers)
      .map(([key, value]) => {
        let cycle = 300;
        if (key !== 'seeds') cycle = 3600;
        let remaining = cycle - (value % cycle);
        if (remaining === cycle) remaining = 0;
        let min = Math.floor(remaining / 60);
        let sec = remaining % 60;
        return `${key}: ${min}m ${sec}s`;
      })
      .join('\n');
    await message.reply(text);
  } catch (e) {
  }
}

async function handleLastSeen(message) {
  try {
    const lastSeen = await getLastSeen();
    if (!lastSeen || Object.keys(lastSeen).length === 0) {
      await message.reply('Nenhuma informação de last seen encontrada.');
      return;
    }
    let text = Object.entries(lastSeen)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    await message.reply(text);
  } catch (e) {
  }
}
async function handleGardenStock(message, category) {
  try {
    if (category === 'all') {
      const data = await fetchStock();
      let allText = Object.entries(data)
        .filter(([key]) => Array.isArray(data[key]))
        .map(([key, items]) => {
          if (!items.length) return '';
          let title = key.charAt(0).toUpperCase() + key.slice(1);
          let list = items.map(item => `${item.name} (x${item.value})`).join(', ');
          return `${title}:\n${list}`;
        })
        .filter(Boolean)
        .join('\n\n');
      await message.reply(allText);
      return;
    }
    const stock = await getCategoryStock(category);
    if (!stock || stock.length === 0) {
      await message.reply('Nenhum item encontrado para esta categoria.');
      return;
    }
    let text;
    if (category === 'seedsStock') {
      let db;
      let itemsArr = [];
      try {
        const fs = await import('fs/promises');
        const path = new URL('../../storage/Database.json', import.meta.url);
        const jsonStr = await fs.readFile(path, 'utf-8');
        db = JSON.parse(jsonStr);
        itemsArr = Array.isArray(db.items) ? db.items : [];
        console.log('Database.json carregado:', !!db, itemsArr.length);
      } catch (err) {
        console.log('Erro ao ler Database.json:', err);
      }
      text = stock.map(item => {
        let type = '';
        let found = itemsArr.find(i => i.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        if (found && found.rarity) type = found.rarity;
        console.log('Seed:', item.name, '| Encontrado:', !!found, '| Raridade:', type);
        let str = `${item.name} (x${item.value})`;
        if (type) str += `  ${type}`;
        return str;
      }).join('\n\n');
    } else {
      text = stock.map(item => {
        let str = `${item.name} (x${item.value})`;
        if (category !== 'seedsStock' && category !== 'eggStock' && item.image) str += `\n${item.image}`;
        return str;
      }).join('\n\n');
    }
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
  handleGardenStock,
  handleRestockTimers,
  handleLastSeen
};
