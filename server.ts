import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import { GoogleGenAI } from '@google/genai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/lib/firebase';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // Redirection middleware
  app.use((req, res, next) => {
    const host = req.headers.host;
    // Force redirect from root domain to WWW version on production
    if (host === "bookmytable.co.in") {
      return res.redirect(301, `https://www.bookmytable.co.in${req.url}`);
    }
    next();
  });

  // API Route for Contact Form
  app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message, restaurantName, phone } = req.body;
    
    console.log('--- NEW CONTACT FORM SUBMISSION ---');
    console.log('To: contact@bookmytable.co.in');
    console.log(`From: ${name} (${email})`);
    console.log(`Subject: ${subject}`);
    if (restaurantName) console.log(`Restaurant: ${restaurantName}`);
    if (phone) console.log(`Phone: ${phone}`);
    if (message) console.log(`Message: ${message}`);
    console.log('------------------------------------');

    const resend = getResend();
    if (resend) {
      try {
        // Send to BookMyTable Admin
        await resend.emails.send({
          from: 'BookMyTable <contact@bookmytable.co.in>',
          to: 'contact@bookmytable.co.in',
          subject: (subject || 'New Enquiry') + ` from ${name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h1 style="color: #f43f5e;">New ${subject || 'Enquiry'} Received!</h1>
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p><strong>👤 Name:</strong> ${name}</p>
                <p><strong>📧 Email:</strong> ${email}</p>
                ${phone ? `<p><strong>📞 Phone:</strong> ${phone}</p>` : ''}
                ${restaurantName ? `<p><strong>🏨 Restaurant:</strong> ${restaurantName}</p>` : ''}
                ${message ? `<p><strong>💬 Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
              </div>
            </div>
          `
        });

        // Send confirmation auto-reply to the User
        if (email) {
          await resend.emails.send({
            from: 'BookMyTable <contact@bookmytable.co.in>',
            to: email,
            subject: 'We received your request - BookMyTable',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <h1 style="color: #6366f1;">Thank you for reaching out!</h1>
                <p>Hi ${name},</p>
                <p>We've received your ${subject ? subject.toLowerCase() : 'message'} and our team will get back to you shortly.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <p><strong>Your Details:</strong></p>
                  ${restaurantName ? `<p>Restaurant: ${restaurantName}</p>` : ''}
                  <p>Email: ${email}</p>
                  ${phone ? `<p>Phone: ${phone}</p>` : ''}
                  ${message ? `<p>Message:<br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
                </div>
                <p>Best regards,<br/>The BookMyTable Team</p>
              </div>
            `
          });
        }
      } catch (err) {
        console.error('Error sending emails:', err);
      }
    } else {
      console.log('NOTICE: RESEND_API_KEY missing. Email skipped but logged.');
    }
    res.status(200).json({ success: true, message: 'Message received and logged.' });
  });

  // API Route for Booking Confirmation
  app.post('/api/confirm-booking', async (req, res) => {
    const { 
      userEmail, 
      userName, 
      restaurantName, 
      restaurantLocation,
      ownerEmail,
      dateTime,
      guests,
      userPhone
    } = req.body;

    console.log('--- NEW BOOKING CONFIRMATION ---');
    console.log(`User: ${userName} (${userEmail})`);
    console.log(`Restaurant: ${restaurantName} (${restaurantLocation})`);
    console.log(`DateTime: ${dateTime}`);
    console.log(`Guests: ${guests}`);
    console.log('--------------------------------');

    const resend = getResend();
    if (resend) {
      try {
        // Send to User
        await resend.emails.send({
          from: 'BookMyTable <bookings@bookmytable.co.in>', // Use verified domain in production
          to: userEmail,
          subject: 'Reservation Confirmed: ' + restaurantName,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h1 style="color: #6366f1;">Your Reservation is Confirmed!</h1>
              <p>Hi ${userName},</p>
              <p>Your table at <strong>${restaurantName}</strong> has been booked successfully.</p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p><strong>📅 Date & Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
                <p><strong>👥 Guests:</strong> ${guests}</p>
                <p><strong>📍 Location:</strong> ${restaurantLocation}</p>
              </div>
              <p>We look forward to seeing you!</p>
              <p style="font-size: 12px; color: #64748b;">If you need to cancel, please contact the restaurant directly.</p>
            </div>
          `
        });

        // Send to Owner if email provided
        if (ownerEmail) {
          await resend.emails.send({
            from: 'BookMyTable <bookings@bookmytable.co.in>',
            to: ownerEmail,
            subject: 'New Booking Alert: ' + restaurantName,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <h1 style="color: #f43f5e;">New Reservation Received!</h1>
                <p>You have a new booking at <strong>${restaurantName}</strong>.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <p><strong>👤 Customer:</strong> ${userName}</p>
                  <p><strong>📧 Email:</strong> ${userEmail}</p>
                  <p><strong>📞 Phone:</strong> ${userPhone || 'Not provided'}</p>
                  <p><strong>📅 Date & Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
                  <p><strong>👥 Guests:</strong> ${guests}</p>
                </div>
              </div>
            `
          });
        }
      } catch (err) {
        console.error('Error sending emails:', err);
      }
    } else {
      console.log('NOTICE: RESEND_API_KEY missing. Email skipped but logged.');
    }

    // --- WHATSAPP via TextMeBot ---
    const textMeBotKey = process.env.TEXTMEBOT_API_KEY;
    if (textMeBotKey && userPhone) {
      try {
        const message = `*Booking Confirmed!*\n\nHi ${userName},\nYour table at *${restaurantName}* is confirmed.\n\nDate: ${new Date(dateTime).toLocaleDateString()}\nTime: ${new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nGuests: ${guests}\n\nSee you there!`;
        const url = `https://api.textmebot.com/send.php?recipient=${userPhone.replace(/\+/g, '')}&apikey=${textMeBotKey}&text=${encodeURIComponent(message)}`;
        await fetch(url);
        console.log('WhatsApp confirmation sent via TextMeBot to:', userPhone);
      } catch (whatsappErr) {
        console.error('TextMeBot WhatsApp failed:', whatsappErr);
      }
    } else if (!textMeBotKey) {
      console.log('NOTICE: TEXTMEBOT_API_KEY missing. WhatsApp skipped.');
    }

    res.json({ success: true });
  });

  // API Route for AI Search (Gemini)
  app.post('/api/ai/search', async (req, res) => {
    const { query: searchQuery } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [
          `Search for the top 12 most popular and highly-rated restaurants in or around "${searchQuery || 'Bangalore'}", India. 
           Return a JSON object with a single key "restaurants" containing an array of objects with: name, description (1 sentence), cuisine, avgPrice (number for two), location, rating (number 1-5), lat, lng, 
           openingHours (object {open, close, days}), facilities (array), offers (array), 
           menu (array of {name, price, description}).`
        ],
        config: {
          systemInstruction: 'You are a specialized restaurant search assistant for India. Provide real, accurate restaurant data in JSON format.',
          responseMimeType: 'application/json',
        }
      });

      const content = response.text || '{"restaurants": []}';
      const data = JSON.parse(content);
      res.json(data.restaurants || data);
    } catch (error: any) {
      console.error('Gemini Search Error:', error);
      res.status(200).json({ restaurants: [] });
    }
  });

  // API Route for AI Summary (Gemini)
  app.post('/api/ai/summary', async (req, res) => {
    const { restaurantName, location } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.status(200).json({ summary: 'AI Summary is currently unavailable (API Key missing on server).' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [
          `Summarize the general sentiment and key highlights from recent reviews for "${restaurantName}" in "${location}". Be concise (max 80 words).`
        ],
        config: {
          systemInstruction: 'You are a helpful assistant that summarizes restaurant reviews.',
        }
      });

      res.json({ summary: response.text });
    } catch (error: any) {
      console.error('Gemini Summary Error:', error);
      res.status(200).json({ summary: "AI Summary is currently unavailable. Please check the AI config or try again later." });
    }
  });

  // API Route for Geocoding (Using Nominatim - Free OSM Service)
  app.post('/api/system/geocode', async (req, res) => {
    const { address, city } = req.body;

    try {
      const query = encodeURIComponent(`${address}, ${city}, India`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: {
          'User-Agent': 'BookMyTable-App/1.0 (rec.abhishek@gmail.com)'
        }
      });
      const data: any = await response.json();

      if (data && data.length > 0) {
        return res.json({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
      }
      res.status(200).json({ error: "Location not found" });
    } catch (error: any) {
      console.error('Geocode Error:', error);
      res.status(200).json({ error: "Geocoding service unavailable" });
    }
  });

  // API Route for Paytm Initiate Transaction
  app.post('/api/paytm/initiate', async (req, res) => {
    const { amount, orderId, customerId } = req.body;

    // We use dynamic import for CommonJS module if needed, or straight require.
    // In tsx/esbuild it mostly works as import.
    try {
      const PaytmChecksum = (await import('paytmchecksum')).default || await import('paytmchecksum');
      const https = await import('https');

      const paytmParams: any = {
        body: {
          requestType: "Payment",
          mid: process.env.PAYTM_MID || "ZZUTMz05213521592016",
          websiteName: "WEBSTAGING",
          orderId: orderId,
          callbackUrl: "https://securegw-stage.paytm.in/theia/paytmCallback?ORDER_ID=" + orderId,
          txnAmount: {
            value: Number(amount).toFixed(2),
            currency: "INR",
          },
          userInfo: {
            custId: customerId || "CUST_001",
          },
          channelId: "WEB",
          industryTypeId: "Retail"
        }
      };

      const merchantKey = process.env.PAYTM_MERCHANT_KEY || "z%b4_fEHUHkW&nZy";
      const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), merchantKey);
      
      paytmParams.head = {
        signature: checksum
      };

      const post_data = JSON.stringify(paytmParams);

      const options = {
        hostname: 'securegw-stage.paytm.in',
        port: 443,
        path: `/theia/api/v1/initiateTransaction?mid=${paytmParams.body.mid}&orderId=${orderId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(post_data)
        }
      };

      let response = "";
      const post_req = https.request(options, function(post_res) {
        post_res.on('data', function (chunk) {
          response += chunk;
        });

        post_res.on('end', function() {
           try {
             res.json(JSON.parse(response));
           } catch(e) {
             res.status(500).json({ error: "Invalid JSON from Paytm" });
           }
        });
      });

      post_req.on('error', (e) => {
        res.status(500).json({ error: e.message });
      });

      post_req.write(post_data);
      post_req.end();
    } catch (error: any) {
      console.error('Paytm Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // SEO: dynamic sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      const addUrl = (url: string, priority = '0.8', changefreq = 'daily') => {
        sitemap += `
  <url>
    <loc>https://www.bookmytable.co.in${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
      };

      addUrl('/', '1.0');
      addUrl('/about', '0.8', 'weekly');
      addUrl('/contact', '0.8', 'monthly');
      addUrl('/privacy', '0.5', 'monthly');
      addUrl('/terms', '0.5', 'monthly');
      addUrl('/cookie-policy', '0.5', 'monthly');
      addUrl('/onboarding-request', '0.7', 'monthly');

      // Fetch Cities
      const citiesSnap = await getDocs(collection(db, 'cities'));
      citiesSnap.forEach(doc => {
        const cityData = doc.data();
        if (cityData.name) {
          const citySlug = cityData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          addUrl(`/${citySlug}`, '0.9');
        }
      });

      // Fetch Collections
      const collectionsSnap = await getDocs(collection(db, 'collections'));
      collectionsSnap.forEach(doc => {
        const colData = doc.data();
        if (colData.slug && colData.isActive !== false) {
           addUrl(`/collections/${colData.slug}`, '0.8', 'weekly');
           if (colData.city && colData.city.toLowerCase() !== 'all') {
              const citySlug = colData.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
              addUrl(`/${citySlug}/collections/${colData.slug}`, '0.8', 'weekly');
           }
        }
      });

      // Fetch Restaurants
      const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
      restaurantsSnap.forEach(doc => {
        const resData = doc.data();
        const id = doc.id;
        if (resData.isActive !== false && resData.name && resData.city) {
          const citySlug = resData.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          
          // You could use resData.slug if available, else id
          const slug = resData.slug || id;

          // Main Restaurant entry
          addUrl(`/${citySlug}/restaurant/${slug}`, '0.8', 'daily');
          // Old Canonical Style: The user requested $resturant_link format, wait, let's keep the active app routes which works
          addUrl(`/${slug}`, '0.8', 'daily'); // Assuming they have a direct vanity URL system handled via canonical
          
          // Tabs
          addUrl(`/${citySlug}/restaurant/${slug}/menu`, '0.8', 'weekly');
          addUrl(`/${citySlug}/restaurant/${slug}/reviews`, '0.7', 'weekly');
          addUrl(`/${citySlug}/restaurant/${slug}/info`, '0.7', 'monthly');
          
          // Offers
          addUrl(`/${citySlug}/restaurant/${slug}/offers`, '0.8', 'weekly');
          
          // Book
          addUrl(`/${citySlug}/restaurant/${slug}/book`, '0.8', 'daily');

          // Takeaway (if available)
          if (resData.features && resData.features.takeaway) {
             addUrl(`/${citySlug}/restaurant/${slug}/takeaway`, '0.8', 'daily');
          }
        }
      });

      sitemap += `\n</urlset>`;
      
      res.type('application/xml');
      res.send(sitemap);
    } catch (e) {
      console.error('Error generating sitemap:', e);
      res.status(500).send('Error generating sitemap');
    }
  });

  let isProduction = process.env.NODE_ENV === 'production' || process.argv[1]?.endsWith('server.cjs');

  // Check if we should use vite or static serving
  let useVite = false;
  if (!isProduction) {
    try {
       await import('vite');
       useVite = true;
    } catch(e) {
       console.warn('Vite module not found. Falling back to production static serving.');
       isProduction = true;
    }
  }

  // Vite middleware for development
  if (useVite) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    
    app.get('*', (req, res) => {
      if (req.path.startsWith('/assets/')) {
        if (req.path.endsWith('.js')) {
          // Serve a script that forces a cache-busting reload
          return res.status(404).type('application/javascript').send('window.location.href = window.location.pathname + (window.location.search ? window.location.search + "&" : "?") + "t=" + Date.now();');
        }
        if (req.path.endsWith('.css')) {
          return res.status(404).type('text/css').send('/* Not found */');
        }
        return res.status(404).send('Not found');
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Contact notifications set for: contact@bookmytable.co.in`);
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Warning: Port ${PORT} is in use (likely AI Studio environment). Falling back to port 3000...`);
      app.listen(3000, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:3000`);
        console.log(`Contact notifications set for: contact@bookmytable.co.in`);
      });
    } else {
      console.error('Server error:', error);
    }
  });
}

startServer().catch(console.error);
