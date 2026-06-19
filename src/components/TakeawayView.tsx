import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRestaurants } from "../hooks/useFirebase";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ArrowLeft,
  Clock,
  ShoppingBag,
  Plus,
  Minus,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Star,
  ChevronUp,
  ChevronDown,
  Menu as MenuIcon,
  UserCheck,
  Loader2,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, getRestaurantUrl, slugify } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { useMasterData } from "./MasterDataContext";

const DietaryIcon = ({ isVeg }: { isVeg?: boolean }) => {
  if (isVeg === undefined) return null;
  return isVeg ? (
    <div className="w-4 h-4 border border-green-600 flex items-center justify-center rounded-sm shrink-0">
      <div className="w-2 h-2 rounded-full bg-green-600" />
    </div>
  ) : (
    <div className="w-4 h-4 border border-red-600 flex items-center justify-center rounded-sm shrink-0">
      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-red-600" />
    </div>
  );
};

export default function TakeawayView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { restaurants, loading: restaurantsLoading } = useRestaurants(true);
  const { user, profile, signInWithGoogle } = useAuth();
  const { appSettings } = useMasterData();
  const [phoneInput, setPhoneInput] = useState("");

  const restaurant = React.useMemo(() => {
    if (!slug) return null;
    let found = restaurants.find((r) => r.id === slug);
    if (!found) {
      found = restaurants.find((r) => {
        const rNameSlug = slugify(r.name || "restaurant");
        const rLocSlug = slugify(r.location || "");
        const combined = rLocSlug ? `${rNameSlug}-${rLocSlug}` : rNameSlug;
        return combined === slug;
      });
    }
    return found;
  }, [slug, restaurants]);

  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [step, setStep] = useState<"menu" | "checkout" | "success">("menu");

  useEffect(() => {
    if (step === 'success') {
      window.scrollTo(0, 0);
    }
  }, [step]);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<"online" | "restaurant">(
    "online",
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  if (restaurantsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 border-t border-slate-300">
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
        <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">
          Restaurant not found
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-2 bg-brand text-white rounded-xl font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Format items with category and veg toggle where possible
  const liveMenu = (restaurant.liveMenu || []).map((item: any) => ({
    ...item,
    category: item.isAvailable
      ? item.category || "Recommended"
      : "Currently Unavailable for Order",
    isVeg:
      item.isVeg !== undefined
        ? item.isVeg
        : item.name.toLowerCase().includes("chicken") ||
            item.name.toLowerCase().includes("mutton")
          ? false
          : true,
  }));

  const cartTotal = Object.entries(cart).reduce((total, [itemId, quantity]) => {
    const item = liveMenu.find((i: any) => i.id === itemId);
    if (!item) return total;
    return total + item.price * quantity;
  }, 0);

  const updateCart = (itemId: string, increment: boolean) => {
    setCart((prev) => {
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
    setStep("checkout");
  };

  const handleConfirmOrder = async () => {
    const payableAmount =
      cartTotal +
      Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal) + (appSettings?.platformFee || 0);
    const orderId =
      "ORD_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const customerId = user?.uid || "CUST_GUEST";

    const items = Object.entries(cart).map(([itemId, qty]) => {
      const liveItem = restaurant.liveMenu?.find((i: any) => i.id === itemId);
      return {
        itemId,
        quantity: qty,
        name: liveItem?.name || 'Unknown Item',
        price: liveItem?.price || 0,
      };
    });

    const createOrderRecord = async (paymentStatus: string, txnId?: string) => {
      if (!user) return;
      try {
        const orderData = {
          orderId,
          restaurantId: restaurant.id,
          userId: user.uid,
          customerName: user.displayName || "Guest",
          customerPhone: profile?.phone || "",
          type: "takeaway",
          items,
          totalPrice: payableAmount,
          itemTotal: cartTotal,
          taxes: Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal),
          packaging: 0,
          platformFee: appSettings?.platformFee || 0,
          tokenNumber: orderId.substring(orderId.length - 4),
          discount: 0,
          paymentMethod,
          status: "Received",
          paymentStatus,
          txnId: txnId || "",
          createdAt: Date.now()
        };
        await addDoc(collection(db, "orders"), orderData);
        setCompletedOrder(orderData);
      } catch (e) {
        console.error("Error creating order record", e);
      }
    };

    if (paymentMethod === "online") {
      setIsProcessingPayment(true);

      try {
        const response = await fetch("/api/paytm/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: payableAmount,
            orderId: orderId,
            customerId: customerId,
          }),
        });

        const data = await response.json();

        if (data.error || !data.body || !data.body.txnToken) {
          alert(
            "Payment Initialization failed via Paytm: " +
              (data.error ||
                data.body?.resultInfo?.resultMsg ||
                "Unknown error"),
          );
          setIsProcessingPayment(false);
          return;
        }

        const txnToken = data.body.txnToken;
        const MID = import.meta.env.VITE_PAYTM_MID || "ZZUTMz05213521592016";

        const loadScript = () => {
          return new Promise((resolve) => {
            const scriptId = "paytm-checkout-script";
            if (document.getElementById(scriptId)) {
              return resolve(true); // already loaded
            }
            const script = document.createElement("script");
            script.id = scriptId;
            script.src = `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${MID}.js`;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const scriptLoaded = await loadScript();
        if (!scriptLoaded) {
          alert("Paytm SDK failed to load. Are you online?");
          setIsProcessingPayment(false);
          return;
        }

        const config = {
          root: "",
          flow: "DEFAULT",
          data: {
            orderId: orderId,
            token: txnToken,
            tokenType: "TXN_TOKEN",
            amount: String(payableAmount),
          },
          handler: {
            notifyMerchant: function (eventName: string, data: any) {
              console.log("Paytm notifyMerchant event:", eventName);
              if (eventName === "APP_CLOSED") {
                setIsProcessingPayment(false);
              }
            },
            transactionStatus: function (data: any) {
              console.log("Paytm transaction status payload: ", data);
              if (data && data.STATUS === "TXN_SUCCESS") {
                createOrderRecord("Success", data.TXNID).then(() => setStep("success"));
              } else {
                alert(
                  "Payment was not successful. Status: " +
                    (data.STATUS || "Failed"),
                );
                setIsProcessingPayment(false);
              }
              if ((window as any).Paytm && (window as any).Paytm.CheckoutJS) {
                (window as any).Paytm.CheckoutJS.close();
              }
            },
          },
        };

        if ((window as any).Paytm && (window as any).Paytm.CheckoutJS) {
          (window as any).Paytm.CheckoutJS.init(config)
            .then(function onSuccess() {
              (window as any).Paytm.CheckoutJS.invoke();
            })
            .catch(function onError(error: any) {
              console.log("Paytm error => ", error);
              setIsProcessingPayment(false);
              alert("Error in Paytm Checkout JS: " + error);
            });
        }
      } catch (e: any) {
        console.error(e);
        alert("Payment initialization error: " + e.message);
        setIsProcessingPayment(false);
      }
    } else {
      setIsProcessingPayment(true);
      await createOrderRecord("Pending");
      setIsProcessingPayment(false);
      setStep("success");
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const groupedMenu = liveMenu.reduce((acc: any, item: any) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 relative pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-300 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center h-16 md:h-20 px-4">
          {step === "menu" ? (
            <button
              onClick={() => navigate(getRestaurantUrl(restaurant))}
              className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft size={24} />
            </button>
          ) : step === "checkout" ? (
            <button
              onClick={() => setStep("menu")}
              className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft size={24} />
            </button>
          ) : (
            <button
              onClick={() => navigate(getRestaurantUrl(restaurant))}
              className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="flex-1 ml-2">
            <h1 className="text-lg sm:text-xl line-clamp-1 text-[#363636] font-normal leading-[1.2]">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <span className="truncate">{restaurant.location}</span>
              <span>•</span>
              <span className="font-medium text-brand">Online Order</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {step === "menu" && (
          <div className="flex flex-col md:flex-row gap-8 relative">
            <div className="flex-1 space-y-6 pb-24 md:pb-0">
              {liveMenu.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-300 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="text-slate-400" size={24} />
                  </div>
                  <h3 className="text-[#363636] font-normal leading-[1.2]">
                    No items available
                  </h3>
                  <p className="text-slate-500 text-sm mt-1 mb-4">
                    The restaurant has not added any menu items yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedMenu).map(
                    ([cat, items]: [string, any]) => {
                      const isCollapsed = collapsedCats.has(cat);
                      return (
                        <div
                          key={cat}
                          id={`cat-${cat.replace(/\s+/g, "-")}`}
                          className="bg-white scroll-mt-24"
                        >
                          <button
                            onClick={() => toggleCategory(cat)}
                            className="w-full flex items-center justify-between py-6 px-4 md:px-6 bg-white"
                          >
                            <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                              {cat} ({items.length})
                            </h2>
                            {isCollapsed ? (
                              <ChevronDown size={24} />
                            ) : (
                              <ChevronUp size={24} />
                            )}
                          </button>

                          <AnimatePresence initial={false}>
                            {!isCollapsed && (
                              <motion.div
                                initial="collapsed"
                                animate="open"
                                exit="collapsed"
                                variants={{
                                  open: { opacity: 1, height: "auto" },
                                  collapsed: { opacity: 0, height: 0 },
                                }}
                                transition={{
                                  duration: 0.3,
                                  ease: [0.04, 0.62, 0.23, 0.98],
                                }}
                                className="overflow-hidden"
                              >
                                <div className="divide-y divide-slate-100 border-b-8 border-slate-50 pb-8 px-4 md:px-6">
                                  {items.map((item: any) => (
                                    <div
                                      key={item.id}
                                      className={cn(
                                        "flex justify-between py-6 gap-4",
                                        !item.isAvailable &&
                                          "opacity-60 grayscale",
                                      )}
                                    >
                                      {/* Left: Info */}
                                      <div className="flex-1 flex flex-col justify-start max-w-[65%]">
                                        <div className="mb-2">
                                          <DietaryIcon isVeg={item.isVeg} />
                                        </div>
                                        <h3 className="md:text-lg text-[#363636] font-normal leading-[1.2]">
                                          {item.name}
                                        </h3>
                                        <div className="font-medium text-slate-700 mt-1">
                                          ₹{item.price}
                                        </div>
                                        {item.rating && (
                                          <div className="flex items-center text-sm font-bold mt-1.5">
                                            <Star
                                              className="text-green-600 fill-green-600 mr-1"
                                              size={14}
                                            />
                                            <span className="text-green-600">
                                              {item.rating}
                                            </span>
                                            <span className="text-slate-500 ml-1 font-medium text-xs">
                                              ({item.ratingCount || 0})
                                            </span>
                                          </div>
                                        )}
                                        {item.description && (
                                          <p className="text-slate-500 text-sm mt-3 line-clamp-2 md:line-clamp-3 leading-relaxed">
                                            {item.description}
                                          </p>
                                        )}
                                      </div>

                                      {/* Right: Image & Button Box */}
                                      <div className="relative w-32 md:w-36 shrink-0 flex flex-col items-center">
                                        {item.image ? (
                                          <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-32 md:h-36 object-cover rounded-2xl shadow-sm"
                                          />
                                        ) : (
                                          <div className="w-full h-32 md:h-36 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                                            <ShoppingBag
                                              size={24}
                                              className="text-slate-300"
                                            />
                                          </div>
                                        )}

                                        {item.isAvailable && (
                                          <div className="absolute -bottom-4 w-28 md:w-32 z-10 drop-shadow-md">
                                            <div
                                              className={cn(
                                                "bg-white rounded-lg border border-slate-300 overflow-hidden font-bold transition-all",
                                                cart[item.id]
                                                  ? "text-brand"
                                                  : "text-green-600",
                                              )}
                                            >
                                              {cart[item.id] ? (
                                                <div className="flex items-center justify-between h-[36px] bg-white">
                                                  <button
                                                    onClick={() =>
                                                      updateCart(item.id, false)
                                                    }
                                                    className="w-1/3 h-full flex items-center justify-center active:bg-slate-50 hover:bg-slate-50 text-slate-500 hover:text-brand"
                                                  >
                                                    <Minus size={16} />
                                                  </button>
                                                  <span className="text-sm font-normal text-[#363636] leading-[1.2]">
                                                    {cart[item.id]}
                                                  </span>
                                                  <button
                                                    onClick={() =>
                                                      updateCart(item.id, true)
                                                    }
                                                    className="w-1/3 h-full flex items-center justify-center active:bg-slate-50 hover:bg-slate-50 text-slate-500 hover:text-brand"
                                                  >
                                                    <Plus size={16} />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() =>
                                                    updateCart(item.id, true)
                                                  }
                                                  className="w-full h-[36px] bg-white text-brand tracking-widest text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors uppercase flex items-center justify-center gap-1"
                                                >
                                                  ADD
                                                  {!cart[item.id] && (
                                                    <Plus
                                                      size={14}
                                                      className="opacity-50"
                                                    />
                                                  )}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            {/* Cart Summary Sidebar */}
            <div className="hidden md:block w-80 shrink-0">
              <div className="sticky top-[104px]">
                <div className="bg-white rounded-3xl p-6 border border-slate-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <h3 className="text-lg mb-6 flex items-center gap-2 text-[#363636] font-normal leading-[1.2]">
                    <ShoppingBag size={20} className="text-brand" />
                    Your Cart
                  </h3>

                  {cartItemsCount === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-slate-400 text-sm">Cart is empty</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Add items to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {Object.entries(cart).map(([itemId, quantity]) => {
                          const item = liveMenu.find(
                            (i: any) => i.id === itemId,
                          );
                          if (!item) return null;
                          return (
                            <div
                              key={itemId}
                              className="flex justify-between items-start gap-4"
                            >
                              <div className="flex-1">
                                <div className="font-normal text-[#363636] leading-[1.2] text-sm leading-tight flex items-start gap-2">
                                  <div className="shrink-0 w-4 h-4 mt-0.5 border-2 border-brand flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-brand" />
                                  </div>
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 pl-6">
                                  ₹{item.price} × {quantity}
                                </div>
                              </div>
                              <div className="font-normal text-[#363636] leading-[1.2]">
                                ₹{item.price * quantity}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-300 pt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-500">
                          <span>Item Total</span>
                          <span>₹{cartTotal}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>GST ({restaurant.gstPercentage || 5}%)</span>
                          <span>
                            ₹
                            {Math.round(
                              cartTotal *
                                ((restaurant.gstPercentage || 5) / 100),
                            )}
                          </span>
                        </div>
                        {(appSettings?.platformFee || 0) > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>Platform Fee</span>
                            <span>₹{appSettings?.platformFee}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-normal text-[#363636] leading-[1.2] text-lg pt-2 mt-2 border-t border-slate-300">
                          <span>To Pay</span>
                          <span>
                            ₹
                            {cartTotal + Math.round(cartTotal * ((restaurant.gstPercentage || 5) / 100)) + (appSettings?.platformFee || 0)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleCheckout}
                        className="w-full mt-4 bg-brand text-white py-4 rounded-xl font-bold flex items-center justify-between px-6 hover:bg-[#ff0040] transition-colors active:scale-95 shadow-sm"
                      >
                        <span>Checkout</span>
                        <div className="flex items-center gap-1">
                          <span>
                            ₹
                            {cartTotal + Math.round(cartTotal * ((restaurant.gstPercentage || 5) / 100)) + (appSettings?.platformFee || 0)}
                          </span>
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

        {step === "checkout" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-300 shadow-sm">
              <h2 className="text-2xl mb-6 text-[#363636] font-normal leading-[1.2]">
                Checkout
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">
                    Order Details
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                    {Object.entries(cart).map(([itemId, quantity]) => {
                      const item = liveMenu.find((i: any) => i.id === itemId);
                      if (!item) return null;
                      return (
                        <div
                          key={itemId}
                          className="flex justify-between items-start gap-4"
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <div className="mt-1">
                              <DietaryIcon isVeg={item.isVeg} />
                            </div>
                            <div>
                              <div className="font-normal text-[#363636] leading-[1.2] text-sm">
                                {item.name}
                              </div>
                              <div className="font-medium text-slate-500 text-sm">
                                ₹{item.price}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden h-8 shadow-sm">
                              <button
                                onClick={() => updateCart(itemId, false)}
                                className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-brand"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center text-sm font-normal text-[#363636] leading-[1.2]">
                                {quantity}
                              </span>
                              <button
                                onClick={() => updateCart(itemId, true)}
                                className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-brand"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="font-normal text-[#363636] leading-[1.2] text-sm">
                              ₹{item.price * quantity}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="border-t border-slate-300 pt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Item Total</span>
                        <span className="font-medium text-[#363636]">
                          ₹{cartTotal}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST ({restaurant.gstPercentage || 5}%)</span>
                        <span className="font-medium text-[#363636]">
                          ₹
                          {Math.round(
                            ((restaurant.gstPercentage || 5) / 100) * cartTotal,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Platform Fee</span>
                        <span className="font-medium text-[#363636]">₹20</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-300 pt-4 flex justify-between font-black text-lg">
                      <span>To Pay</span>
                      <span className="text-brand">
                        ₹
                        {cartTotal + Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal) + 20 + (appSettings?.platformFee || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {!user || !profile?.phone ? (
                  <div className="bg-brand/5 border border-brand/20 p-6 rounded-2xl text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <UserCheck className="text-brand" size={24} />
                    </div>
                    <div>
                      <h3 className="text-brand font-normal leading-[1.2]">
                        {!user ? "Login Required" : "Contact Details Required"}
                      </h3>
                      <p className="text-sm text-brand/80 mt-1">
                        Please provide your details to place order
                      </p>
                    </div>
                    {!user ? (
                      <button
                        onClick={signInWithGoogle}
                        className="w-full bg-brand text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
                      >
                        Login to Proceed
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="Enter Phone Number"
                          className="flex-1 px-4 py-3 bg-white border border-brand/20 outline-none focus:border-brand rounded-xl font-medium"
                        />
                        <button
                          onClick={async () => {
                            if (
                              phoneInput &&
                              phoneInput.length >= 10 &&
                              user.uid
                            ) {
                              await updateDoc(doc(db, "users", user.uid), {
                                phone: phoneInput,
                              });
                            }
                          }}
                          className="bg-brand text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="mb-3 text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">
                      Payment Method
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex-1 flex items-center gap-3 p-4 border border-slate-300 rounded-xl cursor-pointer hover:border-brand/50 transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                        <input
                          type="radio"
                          name="payment_method"
                          value="online"
                          checked={paymentMethod === "online"}
                          onChange={() => setPaymentMethod("online")}
                          className="hidden"
                        />
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand opacity-0 transition-opacity"></div>
                        </div>
                        <span className="font-normal text-[#363636] leading-[1.2]">
                          Pay Online
                        </span>
                      </label>
                      <label className="flex-1 flex items-center gap-3 p-4 border border-slate-300 rounded-xl cursor-pointer hover:border-brand/50 transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                        <input
                          type="radio"
                          name="payment_method"
                          value="restaurant"
                          checked={paymentMethod === "restaurant"}
                          onChange={() => setPaymentMethod("restaurant")}
                          className="hidden"
                        />
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand opacity-0 transition-opacity"></div>
                        </div>
                        <span className="font-normal text-[#363636] leading-[1.2]">
                          Pay at Restaurant
                        </span>
                      </label>
                    </div>

                    <style
                      dangerouslySetInnerHTML={{
                        __html: `
                       input[type="radio"]:checked + div { border-color: var(--brand, #ff3366); }
                       input[type="radio"]:checked + div > div { opacity: 1; }
                     `,
                      }}
                    />

                    <button
                      onClick={handleConfirmOrder}
                      disabled={isProcessingPayment}
                      className="w-full mt-2 bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold justify-center flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-70 disabled:pointer-events-none"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <CreditCard size={20} />
                          {paymentMethod === "online"
                            ? "Proceed to Pay"
                            : "Place Order"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="max-w-md mx-auto text-left md:text-center pt-0 md:pt-12 pb-0 md:pb-12 px-0 md:px-4 md:bg-transparent min-h-screen md:min-h-0 bg-white md:bg-slate-50">
            <div className="hidden md:block">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 size={48} className="text-green-500" />
              </motion.div>
              <h2 className="text-3xl mb-2 text-[#363636] font-normal leading-[1.2]">
                Order Confirmed!
              </h2>
              <p className="text-slate-500 mb-8">
                Your order has been placed successfully. The restaurant
                will notify you when it's ready for pickup.
                {paymentMethod === "restaurant" &&
                  " Please pay at the restaurant upon collection."}
              </p>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center p-4 border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
               <span className="font-bold text-[#363636] font-mono text-lg">Order #{completedOrder?.orderId || "..."}</span>
            </div>
            
            {/* Mobile Title */}
            <div className="md:hidden flex items-center gap-2 p-4 pb-0 mb-4">
               <div className="w-2 h-2 rounded-full bg-slate-400"></div>
               <span className="text-sm font-medium text-slate-500">Takeaway Order</span>
            </div>

            <div className="bg-white rounded-none md:rounded-[24px] border-y md:border border-slate-200 md:shadow-sm text-left mb-8 md:overflow-hidden shadow-none md:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
               
              <div className="p-5 md:p-6 pb-4 border-b border-dashed border-slate-200">
                <div className="flex justify-between items-start mb-6">
                   <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Token Number
                     </div>
                     <div className="text-4xl font-black text-[#363636]">{completedOrder?.tokenNumber || "..."}</div>
                   </div>
                   <div className="text-right">
                      {paymentMethod === "restaurant" ? (
                        <>
                          <div className="inline-block px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded mb-1">
                            Payment Pending
                          </div>
                          <div className="font-bold text-[#363636] text-xl">
                            ₹{completedOrder?.totalPrice || cartTotal}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="inline-block px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded mb-1">
                            Paid via Online
                          </div>
                          <div className="font-bold text-[#363636] text-xl">
                            ₹{completedOrder?.totalPrice || cartTotal}
                          </div>
                        </>
                      )}
                   </div>
                </div>

                <div className="hidden md:block">
                   <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-widest">Order ID</div>
                   <div className="text-sm font-medium text-[#363636]">{completedOrder?.orderId || "..."}</div>
                </div>
              </div>

              {/* Items List */}
              <div className="p-5 md:p-6 border-b border-slate-100">
                <div className="space-y-4">
                  {(completedOrder?.items || Object.entries(cart).map(([id, q]) => ({ name: restaurant.liveMenu?.find((i:any)=>i.id===id)?.name, price: restaurant.liveMenu?.find((i:any)=>i.id===id)?.price, quantity: q }))).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1 w-3.5 h-3.5 rounded border border-green-500 flex items-center justify-center shrink-0 bg-green-50/50">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        </div>
                        <div>
                          <div className="font-medium text-[#363636] text-sm line-clamp-2">{item.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{item.quantity} x ₹{item.price}</div>
                        </div>
                      </div>
                      <div className="font-medium text-[#363636] text-sm shrink-0">₹{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="text-sm font-bold text-[#363636] mb-4">Order Summary</div>
                <div className="space-y-3 text-sm text-slate-500">
                  <div className="flex justify-between">
                    <span>Item Sub Total</span>
                    <span className="font-medium text-[#363636]">₹{(completedOrder?.itemTotal || cartTotal).toFixed(2)}</span>
                  </div>
                  {((restaurant.gstPercentage || 5) > 0) && (
                    <div className="flex justify-between">
                      <span>Taxes ({restaurant.gstPercentage || 5}%)</span>
                      <span className="font-medium text-[#363636]">₹{(completedOrder?.taxes || Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal)).toFixed(2)}</span>
                    </div>
                  )}
                  {(completedOrder?.platformFee || appSettings?.platformFee) ? (
                    <div className="flex justify-between">
                      <span>Platform Fee</span>
                      <span className="font-medium text-[#363636]">₹{(completedOrder?.platformFee || appSettings?.platformFee).toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between pt-3 border-t border-slate-200 font-bold text-[#363636] text-base">
                    <span>Total Payable Amount</span>
                    <span>₹{(completedOrder?.totalPrice || cartTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Tracker */}
              <div className="p-5 md:p-6 bg-slate-50/30">
                <div className="relative pl-6 space-y-7">
                  {/* Line */}
                  <div className="absolute left-[11px] top-2 bottom-6 w-px bg-slate-200 border-l border-dashed border-slate-300"></div>
                  
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-[30px] bg-white w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center z-10 box-content">
                       <CheckCircle2 size={12} className="text-green-500" />
                    </div>
                    <div className="font-medium text-sm text-[#363636]">Order Created</div>
                    <div className="text-xs text-slate-500 mt-0.5">Waiting for Confirmation</div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-[30px] bg-white w-5 h-5 rounded-full border-2 border-brand flex items-center justify-center z-10 box-content text-brand">
                       <Clock size={12} strokeWidth={3} />
                    </div>
                    <div className="font-medium text-sm text-[#363636]">Order Confirmed</div>
                    <div className="text-xs text-brand/80 mt-0.5">Order is being prepared.</div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute -left-[30px] bg-white w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center z-10 box-content text-slate-300">
                       <ShoppingBag size={12} />
                    </div>
                    <div className="font-medium text-sm text-slate-400">Order Ready</div>
                    <div className="text-xs text-slate-400 mt-0.5">Ready for pickup.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <button
                onClick={() => navigate(getRestaurantUrl(restaurant))}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
              >
                Back to Restaurant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cart / Menu Fab */}
      <AnimatePresence>
        {step === "menu" && (
          <div
            className={cn(
              "md:hidden fixed right-6 z-[55] flex flex-col items-end gap-3 transition-all duration-300",
              cartItemsCount > 0 ? "bottom-24" : "bottom-6",
            )}
          >
            {Object.keys(groupedMenu).length > 0 && (
              <button
                onClick={() => {
                  const el = document.getElementById(
                    `cat-${Object.keys(groupedMenu)[0].replace(/\s+/g, "-")}`,
                  );
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-16 h-16 bg-slate-900 text-white rounded-full flex flex-col items-center justify-center gap-1 shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <MenuIcon size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Menu
                </span>
              </button>
            )}
          </div>
        )}

        {step === "menu" && cartItemsCount > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-brand text-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-4 pb-8"
          >
            <div className="flex items-center justify-between mx-auto max-w-sm">
              <div>
                <div className="font-bold text-sm">
                  {cartItemsCount} item{cartItemsCount > 1 ? "s" : ""} added
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="text-white font-bold flex items-center gap-2 active:scale-95 transition-transform"
              >
                VIEW CART <ShoppingBag size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
