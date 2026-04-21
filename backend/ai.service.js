const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generarPreguntas(temas) {
  const prompt = `
Genera preguntas educativas en español para estudiantes sobre:
${temas}

Reglas:
- Máximo 20 preguntas
- Mezcla:
  - selección múltiple (4 opciones)
  - verdadero/falso
- Incluye respuesta correcta
- Incluye explicación
- Devuelve JSON válido
`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content;
}

module.exports = { generarPreguntas };