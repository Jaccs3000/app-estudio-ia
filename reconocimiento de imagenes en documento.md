# 🖼️ EXTENSIÓN: PROCESAMIENTO DE IMÁGENES + PREGUNTAS MULTIMODALES

---

# 🧠 DESCRIPCIÓN GENERAL

Se extiende el sistema actual para soportar:

- Extracción de imágenes desde archivos (PDF, DOCX)
- Análisis de imágenes con IA (visión)
- Generación de preguntas basadas en imágenes
- Integración con preguntas de texto existentes

El sistema ahora soporta:

✔ Texto  
✔ Imágenes  
✔ Texto + Imágenes  

---

# 🔄 NUEVO FLUJO DEL SISTEMA

Se amplía el flujo actual:

## Procesamiento de archivos

ANTES:
- Solo extracción de texto

AHORA:

1. Extracción de texto (igual que antes)
2. Extracción de imágenes (nuevo)
3. Procesamiento paralelo:


texto → generar preguntas texto
imagenes → generar preguntas imagen


4. Merge final:


preguntas = [...preguntasTexto, ...preguntasImagen]


---

# 📁 MANEJO DE IMÁGENES

## Carpeta de almacenamiento

Ruta:

/uploads


## Reglas:

- Al iniciar `/procesar-archivos`:
  - 🔥 eliminar todas las imágenes existentes
- Cada imagen se guarda como archivo físico
- Nombre sugerido:

img_<timestamp>_<index>.png


---

# 🖼️ EXTRACCIÓN DE IMÁGENES

## PDF

- Se convierten páginas a imágenes
- Cada página = 1 imagen

## DOCX

- Se extraen desde:

/word/media


---

# 🤖 IA MULTIMODAL

Modelo utilizado:

- gpt-4o (requerido para visión)

Capacidades:
- Interpretación de imágenes
- Generación de contenido basado en imagen

---

# ❓ GENERACIÓN DE PREGUNTAS DESDE IMÁGENES

Por cada imagen:

1. Se envía a IA
2. Se genera 1 pregunta

## Reglas:

- Basada únicamente en la imagen
- 4 opciones
- 1 correcta
- Explicación obligatoria

---

# 🧱 ESTRUCTURA DE PREGUNTA (EXTENSIÓN)

Se amplía la estructura actual:


{
pregunta,
opciones,
respuesta_correcta,
explicacion,
tipo: "imagen", // nuevo
imagen: "ruta" // nuevo (path local)
}


---

# 🔀 INTEGRACIÓN CON SISTEMA EXISTENTE

## Normalización

- Se reutiliza `normalizarPreguntas()`
- Se extiende para soportar:
  - tipo = "imagen"
  - campo imagen

## Validación

- Preguntas de texto:
  ✔ se validan como actualmente

- Preguntas de imagen:
  ⚠️ no se validan contra texto
  ✔ pasan directo o validación ligera independiente

---

# ⚠️ CONSIDERACIONES

- Documentos pueden tener:
  - solo texto
  - solo imágenes
  - ambos

- Si no hay texto:
  ✔ generar preguntas solo de imágenes

- Si no hay imágenes:
  ✔ flujo actual sin cambios

---

# 🎯 FRONTEND

Cambio mínimo:

## Render condicional:

- Si tipo === "imagen"
  - mostrar imagen antes de la pregunta

No se modifican:
- lógica de respuestas
- validación
- dashboard
- historial

---

# 🚀 RESULTADO

El sistema ahora permite:

✔ Preguntas desde texto  
✔ Preguntas desde imágenes  
✔ Mezcla automática  
✔ Soporte multimodal completo  
✔ Sin romper arquitectura actual