import React from 'react';
import { Shield, CheckCircle, Users, Heart } from 'lucide-react';

export default function CodeOfConductView() {
  return (
    <div className="bg-vibrant-bg min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white p-8 md:p-16 rounded-[3rem] border border-gray-100 shadow-vibrant">
          <div className="flex items-center gap-4 mb-8 text-teal-600">
            <Shield size={48} className="shrink-0" />
            <h1 className="text-4xl md:text-5xl text-[#363636] font-normal leading-[1.2]">Code of Conduct</h1>
          </div>
          
          <p className="text-vibrant-gray mb-10 text-lg">Last updated: April 19, 2026</p>
          
          <div className="space-y-12 prose prose-slate prose-lg max-w-none">
            
            <section>
              <div className="flex items-center gap-3 mb-4 text-[#363636]">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <h2 className="text-2xl m-0 font-normal leading-[1.2]">1. Our Commitment</h2>
              </div>
              <p>In the interest of fostering an open and welcoming environment, we pledge to making participation in our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.</p>
            </section>
            
            <section>
              <div className="flex items-center gap-3 mb-4 text-[#363636]">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <h2 className="text-2xl m-0 font-normal leading-[1.2]">2. Our Standards</h2>
              </div>
              <p>Examples of behavior that contributes to creating a positive environment include:</p>
              <ul>
                <li>Using welcoming and inclusive language.</li>
                <li>Being respectful of differing viewpoints and experiences.</li>
                <li>Gracefully accepting constructive criticism.</li>
                <li>Focusing on what is best for the community.</li>
                <li>Showing empathy towards other community members.</li>
              </ul>
            </section>
            
            <section>
              <div className="flex items-center gap-3 mb-4 text-[#363636]">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Heart size={20} />
                </div>
                <h2 className="text-2xl m-0 font-normal leading-[1.2]">3. Unacceptable Behavior</h2>
              </div>
              <p>Examples of unacceptable behavior by participants include:</p>
              <ul>
                <li>The use of sexualized language or imagery and unwelcome sexual attention or advances.</li>
                <li>Trolling, insulting/derogatory comments, and personal or political attacks.</li>
                <li>Public or private harassment.</li>
                <li>Publishing others' private information, such as a physical or electronic address, without explicit permission.</li>
                <li>Other conduct which could reasonably be considered inappropriate in a professional setting.</li>
              </ul>
            </section>

            <div className="bg-teal-50 p-8 rounded-[2rem] border border-teal-100">
              <h3 className="text-xl mb-4 text-[#363636] font-normal leading-[1.2]">Reporting</h3>
              <p className="text-vibrant-gray text-base m-0">Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at:</p>
              <p className="text-teal-600 font-bold mt-2">contact@bookmytable.co.in</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
