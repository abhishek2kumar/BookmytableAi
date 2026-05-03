import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import { GoogleGenAI } from '@google/genai';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
            <h1>Your Reservation is Confirmed!</h1>
            <p>Hi ${userName},</p>
            <p>Your table at <strong>${restaurantName}</strong> has been booked.</p>
            <p><strong>Date & Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
            <p><strong>Guests:</strong> ${guests}</p>
            <p><strong>Location:</strong> ${restaurantLocation}</p>
            <p>We look forward to seeing you!</p>
          `
        });

        // Send to Owner if email provided
        if (ownerEmail) {
          await resend.emails.send({
            from: 'BookMyTable <bookings@bookmytable.co.in>',
            to: ownerEmail,
            subject: 'New Booking: ' + restaurantName,
            html: `
              <h1>New Reservation Received!</h1>
              <p>You have a new booking at <strong>${restaurantName}</strong>.</p>
              <p><strong>Customer:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Phone:</strong> ${userPhone}</p>
              <p><strong>Date & Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
              <p><strong>Guests:</strong> ${guests}</p>
            `
          });
        }
      } catch (err) {
        console.error('Error sending emails:', err);
      }
    } else {
      console.log('NOTICE: RESEND_API_KEY missing. Email skipped but logged.');
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
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for AI Summary (Gemini)
  app.post('/api/ai/summary', async (req, res) => {
    const { restaurantName, location } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
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
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Contact notifications set for: bookmytableindia@gmail.com`);
  });
}

startServer().catch(console.error);
