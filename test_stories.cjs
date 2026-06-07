const admin = require('firebase-admin');
const fs = require('fs');

const configRaw = fs.readFileSync('./firebase-applet-config.json', 'utf8');
const FIREBASE_CONFIG = JSON.parse(configRaw);

// Extract project ID from the parsed config
const projectId = FIREBASE_CONFIG.projectId;

if (!admin.apps.length) {
  // Try to use Google Application Credentials first
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      projectId: projectId
    });
  } else {
    console.error("GOOGLE_APPLICATION_CREDENTIALS not set. Make sure your environment has access to the Firebase admin SDK.");
    process.exit(1);
  }
}
const db = admin.firestore();

async function run() {
  const rs = await db.collection('stories').get();
  console.log("Total stories:", rs.size);
  rs.forEach(d => {
    console.log(d.id, d.data());
  })
}
run().catch(console.error);
