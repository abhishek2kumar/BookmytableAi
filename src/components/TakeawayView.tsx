import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRestaurants } from '../hooks/useFirebase';
import { ArrowLeft, Clock, ShoppingBag, Plus, Minus, CreditCard, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getRestaurantUrl } from '../lib/utils';
import { useAuth } from './AuthProvider';

export default function TakeawayView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { getRestaurantBySlug } = useRestaurants();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [cart, setCart] = useState<{[itemId: string]: number}>({});
  const [step, setStep] = useState<'menu' | 'checkout' | 'success'>('menu');

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const data = await getRestaurantBySlug(slug);
        if (data) {
          setRestaurant(data);
        }
      } catch (err) {
        console.error("Error loading restaurant:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, getRestaurantBySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 border-t border-slate-200">
        <div className="h-full flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <AlertCircle size={48} className="text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Restaurant not found</h2>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-brand text-white rounded-xl font-bold">Go Home</button>
      </div>
    );
  }

  const liveMenu = (restaurant.liveMenu || []).filter((item: any) => item.isAvailable);

  const cartTotal = Object.entries(cart).reduce((total, [itemId, quantity]) => {
    const item = liveMenu.find((i: any) => i.id === itemId);
    if (!item) return total;
    return total + (item.price * quantity);
  }, 0);

  const updateCart = (itemId: string, increment: boolean) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = increment ? current + 1 : Math.max(0, current - 1);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = next;
      }
      return updated;
    });
  };

  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleCheckout = () => {
    if (!user) {
      // Should login actually but showing a simple flow here
    }
    setStep('checkout');
  };

  const handleConfirmOrder = () => {
    setStep('success');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
         <div className="max-w-4xl mx-auto flex items-center h-16 md:h-20 px-4">
           {step === 'menu' ? (
             <button onClick={() => navigate(getRestaurantUrl(restaurant))} className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100">
               <ArrowLeft size={24} />
             </button>
           ) : step === 'checkout' ? (
             <button onClick={() => setStep('menu')} className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100">
               <ArrowLeft size={24} />
             </button>
           ) : (
             <button onClick={() => navigate(getRestaurantUrl(restaurant))} className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100">
               <ArrowLeft size={24} />
             </button>
           )}
           <div className="flex-1 ml-2">
             <h1 className="font-bold text-slate-900 text-lg sm:text-xl line-clamp-1">{restaurant.name}</h1>
             <div className="flex items-center gap-1 text-slate-500 text-xs">
               <span className="truncate">{restaurant.location}</span>
               <span>•</span>
               <span className="font-medium text-brand">Takeaway Order</span>
             </div>
           </div>
         </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {step === 'menu' && (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Live Menu</h2>
              
              {liveMenu.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="text-slate-400" size={24} />
                  </div>
                  <h3 className="font-bold text-slate-900">No items available</h3>
                  <p className="text-slate-500 text-sm mt-1 mb-4">The restaurant has not added any takeaway items yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveMenu.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200 flex gap-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex-1 flex flex-col justify-center">
                        <h4 className="font-bold text-slate-900 text-lg mb-1">{item.name}</h4>
                        <div className="font-black text-brand mb-2">₹{item.price}</div>
                        {item.description && <p className="text-sm text-slate-500 line-clamp-2 md:line-clamp-3 leading-relaxed mb-4">{item.description}</p>}
                        
                        <div className="mt-auto self-start">
                          <div className={cn(
                            "flex items-center gap-4 rounded-xl border transition-all h-10 px-3",
                            cart[item.id] ? "bg-brand/5 border-brand/20" : "bg-white border-slate-200"
                          )}>
                            <button 
                              onClick={() => updateCart(item.id, false)}
                              className={cn("w-6 h-6 flex items-center justify-center rounded-md active:scale-95 transition-all text-slate-600 hover:bg-slate-100", cart[item.id] ? "" : "opacity-0 pointer-events-none")}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="font-bold text-slate-900 min-w-4 text-center">
                              {cart[item.id] ? cart[item.id] : (
                                <button
                                  onClick={() => updateCart(item.id, true)}
                                  className="w-full text-brand font-bold uppercase tracking-widest text-xs px-2"
                                >
                                  Add
                                </button>
                              )}
                            </span>
                            <button 
                              onClick={() => updateCart(item.id, true)}
                              className={cn("w-6 h-6 flex items-center justify-center rounded-md active:scale-95 transition-all text-slate-600 hover:bg-slate-100", cart[item.id] ? "" : "opacity-0 pointer-events-none")}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {item.image && (
                        <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary Header/Sidebar */}
            <div className="w-full md:w-80 shrink-0">
              <div className="sticky top-[104px]">
                 <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                   <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
                     <ShoppingBag size={20} className="text-brand" />
                     Your Cart
                   </h3>
                   
                   {cartItemsCount === 0 ? (
                     <div className="text-center py-6">
                       <p className="text-slate-400 text-sm">Cart is empty</p>
                       <p className="text-slate-400 text-xs mt-1">Add items to get started</p>
                     </div>
                   ) : (
                     <div className="space-y-6">
                       <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                         {Object.entries(cart).map(([itemId, quantity]) => {
                            const item = liveMenu.find((i: any) => i.id === itemId);
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <div className="font-bold text-slate-900 text-sm leading-tight flex items-start gap-2">
                                     <div className="shrink-0 w-4 h-4 mt-0.5 border-2 border-brand flex items-center justify-center">
                                       <div className="w-2 h-2 rounded-full bg-brand" />
                                     </div>
                                     {item.name}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1 pl-6">
                                     ₹{item.price} × {quantity}
                                  </div>
                                </div>
                                <div className="font-black text-slate-900">
                                  ₹{item.price * quantity}
                                </div>
                              </div>
                            )
                         })}
                       </div>
                       
                       <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                         <div className="flex justify-between text-slate-500">
                           <span>Item Total</span>
                           <span>₹{cartTotal}</span>
                         </div>
                         <div className="flex justify-between text-slate-500">
                           <span>Taxes & Charges</span>
                           <span>₹{Math.round(cartTotal * 0.05)}</span>
                         </div>
                         <div className="flex justify-between font-black text-slate-900 text-lg pt-2">
                           <span>To Pay</span>
                           <span>₹{cartTotal + Math.round(cartTotal * 0.05)}</span>
                         </div>
                       </div>
                       
                       <button 
                         onClick={handleCheckout}
                         className="w-full bg-brand text-white py-4 rounded-xl font-bold flex items-center justify-between px-6 hover:bg-[#ff0040] transition-colors active:scale-95 shadow-sm"
                       >
                         <span>Checkout</span>
                         <div className="flex items-center gap-1">
                           <span>₹{cartTotal + Math.round(cartTotal * 0.05)}</span>
                           <ChevronRight size={18} />
                         </div>
                       </button>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        )}

        {step === 'checkout' && (
           <div className="max-w-xl mx-auto space-y-6">
             <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
               <h2 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h2>
               
               <div className="space-y-6">
                 <div>
                   <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-widest">Order Details</h3>
                   <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                     {Object.entries(cart).map(([itemId, quantity]) => {
                        const item = liveMenu.find((i: any) => i.id === itemId);
                        if (!item) return null;
                        return (
                          <div key={itemId} className="flex justify-between text-sm">
                            <span className="text-slate-600">{quantity} × {item.name}</span>
                            <span className="font-medium text-slate-900">₹{item.price * quantity}</span>
                          </div>
                        );
                     })}
                     <div className="border-t border-slate-200 pt-3 flex justify-between font-black">
                       <span>Total Payable</span>
                       <span className="text-brand">₹{cartTotal + Math.round(cartTotal * 0.05)}</span>
                     </div>
                   </div>
                 </div>

                 <div>
                   <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-widest">Contact Info</h3>
                   <div className="space-y-4">
                     <input type="text" placeholder="Full Name" defaultValue={user?.displayName || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand/20 outline-none" />
                     <input type="tel" placeholder="Phone Number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand/20 outline-none" />
                   </div>
                 </div>

                 <button 
                   onClick={handleConfirmOrder}
                   className="w-full mt-4 bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold justify-center flex items-center gap-2 transition-all active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                 >
                   <CreditCard size={20} />
                   Place Takeaway Order
                 </button>
               </div>
             </div>
           </div>
        )}

        {step === 'success' && (
          <div className="max-w-md mx-auto text-center py-12">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 size={48} className="text-green-500" />
            </motion.div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Order Confirmed!</h2>
            <p className="text-slate-500 mb-8">Your takeaway order has been placed successfully. The restaurant will notify you when it's ready for pickup.</p>
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-left mb-8">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Order Summary</div>
               <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                 <div>
                   <div className="text-sm text-slate-500">Order ID</div>
                   <div className="font-bold text-slate-900">#BMT-{Math.floor(Math.random() * 1000000)}</div>
                 </div>
                 <div className="text-right">
                   <div className="text-sm text-slate-500">Total Paid</div>
                   <div className="font-bold text-brand">₹{cartTotal + Math.round(cartTotal * 0.05)}</div>
                 </div>
               </div>
               <div className="text-sm font-medium text-slate-700 flex items-start gap-3">
                 <Clock className="shrink-0 text-amber-500" size={20} />
                 <span>Estimated pickup time is approximately 30-45 minutes. Watch out for SMS updates.</span>
               </div>
            </div>

            <button 
              onClick={() => navigate(getRestaurantUrl(restaurant))}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
            >
              Back to Restaurant
            </button>
          </div>
        )}
      </div>

      {/* Mobile Cart Floating Bar */}
      <AnimatePresence>
        {step === 'menu' && cartItemsCount > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 pb-8"
          >
             <div className="flex items-center justify-between mb-4">
               <div>
                 <div className="font-bold text-slate-900">{cartItemsCount} item{cartItemsCount > 1 ? 's' : ''}</div>
                 <div className="text-brand font-black text-lg">Total ₹{cartTotal + Math.round(cartTotal * 0.05)}</div>
               </div>
               <button 
                 onClick={handleCheckout}
                 className="bg-brand text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
               >
                 Checkout <ChevronRight size={18} />
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
