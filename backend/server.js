import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import multer from "multer";
import mammoth from "mammoth";
import db from "./database.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

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

async function validarPreguntas(preguntas, contexto, esDocumento) {
  try {
    const prompt = esDocumento
      ? `
Valida las siguientes preguntas basadas en un documento:

CONTEXTO:
${contexto}

PREGUNTAS:
${JSON.stringify(preguntas)}

Reglas:
- Verifica que cada respuesta correcta esté explícitamente en el texto
- Verifica que la pregunta se pueda responder SOLO con el texto
- NO permitir información externa

Responde en JSON:
[
  { "index": 0, "valida": true },
  { "index": 1, "valida": false }
]
`
      : `
Valida las siguientes preguntas:

${JSON.stringify(preguntas)}

Reglas:
- Verifica que la respuesta correcta sea correcta
- Verifica que las opciones incorrectas no sean correctas
- Detecta errores o inconsistencias

Responde en JSON:
[
  { "index": 0, "valida": true },
  { "index": 1, "valida": false }
]
`;

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    let text = completion.choices[0].message.content;

    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    console.log("🧠 RESPUESTA IA (RAW):");
    console.log(text);

    if (!Array.isArray(parsed)) {
      throw new Error("Validación inválida");
    }

    return parsed;
  } catch (error) {
    console.error("Error validando preguntas:", error.message);
    return preguntas.map((_, i) => ({ index: i, valida: true }));
  }
}

