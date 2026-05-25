import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Order, SiteSettings, ContactMessage, UserProfile } from '../types';
import {
  Package, ShoppingCart, Users, Settings, Plus, Pencil, Trash2, Eye,
  Save, X, MessageSquare, LayoutDashboard, ArrowLeft, Image, Star,
  TrendingUp, DollarSign, CheckCircle, Upload, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sendStatusUpdateEmail } from '../utils/emailService';

type Tab = 'dashboard' | 'products' | 'orders' | 'messages' | 'settings' | 'users';

const defaultSettings: SiteSettings = {
  bannerText: '🔥 Free Shipping on Orders Over Rs. 5,000!',
  bannerEnabled: true,
  heroTitle: 'Smart Shopping, Smart Living',
  heroSubtitle: 'Discover the latest gadgets and electronics at unbeatable prices.',
  heroImageUrl: '/images/hero-banner.jpg',
  announcement: '',
  announcementEnabled: false,
  featuredCategoryTitle: 'Featured Products',
  aboutText: 'SmartZone is your go-to destination for premium electronics and gadgets.',
  specialOfferEnabled: false,
  specialOfferTitle: '',
  specialOfferDescription: '',
  specialOfferImageUrl: '',
};

const AdminPage: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', originalPrice: '', category: '',
    imageUrl: '', stock: '', featured: false, images: ''
  });

  // Image upload states
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingAdditionalImages, setUploadingAdditionalImages] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);

  // Order detail
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // User management
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userForm, setUserForm] = useState({
    displayName: '',
    phone: '',
    address: '',
    isAdmin: false,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/login');
      toast.error('Admin access required');
    }
  }, [isAdmin, authLoading]);

  useEffect(() => {
    if (isAdmin) fetchAllData();
  }, [isAdmin]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Products
      const prodSnap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

      // Orders
      const orderSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));

      // Messages
      const msgSnap = await getDocs(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc')));
      setMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContactMessage)));

      // Users
      const userSnap = await getDocs(collection(db, 'users'));
      setUsers(userSnap.docs.map(d => ({ ...d.data() } as UserProfile)));

      // Settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
      if (settingsDoc.exists()) {
        setSiteSettings({ ...defaultSettings, ...settingsDoc.data() as SiteSettings });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Image Upload and Compression Utilities
  // ============================================================
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      e.target.value = '';
      return;
    }

    setUploadingMainImage(true);
    try {
      const fileName = `products/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const url = await uploadImageToStorage(file, fileName);
      setProductForm(prev => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.warn('Storage upload error, falling back to local base64:', error);
      try {
        const compressedBase64 = await compressImage(file);
        setProductForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
        toast.success('Image loaded successfully (local fallback)!');
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        toast.error('Failed to load image');
      }
    } finally {
      setUploadingMainImage(false);
      e.target.value = '';
    }
  };

  const handleAdditionalImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAdditionalImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) return null;
        if (file.size > 5 * 1024 * 1024) return null;
        const fileName = `products/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/\s+/g, '_')}`;
        
        try {
          return await uploadImageToStorage(file, fileName);
        } catch (storageErr) {
          console.warn('Storage upload failed for additional image, falling back to base64:', storageErr);
          try {
            return await compressImage(file);
          } catch (fallbackErr) {
            console.error('Fallback failed for additional image:', fallbackErr);
            return null;
          }
        }
      });

      const urls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
      
      setProductForm(prev => {
        const existingImages = prev.images ? prev.images.split(',').map(s => s.trim()).filter(Boolean) : [];
        const allImages = [...existingImages, ...urls];
        return { ...prev, images: allImages.join(', ') };
      });
      toast.success(`${urls.length} image(s) loaded!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to load images');
    } finally {
      setUploadingAdditionalImages(false);
      e.target.value = '';
    }
  };

  // Product CRUD
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : 0,
        category: productForm.category,
        imageUrl: productForm.imageUrl,
        images: productForm.images ? productForm.images.split(',').map(s => s.trim()).filter(Boolean) : [],
        stock: parseInt(productForm.stock) || 0,
        featured: productForm.featured,
        updatedAt: Date.now(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
        toast.success('Product updated!');
      } else {
        await addDoc(collection(db, 'products'), { ...data, createdAt: Date.now() });
        toast.success('Product added!');
      }
      resetProductForm();
      fetchAllData();
    } catch (error) {
      toast.error('Error saving product');
    }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      category: product.category,
      imageUrl: product.imageUrl,
      stock: product.stock.toString(),
      featured: product.featured,
      images: product.images?.join(', ') || '',
    });
    setShowProductForm(true);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Product deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Error deleting product');
    }
  };

  const resetProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', originalPrice: '', category: '', imageUrl: '', stock: '', featured: false, images: '' });
    setImageInputMode('upload');
  };

  // Order management
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: Date.now() });
      toast.success('Order status updated');

      // Find the order to get customer details for email
      const order = orders.find(o => o.id === orderId);
      if (order) {
        // Send status update email to customer (non-blocking)
        sendStatusUpdateEmail(
          {
            id: orderId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: order.total,
            trackingNumber: order.trackingNumber,
          },
          status
        );
      }

      fetchAllData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: status as any });
      }
    } catch (error) {
      toast.error('Error updating order');
    }
  };

  const updateTrackingNumber = async (orderId: string, trackingNumber: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { trackingNumber, updatedAt: Date.now() });
      toast.success('Tracking number updated');
      
      // Send tracking update email to customer (non-blocking)
      const order = orders.find(o => o.id === orderId);
      if (order) {
        sendStatusUpdateEmail(
          {
            id: orderId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: order.total,
            trackingNumber: trackingNumber,
          },
          order.status
        );
      }

      fetchAllData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, trackingNumber });
      }
    } catch (error) {
      toast.error('Error updating tracking');
    }
  };

  // Settings
  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'site'), siteSettings);
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Error saving settings');
    }
  };

  // Delete message
  const deleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contactMessages', id));
      toast.success('Message deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Error deleting message');
    }
  };

  const markMessageRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'contactMessages', id), { read: true });
      fetchAllData();
    } catch (error) {
      console.error(error);
    }
  };

  // User management functions
  const handleUserUpdate = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        displayName: userForm.displayName,
        phone: userForm.phone,
        address: userForm.address,
        isAdmin: userForm.isAdmin,
      });
      toast.success('User updated successfully');
      setShowUserForm(false);
      setEditingUser(null);
      fetchAllData();
    } catch (error) {
      toast.error('Error updating user');
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast.success('User deleted from database');
      fetchAllData();
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    totalRevenue: orders.filter(o => o.status !== 'cancelled').reduce((a, b) => a + b.total, 0),
    totalUsers: users.length,
    unreadMessages: messages.filter(m => !m.read).length,
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { key: 'products', label: 'Products', icon: <Package size={18} /> },
    { key: 'orders', label: 'Orders', icon: <ShoppingCart size={18} />, badge: stats.pendingOrders },
    { key: 'messages', label: 'Messages', icon: <MessageSquare size={18} />, badge: stats.unreadMessages },
    { key: 'users', label: 'Users', icon: <Users size={18} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-xs text-gray-300">SmartZone Management</p>
            </div>
          </div>
          <button onClick={fetchAllData} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm font-medium">
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.badge ? (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <DollarSign size={24} className="text-green-500" />
                      <TrendingUp size={16} className="text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">Rs. {stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <ShoppingCart size={24} className="text-blue-500" />
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">{stats.pendingOrders} pending</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Package size={24} className="text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
                    <p className="text-xs text-gray-500">Total Products</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Users size={24} className="text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
                    <p className="text-xs text-gray-500">Registered Users</p>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Orders</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Order ID</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Customer</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Total</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Status</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map(order => (
                          <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedOrder(order); setActiveTab('orders'); }}>
                            <td className="py-3 px-2 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                            <td className="py-3 px-2">{order.customerName}</td>
                            <td className="py-3 px-2 font-semibold">Rs. {order.total.toLocaleString()}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>{order.status}</span>
                            </td>
                            <td className="py-3 px-2 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Products ({products.length})</h2>
                  <button
                    onClick={() => { resetProductForm(); setShowProductForm(true); }}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200"
                  >
                    <Plus size={18} /> Add Product
                  </button>
                </div>

                {/* Product Form Modal */}
                {showProductForm && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
                      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">
                          {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </h3>
                        <button onClick={resetProductForm} className="p-2 hover:bg-gray-100 rounded-lg">
                          <X size={20} />
                        </button>
                      </div>
                      <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                          <input
                            type="text" required value={productForm.name}
                            onChange={e => setProductForm({...productForm, name: e.target.value})}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                            placeholder="e.g., iPhone 15 Pro Max"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                          <textarea
                            required rows={4} value={productForm.description}
                            onChange={e => setProductForm({...productForm, description: e.target.value})}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm resize-none"
                            placeholder="Product description..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.) *</label>
                            <input
                              type="number" required min="0" step="0.01" value={productForm.price}
                              onChange={e => setProductForm({...productForm, price: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (Rs.)</label>
                            <input
                              type="number" min="0" step="0.01" value={productForm.originalPrice}
                              onChange={e => setProductForm({...productForm, originalPrice: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                              placeholder="For showing discount"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <input
                              type="text" required value={productForm.category}
                              onChange={e => setProductForm({...productForm, category: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                              placeholder="e.g., Smartphones"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                            <input
                              type="number" required min="0" value={productForm.stock}
                              onChange={e => setProductForm({...productForm, stock: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Main Image - Upload or URL */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">Main Image *</label>
                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => setImageInputMode('upload')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                                  imageInputMode === 'upload'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <Upload size={12} className="inline mr-1" />Upload
                              </button>
                              <button
                                type="button"
                                onClick={() => setImageInputMode('url')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                                  imageInputMode === 'url'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                🔗 URL
                              </button>
                            </div>
                          </div>

                          {imageInputMode === 'upload' ? (
                            <div>
                              <input
                                ref={mainImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleMainImageUpload}
                                className="hidden"
                              />
                              <div
                                onClick={() => mainImageInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition group"
                              >
                                {uploadingMainImage ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 size={32} className="text-blue-500 animate-spin" />
                                    <p className="text-sm text-blue-600 font-medium">Uploading...</p>
                                  </div>
                                ) : productForm.imageUrl ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <img src={productForm.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-xl border shadow-sm" />
                                    <p className="text-xs text-gray-500">Click to change image</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-blue-100 transition">
                                      <Upload size={24} className="text-gray-400 group-hover:text-blue-500 transition" />
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="url" value={productForm.imageUrl}
                                onChange={e => setProductForm({...productForm, imageUrl: e.target.value})}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                placeholder="https://example.com/image.jpg"
                              />
                              {productForm.imageUrl && (
                                <img src={productForm.imageUrl} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded-lg border" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Additional Images */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Images</label>
                          <input
                            ref={additionalImagesInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAdditionalImagesUpload}
                            className="hidden"
                          />
                          <div className="flex flex-wrap gap-2 mb-2">
                            {productForm.images && productForm.images.split(',').map(s => s.trim()).filter(Boolean).map((url, i) => (
                              <div key={i} className="relative group">
                                <img src={url} alt={`Additional ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const imgs = productForm.images.split(',').map(s => s.trim()).filter(Boolean);
                                    imgs.splice(i, 1);
                                    setProductForm({ ...productForm, images: imgs.join(', ') });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => additionalImagesInputRef.current?.click()}
                              disabled={uploadingAdditionalImages}
                              className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition"
                            >
                              {uploadingAdditionalImages ? (
                                <Loader2 size={18} className="text-blue-500 animate-spin" />
                              ) : (
                                <Plus size={18} className="text-gray-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">Click + to upload additional images, or enter URLs below (comma separated)</p>
                          <input
                            type="text" value={productForm.images}
                            onChange={e => setProductForm({...productForm, images: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-xs mt-1"
                            placeholder="url1, url2, url3"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox" id="featured" checked={productForm.featured}
                            onChange={e => setProductForm({...productForm, featured: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <label htmlFor="featured" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Star size={14} className="text-yellow-500" /> Featured Product
                          </label>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button 
                            type="button" 
                            onClick={resetProductForm} 
                            disabled={uploadingMainImage || uploadingAdditionalImages}
                            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={uploadingMainImage || uploadingAdditionalImages}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingMainImage || uploadingAdditionalImages ? (
                              <>
                                <Loader2 size={16} className="animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <Save size={16} /> {editingProduct ? 'Update' : 'Add'} Product
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="relative">
                        <img src={product.imageUrl || '/images/product-placeholder.jpg'} alt={product.name} className="w-full h-48 object-cover" />
                        {product.featured && (
                          <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">Featured</span>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-blue-600 font-medium">{product.category}</p>
                        <h3 className="font-semibold text-gray-800 truncate">{product.name}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-blue-600">Rs. {product.price.toLocaleString()}</span>
                          <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => editProduct(product)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition flex items-center justify-center gap-1">
                            <Pencil size={14} /> Edit
                          </button>
                          <button onClick={() => deleteProduct(product.id)} className="py-2 px-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {products.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl">
                    <Package size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-500">No products yet. Click "Add Product" to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                {selectedOrder ? (
                  <div>
                    <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 text-blue-600 font-medium mb-4 hover:underline">
                      <ArrowLeft size={16} /> Back to Orders
                    </button>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
                          <p className="text-sm text-gray-500">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                            <button
                              key={status}
                              onClick={() => updateOrderStatus(selectedOrder.id, status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                                selectedOrder.status === status
                                  ? status === 'pending' ? 'bg-yellow-500 text-white' :
                                    status === 'processing' ? 'bg-blue-500 text-white' :
                                    status === 'shipped' ? 'bg-purple-500 text-white' :
                                    status === 'delivered' ? 'bg-green-500 text-white' :
                                    'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tracking */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            defaultValue={selectedOrder.trackingNumber || ''}
                            id="trackingInput"
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                            placeholder="Enter tracking number..."
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById('trackingInput') as HTMLInputElement;
                              updateTrackingNumber(selectedOrder.id, input.value);
                            }}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                          >
                            Update
                          </button>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-gray-700 mb-2 text-sm">Customer Details</h4>
                          <p className="font-medium">{selectedOrder.customerName}</p>
                          <p className="text-sm text-gray-500">{selectedOrder.customerEmail}</p>
                          <p className="text-sm text-gray-500">{selectedOrder.customerPhone}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <h4 className="font-semibold text-gray-700 mb-2 text-sm">Shipping Address</h4>
                          <p className="text-sm text-gray-600">{selectedOrder.shippingAddress}</p>
                        </div>
                      </div>

                      {/* Items */}
                      <h4 className="font-semibold text-gray-700 mb-3">Items</h4>
                      <div className="space-y-2 mb-4">
                        {selectedOrder.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl">
                            <img src={item.imageUrl || '/images/product-placeholder.jpg'} alt="" className="w-14 h-14 object-cover rounded-lg" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.productName}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity} × Rs. {item.price.toLocaleString()}</p>
                            </div>
                            <span className="font-semibold text-sm">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total with delivery charge */}
                      <div className="border-t pt-4">
                        <div className="flex justify-end">
                          <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Subtotal</span>
                              <span className="font-medium">Rs. {(selectedOrder.subtotal || (selectedOrder.total - (selectedOrder.deliveryCharge || 0))).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Delivery Charge 🚚</span>
                              <span className="font-medium text-orange-600">Rs. {(selectedOrder.deliveryCharge || 500).toLocaleString()}</span>
                            </div>
                            <hr />
                            <div className="flex justify-between">
                              <span className="text-lg font-bold text-gray-800">Total</span>
                              <span className="text-2xl font-bold text-blue-600">Rs. {selectedOrder.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedOrder.notes && (
                        <div className="mt-4 bg-yellow-50 p-4 rounded-xl">
                          <p className="text-sm"><strong>Notes:</strong> {selectedOrder.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Orders ({orders.length})</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-3 px-4 font-semibold text-gray-600">Order ID</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-600">Customer</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-600">Phone</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-600">Total</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-600">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(order => (
                              <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                <td className="py-3 px-4">{order.customerName}</td>
                                <td className="py-3 px-4 text-gray-500">{order.customerPhone}</td>
                                <td className="py-3 px-4 font-semibold">Rs. {order.total.toLocaleString()}</td>
                                <td className="py-3 px-4">
                                  <select
                                    value={order.status}
                                    onChange={e => updateOrderStatus(order.id, e.target.value)}
                                    className={`px-2 py-1 rounded-lg text-xs font-semibold border-0 ${
                                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                      'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </td>
                                <td className="py-3 px-4 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 px-4">
                                  <button onClick={() => setSelectedOrder(order)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                                    <Eye size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {orders.length === 0 && (
                        <div className="text-center py-12">
                          <ShoppingCart size={48} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-gray-500">No orders yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6">Messages ({messages.length})</h2>
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${!msg.read ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800">{msg.name}</h3>
                            {!msg.read && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">New</span>}
                          </div>
                          <p className="text-sm text-gray-500 mb-1">{msg.email} {msg.phone && `• ${msg.phone}`}</p>
                          <p className="text-gray-600 text-sm mt-2">{msg.message}</p>
                          <p className="text-xs text-gray-400 mt-2">{new Date(msg.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          {!msg.read && (
                            <button onClick={() => markMessageRead(msg.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-xs">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button onClick={() => deleteMessage(msg.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl">
                      <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6">Registered Users ({users.length})</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Phone</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Address</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Role</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Joined</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.uid} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{u.displayName || 'N/A'}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{u.email}</td>
                            <td className="py-3 px-4 text-gray-500">{u.phone || '-'}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs max-w-[150px] truncate">{u.address || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                {u.isAdmin ? 'Admin' : 'Customer'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setUserForm({
                                      displayName: u.displayName || '',
                                      phone: u.phone || '',
                                      address: u.address || '',
                                      isAdmin: u.isAdmin,
                                    });
                                    setShowUserForm(true);
                                  }}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                                  title="Edit User"
                                >
                                  <Pencil size={14} />
                                </button>
                                {u.email !== 'smartzonelk101@gmail.com' && (
                                  <button
                                    onClick={() => deleteUser(u.uid)}
                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                    title="Delete User"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit User Modal */}
                {showUserForm && editingUser && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">Edit User</h3>
                        <button onClick={() => { setShowUserForm(false); setEditingUser(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-xs text-gray-500">Email (cannot be changed)</p>
                          <p className="font-medium text-gray-800">{editingUser.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                          <input
                            type="text"
                            value={userForm.displayName}
                            onChange={e => setUserForm({ ...userForm, displayName: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={userForm.phone}
                            onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <textarea
                            rows={2}
                            value={userForm.address}
                            onChange={e => setUserForm({ ...userForm, address: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm resize-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="userIsAdmin"
                            checked={userForm.isAdmin}
                            onChange={e => setUserForm({ ...userForm, isAdmin: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                            disabled={editingUser.email === 'smartzonelk101@gmail.com'}
                          />
                          <label htmlFor="userIsAdmin" className="text-sm font-medium text-gray-700">
                            Admin privileges
                          </label>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => { setShowUserForm(false); setEditingUser(null); }}
                            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUserUpdate}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                          >
                            <Save size={16} /> Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Site Settings</h2>
                  <button onClick={saveSettings} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200">
                    <Save size={16} /> Save All Settings
                  </button>
                </div>
                <div className="space-y-6">
                  {/* Banner */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Star size={16} /></div>
                      Promotional Banner
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="bannerEnabled" checked={siteSettings.bannerEnabled}
                          onChange={e => setSiteSettings({...siteSettings, bannerEnabled: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="bannerEnabled" className="text-sm font-medium text-gray-700">Enable Banner</label>
                      </div>
                      <input type="text" value={siteSettings.bannerText}
                        onChange={e => setSiteSettings({...siteSettings, bannerText: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                        placeholder="Banner text..."
                      />
                    </div>
                  </div>

                  {/* Hero Section */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Image size={16} /></div>
                      Hero Section
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
                        <input type="text" value={siteSettings.heroTitle}
                          onChange={e => setSiteSettings({...siteSettings, heroTitle: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
                        <textarea rows={3} value={siteSettings.heroSubtitle}
                          onChange={e => setSiteSettings({...siteSettings, heroSubtitle: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                        <input type="text" value={siteSettings.heroImageUrl}
                          onChange={e => setSiteSettings({...siteSettings, heroImageUrl: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                        />
                        {siteSettings.heroImageUrl && (
                          <img src={siteSettings.heroImageUrl} alt="Preview" className="mt-2 w-40 h-24 object-cover rounded-lg border" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Announcement */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-yellow-100 text-yellow-600 rounded-lg"><MessageSquare size={16} /></div>
                      Announcement
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="announcementEnabled" checked={siteSettings.announcementEnabled}
                          onChange={e => setSiteSettings({...siteSettings, announcementEnabled: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="announcementEnabled" className="text-sm font-medium text-gray-700">Enable Announcement</label>
                      </div>
                      <textarea rows={3} value={siteSettings.announcement}
                        onChange={e => setSiteSettings({...siteSettings, announcement: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm resize-none"
                        placeholder="Write your announcement here..."
                      />
                    </div>
                  </div>

                  {/* Special Offer */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-red-100 text-red-600 rounded-lg"><DollarSign size={16} /></div>
                      Special Offer Section
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="specialOfferEnabled" checked={siteSettings.specialOfferEnabled}
                          onChange={e => setSiteSettings({...siteSettings, specialOfferEnabled: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="specialOfferEnabled" className="text-sm font-medium text-gray-700">Enable Special Offer</label>
                      </div>
                      <input type="text" value={siteSettings.specialOfferTitle}
                        onChange={e => setSiteSettings({...siteSettings, specialOfferTitle: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                        placeholder="Offer title..."
                      />
                      <textarea rows={2} value={siteSettings.specialOfferDescription}
                        onChange={e => setSiteSettings({...siteSettings, specialOfferDescription: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm resize-none"
                        placeholder="Offer description..."
                      />
                      <input type="text" value={siteSettings.specialOfferImageUrl}
                        onChange={e => setSiteSettings({...siteSettings, specialOfferImageUrl: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                        placeholder="Offer image URL..."
                      />
                    </div>
                  </div>

                  {/* About & Featured */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 text-green-600 rounded-lg"><Settings size={16} /></div>
                      Other Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Featured Section Title</label>
                        <input type="text" value={siteSettings.featuredCategoryTitle}
                          onChange={e => setSiteSettings({...siteSettings, featuredCategoryTitle: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">About Text</label>
                        <textarea rows={4} value={siteSettings.aboutText}
                          onChange={e => setSiteSettings({...siteSettings, aboutText: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button onClick={saveSettings} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    <Save size={18} /> Save All Settings
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
