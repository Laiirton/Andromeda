import { r34_search, r34_random } from "r34-module";

export async function searchR34(tag) {
  try {
    console.log(`Buscando imagens R34 para a tag: ${tag}`);
    const results = await r34_search({ search_tag: tag });
    console.log(`Encontradas ${results.length} imagens para a tag: ${tag}`);
    return results;
  } catch (error) {
    console.error(`Erro ao buscar imagens R34 para a tag ${tag}:`, error);
    throw error;
  }
}

export async function getRandomR34() {
  try {
    console.log("Buscando imagem R34 aleatória");
    const result = await r34_random();
    console.log("Imagem R34 aleatória obtida com sucesso");
    return result;
  } catch (error) {
    console.error("Erro ao buscar imagem R34 aleatória:", error);
    throw error;
  }
}