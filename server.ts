import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 8080;

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
