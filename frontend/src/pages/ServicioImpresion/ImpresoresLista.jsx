// src/pages/ServicioImpresion/ImpresoresLista.jsx
import { useEffect, useState } from 'react';
import API from '../../api';
import './impresores.css';


export default function ImpresoresLista(){
const [items, setItems] = useState([]);
const [q, setQ] = useState('');


useEffect(() => { (async()=>{
const { data } = await API.get('/servicio/impresoras');
setItems(data);
})(); }, []);


const filtrados = items.filter(x => x.nombre_publico.toLowerCase().includes(q.toLowerCase()));


return (
<div className="page-wrapper">
<h1>Impresores disponibles</h1>
<input className="buscar" placeholder="Buscar" value={q} onChange={e=>setQ(e.target.value)} />
<div className="grid-impresores">
{filtrados.map(i => (
<article className="card-impresor" key={i.id}>
<h3>{i.nombre_publico}</h3>
<p>{i.tecnologia} • {i.volumen}</p>
<p>Materiales: {i.materiales.join(', ')}</p>
<p>Desde ARS {i.costo_hora}/h</p>
<button onClick={()=>alert('Abrir modal de cotizar con este vendedor')}>Cotizar</button>
</article>
))}
</div>
</div>
);
}