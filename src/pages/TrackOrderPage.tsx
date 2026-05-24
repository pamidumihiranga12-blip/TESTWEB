import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, MapPin, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-yellow-500' },
  { key: 'processing', label: 'Processing', icon: Package, color: 'text-blue-500' },
  { key: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-500' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-500' },
];

const TrackOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('orderId') || searchParams.get('tracking') || '');
  const [searchType, setSearchType] = useState<'orderId' | 'tracking'>('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, [user]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const tracking = searchParams.get('tracking');
    
    if (orderId) {
      setSearchValue(orderId);
      setSearchType('orderId');
      trackOrder(orderId, 'orderId');
    } else if (tracking) {
      setSearchValue(tracking);
      setSearchType('tracking');
      trackOrder(tracking, 'tracking');
    }
  }, [searchParams]);

  const fetchMyOrders = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setMyOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const trackOrder = async (value?: string, type?: 'orderId' | 'tracking') => {
    const searchVal = (value || searchValue).trim();
    const searchBy = type || searchType;
    
    if (!searchVal) {
      toast.error(`Please enter ${searchBy === 'orderId' ? 'an order ID' : 'a tracking number'}`);
      return;
    }
    
    setLoading(true);
    setSearched(true);
    setOrder(null);
    
    try {
      if (searchBy === 'orderId') {
        // Search by Order ID
        const docRef = await getDoc(doc(db, 'orders', searchVal));
        if (docRef.exists()) {
          setOrder({ id: docRef.id, ...docRef.data() } as Order);
        } else {
          toast.error('Order not found');
        }
      } else {
        // Search by Tracking Number
        const q = query(
          collection(db, 'orders'),
          where('trackingNumber', '==', searchVal)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const doc = snap.docs[0];
          setOrder({ id: doc.id, ...doc.data() } as Order);
        } else {
          toast.error('No order found with this tracking number');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error tracking order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return statusSteps.findIndex(s => s.key === status);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Track Your Order</h1>
          <p className="text-blue-100 mb-8">Enter your order ID or tracking number to check delivery status</p>
          
          {/* Search Type Toggle */}
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => { setSearchType('orderId'); setSearchValue(''); setOrder(null); setSearched(false); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                searchType === 'orderId' 
                  ? 'bg-white text-blue-600' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Hash size={16} /> Order ID
              </span>
            </button>
            <button
              onClick={() => { setSearchType('tracking'); setSearchValue(''); setOrder(null); setSearched(false); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                searchType === 'tracking' 
                  ? 'bg-white text-blue-600' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Truck size={16} /> Tracking Number
              </span>
            </button>
          </div>
          
          <div className="flex gap-2 max-w-lg mx-auto">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && trackOrder()}
                placeholder={searchType === 'orderId' ? 'Enter Order ID...' : 'Enter Tracking Number...'}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
            </div>
            <button
              onClick={() => trackOrder()}
              disabled={loading}
              className="px-6 py-3.5 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition disabled:opacity-50"
            >
              {loading ? '...' : 'Track'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Order Details */}
        {order && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Order #{order.id.slice(0, 8).toUpperCase()}</h2>
                <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>

            {/* Status Timeline */}
            {order.status !== 'cancelled' ? (
              <div className="mb-8">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${(getStatusIndex(order.status) / (statusSteps.length - 1)) * 100}%` }}
                    />
                  </div>
                  {statusSteps.map((step, i) => {
                    const isActive = i <= getStatusIndex(order.status);
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="relative flex flex-col items-center z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                        } transition-all`}>
                          <Icon size={20} />
                        </div>
                        <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-8 flex items-center gap-3 bg-red-50 p-4 rounded-xl">
                <XCircle className="text-red-500" size={24} />
                <div>
                  <p className="font-semibold text-red-700">Order Cancelled</p>
                  <p className="text-sm text-red-500">This order has been cancelled.</p>
                </div>
              </div>
            )}

            {/* Tracking Number */}
            {order.trackingNumber && (
              <div className="mb-6 bg-blue-50 p-4 rounded-xl flex items-center gap-3">
                <MapPin className="text-blue-600" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-700">Tracking Number</p>
                  <p className="font-mono text-blue-600 font-bold">{order.trackingNumber}</p>
                </div>
              </div>
            )}

            {/* Shipping Details */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">Shipping To</h3>
                <p className="font-medium text-gray-800">{order.customerName}</p>
                <p className="text-sm text-gray-500">{order.shippingAddress}</p>
                <p className="text-sm text-gray-500">{order.customerPhone}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">Order Info</h3>
                <p className="text-sm text-gray-500">Email: {order.customerEmail}</p>
                <p className="text-sm text-gray-500">Items: {order.items.length}</p>
                <p className="font-bold text-blue-600 text-lg mt-1">Total: Rs. {order.total.toLocaleString()}</p>
              </div>
            </div>

            {/* Items */}
            <h3 className="font-semibold text-gray-700 mb-3">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl">
                  <img src={item.imageUrl || '/images/product-placeholder.jpg'} alt={item.productName} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 truncate">{item.productName}</h4>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-gray-800">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="mt-4 bg-yellow-50 p-4 rounded-xl">
                <p className="text-sm"><strong>Notes:</strong> {order.notes}</p>
              </div>
            )}
          </div>
        )}

        {searched && !order && !loading && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <Package size={64} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Order not found</h3>
            <p className="text-gray-400">
              {searchType === 'orderId' 
                ? 'Please check your order ID and try again.'
                : 'Please check your tracking number and try again.'}
            </p>
          </div>
        )}

        {/* My Orders */}
        {user && myOrders.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">My Orders</h2>
            <div className="space-y-4">
              {myOrders.map(o => (
                <div
                  key={o.id}
                  onClick={() => {
                    setSearchValue(o.id);
                    setSearchType('orderId');
                    trackOrder(o.id, 'orderId');
                  }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500">{o.items.length} item(s)</p>
                      {o.trackingNumber && (
                        <p className="text-xs text-blue-600 mt-1">Tracking: {o.trackingNumber}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">Rs. {o.total.toLocaleString()}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${getStatusColor(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;
