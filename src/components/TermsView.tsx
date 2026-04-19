import React from 'react';
import { FileText, CheckCircle, Scale, AlertCircle } from 'lucide-react';

export default function TermsView() {
  return (
    <div className="bg-vibrant-bg min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white p-8 md:p-16 rounded-[3rem] border border-gray-100 shadow-vibrant">
          <div className="flex items-center gap-4 mb-8 text-indigo-600">
            <Scale size={48} className="shrink-0" />
            <h1 className="text-4xl md:text-5xl font-display font-black text-vibrant-dark">Terms of Service</h1>
          </div>

          <p className="text-vibrant-gray mb-10 text-lg">Last updated: April 19, 2026</p>

          <div className="space-y-12 prose prose-slate prose-lg max-w-none">
            <section>
              <div className="flex items-center gap-3 mb-4 text-vibrant-dark">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold m-0">1. Acceptance of Terms</h2>
              </div>
              <p>By accessing or using the BookMyTable platform, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services.</p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 text-vibrant-dark">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold m-0">2. Reservation Policy</h2>
              </div>
              <p>Reservations made through our platform are subject to the availability and confirmation of the respective restaurants. We act as an intermediary to facilitate these bookings. Users are expected to honor their reservations or cancel within a reasonable timeframe if they cannot attend.</p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 text-vibrant-dark">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold m-0">3. User Conduct</h2>
              </div>
              <p>You agree not to use the service for any unlawful purpose or in any way that might harm, damage, or disparage any other party. You are responsible for maintaining the confidentiality of your account information.</p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 text-vibrant-dark">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Scale size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold m-0">4. Limitation of Liability</h2>
              </div>
              <p>BookMyTable shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. We do not guarantee the quality of food or service provided by the partner restaurants.</p>
            </section>

            <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
              <h3 className="text-xl font-display font-bold text-vibrant-dark mb-4">Legal Inquiries</h3>
              <p className="text-vibrant-gray text-base m-0">For all legal questions regarding our terms, please reach out to our legal department at:</p>
              <p className="text-indigo-600 font-bold mt-2">bookmytableindia@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
