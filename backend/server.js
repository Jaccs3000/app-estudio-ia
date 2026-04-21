console.log("🔥 server.js cargado");

require("dotenv").config();
const express = require("express");
const cors = require("cors");

// 🧠 OpenAI oficial
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

// 🔗 Inicializar base de datos
require("./database");

// 🤖 Cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ⚙️ CONFIG (según tu .md)
const MAX_REINTENTOS = 3;

// ------------------- FUNCIONES -------------------

// 🔥 limpiar JSON
function limpiarJSON(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/\n/g, " ")
    .replace(/\r/g, "")
    .replace(/,\s*]/g, "]")
    .replace(/,\s*}/g, "}")
    .trim();
}

function normalizarPreguntas(preguntas) {
  return preguntas.map((p) => {
    if (p.tipo === "multiple") {
      if (["A", "B", "C", "D"].includes(p.correcta)) {
        const index = ["A", "B", "C", "D"].indexOf(p.correcta);
        p.correcta = p.opciones[index];
      }

      // limpiar opciones tipo "A) texto"
      p.opciones = p.opciones.map((op) => op.replace(/^[A-D]\)\s*/, "").trim());
    }

    if (typeof p.explicacion !== "string") {
      p.explicacion = JSON.stringify(p.explicacion);
    }

    return p;
  });
}

// ------------------- ENDPOINTS -------------------

// Health check
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

// Generar preguntas
app.post("/generar", async (req, res) => {
  console.log("🔥 endpoint /generar ejecutado");

  const { temas } = req.body;

  if (!temas || typeof temas !== "string") {
    return res.status(400).json({
      error: "Debes enviar el campo 'temas' como texto",
    });
  }

  let preguntas = null;

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      console.log(`🔁 Intento ${intento}`);

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `
Genera preguntas educativas en español para estudiantes sobre:
${temas}

Reglas:
- Exactamente 5 preguntas
- Mezclar:
  - selección múltiple (4 opciones, una correcta)
  - verdadero/falso
- Incluir explicación breve en TODAS las preguntas
- NO repetir preguntas
- NO repetir opciones
- Nivel: primaria/secundaria

IMPORTANTE:
Devuelve SOLO JSON válido, sin texto adicional.

Formato:
[
  {
    "tipo": "multiple",
    "pregunta": "...",
    "opciones": ["A","B","C","D"],
    "correcta": "A",
    "explicacion": "..."
  },
  {
    "tipo": "vf",
    "pregunta": "...",
    "respuesta_correcta": true,
    "explicacion": "..."
  }
]
`,
          },
        ],
      });

      let text = completion.choices[0].message.content;

      console.log("🧠 RESPUESTA IA:");
      console.log(text);

      // 🔥 LIMPIAR RESPUESTA
      text = limpiarJSON(text);

      // 🔥 PARSEAR JSON
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error("El resultado no es un array");
      }

      preguntas = normalizarPreguntas(parsed);

      console.log("✅ JSON válido obtenido");
      break;
    } catch (error) {
      console.error(`❌ Error en intento ${intento}:`, error.message);

      if (intento === MAX_REINTENTOS) {
        return res.status(500).json({
          error: "No se pudo generar preguntas válidas tras varios intentos",
        });
      }
    }
  }

  res.json({
    preguntas,
  });
});

// Guardar en BD
const db = require("./database");

app.post("/guardar", (req, res) => {
  const { temas, preguntas, respuestas, correctas, total, nota } = req.body;

  if (!temas || !respuestas) {
    return res.status(400).json({
      error: "Datos incompletos",
    });
  }

  const query = `
    INSERT INTO resultados 
    (temas, preguntas, respuestas, correctas, total, nota)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      temas,
      JSON.stringify(preguntas),
      JSON.stringify(respuestas),
      correctas,
      total,
      nota,
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error guardando" });
      }

      res.json({
        message: "Resultado guardado",
        id: this.lastID,
      });
    },
  );
});

// Obtener historial
// Obtener historial paginado
app.get("/resultados", (req, res) => {
  const db = require("./database");

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  const query = `
    SELECT * FROM resultados
    ORDER BY fecha DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [limit, offset], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Error obteniendo resultados",
      });
    }

    res.json(rows);
  });
});

// ------------------- SERVER -------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
