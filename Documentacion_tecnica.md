# 📘 PROYECTO: GENERADOR DE CUESTIONARIOS CON IA

---

# 🧠 DESCRIPCIÓN GENERAL

Aplicación web que genera cuestionarios educativos a partir de:

* Texto ingresado manualmente
* Contenido extraído de archivos (PDF, DOCX, TXT)

Incluye:

* Generación de preguntas con IA
* Validación y regeneración de preguntas
* Resolución interactiva del cuestionario
* Guardado de resultados
* Historial paginado
* Dashboard de rendimiento

---

# 🏗️ ARQUITECTURA

## Backend

* Runtime: Node.js v20 (ES Modules)
* Framework: Express
* DB: SQLite
* IA: OpenAI API

## Frontend

* React (Vite)
* Recharts (gráficas)
* Tailwind (estilos)

---

# 📦 LIBRERÍAS

## Backend

* express
* cors
* dotenv
* openai
* multer
* mammoth
* pdfjs-dist (legacy build)
* sqlite3

## Frontend

* react
* recharts
* lucide-react

---

# ⚙️ CONFIGURACIÓN

.env:
OPENAI_API_KEY=
OPENAI_MODEL=

Uso:
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

---

# 🔄 FLUJO COMPLETO DEL SISTEMA

## 1. Carga de contenido (Frontend)

### Entrada del usuario:

* Texto manual (textarea)
* Archivos (input type=file)

### Flujo:

1. Usuario carga archivos
2. Frontend envía FormData a:
   POST /procesar-archivos

---

## 2. Procesamiento de archivos (Backend)

Endpoint:
POST /procesar-archivos

### Lógica:

* Itera archivos
* Detecta tipo por extensión

### TXT:

file.buffer → string

### PDF:

* pdfjs-dist
* getDocument({ data: new Uint8Array(buffer) })
* Itera páginas
* Extrae items → texto

### DOCX:

* mammoth.extractRawText

### DOC:

* No soportado (mensaje placeholder)

### Salida:

* textoTotal (contenido completo)
* resumen (IA)

### Resumen IA:

* Prompt: resumen en 1 frase (máx 20 palabras)

### Respuesta al frontend:

{
texto,
resumen
}

---

## 3. Uso del contenido en frontend

Estados clave:

* temas (texto manual)
* textoDocumento (texto extraído)
* resumenDocumento (resumen IA)

### Lógica:

const contenido = textoDocumento || temas;

---

## 4. Generación de preguntas

Endpoint:
POST /generar

### Entrada:

{
temas: contenido
}

### Flujo backend:

1. Construcción prompt
2. Llamada OpenAI
3. Limpieza de respuesta (limpiarJSON)
4. JSON.parse

Soporta:

* array directo
* objeto con "preguntas"

---

## 5. Normalización

Función: normalizarPreguntas()

### Operaciones:

* Garantiza respuesta_correcta
* Garantiza explicacion
* Detecta tipo (multiple/vf)
* Si no hay opciones → VF
* Normaliza boolean → texto
* Limpia opciones (A), B), etc
* Convierte A/B/C/D → texto real
* Asegura formato final

### Estructura final:

{
pregunta,
opciones,
respuesta_correcta,
explicacion,
tipo
}

---

## 6. Validación con IA

Función: validarPreguntas()

Entrada:

* preguntas
* contexto

Salida:
[
{ index, valida }
]

---

## 7. Regeneración

Función: regenerarPregunta()

### Flujo:

* Solo para preguntas inválidas
* Genera 1 pregunta nueva
* Valida estructura
* Normaliza nuevamente

---

## 8. Filtrado final

Antes de enviar:

preguntas = preguntas.filter(p =>
p.pregunta && p.respuesta_correcta && p.explicacion
);

---

## 9. Respuesta al frontend

{
preguntas
}

---

# 🎯 FLUJO FRONTEND

## Estados principales

* inicio
* cargando
* preguntas
* feedback
* resultado final
* historial
* dashboard
* detalle

---

## 10. Resolución de preguntas

* Usuario selecciona opción
* Se evalúa contra respuesta_correcta
* Se guarda en estado respuestas
* Se muestra feedback

---

## 11. Finalización

Cálculo:
nota = (correctas / total) * 5

---

## 12. Guardado automático

Trigger:
useEffect(finalizado)

Endpoint:
POST /guardar

Datos:

* temas (resumenDocumento || temas)
* preguntas
* respuestas
* correctas
* total
* nota

---

# 💾 BASE DE DATOS

Tabla: resultados
Campos:

* id
* temas
* preguntas
* respuestas
* correctas
* total
* nota
* fecha

---

# 📊 HISTORIAL

Endpoint:
GET /resultados?page=

### Backend:

* LIMIT 5
* OFFSET
* detecta hayMas

### Frontend:

* navegación páginas
* parse JSON respuestas

---

# 📊 DASHBOARD

Endpoint:
GET /dashboard?limit=

### Backend:

* últimos registros

### Frontend:

* BarChart
* X: fechaCorta
* Y: nota
* color dinámico
* click → detalle

---

# 🔁 MODO REFUERZO

Función: iniciarRefuerzo()

### Lógica:

* filtra respuestas incorrectas
* vuelve a mostrar esas preguntas
* no afecta nota

---

# 🧱 ESCALABILIDAD

## Backend

* Separación lógica clara
* Escalable a servicios
* DB migrable

## IA

* Modelo configurable

## Frontend

* Componentes reutilizables

---

# 🔒 LIMITACIONES

* No OCR
* No .doc real
* Dependencia IA

---

# 🚀 MEJORAS FUTURAS

* OCR
* UI avanzada
* validación más estricta
* exportación
* análisis por tema

---

# 🎯 ESTADO ACTUAL

✔ Flujo completo funcional
✔ PDF/DOCX soportados
✔ Generación estable
✔ Validación IA
✔ Dashboard interactivo
✔ Historial paginado
✔ Refuerzo activo

---

# 📎 PROPÓSITO DEL DOCUMENTO

Permitir:

* Continuar desarrollo sin contexto previo
* Entender lógica completa
* Escalar sistema

---

(Documento alineado 100% con código actual)