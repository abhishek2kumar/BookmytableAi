const fs = require('fs');
const configRaw = fs.readFileSync('./firebase-applet-config.json', 'utf8');
const FIREBASE_CONFIG = JSON.parse(configRaw);

const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.firestoreDatabaseId || '(default)'}/documents/stories?key=${FIREBASE_CONFIG.apiKey}`;

console.log("Fetching:", url.replace(FIREBASE_CONFIG.apiKey, 'HIDDEN'));

fetch(url)
  .then(res => res.json())
  .then(json => console.log(JSON.stringify(json, null, 2)))
  .catch(console.error);
