import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src/components', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let replaced = content.replace(/-mx-6 px-6 md:mx-0 md:px-0/g, '-mx-6 px-6 scroll-px-6 md:scroll-px-0 md:mx-0 md:px-0');
    replaced = replaced.replace(/-mx-4 px-4 md:mx-0 md:px-0/g, '-mx-4 px-4 scroll-px-4 md:scroll-px-0 md:mx-0 md:px-0');
    
    // CityView specific edge cases
    replaced = replaced.replace(/-mx-6 px-6 scroll-px-6 md:scroll-px-0 md:mx-0 md:px-0 scroll-px-6/g, '-mx-6 px-6 scroll-px-6 md:scroll-px-0 md:mx-0 md:px-0'); // Avoid double
    replaced = replaced.replace(/-mx-6 px-6 md:mx-0 md:px-0 snap-x/g, '-mx-6 px-6 scroll-px-6 md:scroll-px-0 md:mx-0 md:px-0 snap-x');
    
    if (content !== replaced) {
      fs.writeFileSync(filePath, replaced, 'utf8');
      console.log('Fixed:', filePath);
    }
  }
});
