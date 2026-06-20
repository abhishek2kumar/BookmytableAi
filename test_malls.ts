import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-2d27f87f-02b0-4214-bac3-839e1706cd7a",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const querySnapshot = await getDocs(collection(db, "malls"));
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data().name, doc.data().location);
  });
}

main().catch(console.error);
