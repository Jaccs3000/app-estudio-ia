import { useState, useEffect } from "react";

function App() {
  const [temas, setTemas] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState(null);

  const [preguntas, setPreguntas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [preguntasOriginales, setPreguntasOriginales] = useState([]);

  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] = useState([]);

  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [modoRefuerzo, setModoRefuerzo] = useState(false);

  // ------------------- GENERAR -------------------

  const generarPreguntas = async () => {
    if (!temas) {
      alert("Escribe al menos un tema");
      return;
    }

    setCargando(true);

    try {
      const response = await fetch("http://localhost:3000/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ temas }),
      });

      const data = await response.json();

      const lista = data.preguntas || [];

      setPreguntas(lista);
      setPreguntasOriginales(lista);

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

  // ------------------- RESPONDER -------------------

  const responder = (valor) => {
    const pregunta = preguntas[indiceActual];

    let esCorrecta = false;

    if (pregunta.tipo === "multiple") {
      esCorrecta = valor === pregunta.correcta;
    }

    if (pregunta.tipo === "vf") {
      esCorrecta = valor === pregunta.respuesta_correcta;
    }

    const nueva = {
      pregunta: pregunta.pregunta,
      seleccion: valor,
      esCorrecta,
      explicacion: pregunta.explicacion,
      correcta: pregunta.correcta || pregunta.respuesta_correcta,
    };

    setRespuestas((prev) => [...prev, nueva]);
    setMostrarFeedback(true);
  };

  // ------------------- SIGUIENTE -------------------

  const siguiente = () => {
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
    //setTemas("");
  };

  const obtenerHistorial = async (page = 1) => {
    if (typeof page !== "number") {
      page = 1;
    }
    try {
      const res = await fetch(`http://localhost:3000/resultados?page=${page}`);
      const data = await res.json();

      setHistorial(data);
      setPagina(page);
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
          temas,
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
          <button onClick={() => setDetalle(null)}>Volver</button>
        </div>
      );
    }

    return (
      <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
        <h2>Detalle del intento 📘</h2>

        {detalle.respuestas.map((r, i) => (
          <div key={i} style={{ marginBottom: "15px" }}>
            <p>
              <strong>{r.pregunta}</strong>
            </p>

            <p>
              Tu respuesta:{" "}
              {typeof r.seleccion === "object"
                ? JSON.stringify(r.seleccion)
                : String(r.seleccion)}
            </p>

            <p>
              Correcta:{" "}
              {typeof r.correcta === "object"
                ? JSON.stringify(r.correcta)
                : String(r.correcta)}
            </p>

            <p style={{ color: r.esCorrecta ? "green" : "red" }}>
              {r.esCorrecta ? "Correcto" : "Incorrecto"}
            </p>

            {!r.esCorrecta && (
              <p>
                <p>
                  <strong>Explicación:</strong>{" "}
                  {typeof r.explicacion === "object"
                    ? JSON.stringify(r.explicacion)
                    : String(r.explicacion)}
                </p>
              </p>
            )}
          </div>
        ))}

        <button onClick={() => setDetalle(null)}>Volver</button>
      </div>
    );
  }

  if (verHistorial) {
    return (
      <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
        <h2>Historial 📊</h2>

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
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                <p>
                  <strong>Temas:</strong> {item.temas}
                </p>
                <p>
                  <strong>Nota:</strong> {item.nota}
                </p>
                <p>
                  <strong>Resultado:</strong> {item.correctas}/{item.total}
                </p>
                <p>
                  <strong>Fecha:</strong> {item.fecha}
                </p>
              </div>
            );
          })
        )}

        {/* 🔥 PAGINACIÓN AQUÍ */}
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => obtenerHistorial(pagina - 1)}
            disabled={pagina === 1}
          >
            ⬅ Anterior
          </button>

          <span style={{ margin: "0 10px" }}>Página {pagina}</span>

          <button onClick={() => obtenerHistorial(pagina + 1)}>
            Siguiente ➡
          </button>
        </div>

        <button onClick={reiniciarTodo}>Volver</button>
      </div>
    );
  }

  // ------------------- RESULTADO FINAL -------------------

  if (finalizado) {
    const correctas = respuestas.filter((r) => r.esCorrecta).length;
    const total = respuestas.length;
    const nota = ((correctas / total) * 5).toFixed(2);

    return (
      <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
        <h2>Resultado final</h2>

        <p>Correctas: {correctas}</p>
        <p>Total: {total}</p>
        <p>
          <strong>Nota: {nota}</strong>
        </p>

        <hr />

        {respuestas.map((r, i) => (
          <div key={i} style={{ marginBottom: "15px" }}>
            <p>
              <strong>{r.pregunta}</strong>
            </p>
            <p>Tu respuesta: {String(r.seleccion)}</p>

            <p style={{ color: r.esCorrecta ? "green" : "red" }}>
              {r.esCorrecta ? "Correcto" : "Incorrecto"}
            </p>

            {!r.esCorrecta && (
              <p>
                <strong>Explicación:</strong> {r.explicacion}
              </p>
            )}
          </div>
        ))}

        {/* BOTÓN REFUERZO */}
        {!modoRefuerzo && (
          <button onClick={iniciarRefuerzo} style={{ marginTop: "20px" }}>
            Reforzar preguntas incorrectas
          </button>
        )}
        <button
          onClick={reiniciarTodo}
          style={{ marginTop: "10px", marginLeft: "10px" }}
        >
          Nuevo cuestionario 🔄
        </button>
      </div>
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
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h1>App de Estudio con IA 📚</h1>

      {/* INPUT */}
      {preguntas.length === 0 && !verHistorial && (
        <>
          <textarea
            placeholder="Escribe los temas (ej: fotosíntesis, células)"
            value={temas}
            onChange={(e) => setTemas(e.target.value)}
            style={{ width: "100%", height: "100px", marginBottom: "10px" }}
          />

          <button onClick={generarPreguntas} disabled={cargando}>
            {cargando ? "Generando..." : "Generar preguntas"}
          </button>

          <button onClick={() => obtenerHistorial(1)}>Ver historial 📊</button>
        </>
      )}

      {/* MODO REFUERZO */}
      {modoRefuerzo && (
        <p style={{ color: "orange" }}>🔁 Modo Refuerzo (no afecta nota)</p>
      )}

      {/* PREGUNTAS */}
      {preguntas.length > 0 && !finalizado && p && (
        <div>
          {/* PROGRESO */}
          <p>
            <strong>
              Pregunta {actual} de {total}
            </strong>
          </p>

          {/* BARRA */}
          <div
            style={{
              background: "#ddd",
              height: "10px",
              borderRadius: "5px",
              marginBottom: "15px",
            }}
          >
            <div
              style={{
                width: `${(actual / total) * 100}%`,
                background: "#4caf50",
                height: "100%",
                borderRadius: "5px",
              }}
            />
          </div>

          <h2>{p.pregunta}</h2>

          {/* OPCIONES */}
          {!mostrarFeedback && (
            <>
              {p.tipo === "multiple" && (
                <div>
                  {p.opciones.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => responder(op)}
                      style={{ display: "block", marginBottom: "10px" }}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              )}

              {p.tipo === "vf" && (
                <div>
                  <button onClick={() => responder(true)}>Verdadero</button>
                  <button
                    onClick={() => responder(false)}
                    style={{ marginLeft: "10px" }}
                  >
                    Falso
                  </button>
                </div>
              )}
            </>
          )}

          {/* FEEDBACK */}
          {mostrarFeedback && (
            <div style={{ marginTop: "20px" }}>
              {respuestas[indiceActual]?.esCorrecta ? (
                <p style={{ color: "green" }}>✅ Correcto</p>
              ) : (
                <div>
                  <p style={{ color: "red" }}>❌ Incorrecto</p>
                  <p>
                    {typeof p.explicacion === "object"
                      ? JSON.stringify(p.explicacion)
                      : String(p.explicacion)}
                  </p>
                </div>
              )}

              <button onClick={siguiente} style={{ marginTop: "10px" }}>
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
