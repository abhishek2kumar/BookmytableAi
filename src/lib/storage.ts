import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import { v4 as uuidv4 } from "uuid";

export async function uploadImageToStorage(file: File, path: string = 'uploads'): Promise<string> {
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${uuidv4()}.${extension}`;
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function deleteImageFromStorage(url: string): Promise<void> {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Failed to delete image from storage:", error);
  }
}
