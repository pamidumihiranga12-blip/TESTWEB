import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ArrowRight, Truck, Upload, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { sendOrderEmailToAdmin, sendOrderEmailToCustomer } from '../utils/emailService';
import OrderWhatsAppPopup from '../components/OrderWhatsAppPopup';

const DELIVERY_CHARGE = 500;

const CartPage: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotal } = useCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod');
  const [form, setForm] = useState({
    name: userProfile?.displayName || user?.displayName || '',
    email: user?.email || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    notes: '',
  });

  const [bankSlip, setBankSlip] = useState<File | null>(null);
  const [bankSlipPreview, setBankSlipPreview] = useState<string | null>(null);

  // WhatsApp popup state
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  const subtotal = getTotal();
  const grandTotal = subtotal + DELIVERY_CHARGE;

  const handleBankSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file size should be less than 5MB');
        return;
      }
      setBankSlip(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBankSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }
    if (cart.length === 0) return;

    setOrdering(true);
    try {
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl,
      }));

      let bankSlipUrl = '';
      if (paymentMethod === 'bank_transfer' && bankSlip) {
        try {
          const storageRef = ref(storage, `bank_slips/${Date.now()}_${bankSlip.name}`);
          
          // Timeout after 3.5 seconds to prevent hanging if Storage is not activated in console
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Firebase Storage upload timed out after 3.5 seconds')), 3500)
          );
          
          const uploadPromise = uploadBytes(storageRef, bankSlip);
          const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
          
          // Get download URL with 2-second timeout
          const urlPromise = getDownloadURL(uploadResult.ref);
          const urlTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Firebase Storage URL lookup timed out')), 2000)
          );
          
          bankSlipUrl = await Promise.race([urlPromise, urlTimeoutPromise]);
        } catch (storageError) {
          console.error('Error uploading bank transfer slip:', storageError);
          // If storage upload fails or times out, we use base64 fallback only if the file size is very small (< 100KB)
          // to avoid bloat and Firestore document size limit issues.
          if (bankSlipPreview && bankSlipPreview.length < 130000) {
            bankSlipUrl = bankSlipPreview;
          }
        }
      }

      const orderData = {
        userId: user.uid,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: form.address,
        items: orderItems,
        subtotal: subtotal,
        deliveryCharge: DELIVERY_CHARGE,
        total: grandTotal,
        status: 'pending',
        paymentMethod: paymentMethod,
        bankSlipUrl: bankSlipUrl || null,
        createdAt: Date.now(),
        notes: form.notes,
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Prepare email data
      const emailData = {
        orderId: docRef.id,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: form.address,
        items: orderItems,
        subtotal: subtotal,
        deliveryCharge: DELIVERY_CHARGE,
        total: grandTotal,
        notes: form.notes,
        paymentMethod: paymentMethod,
        bankSlipUrl: bankSlipUrl || undefined,
      };

      // Send emails (non-blocking)
      sendOrderEmailToAdmin(emailData);
      sendOrderEmailToCustomer(emailData);

      // Set completed order for WhatsApp popup
      setCompletedOrder({
        id: docRef.id,
        customerName: form.name,
        customerPhone: form.phone,
        shippingAddress: form.address,
        items: orderItems,
        subtotal: subtotal,
        deliveryCharge: DELIVERY_CHARGE,
        total: grandTotal,
        paymentMethod: paymentMethod,
        bankSlipUrl: bankSlipUrl || null,
      });

      clearCart();
      toast.success('Order placed successfully!');

      // Show WhatsApp popup
      setShowWhatsAppPopup(true);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setOrdering(false);
    }
  };

  const handleWhatsAppClose = () => {
    setShowWhatsAppPopup(false);
    if (completedOrder) {
      navigate(`/track-order?orderId=${completedOrder.id}`);
    }
  };

  if (cart.length === 0 && !showCheckout && !showWhatsAppPopup) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
          <ShoppingBag size={80} className="text-gray-200 mb-6" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Looks like you haven't added any items to your cart yet.</p>
          <Link to="/products" className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition flex items-center gap-2">
            <ShoppingBag size={18} /> Start Shopping
          </Link>
        </div>

        {/* WhatsApp Popup (shown even after cart cleared) */}
        {completedOrder && (
          <OrderWhatsAppPopup
            isOpen={showWhatsAppPopup}
            onClose={handleWhatsAppClose}
            order={completedOrder}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Shopping Cart</h1>
          <Link to="/products" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium">
            <ArrowLeft size={16} /> Continue Shopping
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map(item => (
              <div key={item.product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4">
                <Link to={`/product/${item.product.id}`} className="shrink-0">
                  <img
                    src={item.product.imageUrl || '/images/product-placeholder.jpg'}
                    alt={item.product.name}
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product.id}`}>
                    <h3 className="font-semibold text-gray-800 hover:text-blue-600 transition truncate">{item.product.name}</h3>
                  </Link>
                  <p className="text-sm text-gray-400">{item.product.category}</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">Rs. {item.product.price.toLocaleString()}</p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1.5 hover:bg-gray-200">
                        <Minus size={14} />
                      </button>
                      <span className="px-3 text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1.5 hover:bg-gray-200">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800">Rs. {(item.product.price * item.quantity).toLocaleString()}</span>
                      <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                  <span className="font-medium">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Truck size={14} /> Delivery Charge
                  </span>
                  <span className="text-orange-600 font-medium">Rs. {DELIVERY_CHARGE.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {!showCheckout ? (
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error('Please login to checkout');
                      navigate('/login');
                      return;
                    }
                    setShowCheckout(true);
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  Proceed to Checkout <ArrowRight size={18} />
                </button>
              ) : (
                <form onSubmit={handleCheckout} className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Shipping Details</h4>
                  <input
                    type="text"
                    placeholder="Full Name *"
                    required
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    required
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                  <textarea
                    placeholder="Shipping Address *"
                    required
                    rows={3}
                    value={form.address}
                    onChange={e => setForm({...form, address: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm resize-none"
                  />
                  <textarea
                    placeholder="Order Notes (optional)"
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm resize-none"
                  />

                  {/* Shipping / Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment & Shipping Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-center transition-all ${
                          paymentMethod === 'cod'
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        <span className="text-2xl mb-1">💵</span>
                        <span className="text-xs">Cash on Delivery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-center transition-all ${
                          paymentMethod === 'bank_transfer'
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        <span className="text-2xl mb-1">🏦</span>
                        <span className="text-xs">Bank Transfer</span>
                      </button>
                    </div>
                  </div>

                  {/* Bank Transfer Details (if selected) */}
                  {paymentMethod === 'bank_transfer' && (
                    <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/40 border border-blue-100/80 rounded-2xl p-4 space-y-3 shadow-inner">
                      <div className="flex items-center gap-1.5 text-blue-800">
                        <span className="text-base">ℹ️</span>
                        <h5 className="font-bold text-[11px] uppercase tracking-wider">Bank Details for Payment</h5>
                      </div>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        Please transfer the total amount to the account below and send a screenshot of the receipt via WhatsApp:
                      </p>
                      
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-blue-50 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bank Name</span>
                          <span className="font-bold text-gray-800">Bank of Ceylon</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Account Number</span>
                          <span className="font-mono font-bold text-blue-600 select-all bg-blue-50 px-2 py-0.5 rounded">95251938</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Account Name</span>
                          <span className="font-bold text-gray-800 text-right">IPMD WIJEGUNAWARDHANA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Branch</span>
                          <span className="font-bold text-gray-800">padaviya</span>
                        </div>
                      </div>
                      
                      {/* Bank Slip Upload */}
                      <div className="space-y-2 pt-3 border-t border-blue-100">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800">
                          Upload Bank Transfer Slip (Optional)
                        </label>
                        {!bankSlipPreview ? (
                          <div className="relative group border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-3 transition bg-white/60 hover:bg-white flex flex-col items-center justify-center cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBankSlipChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <Upload className="text-blue-400 group-hover:text-blue-500 mb-1" size={20} />
                            <span className="text-xs text-blue-950 font-medium group-hover:text-blue-600">Choose slip image</span>
                            <span className="text-[9px] text-gray-400">Supports PNG, JPG, JPEG (Max 5MB)</span>
                          </div>
                        ) : (
                          <div className="relative rounded-xl overflow-hidden border border-blue-200 bg-white p-2">
                            <img
                              src={bankSlipPreview}
                              alt="Bank slip preview"
                              className="w-full max-h-36 object-contain rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setBankSlip(null);
                                setBankSlipPreview(null);
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-md"
                              title="Remove image"
                            >
                              <X size={12} />
                            </button>
                            <div className="text-[10px] text-gray-500 mt-1 text-center font-medium truncate">
                              📎 {bankSlip?.name}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-orange-600 font-semibold flex items-start gap-1 bg-orange-50/80 p-2 rounded-xl border border-orange-100/50">
                        <span className="shrink-0 mt-0.5">⚠️</span>
                        <span>Orders using Bank Transfer will be processed once payment is credited and verified.</span>
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={ordering}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {ordering ? (
                      <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span> Placing Order...</>
                    ) : (
                      <>Place Order</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    Back to Summary
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Order Confirmation Popup */}
      {completedOrder && (
        <OrderWhatsAppPopup
          isOpen={showWhatsAppPopup}
          onClose={handleWhatsAppClose}
          order={completedOrder}
        />
      )}
    </div>
  );
};

export default CartPage;
