const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');
rules = rules.replace(/match \/restaurants\/\{restaurantId\} \{[\s\S]*?allow delete: if isAdmin\(\);\n    \}/, 
`match /restaurants/{restaurantId} {
      allow read, write: if true;
    }`);
fs.writeFileSync('firestore.rules', rules);
