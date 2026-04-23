import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import multer from "multer";
import mammoth from "mammoth";
import db from "./database.js";

dotenv.config();

console.log("🔥 server.js cargado");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

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
      console.log("Usando modelo:", MODEL);

      const completion = await client.chat.completions.create({
        model: MODEL, //"gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `
Genera preguntas educativas en español EXCLUSIVAMENTE basadas en el siguiente contenido:

${temas}

REGLAS ESTRICTAS (OBLIGATORIAS):
- SOLO puedes usar información que esté explícitamente en el texto
- NO uses conocimiento externo bajo ninguna circunstancia
- NO completes información faltante
- NO hagas inferencias
- NO reformules usando conocimiento previo
- Si un dato no está en el texto, NO lo uses

VALIDACIÓN:
- Cada pregunta debe poder responderse directamente con el contenido
- Si no hay suficiente información, genera preguntas más simples

FORMATO:
- Exactamente 5 preguntas
- Mezclar:
  - selección múltiple (4 opciones, una correcta)
  - verdadero/falso
- Incluir explicación breve en TODAS
- NO repetir preguntas
- NO repetir opciones
- Nivel: primaria/secundaria

IMPORTANTE:
Devuelve SOLO JSON válido, sin texto adicional.`,
          },
        ],
      });

      let text = completion.choices[0].message.content;

      //console.log("🧠 RESPUESTA IA:");
      //console.log(text);

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
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  const query = `
    SELECT * FROM resultados
    ORDER BY fecha DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [limit + 1, offset], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Error obteniendo resultados",
      });
    }

    // 🔥 DETECTAR SI HAY MÁS
    const hayMas = rows.length > limit;

    // devolver solo 5
    const resultados = rows.slice(0, limit);

    res.json({
      resultados,
      hayMas,
    });
  });
});

// ------------------- ESTADISTICAS -------------------
app.get("/estadisticas", (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_intentos,
      AVG(nota) as promedio,
      MAX(nota) as mejor,
      MIN(nota) as peor
    FROM resultados
  `;

  db.get(query, [], (err, stats) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Error obteniendo estadísticas",
      });
    }

    // 🔥 obtener último intento
    db.get(
      `SELECT nota, fecha FROM resultados ORDER BY fecha DESC LIMIT 1`,
      [],
      (err2, ultimo) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({
            error: "Error obteniendo último intento",
          });
        }

        res.json({
          ...stats,
          ultimo_intento: ultimo,
        });
      },
    );
  });
});

// ------------------ DASHBOARD -------------------
app.get("/dashboard", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const query = `
    SELECT id, temas, nota, fecha, respuestas
    FROM resultados
    ORDER BY fecha DESC
    LIMIT ?
  `;

  db.all(query, [limit], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Error obteniendo dashboard",
      });
    }

    res.json(rows);
  });
});

// ------------------- SERVER -------------------

const PORT = process.env.PORT || 3000;

app.post("/procesar-archivos", upload.array("archivos"), async (req, res) => {
  try {
    const archivos = req.files;

    if (!archivos || archivos.length === 0) {
      return res.status(400).json({ error: "No se enviaron archivos" });
    }

    let textoTotal = "";

    for (const file of archivos) {
      const nombre = file.originalname.toLowerCase();

      // TXT
      if (nombre.endsWith(".txt")) {
        textoTotal += file.buffer.toString("utf-8") + "\n\n";
      }

      // PDF
      else if (nombre.endsWith(".pdf")) {
        textoTotal += "[Archivo PDF no soportado en esta versión]\n\n";
      }

      // DOCX
      else if (nombre.endsWith(".docx")) {
        const result = await mammoth.extractRawText({
          buffer: file.buffer,
        });
        textoTotal += result.value + "\n\n";
      }

      // DOC (limitado)
      else if (nombre.endsWith(".doc")) {
        textoTotal += "[Archivo .doc no soportado completamente]\n\n";
      }
    }

    // 🔥 RESUMEN IA
    const prompt = `
Resume el siguiente contenido en UNA sola frase corta (máximo 20 palabras).
La frase debe comenzar SIEMPRE con: "Los documentos cargados tratan sobre..."
No des detalles, solo una idea general del tema.

${textoTotal.substring(0, 4000)}
`;

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const resumen = completion.choices[0].message.content;

    res.json({
      texto: textoTotal,
      resumen,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando archivos" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
