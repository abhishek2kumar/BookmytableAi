import fs from 'fs';
const content = fs.readFileSync('src/components/HomeLandingView.tsx', 'utf-8');

const newContent = content.replace(
`               <img 
                 src="/mobile-app-mockup.png" 
                 alt="Mobile App Preview" 
                 className="w-full max-w-[320px] h-auto object-contain drop-shadow-2xl"
                 onError={(e) => {
                   // Fallback visual if they haven't uploaded the image yet
                   e.currentTarget.style.display = 'none';
                   const fallback = document.getElementById('mockup-fallback');
                   if (fallback) fallback.style.display = 'flex';
                 }}
               />
               <div id="mockup-fallback" className="hidden w-64 h-[500px] bg-slate-800 rounded-[2.5rem] border-[8px] border-slate-700 shadow-2xl relative overflow-hidden flex-col items-center justify-center text-center p-6">
                 <p className="text-white/60 text-sm font-medium mb-4">Awaiting Image Upload</p>
                 <p className="text-white/40 text-xs">Please upload your image as <span className="font-bold text-white">mobile-app-mockup.png</span> in the public folder.</p>
               </div>`,
`               <img 
                 src="/mobile-app-mockup.png?v=2" 
                 alt="Mobile App Preview" 
                 className="w-full max-w-[320px] h-auto object-contain drop-shadow-2xl"
               />`
);
fs.writeFileSync('src/components/HomeLandingView.tsx', newContent);
