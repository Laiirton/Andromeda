import { r34_search, r34_random } from "r34-module";

/**
 * Searches for R34 images based on a given tag.
 * @param {string} tag - The tag to search for.
 * @returns {Promise<Array>} - A promise that resolves to an array of image URLs.
 * @throws {Error} - If an error occurs during the search.
 */
export async function searchR34(tag) {
  try {
    console.log(`Buscando imagens R34 para a tag: ${tag}`);
    const results = await r34_search({ search_tag: tag });
    console.log(`Encontradas ${results.length} imagens para a tag: ${tag}`);
    return results;
  } catch (error) {
    console.error(`Erro ao buscar imagens R34 para a tag ${tag}:`, error);
    throw new Error(`Erro ao buscar imagens R34 para a tag ${tag}: ${error.message}`);
  }
}

/**
 * Fetches a random R34 image.
 * @returns {Promise<string>} - A promise that resolves to a random image URL.
 * @throws {Error} - If an error occurs while fetching the image.
 */
export async function getRandomR34() {
  try {
    console.log("Buscando imagem R34 aleatória");
    const result = await r34_random();
    console.log("Imagem R34 aleatória obtida com sucesso");
    return result;
  } catch (error) {
    console.error("Erro ao buscar imagem R34 aleatória:", error);
    throw new Error(`Erro ao buscar imagem R34 aleatória: ${error.message}`);
  }
}
