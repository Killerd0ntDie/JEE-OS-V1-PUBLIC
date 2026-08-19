import { storage } from '@/lib/firebase/client';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export async function uploadBase64Image(userId: string, base64String: string, folder: string): Promise<string> {
  // If it's already a URL, return it
  if (base64String.startsWith('http://') || base64String.startsWith('https://')) {
    return base64String;
  }
  
  if (!base64String.startsWith('data:image')) {
    throw new Error('Invalid image format');
  }

  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  const extMatch = base64String.match(/data:image\/([a-zA-Z0-9]+);base64,/);
  const ext = extMatch ? extMatch[1] : 'png';
  
  const storageRef = ref(storage, `users/${userId}/${folder}/${uuid}.${ext}`);
  await uploadString(storageRef, base64String, 'data_url');
  
  return getDownloadURL(storageRef);
}
