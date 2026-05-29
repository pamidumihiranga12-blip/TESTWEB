import React from 'react';
import { X, MessageCircle, CheckCircle, Package, MapPin, Phone } from 'lucide-react';

interface OrderItem {
  productName: string;
  price: number;
  quantity: number;
}

interface OrderWhatsAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    items: OrderItem[];
    subtotal: number;
    deliveryCharge: number;
    total: number;
    paymentMethod?: 'cod' | 'bank_transfer';
  };
}

const WHATSAPP_NUMBER = '94786800086';

const OrderWhatsAppPopup: React.FC<OrderWhatsAppPopupProps> = ({ isOpen, onClose, order }) => {
  if (!isOpen) return null;

  const orderId = order.id.slice(0, 8).toUpperCase();

  // Build bilingual WhatsApp message (Sinhala + English)
  const itemsList = order.items
    .map((item, i) => `  ${i + 1}. ${item.productName} × ${item.quantity} — Rs. ${(item.price * item.quantity).toLocaleString()}`)
    .join('\n');

  const paymentMethodText = order.paymentMethod === 'bank_transfer'
    ? 'Bank Transfer '
    : 'Cash on Delivery ';

  const bankDetailsText = order.paymentMethod === 'bank_transfer'
    ? `
🏦 *Bank Details for Transfer :*
• Bank Name: Bank of Ceylon
• Account No: 95251938
• Account Name: IPMD WIJEGUNAWARDHANA
• Branch: Padaviya`
    : '';

  const whatsappMessage = `🛒 *SmartZone — New Order*

━━━━━━━━━━━━━━━━━━━━

📦 *Order ID :* #${orderId}
👤 *Customer :* ${order.customerName}
📞 *Phone :* ${order.customerPhone}
📍 *Address :* ${order.shippingAddress}
💳 *Method :* ${paymentMethodText}
${bankDetailsText}

━━━━━━━━━━━━━━━━━━━━

🛍️ *Items :*
${itemsList}

━━━━━━━━━━━━━━━━━━━━

💰 *Subtotal :* Rs. ${order.subtotal.toLocaleString()}
🚚 *Delivery :* Rs. ${order.deliveryCharge.toLocaleString()}
💵 *Total :* Rs. ${order.total.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━

✅ *ඔබගේ ඇණවුම සාර්ථකව තබා ඇත!*
✅ *Your order has been placed successfully!*

🙏 SmartZone වෙතින් ස්තුතියි!
🙏 Thank you for shopping with SmartZone!`;

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ animation: 'popIn 0.3s ease-out' }}
      >
        {/* Header - Success Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-white/20 rounded-full text-white hover:bg-white/30 transition"
          >
            <X size={18} />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            Order Placed Successfully! 🎉
          </h2>
          <p className="text-green-100 text-sm">
            ඔබගේ ඇණවුම සාර්ථකව තබා ඇත!
          </p>
          <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-block">
            <span className="text-white text-sm font-mono font-bold">
              Order #{orderId}
            </span>
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-6">
          {/* Customer Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Phone size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{order.customerName}</p>
              <p className="text-xs text-gray-500">{order.customerPhone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg mt-0.5">
              <MapPin size={16} className="text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">{order.shippingAddress}</p>
          </div>

          {/* Payment Method Info */}
          <div className="flex items-center gap-3 mb-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
            <span className="text-lg">💳</span>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Payment Method / ගෙවීම් ක්‍රමය</p>
              <p className="text-sm font-semibold text-gray-800">
                {order.paymentMethod === 'bank_transfer' ? 'Bank Transfer ' : 'Cash on Delivery / බෙදාහැරීමේදී ගෙවීම'}
              </p>
            </div>
          </div>

          {order.paymentMethod === 'bank_transfer' && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 border border-blue-100 rounded-2xl p-4 mb-4 space-y-2.5">
              <div className="flex items-center gap-1 text-indigo-900">
                <span>🏦</span>
                <p className="text-xs font-bold uppercase tracking-wider">Bank Details / බැංකු විස්තර:</p>
              </div>
              <div className="space-y-1.5 text-xs text-indigo-950 bg-white/80 p-3 rounded-xl border border-indigo-50">
                <div className="flex justify-between"><span className="text-gray-400">Bank Name</span><span className="font-bold text-gray-800">Bank of Ceylon</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-400">Account No</span><span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs">95251938</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Account Name</span><span className="font-bold text-gray-800 text-right text-xs">IPMD WIJEGUNAWARDHANA</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Branch</span><span className="font-bold text-gray-800">padaviya</span></div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">
                Items  ({order.items.length})
              </span>
            </div>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {item.productName} <span className="text-gray-400">× {item.quantity}</span>
                  </span>
                  <span className="font-medium text-gray-800">
                    Rs. {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <hr className="my-3 border-gray-200" />
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal </span>
                <span className="font-medium">Rs. {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery  🚚</span>
                <span className="font-medium">Rs. {order.deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1">
                <span className="text-gray-800">Total </span>
                <span className="text-green-600">Rs. {order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 group"
          >
            <MessageCircle size={22} className="group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <span className="block text-sm font-bold">Send via WhatsApp</span>
              <span className="block text-xs text-green-100">WhatsApp හරහා යවන්න</span>
            </div>
          </a>

          {/* Skip button */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition"
          >
            Skip 
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OrderWhatsAppPopup;
