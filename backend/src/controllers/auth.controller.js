//src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { cloudinary } from '../lib/cloudinary.js';

// Registro de usuario
// Registro de usuario
export const register = async (req, res) => {
  const { apodo, nombre, apellido, email, contrasena, pais } = req.body;

  // 🔹 Validaciones backend
  if (!apodo || !nombre || !apellido || !email || !contrasena || !pais) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email no válido' });

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  if (!passwordRegex.test(contrasena)) return res.status(400).json({ error: 'Contraseña no cumple requisitos' });

  try {
    // 🔹 Verificar si el apodo o email ya existen antes de insertar
    const usuarioExistente = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE apodo = $1 OR email = $2`,
      [apodo, email]
    );

    if (usuarioExistente.rows.length > 0) {
      // 🚨 Eliminar imagen subida si existiera
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'image' });
      }
      return res.status(400).json({ error: 'El apodo o email ya están registrados' });
    }

    // 🔒 Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // 🌩️ URL del avatar
    let avatar_url;
    if (req.file) {
      avatar_url = req.file.path; // avatar subido por el usuario
    } else {
      avatar_url = 'https://res.cloudinary.com/dortoxt8j/image/upload/v1755203058/AVatarDefault_zvqurk.png'; // avatar por defecto
    }

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO usuarios (apodo, nombre, apellido, email, contrasena, avatar_url, pais)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_usuario`,
      [apodo, nombre, apellido, email, hashedPassword, avatar_url, pais]
    );

    // Crear carpeta disenos
    await cloudinary.api.create_folder(`usuarios/${apodo}/disenos`);

    res.status(201).json({ message: '✅ Usuario registrado con éxito', id: result.rows[0].id_usuario });

  } catch (error) {
    console.error('❌ Error al registrar usuario:', error);
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