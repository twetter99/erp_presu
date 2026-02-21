import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Inicializar Firebase Admin SDK
if (!getApps().length) {
  // Buscar service account: primero env var, luego en la raíz del proyecto backend
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : resolve(__dirname, '../../service-account.json');

  if (existsSync(saPath)) {
    // Service account disponible → acceso completo (createUser, etc.)
    const serviceAccount = JSON.parse(require('fs').readFileSync(saPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
    console.log('🔑 Firebase Admin inicializado con service account');
  } else {
    // Solo projectId → puede verificar tokens pero NO crear usuarios
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'erppresu',
    });
    console.log('⚠️  Firebase Admin inicializado solo con projectId (sin service account)');
  }
}

export const firebaseAuth = getAuth();
