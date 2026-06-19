import React, { useEffect, useState } from 'react';
import { Mall } from '../types';
import { db } from '../lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Store, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminMallsTab() {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMalls = async () => {
      try {
        const q = query(collection(db, 'malls'));
        const snapshot = await getDocs(q);
        setMalls(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Mall)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMalls();
  }, []);

  const handlePrintQR = (mall: Mall) => {
    const mallSlug = mall.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + 
                     "-" + 
                     (mall.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    
    const qrUrl = `https://www.bookmytable.co.in/mall/${mallSlug}`;
    
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    
    // We need to render the SVG to string, an easy hack is to find it in DOM or re-render 
    // But since we can't easily wait, let's just create an HTML
    const svgElement = document.getElementById(`qr-mall-${mall.id}`);
    const svgData = new XMLSerializer().serializeToString(svgElement!);
    
    printWin.document.write(`
      <html>
        <head>
          <title>Print QR - ${mall.name}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .qr-container { padding: 40px; border: 2px dashed #ccc; border-radius: 20px; text-align: center; }
            h1 { margin: 0 0 10px 0; font-size: 24px; }
            p { margin: 0 0 20px 0; color: #666; }
            svg { width: 300px; height: 300px; }
            @media print {
              .qr-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${mall.name}</h1>
            <p>${mall.location}, ${mall.city}</p>
            ${svgData}
            <p style="margin-top: 20px; font-weight: bold;">Scan to Order</p>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading malls...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-normal text-[#363636] leading-tight">Food Courts & Malls</h2>
          <p className="text-sm text-slate-500 mt-1">Manage physical mall locations</p>
        </div>
        <Link 
          to="/admin/onboard-mall"
          className="flex items-center gap-2 bg-[#363636] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} />
          <span>Add Mall</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {malls.map(mall => (
          <div key={mall.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0 overflow-hidden">
                {mall.image ? (
                  <img src={mall.image} alt={mall.name} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400">
                     <Store size={24} />
                   </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-[#363636] text-lg leading-tight">{mall.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-1">{mall.location}, {mall.city}</p>
              </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-100 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mall QR Code</div>
                <div className="bg-slate-50 p-2 rounded-xl inline-block border border-slate-200">
                  <QRCodeSVG 
                    id={`qr-mall-${mall.id}`}
                    value={`https://www.bookmytable.co.in/mall/${mall.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${(mall.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`} 
                    size={80} 
                  />
                </div>
              </div>
              <button 
                onClick={() => handlePrintQR(mall)}
                className="flex items-center gap-2 text-brand font-medium text-sm hover:underline"
              >
                <Printer size={16} />
                Print QR
              </button>
            </div>
          </div>
        ))}
        {malls.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-slate-200 border-dashed rounded-3xl">
            No malls onboarded yet.
          </div>
        )}
      </div>
    </div>
  );
}
