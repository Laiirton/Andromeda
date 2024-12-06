import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db;

async function initializeDatabase() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), 'chat_history.db'),
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}

export async function saveMessage(userPhone, role, content) {
  const db = await initializeDatabase();
  await db.run(
    'INSERT INTO chat_history (user_phone, role, content) VALUES (?, ?, ?)',
    [userPhone, role, content]
  );
}

export async function getRecentHistory(userPhone, limit = 20) {
  const db = await initializeDatabase();
  return await db.all(
    'SELECT role, content FROM chat_history WHERE user_phone = ? ORDER BY timestamp DESC LIMIT ?',
    [userPhone, limit]
  );
}

export async function clearHistory(userPhone) {
  const db = await initializeDatabase();
  await db.run('DELETE FROM chat_history WHERE user_phone = ?', [userPhone]);
} 