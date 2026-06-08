const fs = require('fs');
const path = require('path');

const directory = './src/components';
const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
};

const components = walkSync(directory).filter(f => f.endsWith('.tsx'));

components.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('text-vibrant-dark')) {
      content = content.replace(/text-vibrant-dark/g, 'text-[#363636]');
      changed = true;
  }
  
  if (content.includes('font-display font-black')) {
      content = content.replace(/font-display font-black/g, 'font-normal leading-[1.2]');
      changed = true;
  }
  
  if (content.includes('font-display font-bold')) {
      content = content.replace(/font-display font-bold/g, 'font-normal leading-[1.2]');
      changed = true;
  }

  if (content.match(/font-bold text-\[\#363636\]/)) {
      content = content.replace(/font-bold text-\[\#363636\]/g, 'font-normal leading-[1.2] text-[#363636]');
      changed = true;
  }
  
  if (content.match(/font-black text-\[\#363636\]/)) {
      content = content.replace(/font-black text-\[\#363636\]/g, 'font-normal leading-[1.2] text-[#363636]');
      changed = true;
  }
  
  if (content.match(/font-black text-white/)) {
      content = content.replace(/font-black text-white/g, 'font-normal leading-[1.2] text-white');
      changed = true;
  }
  
  if (content.match(/font-black text-brand/)) {
      content = content.replace(/font-black text-brand/g, 'font-normal leading-[1.2] text-brand');
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});

console.log('Done mapping headings and texts to font-normal, 1.2, #363636');
