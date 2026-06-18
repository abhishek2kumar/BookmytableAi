import React from 'react';
import { Cookie, Info, Shield, CheckCircle2 } from 'lucide-react';

export default function CookiePolicyView() {
  return (
    <div className="bg-vibrant-bg min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white p-8 md:p-16 rounded-[3rem] border border-gray-100 shadow-vibrant">
          <div className="flex items-center gap-4 mb-8 text-brand">
            <Cookie size={48} className="shrink-0" />
            <h1 className="text-4xl md:text-5xl text-[#363636] font-normal leading-[1.2]">Cookie Policy</h1>
          </div>

          <p className="text-vibrant-gray mb-10 text-lg">Last updated: June 18, 2026</p>

          <div className="space-y-12 prose prose-slate prose-lg max-w-none">
            <section>
              <div className="flex items-center gap-3 mb-4 text-[#363636]">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Info size={20} />
                </div>
                <h2 className="text-2xl m-0 font-normal leading-[1.2]">What Are Cookies?</h2>
              </div>
              <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information and personalize your experience.</p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 text-[#363636]">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <h2 className="text-2xl m-0 font-normal leading-[1.2]">How We Use Cookies</h2>
              </div>
              <p>We use cookies to enhance your experience on Bookmytable in the following ways:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> These are strictly necessary for the operation of our platform, allowing you to log in securely, navigate the site, and make restaurant reservations.</li>
                <li><strong>Performance and Analytics Cookies:</strong> We use these to understand how visitors interact with our website, helping us improve the user interface and overall performance.</li>
                <li><strong>Functionality Cookies:</strong> These remember your preferences (such as your location or language choices) to provide a more personalized, seamless booking experience.</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4 text-[#363636]">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <h2 className="text-2xl m-0 font-normal leading-[1.2]">Managing Your Cookie Preferences</h2>
              </div>
              <p>You have the right to decide whether to accept or reject non-essential cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website, though your access to some functionality and areas of our platform may be restricted.</p>
              <p>To learn more about how to manage cookies, please visit the help or settings menu of your specific internet browser.</p>
            </section>

            <section className="bg-slate-50 p-8 rounded-[2rem] border border-gray-100">
              <h3 className="text-xl mb-4 text-[#363636] font-normal leading-[1.2]">Contact Us</h3>
              <p className="text-vibrant-gray text-base m-0">If you have any questions or concerns about our use of cookies, please contact us at:</p>
              <p className="text-brand font-bold mt-2">contact@bookmytable.co.in</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
