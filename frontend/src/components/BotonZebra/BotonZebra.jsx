import "./BotonZebra.css";

export default function BotonZebra({ texto, enviando, onClick, disabled, style }) {
  return (
    <button
      className={`boton-zebra ${enviando ? 'enviando' : ''}`}
      type="submit"
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {texto}
    </button>
  );
}