async function regenerarPregunta(contexto, esDocumento) {
  const prompt = esDocumento
    ? `
Genera EXACTAMENTE UNA pregunta basada EXCLUSIVAMENTE en el siguiente texto:

${contexto}

REGLAS OBLIGATORIAS:
- SOLO usar información del texto
- NO inventar
- NO inferir
- NO usar conocimiento externo

FORMATO JSON OBLIGATORIO (SIN EXCEPCIÓN):
{
  "pregunta": "texto",
  "opciones": ["opcion1", "opcion2"] o ["opcion1", "opcion2", "opcion3", "opcion4"],
  "respuesta_correcta": "una de las opciones",
  "explicacion": "explicación breve"
}

REGLAS ADICIONALES:
- SIEMPRE incluir TODOS los campos
- NO devolver campos vacíos
- NO devolver texto fuera del JSON
- Si es verdadero/falso, usar exactamente ["Verdadero","Falso"]

IMPORTANTE:
Devuelve SOLO JSON válido.
`
    : `
Genera EXACTAMENTE UNA pregunta educativa correcta sobre:

${contexto}

FORMATO JSON OBLIGATORIO:
{
  "pregunta": "texto",
  "opciones": ["opcion1", "opcion2"] o ["opcion1", "opcion2", "opcion3", "opcion4"],
  "respuesta_correcta": "una de las opciones",
  "explicacion": "explicación breve"
}

REGLAS:
- SIEMPRE incluir todos los campos
- NO devolver texto fuera del JSON

IMPORTANTE:
Devuelve SOLO JSON válido.
`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  let text = completion.choices[0].message.content;

  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(text);

  return parsed[0] || parsed;
}

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
    console.log("------ NORMALIZANDO PREGUNTA ------");
    console.log("ANTES:", JSON.stringify(p));
    if (!p.respuesta_correcta) {
      p.respuesta_correcta = "No definida";
    }

    if (!p.explicacion) {
      p.explicacion = "Sin explicación disponible";
    }
    // 🔥 NORMALIZAR TIPO SIEMPRE (CLAVE)
    if (p.tipo) {
      const tipo = p.tipo.toLowerCase();

      if (
        tipo.includes("multiple") ||
        tipo.includes("seleccion") ||
        tipo.includes("selección")
      ) {
        p.tipo = "multiple";
      } else if (tipo.includes("verdadero") || tipo.includes("falso")) {
        p.tipo = "vf";
      }
    }

    // 🔥 DETECTAR VERDADERO/FALSO (si no hay opciones)
    if (!p.opciones || p.opciones.length === 0) {
      p.opciones = ["Verdadero", "Falso"];
    }

    // 🔥 NORMALIZAR BOOLEANOS A TEXTO
    if (typeof p.respuesta_correcta === "boolean") {
      p.respuesta_correcta = p.respuesta_correcta ? "Verdadero" : "Falso";
    }

    // 🔥 NORMALIZAR OPCIONES (MULTIPLE)
    if (p.opciones && Array.isArray(p.opciones)) {
      // ✅ 1. limpiar primero (CLAVE)
      p.opciones = p.opciones.map((op) => op.replace(/^[A-D]\)\s*/, "").trim());

      // ✅ 2. luego mapear A/B/C/D
      if (["A", "B", "C", "D"].includes(p.respuesta_correcta)) {
        const index = ["A", "B", "C", "D"].indexOf(p.respuesta_correcta);
        p.respuesta_correcta = p.opciones[index];
      }
    }

    // 🔥 ASIGNAR TIPO
    if (!p.tipo) {
      if (p.opciones && Array.isArray(p.opciones)) {
        const opcionesNormalizadas = p.opciones.map((o) =>
          o.toLowerCase().trim(),
        );

        if (
          opcionesNormalizadas.some((o) => o.includes("verdadero")) &&
          opcionesNormalizadas.some((o) => o.includes("falso")) &&
          p.opciones.length === 2
        ) {
          p.tipo = "vf";

          // 🔥 ASEGURAR FORMATO EXACTO
          p.opciones = ["Verdadero", "Falso"];
        } else {
          p.tipo = "multiple";
        }
      } else {
        p.tipo = "vf";
        p.opciones = ["Verdadero", "Falso"];
      }
    }

    // 🔥 ASEGURAR EXPLICACIÓN STRING
    if (typeof p.explicacion !== "string") {
      p.explicacion = JSON.stringify(p.explicacion);
    }
    console.log("DESPUÉS:", JSON.stringify(p));
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

  const { temas, esDocumento } = req.body;

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
- Debe agregar información nueva o un dato interesante. Debe sentirse como un dato educativo adicional
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
      console.log("🧹 RESPUESTA LIMPIA:");
      console.log(text);

      // 🔥 PARSEAR JSON
      const parsed = JSON.parse(text);
      console.log("📦 JSON PARSEADO:");
      console.log(parsed);

      // 🔥 SOPORTAR AMBOS FORMATOS
      let preguntasArray = null;

      if (Array.isArray(parsed)) {
        preguntasArray = parsed;
      } else if (Array.isArray(parsed.preguntas)) {
        preguntasArray = parsed.preguntas;
      } else {
        console.error("❌ Formato inesperado:", parsed);
        throw new Error("El resultado no contiene preguntas válidas");
      }

      console.log("🧾 ANTES DE NORMALIZAR:");
      console.log(JSON.stringify(preguntasArray, null, 2));

      // 🔥 NORMALIZAR
      preguntas = normalizarPreguntas(preguntasArray);
      console.log("🧩 PREGUNTAS NORMALIZADAS:");
      console.log(JSON.stringify(preguntas, null, 2));

      console.log("🔍 Validando preguntas...");

      // 🔥 VALIDAR
      const validacion = await validarPreguntas(preguntas, temas, esDocumento);
      console.log("🔍 RESULTADO VALIDACIÓN:");
      console.log(validacion);

      // 🔁 REGENERAR LAS INCORRECTAS
      for (const v of validacion) {
        if (!v.valida) {
          try {
            console.log(`♻️ Regenerando pregunta ${v.index}`);

            const nueva = await regenerarPregunta(temas, esDocumento);

            // 🚨 VALIDACIÓN REAL
            if (
              !nueva ||
              !nueva.pregunta ||
              !nueva.respuesta_correcta ||
              !nueva.explicacion
            ) {
              console.log("⚠️ Pregunta regenerada inválida, se omite");
              continue;
            }

            preguntas[v.index] = normalizarPreguntas([nueva])[0];
            console.log(`♻️ PREGUNTA REGENERADA EN INDEX ${v.index}:`);
            console.log(JSON.stringify(preguntas[v.index], null, 2));
          } catch (err) {
            console.error("Error regenerando:", err.message);
          }
        }
      }

      console.log("✅ Preguntas validadas");

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

  console.log("🚀 RESPUESTA FINAL AL FRONTEND:");
  console.log(JSON.stringify(preguntas, null, 2));

  preguntas = preguntas.filter(
    (p) => p.pregunta && p.respuesta_correcta && p.explicacion,
  );
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

      console.log("TIPO buffer:", file.buffer?.constructor?.name);
      console.log("ES Buffer:", Buffer.isBuffer(file.buffer));
      console.log("TAMAÑO buffer:", file.buffer?.length);

      // TXT
      if (nombre.endsWith(".txt")) {
        textoTotal += file.buffer.toString("utf-8") + "\n\n";
      }

      // PDF
      else if (nombre.endsWith(".pdf")) {
        try {
          console.log("👉 Procesando PDF:", nombre);
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(file.buffer),
          });
          const pdf = await loadingTask.promise;

          let text = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            const pageText = content.items.map((item) => item.str).join(" ");
            text += pageText + " ";
          }

          const limpio = text.replace(/\s+/g, " ").trim();

          if (!limpio || limpio.length < 20) {
            textoTotal += "[PDF sin texto legible]\n\n";
          } else {
            textoTotal += limpio + "\n\n";
          }
        } catch (err) {
          console.error("Error leyendo PDF:", err.message);
          textoTotal += "[Error leyendo PDF]\n\n";
        }
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
