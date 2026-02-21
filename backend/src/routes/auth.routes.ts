import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { firebaseAuth } from '../config/firebase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  nombre: z.string().min(1),
  apellidos: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  perfil: z.enum(['DIRECCION', 'COMERCIAL', 'OFICINA_TECNICA', 'COMPRAS', 'TECNICO_INSTALADOR', 'ADMINISTRADOR']),
  telefono: z.string().optional(),
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Obtener usuario actual (autenticado con Firebase)
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.userId },
      select: { id: true, nombre: true, apellidos: true, email: true, perfil: true, telefono: true, activo: true },
    });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar usuario (crea en Firebase Auth + BD)
 *     security:
 *       - bearerAuth: []
 */
router.post('/register', authMiddleware, validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (req.userPerfil !== 'ADMINISTRADOR' && req.userPerfil !== 'DIRECCION') {
      res.status(403).json({ error: 'Solo administradores pueden crear usuarios' });
      return;
    }

    const { nombre, apellidos, email, password, perfil, telefono } = req.body;

    // 1. Crear usuario en Firebase Auth
    const firebaseUser = await firebaseAuth.createUser({
      email,
      password,
      displayName: `${nombre} ${apellidos}`,
    });

    // 2. Crear usuario en nuestra BD con referencia al UID de Firebase
    const usuario = await prisma.usuario.create({
      data: {
        firebaseUid: firebaseUser.uid,
        nombre,
        apellidos,
        email,
        perfil,
        telefono,
      },
      select: { id: true, nombre: true, apellidos: true, email: true, perfil: true, activo: true },
    });

    res.status(201).json(usuario);
  } catch (error: any) {
    // Si Firebase ya creó el usuario pero falla la BD, limpiar
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'El email ya está registrado' });
      return;
    }
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({ error: 'El email ya existe en Firebase. Puede vincular con /vincular.' });
      return;
    }
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

/**
 * @swagger
 * /api/auth/vincular:
 *   post:
 *     tags: [Auth]
 *     summary: Vincular usuario existente en BD con su cuenta Firebase (para migración)
 *     security:
 *       - bearerAuth: []
 */
router.post('/vincular', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // El middleware ya verificó el Firebase token y encontró el usuario por firebaseUid
    // Este endpoint es para cuando un admin necesita vincular manualmente
    if (req.userPerfil !== 'ADMINISTRADOR' && req.userPerfil !== 'DIRECCION') {
      res.status(403).json({ error: 'Solo administradores pueden vincular usuarios' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email requerido' });
      return;
    }

    // Buscar usuario en BD sin firebaseUid
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado en BD' });
      return;
    }

    // Buscar usuario en Firebase por email
    try {
      const firebaseUser = await firebaseAuth.getUserByEmail(email);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { firebaseUid: firebaseUser.uid },
      });
      res.json({ message: `Usuario ${email} vinculado con Firebase UID: ${firebaseUser.uid}` });
    } catch {
      res.status(404).json({ error: 'Usuario no encontrado en Firebase Auth' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

/**
 * @swagger
 * /api/auth/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Configuración inicial - crear admin en Firebase y vincular (solo si no hay usuarios con firebaseUid)
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    // Solo funciona si no hay ningún usuario con firebaseUid asignado
    const linked = await prisma.usuario.count({ where: { firebaseUid: { not: null } } });
    if (linked > 0) {
      res.status(400).json({ error: 'Setup ya completado. Ya existen usuarios vinculados.' });
      return;
    }

    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y password requeridos' });
      return;
    }

    // Buscar usuario admin en BD
    const admin = await prisma.usuario.findUnique({ where: { email } });
    if (!admin) {
      res.status(404).json({ error: 'Usuario no encontrado en BD. Ejecuta el seed primero.' });
      return;
    }

    // Crear en Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.createUser({
        email,
        password,
        displayName: `${admin.nombre} ${admin.apellidos}`,
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        firebaseUser = await firebaseAuth.getUserByEmail(email);
      } else {
        throw err;
      }
    }

    // Vincular
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { firebaseUid: firebaseUser.uid },
    });

    res.json({
      message: `Admin ${email} creado en Firebase y vinculado.`,
      firebaseUid: firebaseUser.uid,
    });
  } catch (error: any) {
    console.error('Setup error:', error?.code, error?.message || error);
    res.status(500).json({ error: 'Error en el servidor', detail: error?.message });
  }
});

/**
 * @swagger
 * /api/auth/usuarios:
 *   get:
 *     tags: [Auth]
 *     summary: Listar usuarios
 *     security:
 *       - bearerAuth: []
 */
router.get('/usuarios', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, nombre: true, apellidos: true, email: true,
        perfil: true, telefono: true, activo: true,
        firebaseUid: true,
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

export default router;
