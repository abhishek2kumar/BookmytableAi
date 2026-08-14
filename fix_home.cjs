const fs = require('fs');
let content = fs.readFileSync('src/components/HomeLandingView.tsx', 'utf-8');

const regex = /<img\s+src=\{appSettings\?\.homeHeroImage[^>]+>/s;
const fixedImg = `<img 
            src={appSettings?.homeHeroImage || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=2000"} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50"
            referrerPolicy="no-referrer"
          />`;

content = content.replace(regex, fixedImg);
fs.writeFileSync('src/components/HomeLandingView.tsx', content);
