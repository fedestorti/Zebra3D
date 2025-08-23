@echo off
echo 🚀 Verificando Docker Desktop...

REM 👉 Arranca docker-desktop si está detenido
wsl --list --verbose | findstr /C:"docker-desktop    Stopped" >nul
if %errorlevel%==0 (
    echo 🟡 Docker Desktop no estaba corriendo, iniciando...
    wsl -d docker-desktop
    timeout /t 5
) else (
    echo ✅ Docker Desktop ya está corriendo.
)

REM 👉 Ir a la carpeta del proyecto
cd "C:\Users\Fede\Desktop\Mi pagina 3d\mi-app-3d"

REM 👉 Ejecutar docker compose
echo 🔥 Ejecutando docker compose up --build...
docker compose up --build

REM 👉 Mantener la ventana abierta
pause