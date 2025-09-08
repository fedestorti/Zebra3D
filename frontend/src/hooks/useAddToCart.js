// src/hooks/useAddToCart.js
import { useCart } from "../context/CartContext";

export default function useAddToCart() {
  const { addToCart } = useCart();

  return (disenoId, cantidad = 1) => {
    if (!disenoId) {
      console.warn("❌ ID de diseño inválido al agregar al carrito:", disenoId);
      return;
    }

    addToCart(disenoId, cantidad);
  };
}