import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

import fs from 'fs';
import path from 'path';

dotenv.config();

try {
  if (!getApps().length) {
    let credentialOptions = {};
    const keyPath = path.resolve(process.cwd(), 'firebase-admin-key.json');
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (keyJson) {
      // For hosts with no local file and no GCP default credentials (e.g. Render):
      // paste the full service account JSON into this one env var.
      const serviceAccount = JSON.parse(keyJson);
      credentialOptions = { credential: cert(serviceAccount) };
      console.log('Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY env var.');
    } else if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      credentialOptions = { credential: cert(serviceAccount) };
      console.log('Firebase Admin initialized with local key file.');
    } else {
      console.log('Firebase Admin initialized (using default credentials or emulator).');
    }
    
    initializeApp(credentialOptions);
  }
} catch (error) {
  console.error('Firebase Admin initialization error', error);
}

export const adminAuth = getApps().length > 0 ? getAuth() : null;
export const adminDb = getApps().length > 0 ? getFirestore() : null;

export const verifyAuth = async (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV !== 'production') {
    req.user = { uid: 'local-dev-user' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    if (!adminAuth) throw new Error("Firebase Admin Auth is not initialized.");
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
