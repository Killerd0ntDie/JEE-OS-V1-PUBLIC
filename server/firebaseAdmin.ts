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

    // Diagnostic only — never logs the actual secret value, just whether it arrived.
    console.log(
      `[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_KEY present: ${!!keyJson}, length: ${keyJson ? keyJson.length : 0}`
    );

    if (keyJson) {
      const serviceAccount = JSON.parse(keyJson);
      credentialOptions = { credential: cert(serviceAccount) };
      console.log(
        `[firebaseAdmin] Initialized from env var. project_id in key: ${serviceAccount.project_id}`
      );
    } else if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      credentialOptions = { credential: cert(serviceAccount) };
      console.log('[firebaseAdmin] Initialized with local key file.');
    } else {
      console.log('[firebaseAdmin] No key found — falling back to default credentials (will fail on Render).');
    }
    
    initializeApp(credentialOptions);
  }
} catch (error) {
  console.error('[firebaseAdmin] Initialization error:', error);
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
