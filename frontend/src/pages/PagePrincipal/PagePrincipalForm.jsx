import { useNavigate } from 'react-router-dom';
import TarjetaDiseno from '../../components/TarjetaDiseno/TarjetaDiseno';

export default function PagePrincipalForm() {
  const navigate = useNavigate();

  const disenosEjemplo = [
    {
      id: 1,
      titulo: 'Soporte para Celular',
      creador: 'FedePrints',
      imagen: '/Fotos/Ejemplos/celular.jpg',
      precio: 'Gratis'
    },
    {
      id: 2,
      titulo: 'Maceta con forma de zorro',
      creador: 'Zebra3D',
      imagen: '/Fotos/Ejemplos/maceta.jpg',
      precio: '$2.000'
    }
  ];

  return (
    <div className="pagina-principal">
      <section className="banner">
        <h1>🎨 Descubrí diseños 3D únicos</h1>
        <p>Subí, compartí o descargá tus modelos favoritos</p>
      </section>

      <section className="galeria">
        {disenosEjemplo.map(d => (
          <TarjetaDiseno key={d.id} diseno={d} />
        ))}
      </section>
    </div>
  );
}