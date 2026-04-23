# 📚 Plan Maestro — Evolución de la App de Cuestionarios con IA

## 🎯 Objetivo

Extender la aplicación actual para permitir generar cuestionarios no solo desde texto ingresado manualmente, sino también desde archivos (documentos e imágenes), manteniendo intacta la lógica existente.

---

# 🧠 Principio clave

La arquitectura actual se mantiene:

```
Entrada → Generación IA → Evaluación → Resultado → Persistencia
```

Solo cambia la **fuente de entrada**.

---

# 🚀 VISIÓN GENERAL DEL PROYECTO

El desarrollo se divide en **3 versiones evolutivas**, cada una funcional por sí misma:

| Versión | Enfoque                                  | Complejidad | Prioridad |
| ------- | ---------------------------------------- | ----------- | --------- |
| V1      | Documento completo → preguntas           | Baja        | 🔴 Alta   |
| V2      | Selección de contenido (páginas / temas) | Media       | 🟡 Media  |
| V3      | Interpretación de imágenes               | Alta        | 🔵 Baja   |

---

# 🥇 VERSIÓN 1 — DOCUMENTO COMPLETO

## 🎯 Objetivo

Permitir cargar un archivo y generar preguntas sobre TODO su contenido. Si el documento contiene Texto + Imágenes, se ignoran las imágenes y se realizan preguntas sobre el texto.

---

## 📦 Alcance

### Entrada:

* PDF
* DOC / DOCX
* TXT

### Flujo:

```
Archivo → Texto → IA → Preguntas → Flujo actual
```

---

## 🧩 Fases

### 🔹 Fase 1.1 — Carga de archivo

* Input tipo file en frontend
* Envío al backend

---

### 🔹 Fase 1.2 — Extracción de texto

* Convertir archivo a texto plano
* Unificar contenido en un solo string

---

### 🔹 Fase 1.3 — Integración con generación

* Usar el texto como si fuera `temas`
* Reutilizar endpoint `/generar`

---

### 🔹 Fase 1.4 — Flujo completo

* Evaluación
* Feedback
* Resultado
* Guardado en BD
* Historial
* Dashboard

👉 Sin cambios en lógica existente

---

## ⚠️ Consideraciones

* Limitar tamaño del texto
* Evitar documentos extremadamente largos

---

## ✅ Resultado esperado

* Usuario sube archivo
* Se generan preguntas automáticamente
* Funciona igual que la app actual

---

# 🥈 VERSIÓN 2 — SELECCIÓN DE CONTENIDO

## 🎯 Objetivo

Dar control al usuario sobre qué parte del documento evaluar

---

## 🧩 Enfoques

### ✔ Opción A — Selección por páginas (RECOMENDADA)

### ✔ Opción B — Selección por temas (opcional)

---

## 🧩 Fases

---

### 🔹 Fase 2.1 — División por páginas

* Identificar páginas del documento
* Permitir seleccionar rango (ej: 2–5)

---

### 🔹 Fase 2.2 — Generación parcial

```
Documento → páginas seleccionadas → texto → IA
```

---

### 🔹 Fase 2.3 — UI de selección

* Selector de páginas
* Validación de rango

---

### 🔹 Fase 2.4 — (Opcional) Temas simples

* Detectar bloques de contenido
* Mostrar lista básica de temas
* Permitir selección

⚠️ No usar lógica compleja de NLP en esta fase

---

## ⚠️ Consideraciones

* Páginas = control determinista
* Temas = menor precisión

---

## ✅ Resultado esperado

* Usuario decide qué parte del documento evaluar
* Preguntas más relevantes

---

# 🥉 VERSIÓN 3 — IMÁGENES

## 🎯 Objetivo

Generar preguntas basadas en contenido visual

---

## 📦 Alcance

### Tipos:

* Imágenes (JPG, PNG)
* Imágenes dentro de documentos

---

## 🧩 Fases

---

### 🔹 Fase 3.1 — Carga de imágenes

* Input de archivos de imagen
* Soporte múltiple

---

### 🔹 Fase 3.2 — Interpretación visual

```
Imagen → descripción → IA → preguntas
```

---

### 🔹 Fase 3.3 — Integración con flujo actual

* Mezclar preguntas de texto + imagen
* Mantener formato actual

---

### 🔹 Fase 3.4 — Imágenes en documentos

* Extraer imágenes de PDF/DOCX
* Procesarlas individualmente

---

## ⚠️ Consideraciones críticas

* Mayor costo de IA
* Mayor latencia
* Posible menor precisión

---

## ✅ Resultado esperado

* Preguntas basadas en imágenes
* Integración con cuestionarios existentes

---

# 🧠 DECISIONES ARQUITECTÓNICAS CLAVE

---

## 🔹 Persistencia

✔ Guardar:

* Texto procesado del documento
* NO necesariamente el archivo original

---

## 🔹 Reutilización

✔ Permitir:

* Repetir cuestionarios
* Mezclar preguntas nuevas y anteriores

---

## 🔹 Compatibilidad

✔ Todo debe seguir funcionando:

* Modo actual (por temas)
* Historial
* Dashboard
* Refuerzo

---

# 🚀 ORDEN DE IMPLEMENTACIÓN (OBLIGATORIO)

1. ✅ Versión 1 completa
2. ✅ Versión 2 (páginas primero)
3. ⏳ Temas (opcional)
4. ⏳ Versión 3 (imágenes)

---

# ❌ LO QUE NO SE DEBE HACER

* No implementar todo al mismo tiempo
* No iniciar por imágenes
* No hacer NLP complejo en fase inicial
* No romper endpoints existentes

---

# 🏁 DEFINICIÓN DE ÉXITO

La funcionalidad se considera completa cuando:

✔ Se puede generar cuestionario desde archivo
✔ Se mantiene todo el flujo actual
✔ Se puede repetir evaluaciones
✔ Se guarda correctamente en BD
✔ Se visualiza en historial y dashboard

---

# 📌 NOTA FINAL

Este documento es la **fuente única de verdad**.
Cualquier cambio debe reflejarse aquí antes de implementarse.

---
