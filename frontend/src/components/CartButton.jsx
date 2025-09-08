// src/components/CartButton.jsx
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartButton() {
  const { itemCount } = useCart();
  return (
    <Link to="/carrito" className="cart-btn" aria-label="Carrito">
      🛒
      {itemCount > 0 && <span className="badge">{itemCount}</span>}
    </Link>
  );
}
