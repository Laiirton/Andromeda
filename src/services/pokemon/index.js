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
  updateCapturesRemaining
};