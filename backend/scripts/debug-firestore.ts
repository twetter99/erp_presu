/**
 * Script de debug: lee el primer documento de inventory de OrderFlow
 * para inspeccionar su estructura real.
 *
 * Ejecutar: npx tsx scripts/debug-firestore.ts
 */
import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.ORDERFLOW_PROJECT_ID;
const clientEmail = process.env.ORDERFLOW_CLIENT_EMAIL;
const privateKey = process.env.ORDERFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Faltan variables ORDERFLOW_*');
  process.exit(1);
}

const app = initializeApp(
  { credential: cert({ projectId, clientEmail, privateKey }), projectId },
  'debug'
);

const db = getFirestore(app);

async function main() {
  console.log('🔍 Leyendo primeros 3 docs de inventory...\n');
  const snapshot = await db.collection('inventory').limit(3).get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`📄 Doc ID: ${doc.id}`);
    console.log(`   Keys: [${Object.keys(data).join(', ')}]`);
    console.log(`   Data:`, JSON.stringify(data, null, 4));
    console.log('---');
  }
  
  console.log(`\n📊 Total docs en inventory: ${(await db.collection('inventory').count().get()).data().count}`);
  process.exit(0);
}

main().catch(console.error);
