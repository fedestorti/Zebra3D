import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { JWT_SECRET } from '../config.js';

//----------------------------------------------------------------
// Registro
export const register = async (req, res) => {
  const { apodo, nombre, apellido, email, contraseña, avatar_url, pais } = req.body;

  try {
    // Validar campos obligatorios
    if (!apodo || !nombre || !apellido || !email || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar completos' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    // Insertar en DB
    const result = await pool.query(
      `INSERT INTO usuarios (apodo, nombre, apellido, email, contrasena, avatar_url, pais)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_usuario`,
      [apodo, nombre, apellido, email, hashedPassword, avatar_url, pais]  // 👈 este array es necesario
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
  const { email, contraseña } = req.body;

  try {
    const normalizedEmail = email.toLowerCase(); // 👈 Forzar minúsculas

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!validPassword) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    // 🔥 Firmar el token con el campo correcto
    const token = jwt.sign(
      { id_usuario: user.id_usuario, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: '✅ Login exitoso', token });
  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

//----------------------------------------------------------------