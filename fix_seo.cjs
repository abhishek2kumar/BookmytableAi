const fs = require('fs');
let content = fs.readFileSync('src/components/RestaurantDetailsView.tsx', 'utf8');

const getSeoStr = `  const getSeoData = () => {
    const cuisineStr = Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine;
    const locationStr = restaurant.location || city || restaurant.city || 'your city';
    const cityStr = city || restaurant.city || 'your city';
    const addressStr = restaurant.address || locationStr;
    const baseDesc = \\\`\\\${\\restaurant.name} \\\${\\addressStr}; \\\${\\restaurant.name} \\\${\\cityStr}; Cuisine \\\${\\cuisineStr}. Cost for two: ₹\\\${\\restaurant.avgPrice || 500}. Avg rating \\\${\\restaurant.rating || 4.5}. Famous for \\\${\\restaurant.description || 'great food'}. Book table for free, View Menu, check Review, Contact restaurant, phone number, Location, Maps and many more of \\\${\\restaurant.name} on Bookmytable.\\\`;
    const keywords = \\\`book table online, restaurants in \\\${\\addressStr}, restaurants in \\\${\\cityStr}, online restaurant booking, bookmytable, booking, hotel, restaurant, dineout, table booking\\\`;
    const defaultTitle = \\\`\\\${\\restaurant.name}, \\\${\\locationStr}, \\\${\\cityStr} - Bookmytable\\\`;
    const ogTitle = \\\`Book table for free at \\\${\\restaurant.name}, \\\${\\addressStr} with discounts\\\`;
    const ogDesc = \\\`Instant table booking with discounts at \\\${\\restaurant.name}, \\\${\\addressStr}\\\`;

    let title = defaultTitle;
    let description = baseDesc;

    switch (tab) {
      case 'book':
        title = \\\`Table Booking at \\\${\\restaurant.name} | Bookmytable\\\`;
        break;
      case 'menu':
        title = \\\`Menu of \\\${\\restaurant.name} | Bookmytable\\\`;
        break;
      case 'photos':
        title = \\\`Photos, Images & Ambiance of \\\${\\restaurant.name} | Bookmytable\\\`;
        break;
      case 'reviews':
        title = \\\`Reviews & Ratings of \\\${\\restaurant.name} | Bookmytable\\\`;
        break;
      case 'takeaway':
        title = \\\`Order Takeaway from \\\${\\restaurant.name} | Bookmytable\\\`;
        break;
      case 'offers':
        title = \\\`Offers & Discounts at \\\${\\restaurant.name} | Bookmytable\\\`;
        break;
    }

    const jsonLd = {
      "@context": "http://schema.org",
      "@type": "Restaurant",
      "@id": \\\`https://www.bookmytable.co.in/\\\${\\restaurant.id}\\\`,
      "name": \\\`\\\${\\restaurant.name}, \\\${\\locationStr}\\\`,
      "url": \\\`https://www.bookmytable.co.in/\\\${\\restaurant.id}\\\`,
      "description": restaurant.description || baseDesc,
      "hasMenu": \\\`https://www.bookmytable.co.in/\\\${\\restaurant.id}\\\`,
      "image": bannerImages[0] || RESTAURANT_IMAGE_FALLBACK,
      "servesCuisine": cuisineStr,
      "priceRange": \\\`₹ \\\${\\restaurant.avgPrice || 500} (approx)\\\`,
      "telephone": restaurant.phone || "+919989764575",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": addressStr,
        "addressLocality": cityStr,
        "postalCode": restaurant.pincode || "411001",
        "addressCountry": "IN"
      },
      "review": {
          "@type": "Review",
          "url": \\\`https://www.bookmytable.co.in/\\\${\\restaurant.id}\\\`,
          "author": { "@type": "Person", "name": "Google user" },
          "publisher": {
              "@type": "Organization",
              "name": "Bookmytable",
              "sameAs": "https://www.bookmytable.co.in"
          },
          "reviewRating": {
              "@type": "Rating", "worstRating": 1, "bestRating": 5, "ratingValue": restaurant.rating || 5
          }
      },
      "currenciesAccepted": "INR",
      "paymentAccepted": ["Cash", "Credit Cards", "Wallet"],
      "makesoffer": "Upto 50% off on final bill",
      "isAccessibleForFree": true,
      "publicAccess": true
    };

    return {
      title,
      description,
      keywords,
      ogTitle,
      ogDesc,
      jsonLd
    };
  };

  const seoData = getSeoData();`;

content = content.replace(/const getSeoData = \(\) => {[\s\S]*?const seoData = getSeoData\(\);/, getSeoStr.replace(/\\/g, ''));

const helmetStr = `<Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <link rel="alternate" hrefLang="en" href={\`https://www.bookmytable.co.in/\${restaurant.id}\`} />
        <meta name="url" content={\`https://www.bookmytable.co.in/\${restaurant.id}\`} />
        <meta name="twitter:app:name:iphone" content="Bookmytable" />
        <meta name="twitter:app:name:ipad" content="Bookmytable" />
        <meta name="twitter:app:country" content="in" />
        <meta property="og:title" content={seoData.ogTitle} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={\`https://www.bookmytable.co.in/\${restaurant.id}\`} />
        <meta property="og:site_name" content="Bookmytable" />
        <meta property="og:description" content={seoData.ogDesc} />
        <meta property="og:image" content={bannerImages[0] || RESTAURANT_IMAGE_FALLBACK} />
        <meta property="product:brand" content="Bookmytable" />
        <meta property="product:price:amount" content={restaurant.avgPrice?.toString() || "500"} />
        <meta property="product:price:currency" content="INR" />
        <script type="application/ld+json">
          {JSON.stringify(seoData.jsonLd)}
        </script>
      </Helmet>`;

content = content.replace(/<Helmet>[\s\S]*?<\/Helmet>/, helmetStr);

fs.writeFileSync('src/components/RestaurantDetailsView.tsx', content);
