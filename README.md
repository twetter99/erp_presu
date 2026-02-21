# ERP Presupuestos - Sistema Integral de Gestión de Proyectos de Instalación Embarcada

Sistema ERP vertical especializado en instalaciones embarcadas para flotas de autobuses.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Empresas | Gestión de clientes, propietarios, operadores |
| Cocheras | Centros de trabajo con datos técnicos |
| Autobuses | Catálogo de tipos de bus con plantillas |
| Trabajos | Catálogo de trabajos estandarizados con checklist |
| Materiales | Catálogo de materiales con SKU y proveedores |
| Replanteo | Recogida técnica estructurada pre-presupuesto |
| Presupuestos | Doble cara: cliente (comercial) + interna (costes) |
| Compras | Solicitudes, pedidos, recepciones, facturas |
| Órdenes de Trabajo | Ejecución, checklist, horas reales, material real |
| Control Económico | Margen estimado vs real, rentabilidad por dimensión |

## Stack Tecnológica

- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Base de datos**: PostgreSQL 16 (local en dev, **Google Cloud SQL** en producción)
- **Autenticación**: Firebase Authentication
- **Cloud**: Google Cloud Platform (Cloud SQL, Cloud Run, Firebase)
- **Despliegue**: Docker / Docker Compose / Google Cloud Run

## Requisitos

- Node.js 20+
- PostgreSQL 16+ (solo para desarrollo local)
- npm o yarn
- Cuenta de Google Cloud (para producción)
- Proyecto Firebase configurado

## Inicio rápido

### Desarrollo local

```bash
# 1. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 2. Configurar PostgreSQL local
#    Crear usuario y BD (ajusta la contraseña):
psql -U postgres -c "CREATE USER erp_admin WITH PASSWORD 'erp_secret_2026';"
psql -U postgres -c "CREATE DATABASE erp_presu OWNER erp_admin;"

# 3. Copiar y configurar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
#    Editar con tus valores de Firebase

# 4. Migrar y sembrar la BD
cd backend
npx prisma migrate dev --name init
npx prisma db seed

# 5. Arrancar
npm run dev          # Backend en http://localhost:4000
cd ../frontend
npm run dev          # Frontend en http://localhost:5173
```

### Con Docker (desarrollo)
```bash
cp .env.example .env   # Editar con tus valores
docker-compose up -d
```

### Producción (Google Cloud SQL)

```bash
# 1. Crear instancia Cloud SQL (PostgreSQL 16)
gcloud sql instances create erp-presu-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-southwest1 \
  --project=erppresu

# 2. Crear usuario y BD
gcloud sql users create erp_admin --instance=erp-presu-db --password=TU_PASSWORD
gcloud sql databases create erp_presu --instance=erp-presu-db

# 3. Desplegar con Cloud SQL Proxy
cp .env.example .env   # Configurar DATABASE_URL con Cloud SQL
docker-compose -f docker-compose.prod.yml up -d
```

Ver la sección "Despliegue en Google Cloud" más abajo para instrucciones completas.

### Acceso
- Frontend: http://localhost:5173 (dev) / http://localhost:3000 (Docker)
- API: http://localhost:4000/api

### Emisión de ofertas (HTML/PDF)

El backend soporta actualmente:
- `GET /api/presupuestos/oferta-templates/catalogo` (catálogo de plantillas disponibles)
- `GET /api/presupuestos/oferta-templates/:code/modulos` (módulos globales por plantilla)
- `PUT /api/presupuestos/oferta-templates/:code/modulos` (actualiza overrides globales)
- `GET /api/presupuestos/:id/oferta-modulos` (módulos efectivos del presupuesto)
- `PUT /api/presupuestos/:id/oferta-modulos` (override por presupuesto)
- `GET /api/presupuestos/:id/oferta-html` (siempre disponible)
- `GET /api/presupuestos/:id/oferta-pdf` (requiere proveedor PDF)
- `POST /api/presupuestos/:id/emitir` con body opcional `{ "templateCode": "OFERTA_EMT_360_V2" }`

