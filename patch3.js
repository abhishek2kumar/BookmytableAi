import fs from 'fs';
const content = fs.readFileSync('src/components/HomeLandingView.tsx', 'utf-8');
// add missing closing div for max-w-6xl container
const newContent = content.replace(
`               <motion.div 
                 animate={{ y: [0, 10, 0] }}
                 transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                 className="absolute -left-12 bottom-40 bg-white text-[#363636] px-4 py-2 rounded-xl shadow-2xl font-normal leading-[1.2] text-xs"
               >
                  1M+ Downloads
               </motion.div>
            </div>
            
            {/* Background elements */}`,
`               <motion.div 
                 animate={{ y: [0, 10, 0] }}
                 transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                 className="absolute -left-12 bottom-40 bg-white text-[#363636] px-4 py-2 rounded-xl shadow-2xl font-normal leading-[1.2] text-xs"
               >
                  1M+ Downloads
               </motion.div>
            </div>
         </div>
         
         {/* Background elements */}`
);
fs.writeFileSync('src/components/HomeLandingView.tsx', newContent);
