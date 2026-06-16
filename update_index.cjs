const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

// Replace everything between <head> and the GTM scripts
const headStart = '<head>';
const headEnd = '    <!-- Global site tag (gtag.js) - Google Analytics -->';

const newHeadContent = `  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=0" />
    <meta name="google-site-verification" content="RTJQ89Y5fZCegTCelEYBn-Jxy0I2_7t3oVikmgk480w" />
    <meta name="google-site-verification" content="39HzsO_tJOrNlQtWih-0-Gy5s46g3UZZUry3pwsJYgs" />
    <meta name="description" content="Book table at your favourite restaurant for free and get served instantly. Find, reserve and experience cuisine at the Restaurants around you. Booking table in real time without any cover charges" />
    <meta name="keywords" content="book table online, restaurants in Pune, online table booking, bookmytable, booking, hotel, restaurant, christmas party, new year party " />
    <meta name="url" content="https://www.bookmytable.co.in/" />
    <meta property="og:title" content="Bookmytable - Book table in your favourite restaurant and get served instantly." />
    <meta property="og:description" content="Bookmytable makes it easy to search for restaurants around you and book table instantly" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.bookmytable.co.in/" />
    <meta name="twitter:app:name:iphone" content="Bookmytable" />
    <meta name="twitter:app:name:ipad" content="Bookmytable" />
    <meta name="twitter:app:country" content="in" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />

    <title>Bookmytable : Never wait for your meal</title>
    <link rel="icon" type="image/png" href="/logo.png" />
    
    <script data-ad-client="ca-pub-5069663906289868" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>

    <script type="application/ld+json">
    {
        "@context": "http://schema.org",
        "@type": "Organization",
        "url": "https://www.bookmytable.co.in/",
        "name": "Bookmytable",
        "description": "Book table at your favourite restaurant and get served instantly. Find, reserve and experience cuisine at the Restaurants around you. Booking table in real time or place take away order",
        "sameAs": [
            "https://www.facebook.com/bookmytableIN/",
            "https://www.instagram.com/bookmytable_IN/",
            "https://twitter.com/bookmytableIN/"
            ],
        "contactPoint": [
            {
                "@type": "ContactPoint",
                "telephone": "+91 9989764575",
                "contactType": "customer service"
            }
        ]
    }
    </script>

`;

const startIdx = content.indexOf('<head>');
const endIdx = content.indexOf(headEnd);
if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + newHeadContent + content.substring(endIdx);
}

fs.writeFileSync('index.html', content);
