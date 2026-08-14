import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDocs, query, collection, where } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "teststaff@gmail.com", "password123");
    console.log("Logged in:", cred.user.uid);
    const q = query(collection(db, 'restaurants'), where('partnerEmails', 'array-contains', "teststaff@gmail.com"));
    const snapshot = await getDocs(q);
    if(snapshot.docs.length > 0) {
      console.log("Found restaurant");
      const docRef = doc(db, 'restaurants', snapshot.docs[0].id);
      await updateDoc(docRef, { name: "Updated Name" });
      console.log("Updated!");
    } else {
      console.log("No restaurant found");
    }
  } catch(e) {
    console.error(e);
  }
}
run();