Variables de entorno backend:
- `OFERTA_PDF_PROVIDER=none|puppeteer` (por defecto `none`)
- `PUPPETEER_EXECUTABLE_PATH` (opcional, útil en servidores/container)

Para activar PDF con Puppeteer:
```bash
cd backend
npm install puppeteer
# en .env:
OFERTA_PDF_PROVIDER=puppeteer
```

Si el proveedor no está configurado, el endpoint PDF responde `501` con enlace `fallbackHtml` para descarga en HTML.

Verificación E2E documental (genera HTML + payload + hash y PDF si está activo):
```bash
cd backend
npm run verify:oferta -- --presupuestoId=123 --template=OFERTA_EMT_360_V2 --outDir=./tmp
```

### Configuración inicial
```bash
# Crear usuario admin vinculado a Firebase:
POST http://localhost:4000/api/auth/setup
{ "email": "admin@erppresu.com", "password": "admin123" }
```

## Arquitectura de Base de Datos

```
┌─────────────────────────────────────────────────┐
│                  DESARROLLO                      │
│  App → localhost:5432 → PostgreSQL local         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  PRODUCCIÓN                      │
│  App → Cloud SQL Auth Proxy → Cloud SQL (GCP)   │
│       (o conexión directa por IP privada)        │
└─────────────────────────────────────────────────┘
```

Prisma usa `DATABASE_URL` del `.env`. El código es idéntico en ambos entornos; solo cambia la cadena de conexión.

## Despliegue en Google Cloud

### Requisitos previos
1. Proyecto GCP con facturación habilitada
2. `gcloud` CLI instalado y configurado
3. APIs habilitadas: Cloud SQL Admin, Cloud Run, Container Registry

### 1. Cloud SQL (PostgreSQL)
```bash
# Crear instancia
gcloud sql instances create erp-presu-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-southwest1

# Crear usuario y base de datos
gcloud sql users create erp_admin \
  --instance=erp-presu-db \
  --password=TU_PASSWORD_SEGURA

gcloud sql databases create erp_presu \
  --instance=erp-presu-db
```

### 2. Cloud Run (backend + frontend)
```bash
# Build y push imagen del backend
gcloud builds submit ./backend --tag gcr.io/erppresu/erp-backend

# Deploy backend en Cloud Run con Cloud SQL
gcloud run deploy erp-backend \
  --image gcr.io/erppresu/erp-backend \
  --region europe-southwest1 \
  --add-cloudsql-instances erppresu:europe-southwest1:erp-presu-db \
  --set-env-vars "DATABASE_URL=postgresql://erp_admin:PASSWORD@/erp_presu?host=/cloudsql/erppresu:europe-southwest1:erp-presu-db" \
  --set-env-vars "FIREBASE_PROJECT_ID=erppresu,NODE_ENV=production,PORT=4000"

# Build y push imagen del frontend
gcloud builds submit ./frontend --tag gcr.io/erppresu/erp-frontend

# Deploy frontend en Cloud Run
gcloud run deploy erp-frontend \
  --image gcr.io/erppresu/erp-frontend \
  --region europe-southwest1
```

### 3. Migrar BD en producción
```bash
# Desde local con Cloud SQL Proxy:
cloud-sql-proxy erppresu:europe-southwest1:erp-presu-db &
DATABASE_URL="postgresql://erp_admin:PASSWORD@127.0.0.1:5432/erp_presu" npx prisma migrate deploy
```

## Flujo principal

```
EMPRESA → REPLANTEO → PRESUPUESTO → ACEPTACIÓN → COMPRAS + ORDEN TRABAJO → EJECUCIÓN → CONTROL ECONÓMICO
```

## Licencia

Privado - Todos los derechos reservados.
