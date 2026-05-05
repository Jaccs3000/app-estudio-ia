import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useState, useEffect, useRef } from "react";
import { Cell } from "recharts";
import { ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Layout = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex justify-center px-4 py-6">
    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 md:p-8">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 text-center">
        📚 App de Estudio con IA
      </h1>
      {children}
    </div>
  </div>
);

function App() {
  const [temas, setTemas] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [dataGrafico, setDataGrafico] = useState([]);
  const [verDashboard, setVerDashboard] = useState(false);
  const [resumenDocumento, setResumenDocumento] = useState("");
  const [textoDocumento, setTextoDocumento] = useState("");
  const LIMITE_GRAFICO = 10;

  const [preguntas, setPreguntas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [preguntasOriginales, setPreguntasOriginales] = useState([]);

  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] = useState([]);

  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [seleccionActual, setSeleccionActual] = useState(null);
  const [finalizado, setFinalizado] = useState(false);
  const [modoRefuerzo, setModoRefuerzo] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const inputFileRef = useRef(null);

  const btnPrimary =
    "bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2 rounded-xl transition";
  const btnSecondary =
    "bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl transition";
  const btnSuccess =
    "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition";

  const getColor = (nota) => {
    const n = Number(nota);

    if (n >= 4) return "#4caf50"; // verde
    if (n >= 3) return "#ff9800"; // amarillo/naranja
    return "#f44336"; // rojo
  };

  // ------------------- GENERAR -------------------

  const generarPreguntas = async () => {
    const contenido = textoDocumento || temas;

    if (textoDocumento.includes("sin texto")) {
      alert("El PDF no contiene texto legible");
      return;
    }

    if (!contenido.trim()) {
      alert("Debes escribir al menos un tema o cargar un documento");
      return;
    }

    setCargando(true);

    try {
      const response = await fetch("http://localhost:3000/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ temas: contenido }),
      });

      const data = await response.json();

      const lista = data.preguntas || [];

      console.log("📥 PREGUNTAS RECIBIDAS EN FRONT:");
      console.log(lista);

      setPreguntas(lista);
      setPreguntasOriginales(lista);

      console.log("📦 STATE preguntas:");
      console.log(lista);

      setIndiceActual(0);
      setRespuestas([]);
      setMostrarFeedback(false);
      setFinalizado(false);
      setModoRefuerzo(false);
      setGuardado(false);
    } catch (error) {
      console.error(error);
      alert("Error conectando con backend");
    }

    setCargando(false);
  };

  const manejarCargaArchivos = (e) => {
    const procesarArchivos = async (files) => {
      try {
        const formData = new FormData();

        files.forEach((file) => {
          formData.append("archivos", file);
        });

        const res = await fetch("http://localhost:3000/procesar-archivos", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        setTextoDocumento(data.texto); // 👈 NUEVO (IMPORTANTE)
        setResumenDocumento(data.resumen);
      } catch (error) {
        console.error(error);
        alert("Error procesando archivos");
      }
    };
    const files = Array.from(e.target.files);

    // 🔥 VALIDACIÓN: si hay texto escrito
    if (temas.trim().length > 0) {
      const confirmar = window.confirm(
        "Tienes texto escrito. ¿Deseas borrarlo y continuar?",
      );

      if (!confirmar) return;

      setTemas("");
    }

    const nuevosArchivos = [...archivos, ...files];
    setArchivos(nuevosArchivos);

    // 🔥 enviar al backend
    procesarArchivos(nuevosArchivos);
    e.target.value = null;
  };

  const eliminarArchivo = (index) => {
    const nuevos = archivos.filter((_, i) => i !== index);
    setArchivos(nuevos);

    if (nuevos.length === 0) {
      setResumenDocumento(""); // 👈 limpiar resumen
      setTextoDocumento(""); // 👈 limpiar texto oculto
    }
  };

  const abrirSelectorArchivos = () => {
    if (temas.trim().length > 0) {
      const confirmar = window.confirm(
        "Tienes texto escrito. ¿Deseas borrarlo y continuar?",
      );

      if (!confirmar) return;

      setTemas("");
    }

    if (inputFileRef.current) {
      inputFileRef.current.click();
    }
  };

  // ------------------- RESPONDER -------------------

  const responder = (valor) => {
    const pregunta = preguntas[indiceActual];

    const esCorrecta = valor === pregunta.respuesta_correcta;

    const nueva = {
      pregunta: pregunta.pregunta,
      seleccion: valor,
      esCorrecta,
      explicacion: pregunta.explicacion,
      correcta: pregunta.correcta || pregunta.respuesta_correcta,
    };
    setSeleccionActual(valor);
    setRespuestas((prev) => [...prev, nueva]);
    setMostrarFeedback(true);
  };

  // ------------------- SIGUIENTE -------------------

  const siguiente = () => {
    setSeleccionActual(null);
    setMostrarFeedback(false);

    if (indiceActual + 1 < preguntas.length) {
      setIndiceActual(indiceActual + 1);
    } else {
      setFinalizado(true);
    }
  };

  // ------------------- REFUERZO -------------------

  const iniciarRefuerzo = () => {
    const incorrectas = respuestas.filter((r) => !r.esCorrecta);

    if (incorrectas.length === 0) {
      alert("No hay preguntas incorrectas 🎉");
      return;
    }

    const nuevasPreguntas = preguntasOriginales.filter((p) =>
      incorrectas.some((r) => r.pregunta === p.pregunta),
    );

    setPreguntas(nuevasPreguntas);
    setIndiceActual(0);
    setRespuestas([]);
    setMostrarFeedback(false);
    setFinalizado(false);
    setModoRefuerzo(true);
  };

  // ------------------- REINICIAR -------------------
  const reiniciarTodo = () => {
    setPreguntas([]);
    setPreguntasOriginales([]);
    setIndiceActual(0);
    setRespuestas([]);
    setMostrarFeedback(false);
    setFinalizado(false);
    setModoRefuerzo(false);
    setGuardado(false);
    setVerHistorial(false);
    setVerDashboard(false);
    //setTemas("");
  };

  const obtenerHistorial = async (page = 1) => {
    try {
      if (typeof page !== "number") {
        page = 1;
      }

      const res = await fetch(`http://localhost:3000/resultados?page=${page}`);
      const data = await res.json();

      // 🔥 SI NO HAY DATOS Y NO ES LA PRIMERA PÁGINA → NO AVANZAR
      if (data.resultados.length === 0 && page > 1) {
        return;
      }

      setHistorial(data.resultados);
      setPagina(page);

      // 🔥 SOLO HAY MÁS SI VIENEN EXACTAMENTE 5
      setHayMas(data.hayMas);

      setVerHistorial(true);
    } catch (error) {
      console.error(error);
      alert("Error cargando historial");
    }
  };

  // ------------------- GUARDAR RESULTADO EN BD -------------------
  const guardarResultado = async () => {
    try {
      const correctas = respuestas.filter((r) => r.esCorrecta).length;
      const total = respuestas.length;
      const nota = ((correctas / total) * 5).toFixed(2);

      await fetch("http://localhost:3000/guardar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temas: resumenDocumento || temas,
          preguntas,
          respuestas,
          correctas,
          total,
          nota,
        }),
      });

      console.log("💾 Guardado automático");
    } catch (error) {
      console.error("Error guardando:", error);
    }
  };

  const obtenerDashboard = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/dashboard?limit=${LIMITE_GRAFICO}`,
      );
      const data = await res.json();

      // 🔥 FORMATEAR FECHA CORTA
      const formateado = data.map((item, index) => ({
        ...item,
        fechaCorta: new Date(item.fecha).toLocaleString(),
        index,
      }));

      setDataGrafico(formateado);
      setVerDashboard(true);
    } catch (error) {
      console.error(error);
      alert("Error cargando dashboard");
    }
  };

  useEffect(() => {
    if (finalizado && !guardado) {
      guardarResultado();
      setGuardado(true);
    }
  }, [finalizado]);

  if (detalle) {
    if (!Array.isArray(detalle.respuestas)) {
      return (
        <div style={{ padding: "20px" }}>
          <p>Error en datos del historial</p>
          <button
            onClick={() => setDetalle(null)}
            className={`${btnPrimary} w-full md:w-auto`}
          >
            Volver
          </button>
        </div>
      );
    }

    return (
      <Layout>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Detalle del intento 📘
        </h2>

        {detalle.respuestas.map((r, i) => (
          <div
            key={i}
            className="bg-white border-l-4 border-gray-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-200 cursor-pointer"
          >
            <p className="font-semibold text-gray-800 mb-1">{r.pregunta}</p>

            <p className="text-sm text-gray-600">
              Tu respuesta:{" "}
              {typeof r.seleccion === "object"
                ? JSON.stringify(r.seleccion)
                : String(r.seleccion)}
            </p>

            <p className="text-sm text-gray-600">
              Correcta:{" "}
              {typeof r.correcta === "object"
                ? JSON.stringify(r.correcta)
                : String(r.correcta)}
            </p>

            <p
              className={
                r.esCorrecta
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {r.esCorrecta ? "Correcto" : "Incorrecto"}
            </p>

            {!r.esCorrecta && (
              <div>
                <p>
                  <strong>Explicación:</strong>{" "}
                  {typeof r.explicacion === "object"
                    ? JSON.stringify(r.explicacion)
                    : String(r.explicacion)}
                </p>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => setDetalle(null)}
          className={`${btnPrimary} w-full md:w-auto`}
        >
          Volver
        </button>
      </Layout>
    );
  }

  if (verDashboard) {
    return (
      <Layout>
        <h2 className="text-center text-xl font-semibold mb-6">
          Rendimiento por intento 📊
        </h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dataGrafico}>
            <CartesianGrid stroke="#eee" strokeDasharray="2 2" />

            <XAxis dataKey="fechaCorta" tick={{ fontSize: 10 }} />

            <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;

                  return (
                    <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm">
                      <p>
                        <strong>{data.temas}</strong>
                      </p>
                      <p>Nota: {data.nota}/5</p>
                      <p className="text-xs text-gray-300">{data.fechaCorta}</p>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Bar
              dataKey="nota"
              animationDuration={800}
              radius={[6, 6, 0, 0]}
              onClick={(data) => {
                let respuestas = [];

                try {
                  respuestas = JSON.parse(data.payload.respuestas);
                } catch (e) {
                  console.error("Error parseando respuestas", e);
                }

                setDetalle({
                  ...data.payload,
                  respuestas,
                });
              }}
            >
              {dataGrafico.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.nota)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <button
          onClick={reiniciarTodo}
          className={`${btnPrimary} w-full md:w-auto`}
        >
          Volver
        </button>
      </Layout>
    );
  }

  if (verHistorial) {
    return (
      <Layout>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          📊 Historial
        </h2>

        {historial.filter(Boolean).length === 0 ? (
          <p>No hay registros</p>
        ) : (
          historial.map((item) => {
            let respuestas = [];

            if (item.respuestas && typeof item.respuestas === "string") {
              try {
                respuestas = JSON.parse(item.respuestas);
              } catch (error) {
                console.error("Error parseando respuestas:", item.respuestas);
              }
            }

            return (
              <div
                key={item.id}
                onClick={() =>
                  setDetalle({
                    ...item,
                    respuestas,
                  })
                }
                className="bg-white rounded-xl p-4 mb-4 shadow-md hover:shadow-xl hover:-translate-y-1 transition duration-200 cursor-pointer"
                style={{
                  borderLeft: `6px solid ${getColor(item.nota)}`,
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{item.temas}</p>

                    <p className="text-sm text-gray-600">
                      Resultado: {item.correctas}/{item.total}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">{item.fecha}</p>
                  </div>

                  <div className="text-right flex flex-col items-end justify-center min-w-[50px]">
                    <p
                      className="font-bold text-lg"
                      style={{ color: getColor(item.nota) }}
                    >
                      {item.nota}
                    </p>
                    <p className="text-xs text-gray-400">Nota</p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* 🔥 PAGINACIÓN AQUÍ */}
        <div className="mt-6 flex justify-start">
          <button
            onClick={() => {
              setVerHistorial(false);
              setVerDashboard(false);
              setDetalle(null);
            }}
            className={`${btnPrimary} px-3 py-1.5 text-sm`}
          >
            ← Volver
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl shadow-sm">
            <button
              onClick={() => obtenerHistorial(pagina - 1)}
              className={`${btnPrimary} w-12 h-12 flex items-center justify-center rounded-full shadow-md hover:scale-110`}
              disabled={pagina === 1}
            >
              <ChevronLeft size={26} color="white" />
            </button>

            <span className="text-sm text-gray-600">Página {pagina}</span>

            <button
              onClick={() => obtenerHistorial(pagina + 1)}
              className={`${btnPrimary} w-12 h-12 flex items-center justify-center rounded-full shadow-md hover:scale-110`}
              disabled={!hayMas}
            >
              <ChevronRight size={26} color="white" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ------------------- RESULTADO FINAL -------------------

  if (finalizado) {
    const correctas = respuestas.filter((r) => r.esCorrecta).length;
    const total = respuestas.length;
    const nota = ((correctas / total) * 5).toFixed(2);

    return (
      <Layout>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
          <h2 className="text-lg font-semibold text-indigo-700 mb-2">
            Resultado final
          </h2>

          <p className="text-gray-700">
            Correctas: <span className="font-semibold">{correctas}</span>
          </p>

          <p className="text-gray-700">
            Total: <span className="font-semibold">{total}</span>
          </p>

          <p className="text-xl font-bold text-indigo-600 mt-2">Nota: {nota}</p>
        </div>

        <hr />

        {respuestas.map((r, i) => (
          <div
            key={i}
            className="bg-white border-l-4 border-gray-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-200 cursor-pointer"
          >
            <p>
              <strong>{r.pregunta}</strong>
            </p>
            <p>Tu respuesta: {String(r.seleccion)}</p>

            <p
              className={
                r.esCorrecta
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {r.esCorrecta ? "Correcto" : "Incorrecto"}
            </p>

            {!r.esCorrecta && (
              <p>
                <strong>Explicación:</strong>{" "}
                {typeof r.explicacion === "object"
                  ? JSON.stringify(r.explicacion)
                  : String(r.explicacion)}
              </p>
            )}
          </div>
        ))}

        {/* BOTÓN REFUERZO */}
        {!modoRefuerzo && (
          <button
            onClick={iniciarRefuerzo}
            className={`${btnPrimary} w-full md:w-auto`}
          >
            Reforzar preguntas incorrectas
          </button>
        )}
        <button
          onClick={reiniciarTodo}
          className={`${btnPrimary} w-full md:w-auto`}
        >
          Nuevo cuestionario 🔄
        </button>
      </Layout>
    );
  }

  // ------------------- PREGUNTA ACTUAL -------------------

  // ------------------- PREGUNTA ACTUAL -------------------

  let total = 0;
  let actual = 0;
  let p = null;

  if (!finalizado && preguntas.length > 0) {
    total = preguntas.length;
    actual = indiceActual + 1;
    p = preguntas[indiceActual] || null;
    console.log("🖼️ PREGUNTA ACTUAL:");
    console.log(p);
    console.log("🔎 TIPO DE PREGUNTA:");
    console.log(p?.tipo);
  }

  return (
    <Layout>
      {/* <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">📚 App de Estudio con IA</h1> */}
      {preguntas.length === 0 && !verHistorial && (
        <>
          <div className="space-y-4">
            <textarea
              disabled={archivos.length > 0}
              placeholder={
                archivos.length > 0
                  ? "Elimina los archivos para escribir"
                  : "Escribe los temas (ej: fotosíntesis, células)"
              }
              value={temas}
              onChange={(e) => setTemas(e.target.value)}
              className="w-full h-28 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
            />
            <input
              ref={inputFileRef}
              type="file"
              multiple
              accept=".txt,.pdf,.doc,.docx"
              onChange={manejarCargaArchivos}
              style={{ display: "none" }}
            />
            {/* BLOQUE ARCHIVOS */}
            <div className="space-y-3">
              <button
                onClick={abrirSelectorArchivos}
                className="bg-white border-2 border-dashed border-indigo-400 text-indigo-600 px-4 py-4 rounded-xl w-full hover:bg-indigo-50 transition cursor-pointer"
              >
                {archivos.length > 0
                  ? "Agregar más documentos 📄"
                  : "Subir documentos 📄"}
              </button>
              {archivos.length === 0 && (
                <p className="text-xs text-gray-400 text-center">
                  Puedes subir varios archivos (PDF, Word, TXT)
                </p>
              )}

              {archivos.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {archivos.map((file, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm"
                    >
                      <span className="text-sm text-gray-700 truncate max-w-[85%]">
                        {file.name}
                      </span>

                      <button
                        onClick={() => eliminarArchivo(index)}
                        className="text-gray-400 hover:text-red-500 transition ml-3"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BLOQUE BOTONES (SEPARADO) */}
            <div className="flex flex-col md:flex-row gap-2 mt-4">
              <button
                onClick={generarPreguntas}
                disabled={cargando}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl w-full"
              >
                {cargando ? "Generando..." : "Generar preguntas"}
              </button>

              <button
                onClick={() => obtenerHistorial(1)}
                className={`${btnSecondary} w-full`}
              >
                Historial
              </button>

              <button
                onClick={obtenerDashboard}
                className={`${btnSecondary} w-full`}
              >
                Dashboard
              </button>
            </div>
          </div>
        </>
      )}

      {resumenDocumento &&
        preguntas.length === 0 &&
        !finalizado &&
        !verHistorial &&
        !verDashboard &&
        !detalle && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-4">
            <p className="text-sm text-indigo-800 font-medium mb-1">
              📄 Resumen del documento
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {resumenDocumento}
            </p>
          </div>
        )}

      {/* MODO REFUERZO */}
      {modoRefuerzo && (
        <p className="text-orange-500 font-medium">
          🔁 Modo Refuerzo (no afecta nota)
        </p>
      )}

      {/* PREGUNTAS */}
      {preguntas.length > 0 && !finalizado && p && (
        <div className="transition-all duration-300 animate-fadeIn">
          {/* PROGRESO */}
          <p className="text-sm text-gray-500 mb-1">
            Pregunta {actual} de {total}
          </p>

          {/* BARRA */}
          <div className="w-full h-2 bg-gray-200 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(actual / total) * 100}%` }}
            />
          </div>

          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">
            {p.pregunta}
          </h2>
          <p style={{ color: "red", fontSize: "12px" }}>
            DEBUG → tipo: {p.tipo}
          </p>

          {/* OPCIONES */}
          {!mostrarFeedback && (
            <>
              {p.tipo === "multiple" && (
                <div>
                  {p.opciones.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (!mostrarFeedback) responder(op);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl transition mb-2 active:scale-95 ${
                        seleccionActual === op
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-100 hover:bg-indigo-100"
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              )}
              {p.tipo === "vf" && (
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => {
                      if (!mostrarFeedback) responder("Verdadero");
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition w-full md:w-auto"
                  >
                    Verdadero
                  </button>
                  <button
                    onClick={() => {
                      if (!mostrarFeedback) responder("Falso");
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition w-full md:w-auto"
                  >
                    Falso
                  </button>
                </div>
              )}
            </>
          )}

          {/* FEEDBACK */}
          {mostrarFeedback && (
            <div className="mt-6 space-y-4">
              {respuestas[indiceActual]?.esCorrecta ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-700 font-semibold">✅ Correcto</p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 font-semibold mb-2">
                    ❌ Incorrecto
                  </p>
                  <p className="text-gray-700 text-sm">
                    {typeof p.explicacion === "object"
                      ? JSON.stringify(p.explicacion)
                      : String(p.explicacion)}
                  </p>
                </div>
              )}

              <button
                onClick={siguiente}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2 rounded-xl transition w-full md:w-auto"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default App;
