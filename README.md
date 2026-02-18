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
- **Base de datos**: PostgreSQL 16
- **Despliegue**: Docker / Google Cloud

## Requisitos

- Node.js 20+
- PostgreSQL 16+
- npm o yarn

## Inicio rápido

### Con Docker
```bash
docker-compose up -d
```

### Desarrollo local

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

### Acceso
- Frontend: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api-docs

### Usuario por defecto
- Email: admin@erppresu.com
- Password: admin123

## Flujo principal

```
EMPRESA → REPLANTEO → PRESUPUESTO → ACEPTACIÓN → COMPRAS + ORDEN TRABAJO → EJECUCIÓN → CONTROL ECONÓMICO
```

## Licencia

Privado - Todos los derechos reservados.
