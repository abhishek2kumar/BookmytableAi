const fs = require('fs');

const updateCityView = () => {
  let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

  const getSeoDataStr = `  const getSeoData = () => {
    const locName = locationSlug ? locationSlug.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'Best';
    let url = locationSlug ? \`https://www.bookmytable.co.in/\${cityId}/location/\${locationSlug}\` : \`https://www.bookmytable.co.in/\${cityId}\`;
    let title = locationSlug ? \`\${locName} Restaurants, \${cityName} - Bookmytable\` : \`\${locName} Restaurants, \${cityName} - Bookmytable\`;
    let description = locationSlug ? \`Explore restaurants in \${locName}, \${cityName} and book table instantly with discounts on Bookmytable...\` : \`Explore restaurants in \${cityName} and book table instantly with discounts on Bookmytable...\`;
    let keywords = locationSlug ? \`book table online, resturants in \${cityName}, restaurants in \${locName}, online table booking, bookmytable, booking, hotel, resturant\` : \`book table online, resturants in \${cityName}, online table booking, bookmytable, booking, hotel, resturant\`;

    return { title, url, description, keywords, locName };
  };

  const seoData = getSeoData();`;

  content = content.replace(/  return \(\n    <motion\.div/, getSeoDataStr + '\n\n  return (\n    <motion.div');
  
  const helmetStr = `<Helmet>
        <title>{seoData.title}</title>
        <link rel="alternate" hrefLang="en" href={seoData.url} /> 
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="url" content={seoData.url} />
        <meta name="twitter:app:name:iphone" content="Bookmytable" />
        <meta name="twitter:app:name:ipad" content="Bookmytable" />
        <meta name="twitter:app:country" content="in" />
        <meta property="og:title" content={\`\${seoData.locName} Restaurants, \${cityName} - Bookmytable India\`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoData.url} />
        <meta property="og:site_name" content="Bookmytable" />
        <meta property="og:description" content={seoData.description} />
      </Helmet>`;

  content = content.replace(/<Helmet>[\s\S]*?<\/Helmet>/, helmetStr);
  fs.writeFileSync('src/components/CityView.tsx', content);
};

const updateCuisineView = () => {
  let content = fs.readFileSync('src/components/CuisineView.tsx', 'utf8');

  if(!content.includes("import { Helmet }")) {
      content = content.replace(/import \{ motion \} from 'motion\/react';/, "import { motion } from 'motion/react';\\nimport { Helmet } from 'react-helmet-async';");
  }

  const getSeoDataStr = `
  const getSeoData = () => {
    let locName = cuisineName || cuisineId || 'Cuisine';
    let url = \`https://www.bookmytable.co.in/cuisine/\${cuisineId}\`;
    let title = \`\${locName} Restaurants, \${selectedCity} - Bookmytable\`;
    let description = \`Explore \${locName} restaurants in \${selectedCity} and book table instantly with discounts on Bookmytable...\`;
    let keywords = \`book table online, resturants in \${selectedCity}, restaurants in \${locName}, online table booking, bookmytable, booking, hotel, resturant\`;

    return { title, url, description, keywords, locName };
  };

  const seoData = getSeoData();`;

  content = content.replace(/return \(\n    <div className="bg-slate-50 min-h-screen pb-20">/, getSeoDataStr + '\\n\\n  return (\\n    <div className="bg-slate-50 min-h-screen pb-20">');
  
  const helmetStr = `<div className="bg-slate-50 min-h-screen pb-20">
      <Helmet>
        <title>{seoData.title}</title>
        <link rel="alternate" hrefLang="en" href={seoData.url} /> 
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="url" content={seoData.url} />
        <meta name="twitter:app:name:iphone" content="Bookmytable" />
        <meta name="twitter:app:name:ipad" content="Bookmytable" />
        <meta name="twitter:app:country" content="in" />
        <meta property="og:title" content={\`\${seoData.locName} Restaurants, \${selectedCity} - Bookmytable India\`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoData.url} />
        <meta property="og:site_name" content="Bookmytable" />
        <meta property="og:description" content={seoData.description} />
      </Helmet>`;

  content = content.replace(/<div className="bg-slate-50 min-h-screen pb-20">/, helmetStr);

  fs.writeFileSync('src/components/CuisineView.tsx', content);
};

updateCityView();
updateCuisineView();
