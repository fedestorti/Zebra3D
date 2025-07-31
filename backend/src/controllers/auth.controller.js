//src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { JWT_SECRET } from '../config.js';

// Registro
export const register = async (req, res) => {
  const { apodo, nombre, apellido, email, contrasena, pais } = req.body;

  try {
    // 🔒 Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // 🌩️ Obtener URL del avatar desde Cloudinary (o usar default)
    const avatar_url = req.file?.path || 'https://res.cloudinary.com/demo/image/upload/v123456/avatar-default.png';

    const result = await pool.query(
      `INSERT INTO usuarios (apodo, nombre, apellido, email, contrasena, avatar_url, pais)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_usuario`,
      [apodo, nombre, apellido, email, hashedPassword, avatar_url, pais]
    );

    res.status(201).json({ message: '✅ Usuario registrado con éxito', id: result.rows[0].id_usuario });
  } catch (error) {
    console.error('❌ Error al registrar usuario:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El apodo o email ya están registrados' });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};
//----------------------------------------------------------------
// Login 
export const login = async (req, res) => {
  const { email, contrasena } = req.body;
  console.log('📨 Datos recibidos en login:', { email, contrasena });

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Email no registrado' });
    }

    const usuario = result.rows[0];
    console.log('🧠 Usuario encontrado:', usuario);

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena); // 👈 campo correcto

    if (!coincide) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id_usuario: usuario.id_usuario }, process.env.JWT_SECRET, {
      expiresIn: '365d'
    });

    res.json({ token });
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const obtenerPerfil = async (req, res) => {
  try {
    const { id_usuario } = req.usuario;

    const result = await pool.query(
      'SELECT id_usuario,apodo, avatar_url, email FROM usuarios WHERE id_usuario = $1',
      [id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

//----------------------------------------------------------------