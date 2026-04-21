const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db");

// Crear tabla si no existe
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS resultados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temas TEXT,
      preguntas TEXT,
      respuestas TEXT,
      correctas INTEGER,
      total INTEGER,
      nota REAL,
      fecha DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);
});

module.exports = db;