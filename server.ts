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
  // AI Studio environment strictly requires port 3000.
  // For your external deployments via GitHub, set the EXTERNAL_DEPLOYMENT_PORT environment variable 
  // on your server (e.g., EXTERNAL_DEPLOYMENT_PORT=8080).
  const PORT = process.env.PORT 
    ? parseInt(process.env.PORT, 10) 
    : 3000;

  app.use(express.json());

  // Redirection middleware to force WWW on production domain
  app.use((req, res, next) => {
    const host = req.headers.host;
    if (process.env.NODE_ENV === "production" && host === "bookmytable.co.in") {
      return res.redirect(301, `https://www.bookmytable.co.in${req.url}`);
    }
    next();
  });

  // API Route for Contact Form
  app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    console.log('--- NEW CONTACT FORM SUBMISSION ---');
    console.log('To: bookmytableindia@gmail.com');
    console.log(`From: ${name} (${email})`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log('------------------------------------');

    const resend = getResend();
    if (resend) {
      try {
        // Send to User
        await resend.emails.send({
          from: 'contact@bookmytable.co.in', // Use verified domain in production
          to: 'contact@bookmytable.co.in',
          subject: 'Enquiry from customer' + name,
          html: `
            <h1>Your have received Enquiry from ${name} regarding  !</h1>
            <p>Customer's e-mail address: ${email},</p>
            <p>Customer's message: ${message}</p>
          `
        });

      } catch (err) {
        console.error('Error sending emails:', err);
      }
    } else {
      console.log('NOTICE: RESEND_API_KEY missing. Email skipped but logged.');
    }
    res.status(200).json({ success: true, message: 'Message received and logged for delivery to bookmytableindia@gmail.com' });
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

  // SEO: dynamic sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bookmytable.co.in/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bookmytable.co.in/about</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bookmytable.co.in/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://bookmytable.co.in/onboarding-request</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

      // Fetch Cities
      const citiesSnap = await getDocs(collection(db, 'cities'));
      citiesSnap.forEach(doc => {
        const cityData = doc.data();
        if (cityData.name) {
          const citySlug = cityData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          sitemap += `
  <url>
    <loc>https://bookmytable.co.in/city/${citySlug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
        }
      });

      // Fetch Restaurants
      const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
      restaurantsSnap.forEach(doc => {
        const resData = doc.data();
        const id = doc.id;
        if (resData.name && resData.city) {
          const citySlug = resData.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const nameSlug = resData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          sitemap += `
  <url>
    <loc>https://bookmytable.co.in/restaurant/${citySlug}/${nameSlug}/${id}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bookmytable.co.in/restaurant/${citySlug}/${nameSlug}/${id}/book</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
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

  const isProduction = process.env.NODE_ENV === 'production' || process.argv[1]?.endsWith('server.cjs');

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Contact notifications set for: bookmytableindia@gmail.com`);
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Warning: Port ${PORT} is in use (likely AI Studio environment). Falling back to port 3000...`);
      app.listen(3000, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:3000`);
        console.log(`Contact notifications set for: bookmytableindia@gmail.com`);
      });
    } else {
      console.error('Server error:', error);
    }
  });
}

startServer().catch(console.error);
