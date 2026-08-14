import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp({
  projectId: config.projectId
});
const db = getFirestore(app);

async function run() {
  const snapshot = await db.collection("restaurants").limit(1).get();
  if (snapshot.empty) {
    console.log("No restaurants found");
    return;
  }
  const docRef = snapshot.docs[0].ref;
  const docData = snapshot.docs[0].data();
  const emails = docData.partnerEmails || [];
  if (!emails.includes("teststaff@gmail.com")) {
    await docRef.update({ partnerEmails: [...emails, "teststaff@gmail.com"] });
  }
  console.log("Added teststaff to restaurant:", docRef.id);
  fs.writeFileSync('./test_res_id.txt', docRef.id);
}
run();
