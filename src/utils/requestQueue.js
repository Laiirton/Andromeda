import Queue from 'queue';

const q = new Queue({ autostart: true, concurrency: 3 }); // Ajuste o número conforme necessário

export function addToQueue(task) {
  return new Promise((resolve, reject) => {
    q.push((cb) => {
      task()
        .then((result) => {
          resolve(result);
          cb();
        })
        .catch((error) => {
          reject(error);
          cb();
        });
    });
  });
}