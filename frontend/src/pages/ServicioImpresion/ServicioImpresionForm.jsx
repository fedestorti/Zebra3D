// src/pages/ServicioImpresion/ServicioImpresionForm.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import API from "../../api";

export default function ServicioImpresionForm() {
  const { usuario, loading } = useAuth();
  const [params] = useSearchParams();
  const mp = params.get("mp");
  const msg = params.get("msg");

  const [vendedor, setVendedor] = useState(null);
  const [mpLinked, setMpLinked] = useState(false);
  const [error, setError] = useState("");
  const [showComingSoon, setShowComingSoon] = useState(true);

  const [formVend, setFormVend] = useState({
    cuit: "",
    condicion_fiscal: "monotributo",
  });

  const [impresora, setImpresora] = useState({
    nombre_publico: "",
    tecnologia: "FDM",
    materiales: "PLA,PETG",
    volumen: "220x220x250",
    boquillas: "0.4",
    costo_hora: 2000,
    costo_envio_base: 0,
  });

  // cargar estado de vendedor
  useEffect(() => {
    if (loading || !usuario) return;
    (async () => {
      try {
        const { data } = await API.get("/servicio/vendedores/me");
        setVendedor(data);
        setMpLinked(Boolean(data?.mp_user_id));
      } catch {
        setVendedor(null);
        setMpLinked(false);
      }
    })();
  }, [loading, usuario]);

  // refrescar después de callback ?mp=ok
  useEffect(() => {
    if (mp !== "ok" || loading || !usuario) return;
    (async () => {
      try {
        const { data } = await API.get("/servicio/vendedores/me");
        setVendedor(data);
        setMpLinked(Boolean(data?.mp_user_id));
      } catch {
        setVendedor(null);
        setMpLinked(false);
      }
    })();
  }, [mp, loading, usuario]);

  // Bloquea scroll cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = showComingSoon ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [showComingSoon]);


  if (loading) return <p>Cargando sesión…</p>;
  if (!usuario) return <p>Necesitás iniciar sesión para habilitar el servicio.</p>;

  const guardarVendedor = async () => {
    setError("");
    try {
      const { data } = await API.post("/servicio/vendedores", formVend);
      setVendedor(data);
    } catch {
      setError("No se pudo guardar el vendedor. Revisá CUIT y sesión.");
    }
  };

  const iniciarOAuth = async () => {
    setError("");
    try {
      const { data } = await API.get("/servicio/vendedores/mp/oauth/start");
      if (!data?.auth_url) throw new Error("Sin auth_url");
      window.location.href = data.auth_url;
    } catch {
      setError("No se pudo iniciar la vinculación con Mercado Pago.");
    }
  };

  const crearImpresora = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/servicio/impresoras", impresora);
      alert("Impresora creada: " + data.nombre_publico);
      setImpresora((v) => ({ ...v, nombre_publico: "" }));
    } catch {
      setError("No se pudo crear la impresora. Completá los campos.");
    }
  };

 return (
  <>
    {/* MODAL PRÓXIMAMENTE */}
    {showComingSoon && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Próximamente"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "min(600px, 92vw)",
            background: "#111",
            border: "1px solid #333",
            borderRadius: 12,
            padding: "28px 20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            textAlign: "center",
          }}
        >

          <div
            style={{
              position: "relative",
              margin: "8px 0 16px",
              height: 72,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: "100%",
                transform: "translateY(-50%) rotate(-5deg)",
                background: "rgba(200,0,0,0.9)",
                color: "#fff",
                fontWeight: 800,
                letterSpacing: 3,
                textTransform: "uppercase",
                fontSize: 28,
                padding: "14px 0",
                borderRadius: 6,
                border: "2px dashed rgba(255,255,255,0.8)",
              }}
            >
              PRÓXIMAMENTE
            </div>
          </div>

          <p style={{ color: "#ccc", margin: "18px 0 0" }}>
            Estamos terminando los últimos detalles del servicio.
          </p>
        </div>
      </div>
    )}

    {/* CONTENIDO ORIGINAL */}
    <div className="page-wrapper">
      {/* ...todo tu contenido original acá... */}
    </div>
  </>
);

}
