import fs from 'fs';
import path from 'path';

let evolutionsData = null;

async function loadEvolutions() {
  const evolutions = {};
  const generations = 9; // Supondo que você tenha 9 gerações

  for (let i = 1; i <= generations; i++) {
    const filePath = path.join(`./assets/pokemons_evolutions/generation_${i}.txt`);
    const data = fs.readFileSync(filePath, 'utf8');
    const generationEvolutions = JSON.parse(data);
    Object.assign(evolutions, generationEvolutions);
  }

  return evolutions;
}

// Carrega os dados de evolução ao iniciar o módulo
(async () => {
  evolutionsData = await loadEvolutions();
})();

export function getEvolutionName(companionName, stage) {
  if (!evolutionsData) {
    console.error('Dados de evolução não carregados');
    return null;
  }

  const evolutionStages = evolutionsData[companionName.toLowerCase()];
  if (!evolutionStages || stage > evolutionStages.length) return null;

  return evolutionStages[stage - 1];
}