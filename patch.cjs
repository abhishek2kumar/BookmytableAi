const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  "&& (!('updatedAt' in data) || data.updatedAt is timestamp);",
  "&& (!('foodImages' in data) || data.foodImages is list)\n        && (!('ambienceImages' in data) || data.ambienceImages is list)\n        && (!('collections' in data) || data.collections is list)\n        && (!('mallName' in data) || data.mallName is string)\n        && (!('isTakeawayEnabled' in data) || data.isTakeawayEnabled is bool)\n        && (!('updatedAt' in data) || data.updatedAt is timestamp);"
);

content = content.replace(
  "'email', 'floor', 'shopNo', 'area', 'landmark', 'state', 'pincode', 'rating', 'reviewsCount'",
  "'email', 'floor', 'shopNo', 'area', 'landmark', 'state', 'pincode', 'rating', 'reviewsCount', 'foodImages', 'ambienceImages', 'collections', 'mallName', 'isTakeawayEnabled'"
);

fs.writeFileSync('firestore.rules', content);
