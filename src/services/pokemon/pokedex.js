import { createCanvas, loadImage } from 'canvas';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB em bytes
const BACKGROUND_WIDTH = 3000;
const BACKGROUND_HEIGHT = 2000;

/**
 * Cria uma imagem da Pokédex com os Pokémon capturados pelo usuário.
 * @param {Array} pokemonList - Lista de Pokémon capturados.
 * @param {string} username - Nome do usuário.
 * @param {number} currentPage - Página atual da Pokédex.
 * @param {number} totalPages - Total de páginas da Pokédex.
 * @returns {Buffer} - Buffer da imagem gerada.
 */
export async function createPokedexImage(pokemonList, username, currentPage, totalPages) {
  let POKEMON_PER_ROW = 8;
  let POKEMON_SIZE = 200;
  let PADDING = 40;
  let NAME_HEIGHT = 60;
  let TITLE_HEIGHT = 120;
  let quality = 1;

  let imageBuffer;
  do {
    const ROW_HEIGHT = POKEMON_SIZE + NAME_HEIGHT + PADDING;
    const CONTENT_WIDTH = (POKEMON_SIZE + PADDING) * POKEMON_PER_ROW;
    const CONTENT_HEIGHT = ROW_HEIGHT * Math.ceil(pokemonList.length / POKEMON_PER_ROW);
    const SCALE_FACTOR = Math.min(
      (BACKGROUND_WIDTH - 2 * PADDING) / CONTENT_WIDTH,
      (BACKGROUND_HEIGHT - TITLE_HEIGHT - 2 * PADDING) / CONTENT_HEIGHT
    );
    
    const CANVAS_WIDTH = BACKGROUND_WIDTH;
    const CANVAS_HEIGHT = BACKGROUND_HEIGHT;

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Carrega e desenha o background
    const backgroundImage = await loadImage('./src/media/pokedex.jpg');
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Adiciona o título com o nome do usuário
    ctx.font = `bold ${Math.floor(80 * SCALE_FACTOR)}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 8;
    const title = `Pokédex de ${username} - Página ${currentPage} de ${totalPages}`;
    ctx.strokeText(title, CANVAS_WIDTH / 2, 40);
    ctx.fillText(title, CANVAS_WIDTH / 2, 40);

    // Calcula o ponto de início para centralizar o conteúdo
    const startX = (CANVAS_WIDTH - CONTENT_WIDTH * SCALE_FACTOR) / 2;
    const startY = TITLE_HEIGHT + PADDING;

    ctx.save();
    ctx.translate(startX, startY);
    ctx.scale(SCALE_FACTOR, SCALE_FACTOR);

    for (let i = 0; i < pokemonList.length; i++) {
      const pokemon = pokemonList[i];
      const x = (i % POKEMON_PER_ROW) * (POKEMON_SIZE + PADDING);
      const y = Math.floor(i / POKEMON_PER_ROW) * ROW_HEIGHT;

      try {
        const image = await loadImage(pokemon.pokemon_image_url);
        
        ctx.save();
        
        // Cria um caminho circular para recortar a imagem
        ctx.beginPath();
        ctx.arc(x + POKEMON_SIZE / 2, y + POKEMON_SIZE / 2, POKEMON_SIZE / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Desenha um círculo branco como fundo para o Pokémon
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();

        // Calcula as dimensões para manter a proporção da imagem
        const aspectRatio = image.width / image.height;
        let drawWidth = POKEMON_SIZE;
        let drawHeight = POKEMON_SIZE;
        let offsetX = 0;
        let offsetY = 0;

        if (aspectRatio > 1) {
          drawHeight = POKEMON_SIZE;
          drawWidth = drawHeight * aspectRatio;
          offsetX = (POKEMON_SIZE - drawWidth) / 2;
        } else {
          drawWidth = POKEMON_SIZE;
          drawHeight = drawWidth / aspectRatio;
          offsetY = (POKEMON_SIZE - drawHeight) / 2;
        }

        // Desenha a imagem do Pokémon mantendo a proporção
        ctx.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight);

        ctx.restore();

        // Adiciona sombra ao círculo
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.beginPath();
        ctx.arc(x + POKEMON_SIZE / 2, y + POKEMON_SIZE / 2, POKEMON_SIZE / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Reseta a sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Configura o estilo do texto
        ctx.font = `bold ${Math.max(12, Math.floor(18 * SCALE_FACTOR))}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Adiciona o nome e a contagem do Pokémon
        const pokemonName = pokemon.pokemon_name.charAt(0).toUpperCase() + pokemon.pokemon_name.slice(1);
        const displayName = pokemon.is_shiny ? `${pokemonName} ✨` : pokemonName;
        const countText = `x${pokemon.total_count}`;
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(displayName, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + 10, POKEMON_SIZE);
        ctx.fillText(displayName, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + 10, POKEMON_SIZE);

        // Adiciona a contagem abaixo do nome
        ctx.font = `${Math.max(10, Math.floor(14 * SCALE_FACTOR))}px Arial`;
        ctx.strokeText(countText, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + 35, POKEMON_SIZE);
        ctx.fillText(countText, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + 35, POKEMON_SIZE);

      } catch (error) {
        console.error(`Erro ao carregar imagem para ${pokemon.pokemon_name}:`, error);
      }
    }

    ctx.restore();

    // Gera a imagem com a qualidade atual
    imageBuffer = canvas.toBuffer('image/jpeg', { quality });

    // Se a imagem ainda for muito grande, reduz a qualidade ou o tamanho
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      if (quality > 0.3) {
        quality -= 0.1;
      } else {
        POKEMON_SIZE *= 0.9;
        PADDING *= 0.9;
        NAME_HEIGHT *= 0.9;
        POKEMON_PER_ROW = Math.floor(POKEMON_PER_ROW * 1.1);
        quality = 1;
      }
    }
  } while (imageBuffer.length > MAX_IMAGE_SIZE);

  console.log(`Tamanho final da imagem: ${imageBuffer.length} bytes`);
  return imageBuffer;
}
