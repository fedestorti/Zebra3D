// backend/src/controllers/usuarios.controller.js
import pool from '../db.js';

// Listar usuarios
export const listarUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Crear usuario
export const crearUsuario = async (req, res) => {
  const { nombre, email, contraseña } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, contraseña) VALUES ($1, $2, $3) RETURNING *',
      [nombre, email, contraseña]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    console.log('📦 error.message:', error.message);
    console.log('📦 error.code:', error.code);
  
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
  
    if (
      error.message &&
      error.message.includes('duplicate key value') &&
      error.message.includes('email')
    ) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
  
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};
