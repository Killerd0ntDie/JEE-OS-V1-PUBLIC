import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountStr) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

// Remove single quotes from the JSON string if present
const cleanStr = serviceAccountStr.startsWith("'") && serviceAccountStr.endsWith("'")
  ? serviceAccountStr.slice(1, -1)
  : serviceAccountStr;

const serviceAccount = JSON.parse(cleanStr);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function runAudit() {
  const usersSnapshot = await db.collection('users').limit(1).get();
  if (usersSnapshot.empty) {
    console.log("AUDIT RESULT: No users found. Maybe no one logged in yet?");
    return;
  }
  
  const uid = usersSnapshot.docs[0].id;
  const profile = usersSnapshot.docs[0].data();
  console.log(`AUDIT RESULT: Found User UID: ${uid}`);
  console.log(`Profile keys:`, Object.keys(profile));
  
  const collectionsToCheck = ['chapters', 'mistakes', 'notes', 'studySessions', 'mockResults'];
  for (const coll of collectionsToCheck) {
    const snap = await db.collection(`users/${uid}/${coll}`).limit(5).get();
    console.log(`Collection ${coll}: ${snap.size} documents found.`);
  }
}

runAudit().then(() => process.exit(0)).catch(console.error);
