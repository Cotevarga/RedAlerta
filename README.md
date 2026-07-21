# Red Alerta Rural 🚌

Plataforma tecnológica integral de conectividad, transporte y seguridad para los sectores rurales y costeros de la comuna de **Corral** (Chaihuín, Huiro, La Aguada, Corral Centro).

Mitiga el aislamiento geográfico, optimiza la movilidad y brinda asistencia en emergencias mediante herramientas digitales automatizadas y en tiempo real.

---

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Componentes Funcionales](#componentes-funcionales)
- [Empezar (Desarrollo Local)](#empezar-desarrollo-local)
- [Variables de Entorno](#variables-de-entorno)
- [Despliegue en Render](#despliegue-en-render)
- [API Endpoints](#api-endpoints)
- [Bot de WhatsApp](#bot-de-whatsapp)
- [Licencia](#licencia)

---

## 🏗 Arquitectura

![Arquitectura](https://img.shields.io/badge/Arquitectura-Monorepo-blue)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  React + Vite│     │ Spring Boot  │     │  Neon.tech   │
│   (Vercel)   │     │   (Render)   │     │   (Cloud)    │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                    ┌───────▼───────┐
                    │  Bot WhatsApp │
                    │   (Render)    │
                    └───────────────┘
```

**Frontend** → Vercel (Static Site o Docker)  
**Backend** → Render (Docker Web Service)  
**Bot WhatsApp** → Render (Docker Worker)  
**Base de Datos** → Neon.tech (PostgreSQL serverless)

---

## 🛠 Stack Tecnológico

### Backend
- **Java 21** + **Spring Boot 4.1.0**
- **Spring Security** + **JWT** (jjwt 0.11.5)
- **Spring Data JPA** + **Hibernate**
- **PostgreSQL** (Neon.tech)
- **Maven** (build)
- **Lombok**

### Frontend
- **React 19** + **Vite 8**
- **React Router 7**
- **Tailwind CSS 4**
- **Axios**
- **Lucide React** (iconos)

### Bot
- **Node.js 22**
- **Baileys** (WhatsApp Web API)
- **Axios**

### Infraestructura
- **Docker** + **Docker Compose**
- **Nginx** (servir frontend en producción)
- **Render** (backend + bot)
- **Vercel** (frontend)
- **Neon.tech** (PostgreSQL)

---

## 📁 Estructura del Proyecto

```
RedAlerta/
├── backend/                        # API REST (Spring Boot)
│   ├── src/main/java/com/example/demo/
│   │   ├── controller/             # Controladores REST
│   │   │   ├── AuthController.java       # POST /api/auth/login
│   │   │   ├── TransporteController.java # GET /api/transporte/reporte
│   │   │   ├── AdminController.java      # POST /api/admin/incidentes
│   │   │   └── DashboardController.java  # Stats, incidentes, consultas
│   │   ├── DTO/                   # Data Transfer Objects
│   │   ├── model/                 # Entidades JPA
│   │   │   ├── Ruta.java
│   │   │   ├── HorarioFijo.java
│   │   │   ├── IncidenteVial.java
│   │   │   ├── SuscripcionEmergencia.java
│   │   │   └── RegistroConsulta.java
│   │   ├── repository/            # Spring Data JPA Repositories
│   │   ├── security/              # JWT + CORS
│   │   └── service/               # Lógica de negocio
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend/                      # SPA (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx      # Panel municipal completo
│   │   ├── pages/
│   │   │   └── Login.jsx          # Pantalla de inicio de sesión
│   │   ├── App.jsx                # Enrutamiento
│   │   └── main.jsx               # Entry point
│   ├── Dockerfile
│   └── nginx.conf
│
├── bot-rutarural/                 # Bot WhatsApp
│   ├── index.js
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml             # Orquestación local
├── render.yaml                    # Despliegue en Render
├── .env.example                   # Template de variables
└── README.md
```

---

## 🎯 Componentes Funcionales

### 1. Control y Frecuencia de Buses Rurales
Monitoreo centralizado de horarios de salida y estado operativo de las líneas de transporte hacia los sectores costeros. Registro histórico y actualización de incidencias o demoras en las rutas.

**Endpoint:** `GET /api/transporte/reporte?sector={sector}&dia={dia}`

### 2. Sistema de Alertas Tempranas
Mecanismo que informa al usuario sobre los horarios programados, permitiendo anticipar la llegada del bus al paradero y evitar esperas prolongadas.

### 3. Respuesta y Gestión de Emergencias
Módulo municipal para reportar y gestionar eventos críticos (derrumbes, caída de árboles, cortes de ruta, emergencias en postas rurales). Clasificación por estados: *Activo → Resuelto*.

### 4. Bot de Consultas Automatizadas (WhatsApp)
Interfaz de mensajería 24/7 para que los vecinos consulten horarios, estado de caminos y números de emergencia en lenguaje natural. Cada consulta queda registrada en la base de datos para su posterior análisis.

### 5. Dashboard Municipal
Panel web con 4 vistas:
- **Resumen General** — métricas en tiempo real (buses, consultas, incidentes, sectores)
- **Frecuencia de Buses** — monitoreo de salidas hacia la costa
- **Consultas WhatsApp** — historial de preguntas de los vecinos
- **Emergencias** — listado y gestión de alertas críticas

---

## 🚀 Empezar (Desarrollo Local)

### Prerrequisitos
- Java 21+
- Node.js 22+
- Docker + Docker Compose (opcional)
- Una base de datos PostgreSQL (Neon.tech gratuita)

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/RedAlerta.git
cd RedAlerta
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales de Neon.tech
```

### 3. Backend

```bash
cd backend
./mvnw spring-boot:run
```

El servidor arranca en `http://localhost:8080`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación arranca en `http://localhost:5173`.

### 5. Bot WhatsApp

```bash
cd bot-rutarural
npm install
node index.js
# Escanea el código QR con WhatsApp para vincular el bot
```

### 6. Con Docker Compose (todo en uno)

```bash
docker compose up -d
```

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:80`

---

## 🔐 Variables de Entorno

| Variable | Descripción | Default |
|---|---|---|
| `DATABASE_URL` | JDBC URL de PostgreSQL | `jdbc:postgresql://...neon.tech/neondb` |
| `DATABASE_USERNAME` | Usuario BD | `neondb_owner` |
| `DATABASE_PASSWORD` | Contraseña BD | — |
| `JWT_SECRET` | Clave secreta JWT (Base64) | (generada automáticamente) |
| `JWT_EXPIRATION` | Duración del token en ms | `36000000` (10h) |
| `ADMIN_USERNAME` | Usuario del panel | `adminMuni` |
| `ADMIN_PASSWORD` | Contraseña del panel | `Corral2026` |
| `CORS_ORIGINS` | Orígenes CORS permitidos | `http://localhost:5173,http://localhost:5174,https://red-alerta.vercel.app` |
| `VITE_API_URL` | URL del backend (frontend) | `http://localhost:8080` |
| `BACKEND_URL` | URL del backend (bot) | `http://localhost:8080` |
| `RENDER_URL` | URL pública del backend en Render | — (keep-alive automático) |

---

## ☁️ Despliegue en Render

### Usando `render.yaml` (automático)

1. Fork del repositorio en GitHub
2. En [Render Dashboard](https://dashboard.render.com), conectar repositorio
3. Elegir **Blueprint** y seleccionar `render.yaml`
4. Configure los valores de `DATABASE_URL` desde un servicio PostgreSQL de Neon.tech
5. Render creará automáticamente los 3 servicios

### Servicios creados

| Servicio | Tipo | Dockerfile | Puerto |
|---|---|---|---|
| `redalerta-backend` | Web Service | `./backend/Dockerfile` | 8080 |
| `redalerta-frontend` | Web Service | `./frontend/Dockerfile` | 80 |
| `redalerta-bot` | Worker | `./bot-rutarural/Dockerfile` | — |

### Notas importantes
- El backend en Render **se duerme** tras 15 min en el plan gratuito. El proyecto incluye un **sistema de keep-alive triple** para mantenerlo activo:

  | Mecanismo | Lugar | Intervalo |
  |---|---|---|
  | 🔄 `KeepAliveService.java` | Backend (Spring `@Scheduled`) — se autopinga su propia URL pública | Cada 8 min |
  | 🌐 `setInterval` en Dashboard | Frontend (mientras haya alguien en el panel) | Cada 4 min |
  | 💬 Bot WhatsApp | Bot-Rutarural (ping a backend) | Cada 10 min |

- Si el frontend muestra *"El servidor central está despertando"*, espera ~30 segundos y reintenta.
- Configura `VITE_API_URL` en Render como `https://redalerta-backend.onrender.com`.
- Configura `RENDER_URL` en el backend con la misma URL para activar el keep-alive automático.

---

## 📡 API Endpoints

### Públicos (sin token)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Iniciar sesión (devuelve JWT) |
| `GET` | `/api/transporte/reporte?sector={sector}&dia={dia}` | Reporte de movilidad |
| `POST` | `/api/admin/incidentes` | Reportar incidente (rate-limited) |

### Protegidos (requieren `Authorization: Bearer {token}`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/admin/dashboard/stats` | Estadísticas del dashboard |
| `GET` | `/api/admin/dashboard/incidentes` | Listar todos los incidentes |
| `PUT` | `/api/admin/dashboard/incidentes/{id}/resolver` | Resolver un incidente |
| `GET` | `/api/admin/dashboard/consultas` | Historial de consultas WhatsApp |
| `POST` | `/api/admin/dashboard/consultas` | Registrar una consulta (bot) |

---

## 🤖 Bot de WhatsApp

El bot responde a los siguientes mensajes:

| Mensaje | Respuesta |
|---|---|
| `hola` / `menu` | Mensaje de bienvenida con instrucciones |
| `chaihuin` / `corral` / `huiro` | Horarios y estado de ruta para el sector consultado |
| `emergencia` | Números de emergencia de Corral y costa |

Todas las consultas se registran automáticamente en la base de datos (`registros_consultas`) con el número de WhatsApp, sector consultado, mensaje, y fecha/hora.

### Keep-Alive
El bot envía un ping al backend cada 10 minutos para evitar que Render suspenda el servicio gratuito.

---

## 📄 Licencia

MIT © 2026 — Proyecto desarrollado para la Municipalidad de Corral.
