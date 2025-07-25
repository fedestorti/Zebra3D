import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';

import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import disenosRoutes from './routes/disenos.routes.js';
import { cloudinary } from './lib/cloudinary.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/disenos', disenosRoutes);

app.get('/', (req, res) => {
  res.send('🚀 Backend Proyecto3D funcionando!');
});

//servicio cloudinary
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('❌ Error conectando a Cloudinary:', error);
  } else {
    console.log('✅ Conectado a Cloudinary:', result);
  }
});

// Servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor backend escuchando en el puerto ${PORT}`);
});
