import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

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

    // NOTE: To send a REAL email, you would integrate a service like Resend or SendGrid here.
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ ... });

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
          from: 'BookMyTable <onboarding@resend.dev>', // Use verified domain in production
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
            from: 'BookMyTable <onboarding@resend.dev>',
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
