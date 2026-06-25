import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, getRestaurantUrl, slugify } from "../lib/utils";
import { ExpandableText } from "./ExpandableText";
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

export interface CartItem {
  cartItemId: string;
  itemId: string;
  quantity: number;
  customizations: { categoryName: string, optionName: string, price: number }[];
}

export default function QrMenuView() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '';
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

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customizationModalItem, setCustomizationModalItem] = useState<any>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<{[cat: string]: string[]}>({});
  const [customizationError, setCustomizationError] = useState<string | null>(null);
  const [step, setStep] = useState<"menu" | "checkout" | "success">("menu");
  const [isVegFilter, setIsVegFilter] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

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

  const cartTotal = cart.reduce((total, cartItem) => {
    const item = liveMenu.find((i: any) => i.id === cartItem.itemId);
    if (!item || item.isAvailable === false) return total;
    const itemPrice = item.price + cartItem.customizations.reduce((sum, c) => sum + c.price, 0);
    return total + itemPrice * cartItem.quantity;
  }, 0);

  const getCartQuantityForItem = (itemId: string) => cart.filter(c => c.itemId === itemId).reduce((sum, c) => sum + c.quantity, 0);

  const updateCart = (itemId: string, increment: boolean, customizations: any[] = [], cartItemId?: string) => {
    setCart((prev) => {
      const updated = [...prev];
      if (cartItemId) {
        // Find specific cart item
        const idx = updated.findIndex(c => c.cartItemId === cartItemId);
        if (idx !== -1) {
          if (increment) {
            updated[idx].quantity += 1;
          } else {
            if (updated[idx].quantity > 1) {
              updated[idx].quantity -= 1;
            } else {
              updated.splice(idx, 1);
            }
          }
        }
      } else {
        // No cartItemId provided, try to find an existing identical cart item
        const existingIdx = updated.findIndex(c => c.itemId === itemId && JSON.stringify(c.customizations) === JSON.stringify(customizations));
        if (existingIdx !== -1) {
          if (increment) {
            updated[existingIdx].quantity += 1;
          } else {
            if (updated[existingIdx].quantity > 1) {
              updated[existingIdx].quantity -= 1;
            } else {
              updated.splice(existingIdx, 1);
            }
          }
        } else if (increment) {
          updated.push({
            cartItemId: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            itemId,
            quantity: 1,
            customizations
          });
        }
      }
      return updated;
    });
  };

  const replaceCartItemCustomizations = (cartItemId: string, newCustomizations: any[]) => {
    setCart(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(c => c.cartItemId === cartItemId);
      if (idx !== -1) {
        updated[idx].customizations = newCustomizations;
        // merge if another identical item exists
        const existingIdx = updated.findIndex((c, i) => i !== idx && c.itemId === updated[idx].itemId && JSON.stringify(c.customizations) === JSON.stringify(newCustomizations));
        if (existingIdx !== -1) {
          updated[existingIdx].quantity += updated[idx].quantity;
          updated.splice(idx, 1);
        }
      }
      return updated;
    });
  };

  const cartItemsCount = cart.reduce((total, cartItem) => total + cartItem.quantity, 0);

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

    const items = cart
      .filter(cartItem => {
        const liveItem = restaurant.liveMenu?.find((i: any) => i.id === cartItem.itemId);
        return liveItem && liveItem.isAvailable !== false;
      })
      .map((cartItem) => {
      const liveItem = restaurant.liveMenu?.find((i: any) => i.id === cartItem.itemId);
      const customPrice = cartItem.customizations.reduce((s, c) => s + c.price, 0);
      return {
        itemId: cartItem.itemId,
        quantity: cartItem.quantity,
        name: liveItem?.name || 'Unknown Item',
        price: (liveItem?.price || 0) + customPrice,
        customizations: cartItem.customizations
      };
    });

    if (items.length === 0) {
      alert("No available items in cart to order.");
      return;
    }

    const createOrderRecord = async (paymentStatus: string, txnId?: string) => {
      if (!user) return;
      try {
        const orderData = {
          orderId,
          restaurantId: restaurant.id,
          userId: user.uid,
          customerName: user.displayName || "Guest",
          customerPhone: profile?.phone || "",
          type: "dine_in",
          tableNumber: tableNumber || "Unknown",
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
    if (isVegFilter && !item.isVeg) return acc;
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  Object.keys(groupedMenu).forEach(cat => {
    groupedMenu[cat].sort((a: any, b: any) => {
      if (a.isAvailable === false && b.isAvailable !== false) return 1;
      if (a.isAvailable !== false && b.isAvailable === false) return -1;
      return 0;
    });
  });

  const sortedGroupedMenuEntries = Object.entries(groupedMenu).sort(([catA], [catB]) => {
    if (catA === "Currently Unavailable for Order") return 1;
    if (catB === "Currently Unavailable for Order") return -1;
    return 0;
  });

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
              
              {liveMenu.length > 0 && (
                <div className="bg-slate-50 md:bg-transparent sticky top-[64px] md:top-[80px] z-40 py-3 md:py-0 border-b border-slate-200 md:border-none flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                  <button
                    onClick={() => setIsVegFilter(!isVegFilter)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors shadow-sm",
                      isVegFilter
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="w-4 h-4 rounded-sm border border-green-600 flex items-center justify-center bg-white shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="font-bold text-sm">Veg</span>
                  </button>
                </div>
              )}

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
                  {sortedGroupedMenuEntries.map(
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
                                  {items.map((item: any, idx: number) => (
                                    <div
                                      key={`${item.id}-${idx}`}
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
                                          <ExpandableText text={item.description} />
                                        )}
                                      </div>

                                      {/* Right: Image & Button Box */}
                                      <div className={cn("shrink-0 flex flex-col items-center", item.image ? "w-32 md:w-36" : "w-28 md:w-32 justify-end")}>
                                        <div className={cn("relative w-full flex flex-col items-center", item.image && "mb-8")}>
                                          {item.image && (
                                            <div className="w-full h-32 md:h-36">
                                              <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover rounded-2xl shadow-sm block"
                                              />
                                            </div>
                                          )}

                                          {item.isAvailable && (
                                            <div className={cn("w-28 md:w-32 z-10 flex flex-col items-center", item.image ? "absolute left-1/2 -translate-x-1/2 top-full -mt-[18px]" : "mt-2")}>
                                            <div
                                              className={cn(
                                                "bg-white rounded-lg border border-slate-300 overflow-hidden font-bold transition-all w-full",
                                                getCartQuantityForItem(item.id) > 0
                                                  ? "text-brand"
                                                  : "text-green-600",
                                              )}
                                            >
                                              {getCartQuantityForItem(item.id) > 0 ? (
                                                <div className="flex items-center justify-between h-[36px] bg-white">
                                                  <button
                                                    onClick={() => {
                                                      const cartItem = cart.find(c => c.itemId === item.id);
                                                      if (cartItem) {
                                                        if (item.customizations?.length) {
                                                          // For complex items, remove the first found variation
                                                          updateCart(item.id, false, cartItem.customizations, cartItem.cartItemId);
                                                        } else {
                                                          updateCart(item.id, false, cartItem.customizations, cartItem.cartItemId);
                                                        }
                                                      }
                                                    }}
                                                    className="w-1/3 h-full flex items-center justify-center active:bg-slate-50 hover:bg-slate-50 text-slate-500 hover:text-brand"
                                                  >
                                                    <Minus size={16} />
                                                  </button>
                                                  <span className="text-sm font-normal text-[#363636] leading-[1.2]">
                                                    {getCartQuantityForItem(item.id)}
                                                  </span>
                                                  <button
                                                    onClick={() => {
                                                      if (item.customizations?.length) {
                                                        setCustomizationModalItem(item);
                                                        setSelectedCustomizations({});
                                                      } else {
                                                        updateCart(item.id, true);
                                                      }
                                                    }}
                                                    className="w-1/3 h-full flex items-center justify-center active:bg-slate-50 hover:bg-slate-50 text-slate-500 hover:text-brand"
                                                  >
                                                    <Plus size={16} />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    if (item.customizations?.length) {
                                                      setCustomizationModalItem(item);
                                                      setSelectedCustomizations({});
                                                    } else {
                                                      updateCart(item.id, true);
                                                    }
                                                  }}
                                                  className="w-full h-[36px] bg-white text-brand tracking-widest text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors uppercase flex items-center justify-center gap-1"
                                                >
                                                  ADD
                                                  <Plus size={14} className="opacity-50" />
                                                </button>
                                              )}
                                            </div>
                                            {item.customizations?.length ? (
                                              <div className="text-[10px] text-slate-500 mt-1 font-medium bg-white/90 px-2 rounded-full border border-slate-200">Customisable</div>
                                            ) : null}
                                          </div>
                                        )}
                                        </div>
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
            <div className="hidden md:block w-80 shrink-0 sticky top-[104px] self-start">
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
                        {cart.map((cartItem) => {
                          const item = liveMenu.find(
                            (i: any) => i.id === cartItem.itemId,
                          );
                          if (!item) return null;
                          const customPrice = cartItem.customizations.reduce((s, c) => s + c.price, 0);
                          const itemPrice = item.price + customPrice;
                          const isOutOfStock = item.isAvailable === false;
                          return (
                            <div
                              key={cartItem.cartItemId}
                              className={cn("flex justify-between items-start gap-4", isOutOfStock && "opacity-50 grayscale")}
                            >
                              <div className="flex-1">
                                <div className="font-normal text-[#363636] leading-[1.2] text-sm leading-tight flex items-start gap-2">
                                  <div className="shrink-0 w-4 h-4 mt-0.5 border-2 border-brand flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-brand" />
                                  </div>
                                  <div>
                                    {item.name}
                                    {isOutOfStock && <span className="ml-2 text-xs font-bold text-red-500 whitespace-nowrap">Out of stock</span>}
                                    {cartItem.customizations?.length > 0 && (
                                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                                        {cartItem.customizations.map(c => c.optionName).join(', ')}
                                      </div>
                                    )}
                                    {item.customizations?.length > 0 && !isOutOfStock && (
                                      <button
                                        onClick={() => {
                                          setCustomizationModalItem(item);
                                          setEditingCartItemId(cartItem.cartItemId);
                                          // pre-select existing customizations
                                          const preSelected: {[cat: string]: string[]} = {};
                                          cartItem.customizations.forEach(c => {
                                            if (!preSelected[c.categoryName]) preSelected[c.categoryName] = [];
                                            preSelected[c.categoryName].push(c.optionName);
                                          });
                                          setSelectedCustomizations(preSelected);
                                        }}
                                        className="text-xs font-semibold text-brand mt-1 hover:underline text-left block"
                                      >
                                        Edit Customisation
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 pl-6">
                                  ₹{itemPrice} × {cartItem.quantity}
                                </div>
                              </div>
                              <div className="font-normal text-[#363636] leading-[1.2]">
                                {isOutOfStock ? <span className="line-through text-slate-400">₹{itemPrice * cartItem.quantity}</span> : `₹${itemPrice * cartItem.quantity}`}
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
                    {cart.map((cartItem) => {
                      const item = liveMenu.find((i: any) => i.id === cartItem.itemId);
                      if (!item) return null;
                      const customPrice = cartItem.customizations.reduce((s, c) => s + c.price, 0);
                      const itemPrice = item.price + customPrice;
                      const isOutOfStock = item.isAvailable === false;
                      return (
                        <div
                          key={cartItem.cartItemId}
                          className={cn("flex justify-between items-start gap-4", isOutOfStock && "opacity-50 grayscale")}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <div className="mt-1">
                              <DietaryIcon isVeg={item.isVeg} />
                            </div>
                            <div>
                              <div className="font-normal text-[#363636] leading-[1.2] text-sm">
                                {item.name}
                                {isOutOfStock && <span className="ml-2 text-xs font-bold text-red-500 whitespace-nowrap">Out of stock</span>}
                              </div>
                              {cartItem.customizations?.length > 0 && (
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {cartItem.customizations.map(c => c.optionName).join(', ')}
                                </div>
                              )}
                              {item.customizations?.length > 0 && !isOutOfStock && (
                                <button
                                  onClick={() => {
                                    setCustomizationModalItem(item);
                                    setEditingCartItemId(cartItem.cartItemId);
                                    const preSelected: {[cat: string]: string[]} = {};
                                    cartItem.customizations.forEach(c => {
                                      if (!preSelected[c.categoryName]) preSelected[c.categoryName] = [];
                                      preSelected[c.categoryName].push(c.optionName);
                                    });
                                    setSelectedCustomizations(preSelected);
                                  }}
                                  className="text-xs font-semibold text-brand mt-0.5 hover:underline text-left block"
                                >
                                  Edit Customisation
                                </button>
                              )}
                              <div className="font-medium text-slate-500 text-sm mt-1">
                                {isOutOfStock ? <span className="line-through text-slate-400">₹{itemPrice}</span> : `₹${itemPrice}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden h-8 shadow-sm">
                              <button
                                onClick={() => updateCart(item.id, false, cartItem.customizations, cartItem.cartItemId)}
                                className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-brand"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center text-sm font-normal text-[#363636] leading-[1.2]">
                                {cartItem.quantity}
                              </span>
                              <button
                                onClick={() => updateCart(item.id, true, cartItem.customizations, cartItem.cartItemId)}
                                className={cn("w-8 h-full flex items-center justify-center hover:bg-slate-50 text-brand", isOutOfStock && "pointer-events-none opacity-50")}
                                disabled={isOutOfStock}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="font-normal text-[#363636] leading-[1.2] text-sm">
                              {isOutOfStock ? <span className="line-through text-slate-400">₹{itemPrice * cartItem.quantity}</span> : `₹${itemPrice * cartItem.quantity}`}
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
                  " Please wait at your table."}
              </p>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center p-4 border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
               <span className="font-bold text-[#363636] font-mono text-lg">Order #{completedOrder?.orderId || "..."}</span>
            </div>
            
            {/* Mobile Title */}
            <div className="md:hidden flex items-center gap-2 p-4 pb-0 mb-4">
               <div className="w-2 h-2 rounded-full bg-slate-400"></div>
               <span className="text-sm font-medium text-slate-500">Dine In Order</span>
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
                  {(completedOrder?.items || cart.map((c) => {
                    const i = restaurant.liveMenu?.find((m:any)=>m.id===c.itemId);
                    return { 
                      name: i?.name, 
                      price: (i?.price || 0) + c.customizations.reduce((s, cust) => s + cust.price, 0), 
                      quantity: c.quantity,
                      customizations: c.customizations
                    };
                  })).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1 w-3.5 h-3.5 rounded border border-green-500 flex items-center justify-center shrink-0 bg-green-50/50">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        </div>
                        <div>
                          <div className="font-medium text-[#363636] text-sm line-clamp-2">{item.name}</div>
                          {item.customizations?.length > 0 && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {item.customizations.map((c:any) => c.optionName).join(', ')}
                            </div>
                          )}
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
              "fixed right-6 z-[55] flex flex-col items-end gap-3 transition-all duration-300",
              cartItemsCount > 0 ? "bottom-24 md:bottom-10" : "bottom-6 md:bottom-10",
            )}
          >
            {Object.keys(groupedMenu).length > 0 && (
              <button
                onClick={() => setIsMenuModalOpen(true)}
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

      <AnimatePresence>
        {customizationModalItem && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              className="bg-white md:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] min-h-[50vh]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Customise as per your taste</h3>
                  <p className="text-sm text-slate-500 mt-1">{customizationModalItem.name} • ₹{customizationModalItem.price}</p>
                </div>
                <button 
                  onClick={() => {
                    setCustomizationModalItem(null);
                    setEditingCartItemId(null);
                  }} 
                  className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                {customizationModalItem.customizations?.map((cat: any, catIdx: number) => {
                  const selectedCount = selectedCustomizations[cat.name]?.length || 0;
                  return (
                    <div key={`${cat.id || cat.name}-${catIdx}`} className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-slate-800 text-lg">{cat.name}</h4>
                        <span className="text-xs font-medium text-slate-500">
                          ({selectedCount}/{cat.maxSelections || cat.options.length})
                          {cat.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {cat.options.map((opt: any, optIdx: number) => {
                          const isSelected = selectedCustomizations[cat.name]?.includes(opt.name);
                          const isAvailable = opt.isAvailable !== false;
                          return (
                            <label key={optIdx} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isAvailable ? 'border-slate-200 hover:border-slate-300 cursor-pointer bg-white' : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'}`}>
                              <div className="flex items-center gap-3">
                                <DietaryIcon isVeg={opt.isVeg !== false} />
                                <span className={`font-medium text-sm ${isAvailable ? 'text-slate-700' : 'text-slate-500 line-through'}`}>{opt.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {isAvailable ? (
                                  <>
                                    <span className="text-sm font-medium text-slate-500">+{opt.price > 0 ? `₹${opt.price}` : 'Free'}</span>
                                    <input 
                                      type="checkbox" 
                                      className="w-5 h-5 rounded border-slate-300 text-brand focus:ring-brand accent-brand cursor-pointer"
                                      checked={!!isSelected}
                                      onChange={(e) => {
                                        const catSelections = selectedCustomizations[cat.name] || [];
                                        if (e.target.checked) {
                                          if (cat.maxSelections && catSelections.length >= cat.maxSelections) {
                                            setCustomizationError(`You can select a maximum of ${cat.maxSelections} ${cat.name}.`);
                                            setTimeout(() => setCustomizationError(null), 3000);
                                            return;
                                          }
                                          setSelectedCustomizations({
                                            ...selectedCustomizations,
                                            [cat.name]: [...catSelections, opt.name]
                                          });
                                        } else {
                                          setSelectedCustomizations({
                                            ...selectedCustomizations,
                                            [cat.name]: catSelections.filter(n => n !== opt.name)
                                          });
                                        }
                                      }}
                                    />
                                  </>
                                ) : (
                                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Out of stock</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 md:p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10 shrink-0">
                <AnimatePresence>
                  {customizationError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none px-4"
                    >
                      <div className="bg-slate-800 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-xl flex items-center justify-center">
                        {customizationError}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  onClick={() => {
                    // Validation
                    const missingRequired = customizationModalItem.customizations?.find((c: any) => c.required && (!selectedCustomizations[c.name] || selectedCustomizations[c.name].length === 0));
                    if (missingRequired) {
                      // Just show a native alert for simplicity
                      alert(`Please select at least one option for ${missingRequired.name}`);
                      return;
                    }

                    // Format selected customizations for the cart
                    const customizationsToAdd: any[] = [];
                    customizationModalItem.customizations?.forEach((cat: any) => {
                      const selectedNames = selectedCustomizations[cat.name] || [];
                      selectedNames.forEach(name => {
                        const opt = cat.options.find((o: any) => o.name === name);
                        if (opt) {
                          customizationsToAdd.push({
                            categoryName: cat.name,
                            optionName: opt.name,
                            price: opt.price
                          });
                        }
                      });
                    });

                    if (editingCartItemId) {
                      replaceCartItemCustomizations(editingCartItemId, customizationsToAdd);
                    } else {
                      updateCart(customizationModalItem.id, true, customizationsToAdd);
                    }
                    setCustomizationModalItem(null);
                    setEditingCartItemId(null);
                    setSelectedCustomizations({});
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-95"
                >
                  {editingCartItemId ? 'Update Customisation' : 'Add Item to Cart'} • ₹{customizationModalItem.price + (customizationModalItem.customizations?.reduce((total: number, cat: any) => {
                    const selected = selectedCustomizations[cat.name] || [];
                    return total + selected.reduce((catTotal: number, name: string) => {
                      const opt = cat.options.find((o:any) => o.name === name);
                      return catTotal + (opt?.price || 0);
                    }, 0);
                  }, 0) || 0)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex flex-col justify-end p-0 md:items-center md:justify-center md:p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-[#1a1a2e] text-white w-full max-w-sm md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col pb-6 max-h-[70vh]"
            >
              <div className="flex justify-end p-4">
                <button
                  onClick={() => setIsMenuModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto px-6 pb-6 custom-scrollbar space-y-4">
                {sortedGroupedMenuEntries.map(([cat, items]: [string, any]) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setIsMenuModalOpen(false);
                      const el = document.getElementById(`cat-${cat.replace(/\s+/g, "-")}`);
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 130;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }}
                    className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="font-medium text-lg">{cat}</span>
                    <span className="text-white/60 font-medium">{items.length}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
