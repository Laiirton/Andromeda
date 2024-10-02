import { 
  getRandomPokemonNameAndImage, 
  getUserPokemon, 
  getUserCaptureStatus,
  tradeForCaptures,
  getUserSacrificeStatus,
  sacrificePokemon,
  getUserTradeStatus // Adicione esta linha
} from './capture.js';
import { chooseCompanion } from './companion.js';
import { initiateTrade, respondToTrade, getPendingTradeForUser, getPendingTradesForUser } from './trade.js';

export {
  getRandomPokemonNameAndImage,
  getUserPokemon,
  getUserCaptureStatus,
  chooseCompanion,
  initiateTrade,
  respondToTrade,
  getPendingTradeForUser,
  getPendingTradesForUser,
  tradeForCaptures,
  getUserSacrificeStatus,
  sacrificePokemon,
  getUserTradeStatus // Certifique-se de que esta linha está presente
};