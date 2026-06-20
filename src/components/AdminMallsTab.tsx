import React, { useEffect, useState } from 'react';
import { Mall } from '../types';
import { db } from '../lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Plus, Store, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminMallsTab() {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    const citySlug = (mall.city || "Pune").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    // Hardcode viman-nagar override for "Phoenix Avenue Of Stars" if location is "Nagar Road"
    let loc = (mall.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if(mall.name.includes("Phoenix Avenue") && loc.includes("nagar-road")) {
       loc = "viman-nagar";
    }
    const mallSlug = mall.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + loc;
    
    // We need to render the SVG to string, an easy hack is to find it in DOM or re-render 
    // But since we can't easily wait, let's just create an HTML
    const svgElement = document.getElementById(`qr-mall-${mall.id}`);
    const svgData = new XMLSerializer().serializeToString(svgElement!);
    
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    // Get full original URL of the current app for the logo
    const baseUrl = window.location.origin;
    
    printWin.document.write(`
      <html>
        <head>
          <title>Print QR - ${mall.name}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
            .qr-container { padding: 40px; border: 2px dashed #ccc; border-radius: 20px; text-align: center; background: #fff; max-width: 400px; width: 100%; border: 1px solid #eee; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            .logo-text { font-size: 24px; font-weight: 900; color: #ff5a25; margin: 0 0 5px 0; letter-spacing: -0.5px; }
            .logo-sub { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 30px 0; font-weight: 700; }
            h1 { margin: 0 0 10px 0; font-size: 24px; color: #363636; }
            p { margin: 0 0 20px 0; color: #666; font-size: 14px; }
            svg { width: 300px; height: 300px; margin: 0 auto; display: block; }
            .scan-text { margin-top: 25px; font-weight: 800; color: #363636; font-size: 18px; letter-spacing: 0.5px; }
            .scan-subtext { font-size: 13px; color: #888; margin-top: 5px; }
            @media print {
              body, .qr-container { max-width: none; border: none; box-shadow: none; padding: 0; height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 5px;">
              <div style="width: 28px; height: 28px; background: #ff5a25; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">B</div>
              <div class="logo-text" style="margin-bottom: 0;"><span style="color:#363636;">Bookmy</span><span style="color:#ff5a25;">Table</span></div>
            </div>
            <div class="logo-sub">Skip The Queue</div>
            <h1>${mall.name}</h1>
            <p>${mall.location}, ${mall.city}</p>
            ${svgData}
            <div class="scan-text">Scan & Order</div>
            <div class="scan-subtext">Order from any outlet in the food court</div>
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

  const currentOrigin = window.location.origin.includes('localhost') ? 'https://www.bookmytable.co.in' : window.location.origin;

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
          <div key={mall.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors cursor-pointer" onClick={(e) => {
            // Prevent going to edit if clicking the print button
            if ((e.target as HTMLElement).closest('button')) return;
            navigate(`/admin/malls/${mall.id}/edit`);
          }}>
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
                    value={`${currentOrigin.replace(/\/$/, '')}/${(mall.city || "Pune").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}/mall/${mall.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${(mall.name.includes("Phoenix Avenue") && mall.location?.includes("Nagar Road") ? "viman-nagar" : (mall.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))}`} 
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
