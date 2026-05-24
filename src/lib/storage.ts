import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { v4 as uuidv4 } from "uuid";

export async function uploadImageToStorage(file: File, path: string = 'uploads'): Promise<string> {
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${uuidv4()}.${extension}`;
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}
