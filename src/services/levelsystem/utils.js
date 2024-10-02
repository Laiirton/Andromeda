export function calculateLevelFromXP(xp) {
    return Math.max(1, Math.floor(0.1 * Math.sqrt(xp)));
  }
  
  export function calculateXPForNextLevel(level) {
    return Math.pow((level + 1) / 0.1, 2);
  }
  
  export function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }