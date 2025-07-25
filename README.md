# 🦓 Zebra3D – Plataforma de Diseños 3D

**Zebra3D** es una aplicación web full-stack desarrollada para mostrar, registrar y gestionar diseños de impresión 3D. Utiliza **React + Node.js**, una base de datos **PostgreSQL**, y está preparada para correr con **Docker**.

---

## 🚀 Tecnologías utilizadas

- ⚙️ **Backend**: Node.js + Express
- 🖼️ **Frontend**: React + Vite
- 🐘 **Base de datos**: PostgreSQL
- ☁️ **Cloudinary** (para subir imágenes)
- 🔐 **JWT** para autenticación segura
- 🐳 **Docker** (opcional para contenerización)

---

🖼️ Funcionalidades principales

✅ Registro de usuarios con validación de contraseña segura

📸 Galería para mostrar diseños 3D

🧾 Formulario con validaciones en tiempo real

🌙 Interfaz oscura, moderna y responsiva

🔐 Seguridad con JWT en rutas privadas

---

 ## 📁 Estructura de Proyecto(Zebra3D)

```text
mi-app-3d
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   │   └── Fotos/
│   │       └── Logo/
│   │           └── LogoIndividual.png          # Favicon y logos
│   ├── src/
│   │   ├── components/                         # Componentes reutilizables
│   │   │   └── Header/
│   │   │       ├── Header.css
│   │   │       └── Header.jsx
│   │   ├── pages/                              # Páginas completas
│   │   │   ├── Register/
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── RegisterForm.jsx
│   │   │   │   └── Register.css
│   │   │   └── Login/
│   │   │       ├── Login.jsx
│   │   │       ├── LoginForm.jsx
│   │   │       └── Login.css
│   │   ├── api.js                              # Configuración de Axios u otros servicios
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/
│   ├── node_modules/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js 
│   │   │   ├── disenos.controller.js
│   │   │   └── usuarios.controller.js
│   │   ├── lib/
│   │   │   ├── cloudinary.js
│   │   │   └── multer.js
│   │   ├── middlewares/
│   │   │   └── auth.middleware.js
│   │   ├── models/
│   │   │   ├── diseño.model.js
│   │   │   └── usuario.model.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── disenos.routes.js
│   │   │   └── usuarios.routes.js
│   │   ├── config.js
│   │   ├── db.js
│   │   └── index.js
│   ├── .env
│   ├── package.json
│   └── package-lock.json
│
├── init/
│   └── init.sql
├── docker-compose.yml
├── iniciar_proyecto.bat
└── README.md