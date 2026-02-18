import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  userId?: number;
  userPerfil?: string;
  firebaseUid?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    // Verificar token con Firebase Admin
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.firebaseUid = decoded.uid;

    // Buscar usuario en nuestra BD por firebaseUid
    const usuario = await prisma.usuario.findFirst({
      where: { firebaseUid: decoded.uid, activo: true },
    });

    if (!usuario) {
      res.status(401).json({ error: 'Usuario no registrado en el sistema' });
      return;
    }

    req.userId = usuario.id;
    req.userPerfil = usuario.perfil;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requirePerfil(...perfiles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userPerfil || !perfiles.includes(req.userPerfil)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }
    next();
  };
}
