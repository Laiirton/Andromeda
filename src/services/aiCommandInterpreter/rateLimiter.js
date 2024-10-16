import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 15, // 15 solicitações
  duration: 60, // por minuto
});

export async function checkRateLimit() {
  try {
    await rateLimiter.consume(1);
    return true;
  } catch (error) {
    console.log('Rate limit excedido, aguardando...');
    return false;
  }
}
