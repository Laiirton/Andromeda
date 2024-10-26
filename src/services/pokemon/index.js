import { 
  getRandomPokemonNameAndImage, 
  getUserPokemon, 
  getUserCaptureStatus,
  tradeForCaptures,
  getUserSacrificeStatus,
  sacrificePokemon,
  getUserTradeStatus,
  captureAllAvailable
} from './capture.js';
import { chooseCompanion } from './companion.js';
import { initiateTrade, respondToTrade, getPendingTradeForUser, getPendingTradesForUser } from './trade.js';
import { getOrCreateUser } from './database.js';
import { 
  checkAndUpdateCaptureLimit, 
  getRemainingCaptures, 
  getTradeStatus, 
  getCapturesRemaining,
  updateCapturesRemaining
} from './captureLimits.js';
import { 
  getAllUserPokemon, 
  getPokemonByRarity, 
  getAllPokemonByRarity,
  getUserPokemonByRarity // Adicionando a nova função à importação
} from './pokemonStats.js';

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
  getUserTradeStatus,
  captureAllAvailable,
  getOrCreateUser,
  checkAndUpdateCaptureLimit,
  getRemainingCaptures,
  getTradeStatus,
  getCapturesRemaining,
  updateCapturesRemaining,
  getAllUserPokemon,
  getPokemonByRarity,
  getAllPokemonByRarity,
  getUserPokemonByRarity // Adicionando a nova função à exportação
};
