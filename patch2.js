import fs from 'fs';

const content = fs.readFileSync('src/components/HomeLandingView.tsx', 'utf-8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('<div className="relative scale-110 md:translate-x-10">'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes('Decorative floating stats')) - 2;

console.log("Start:", startIdx, "End:", endIdx);

const replacement = `            <div className="relative md:translate-x-10 group-hover:-translate-y-4 transition-transform duration-700">
               <img 
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
               </div>
            </div>`;

if (startIdx !== -1 && endIdx !== -1) {
    const before = lines.slice(0, startIdx).join('\n');
    const after = lines.slice(endIdx + 1).join('\n');
    fs.writeFileSync('src/components/HomeLandingView.tsx', before + '\n' + replacement + '\n' + after);
    console.log("Patched successfully!");
}
