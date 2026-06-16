const fs = require('fs');

const updatePartner = () => {
    let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');

    // Add state 
    if (!content.includes('qrTableTarget')) {
        content = content.replace(
            /const \[toastMessage, setToastMessage\] = useState/,
            `const [qrTableTarget, setQrTableTarget] = useState("");\n  const [toastMessage, setToastMessage] = useState`
        );
    }
    
    // Update the Digital QR menu UI
    const searchString = `<div className="shrink-0 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm relative z-10">\n                          <QRCodeSVG \n                            value={\`\${window.location.origin}/qr-menu/\${selectedRes?.id}\`} \n                            size={120}\n                            level="H"\n                            includeMargin={false}\n                            fgColor="#0f172a"\n                          />\n                        </div>\n                        <div className="flex-1 text-center md:text-left relative z-10">\n                          <h4 className="text-lg font-bold text-[#363636] mb-2">Digital QR Menu</h4>\n                          <p className="text-sm text-slate-500 mb-4 max-w-sm">\n                            Scan this QR code from any table to view the live menu and place an order directly.\n                          </p>\n                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">\n                            <a \n                              href={\`/qr-menu/\${selectedRes?.id}\`} \n                              target="_blank" \n                              rel="noopener noreferrer" \n                              className="px-5 py-2 bg-brand text-white rounded-full text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all w-fit"\n                            >\n                              Open Menu Link\n                            </a>\n                            <a \n                              href={\`/qr-menu/\${selectedRes?.id}?table=1\`} \n                              target="_blank" \n                              rel="noopener noreferrer" \n                              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all w-fit border border-slate-200"\n                            >\n                              Preview (Table 1)\n                            </a>\n                          </div>\n                        </div>`;

    const replaceString = `<div className="shrink-0 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm relative z-10">
                          <QRCodeSVG 
                            value={\`\${window.location.origin}/qr-menu/\${selectedRes?.id}\${qrTableTarget ? '?table='+encodeURIComponent(qrTableTarget) : ''}\`} 
                            size={120}
                            level="H"
                            includeMargin={false}
                            fgColor="#0f172a"
                          />
                        </div>
                        <div className="flex-1 text-center md:text-left relative z-10">
                          <h4 className="text-lg font-bold text-[#363636] mb-2">Digital QR Menu</h4>
                          <p className="text-sm text-slate-500 mb-3 max-w-sm">
                            Generate this QR code per table by entering the table number below.
                          </p>
                          <div className="mb-4">
                            <input 
                              type="text" 
                              value={qrTableTarget} 
                              onChange={(e) => setQrTableTarget(e.target.value)} 
                              placeholder="Enter Table Number (e.g. 5, A2) or leave blank" 
                              className="w-full max-w-[240px] px-4 py-2 border border-slate-200 rounded-xl text-sm mb-2 focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <a 
                              href={\`/qr-menu/\${selectedRes?.id}\${qrTableTarget ? '?table='+encodeURIComponent(qrTableTarget) : ''}\`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-5 py-2 bg-brand text-white rounded-full text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all w-fit"
                            >
                              Open {qrTableTarget ? 'Table '+qrTableTarget+' ' : 'Generic '}Menu Link
                            </a>
                            <button
                              onClick={() => {
                                const svg = document.querySelector('.bg-white.border-2.border-brand\\\\/20 svg');
                                if (svg) {
                                  const svgData = new XMLSerializer().serializeToString(svg);
                                  const canvas = document.createElement("canvas");
                                  const ctx = canvas.getContext("dom");
                                  const img = document.createElement("img");
                                  img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
                                  img.onload = () => {
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext("2d");
                                    if(ctx) { ctx.drawImage(img, 0, 0);
                                      const a = document.createElement("a");
                                      a.download = \`table-\${qrTableTarget || 'generic'}-qr.png\`;
                                      a.href = canvas.toDataURL("image/png");
                                      a.click();
                                    }
                                  };
                                }
                              }}
                              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all w-fit border border-slate-200"
                            >
                              Download QR (PNG)
                            </button>
                          </div>
                        </div>`;
    
    content = content.replace(searchString, replaceString);

    fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
};

updatePartner();
