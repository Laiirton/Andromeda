import Queue from 'queue';

const q = new Queue({ autostart: true, concurrency: 3 }); // Ajuste o número conforme necessário

/**
 * Adiciona uma tarefa à fila e retorna uma promessa que será resolvida quando a tarefa for concluída.
 * @param {Function} task - A função assíncrona que representa a tarefa a ser executada.
 * @returns {Promise} - Uma promessa que será resolvida com o resultado da tarefa ou rejeitada com um erro.
 */
export function addToQueue(task) {
  return new Promise((resolve, reject) => {
    q.push((cb) => {
      task()
        .then((result) => {
          resolve(result);
          cb();
        })
        .catch((error) => {
          console.error('Erro ao executar tarefa na fila:', error);
          reject(error);
          cb();
        });
    });
  });
}
