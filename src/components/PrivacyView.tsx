import React from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

export default function PrivacyView() {
  return (
    <div className="bg-vibrant-bg min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white p-8 md:p-16 rounded-[3rem] border border-gray-100 shadow-vibrant">
          <div className="flex items-center gap-4 mb-8 text-brand">
            <Shield size={48} className="shrink-0" />
            <h1 className="text-4xl md:text-5xl font-display font-black text-vibrant-dark">Privacy Policy</h1>
          </div>

          <p className="text-vibrant-gray mb-10 text-lg">Last updated: April 19, 2026</p>

          <div className="space-y-12 prose prose-slate prose-lg max-w-none">
            <section>
              <div className="flex items-center gap-3 mb-4 text-vibrant-dark">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold m-0">Information We Collect</h2>
              </div>
              <p>We collect information that you provide directly to us, such as when you create an account, make a restaurant reservation, or contact us for support. This may include your name, email address, phone number, and booking history.</p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 text-vibrant-dark">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold m-0">How We Use Your Information</h2>
              </div>
              <p>We use the information we collect to provide, maintain, and improve our services, including processing your reservations, sending you confirmations, and communicating with you about your bookings or updates to our platform.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To facilitate restaurant bookings and management</li>
                <li>To send transactional emails and notifications</li>
                <li>To personalize your experience on our platform</li>
                <li>To detect, investigate, and prevent fraudulent transactions</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 text-vibrant-dark">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold m-0">Data Security</h2>
              </div>
              <p>We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. We use industry-standard encryption and secure servers to protect your data.</p>
            </section>

            <section className="bg-slate-50 p-8 rounded-[2rem] border border-gray-100">
              <h3 className="text-xl font-display font-bold text-vibrant-dark mb-4">Contact Us Regarding Privacy</h3>
              <p className="text-vibrant-gray text-base m-0">If you have any questions about this Privacy Policy, please contact us at:</p>
              <p className="text-brand font-bold mt-2">bookmytableindia@gmail.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
