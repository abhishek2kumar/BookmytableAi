const fs = require('fs');

const fixCuisineView = () => {
  let content = fs.readFileSync('src/components/CuisineView.tsx', 'utf8');

  content = content.replace(/import \{ motion \} from 'motion\/react';\\nimport \{ Helmet \} from 'react-helmet-async';/, "import { motion } from 'motion/react';\nimport { Helmet } from 'react-helmet-async';");
  
  content = content.replace(/  const getSeoData = \(\) => \{\\n/, "  const getSeoData = () => {\n");
  
  content = content.replace(/getSeoData\(\);\\n\\n  return \(\\n/, "getSeoData();\n\n  return (\n");

  fs.writeFileSync('src/components/CuisineView.tsx', content);
}
fixCuisineView();
