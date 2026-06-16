const fs = require('fs');

const updatePartner = () => {
    let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');

    content = content.replace(/import \{ QRCodeSVG \} from 'qrcode\.react';/, "import { QRCodeCanvas } from 'qrcode.react';");

    content = content.replace(/<QRCodeSVG/g, '<QRCodeCanvas id="qr-canvas-element"');
    content = content.replace(/<\/QRCodeSVG>/g, '</QRCodeCanvas>');

    const downloadLogic = `onClick={() => {\n                                const svg = document.querySelector('.bg-white.border-2.border-brand\\\\/20 svg');\n                                if (svg) {\n                                  const svgData = new XMLSerializer().serializeToString(svg);\n                                  const canvas = document.createElement("canvas");\n                                  const ctx = canvas.getContext("dom");\n                                  const img = document.createElement("img");\n                                  img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));\n                                  img.onload = () => {\n                                    canvas.width = img.width;\n                                    canvas.height = img.height;\n                                    const ctx = canvas.getContext("2d");\n                                    if(ctx) { ctx.drawImage(img, 0, 0);\n                                      const a = document.createElement("a");\n                                      a.download = \`table-\${qrTableTarget || 'generic'}-qr.png\`;\n                                      a.href = canvas.toDataURL("image/png");\n                                      a.click();\n                                    }\n                                  };\n                                }\n                              }}`;

    const newDownloadLogic = `onClick={() => {
                                const canvas = document.getElementById('qr-canvas-element');
                                if (canvas) {
                                  const a = document.createElement("a");
                                  a.download = \`table-\${qrTableTarget || 'generic'}-qr.png\`;
                                  a.href = canvas.toDataURL("image/png");
                                  a.click();
                                }
                              }}`;

    content = content.replace(downloadLogic, newDownloadLogic);
    
    // add print button
    const printBtn = `Download QR (PNG)
                            </button>
                            <button
                              onClick={() => {
                                const canvas = document.getElementById('qr-canvas-element');
                                if (canvas) {
                                  const dataUrl = canvas.toDataURL("image/png");
                                  const printWin = window.open('', '', 'width=600,height=600');
                                  if (printWin) {
                                    let tableName = qrTableTarget ? \`Table \${qrTableTarget}\` : 'Generic Menu';
                                    printWin.document.write(\`
                                      <html>
                                        <head>
                                          <title>Print QR - \${tableName}</title>
                                          <style>
                                            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                                            h1 { font-size: 24px; margin-bottom: 20px; text-align: center; }
                                            img { width: 300px; height: 300px; border: 2px solid #000; padding: 20px; border-radius: 16px; margin-bottom: 20px; }
                                          </style>
                                        </head>
                                        <body>
                                          <h1>\${selectedRes?.name || 'Restaurant'}</h1>
                                          <h2 style="margin-top: 0;">\${tableName}</h2>
                                          <img src="\${dataUrl}" onload="window.print(); window.close();" />
                                        </body>
                                      </html>
                                    \`);
                                    printWin.document.close();
                                  }
                                }
                              }}
                              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all w-fit border border-slate-200"
                            >
                              Print QR
                            </button>`;
    
    content = content.replace(/Download QR \(PNG\)\n\s*<\/button>/g, printBtn);

    fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
};

updatePartner();
