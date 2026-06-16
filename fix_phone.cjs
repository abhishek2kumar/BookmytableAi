const fs = require('fs');
let content = fs.readFileSync('src/components/RestaurantDetailsView.tsx', 'utf8');

content = content.replace(/"telephone": restaurant.phone \|\| "\+919989764575",/, '"telephone": "+91 9989764575",');

fs.writeFileSync('src/components/RestaurantDetailsView.tsx', content);
