// backend/src/db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',      // 👉 Docker expone PostgreSQL en localhost
  port: 5432,             // 👉 Usamos el puerto estándar mapeado en docker-compose
  user: 'postgres',       // 👤 Usuario definido en docker-compose.yml
  password: 'Camaro123',  // 🔑 Contraseña definida en docker-compose.yml
  database: 'Proyecto3D'  // 📦 Nombre de la base
});

// Probar la conexión
pool.connect()
  .then(client => {
    console.log('✅ Conexión exitosa a PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a PostgreSQL', err.stack);
  });

export default pool;
