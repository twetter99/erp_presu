import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Inicializar Firebase Admin SDK
// En producción, usar GOOGLE_APPLICATION_CREDENTIALS o service account JSON
if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'erppresu',
  });
}

export const firebaseAuth = getAuth();
