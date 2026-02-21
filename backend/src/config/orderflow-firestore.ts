import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let orderflowApp: App | null = null;
let orderflowDb: Firestore | null = null;

/**
 * Inicializa (si no existe) y devuelve el cliente Firestore del proyecto OrderFlow.
 * Usa credenciales desde variables de entorno (ORDERFLOW_*).
 * SOLO LECTURA — no se escribe ni modifica nada en OrderFlow.
 */
export function getOrderFlowFirestore(): Firestore {
  if (orderflowDb) return orderflowDb;

  const projectId = process.env.ORDERFLOW_PROJECT_ID;
  const clientEmail = process.env.ORDERFLOW_CLIENT_EMAIL;
  const privateKey = process.env.ORDERFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Faltan variables de entorno ORDERFLOW_PROJECT_ID, ORDERFLOW_CLIENT_EMAIL o ORDERFLOW_PRIVATE_KEY'
    );
  }

  try {
    orderflowApp = getApp('orderflow');
  } catch {
    orderflowApp = initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      },
      'orderflow' // nombre único para no colisionar con la app principal (erppresu)
    );
    console.log('🔗 Firestore OrderFlow inicializado (solo lectura)');
  }

  orderflowDb = getFirestore(orderflowApp);
  return orderflowDb;
}
