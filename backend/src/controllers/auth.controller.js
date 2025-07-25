import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { JWT_SECRET } from '../config.js';

// Registro
export const register = async (req, res) => {
  const { nombre, apellido, email, contraseña } = req.body;

  console.log('📩 Datos recibidos:', req.body); // 👀 Debug

  try {
    if (!nombre || !apellido || !email || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const normalizedEmail = email.toLowerCase(); // 👈 Forzar minúsculas
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    console.log('✅ Contraseña encriptada:', hashedPassword);

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, contraseña) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, apellido, normalizedEmail, hashedPassword]
    );

    res.status(201).json({ message: '✅ Usuario registrado', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

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
