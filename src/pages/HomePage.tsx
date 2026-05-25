import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, SiteSettings } from '../types';
import { ShoppingCart, ArrowRight, Star, Truck, Shield, Headphones, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const defaultSettings: SiteSettings = {
  bannerText: '⚡ Supercharge Your Network! High-Performance Routers & Professional Tech Services ⚡',
  bannerEnabled: true,
  heroTitle: 'High-Speed Routers & Expert Tech Services',
  heroSubtitle: 'Experience seamless connectivity with our top-tier routers and professional network setup, tech installation, maintenance, and support services customized for you.',
  heroImageUrl: '/images/hero-banner.jpg',
  announcement: '',
  announcementEnabled: false,
  featuredCategoryTitle: 'Featured Products',
  aboutText: 'SmartZone is your premier destination for high-performance routers and professional tech support and installation services.',
  specialOfferEnabled: false,
  specialOfferTitle: '',
  specialOfferDescription: '',
  specialOfferImageUrl: '',
};

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings
        const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as SiteSettings;
          if (data.heroTitle === 'Smart Shopping, Smart Living' || data.bannerText?.includes('Free Shipping on Orders Over Rs. 5,000')) {
            const migrated = {
              ...data,
              bannerText: defaultSettings.bannerText,
              heroTitle: defaultSettings.heroTitle,
              heroSubtitle: defaultSettings.heroSubtitle,
              aboutText: defaultSettings.aboutText,
            };
            await setDoc(doc(db, 'settings', 'site'), migrated);
            setSettings({ ...defaultSettings, ...migrated });
          } else {
            setSettings({ ...defaultSettings, ...data });
          }
        } else {
          await setDoc(doc(db, 'settings', 'site'), defaultSettings);
          setSettings(defaultSettings);
        }

        // Fetch featured products
        const featuredQuery = query(
          collection(db, 'products'),
          where('featured', '==', true),
          limit(8)
        );
        const featuredSnap = await getDocs(featuredQuery);
        const featured = featuredSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setFeaturedProducts(featured);

        // Fetch latest products
        const productsQuery = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(8)
        );
        const productsSnap = await getDocs(productsQuery);
        const prods = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setProducts(prods);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden">
        <div className="aspect-square bg-gray-100">
          <img
            src={product.imageUrl || '/images/product-placeholder.jpg'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
          </span>
        )}
        {product.featured && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Star size={12} /> Featured
          </span>
        )}
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <p className="text-xs text-blue-600 font-medium mb-1">{product.category}</p>
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 hover:text-blue-600 transition">{product.name}</h3>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-blue-600">Rs. {product.price.toLocaleString()}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-400 line-through ml-2">Rs. {product.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <button
            onClick={() => handleAddToCart(product)}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
        {product.stock <= 0 && (
          <p className="text-red-500 text-xs font-medium mt-2">Out of Stock</p>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <p className="text-orange-500 text-xs font-medium mt-2">Only {product.stock} left!</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Announcement Banner */}
      {settings.bannerEnabled && settings.bannerText && (
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white text-center py-2.5 text-sm font-medium animate-pulse">
          {settings.bannerText}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="absolute inset-0">
          <img src={settings.heroImageUrl || '/images/hero-banner.jpg'} alt="Hero" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-blue-900/80 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              {settings.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 leading-relaxed">
              {settings.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/products"
                className="px-8 py-3.5 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
              >
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link
                to="/contact"
                className="px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Truck size={24} />, title: 'Fast Delivery', desc: 'Island-wide shipping' },
              { icon: <Shield size={24} />, title: 'Secure Payment', desc: 'Safe & protected' },
              { icon: <Headphones size={24} />, title: '24/7 Support', desc: 'Always here to help' },
              { icon: <Zap size={24} />, title: 'Best Prices', desc: 'Guaranteed low prices' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">{f.icon}</div>
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">{f.title}</h4>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Special Offer Section */}
      {settings.specialOfferEnabled && settings.specialOfferTitle && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              {settings.specialOfferImageUrl && (
                <img src={settings.specialOfferImageUrl} alt="Special Offer" className="w-48 h-48 object-contain" />
              )}
              <div>
                <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Special Offer</span>
                <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3">{settings.specialOfferTitle}</h2>
                <p className="text-orange-100 mb-6">{settings.specialOfferDescription}</p>
                <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-full font-bold hover:bg-orange-50 transition">
                  Shop Now <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Announcement */}
      {settings.announcementEnabled && settings.announcement && (
        <section className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
            <p className="text-yellow-800 font-medium">{settings.announcement}</p>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{settings.featuredCategoryTitle}</h2>
              <p className="text-gray-500 mt-1">Hand-picked products just for you</p>
            </div>
            <Link to="/products" className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 text-sm">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Products */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Latest Products</h2>
            <p className="text-gray-500 mt-1">Check out our newest arrivals</p>
          </div>
          <Link to="/products" className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 text-sm">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No products available yet.</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon for exciting products!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* About Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">About SmartZone</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2 mb-6">
                Your Trusted Shopping Partner in Anuradhapura
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {settings.aboutText || 'SmartZone is your premier destination for quality electronics and gadgets in Anuradhapura. We bring you the latest technology at the best prices, with island-wide delivery and exceptional customer service.'}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl shadow-sm">
                  <h4 className="text-2xl font-bold text-blue-600">500+</h4>
                  <p className="text-sm text-gray-500">Happy Customers</p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-sm">
                  <h4 className="text-2xl font-bold text-blue-600">100+</h4>
                  <p className="text-sm text-gray-500">Products</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img src="/images/about-store.jpg" alt="SmartZone Store" className="rounded-2xl shadow-lg" />
              <div className="absolute -bottom-4 -left-4 bg-blue-600 text-white p-4 rounded-xl shadow-lg">
                <p className="text-sm font-semibold">Trusted Since 2024</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Shopping?</h2>
          <p className="text-blue-100 text-lg mb-8">Join thousands of happy customers and find your perfect product today.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/products" className="px-8 py-3.5 bg-white text-blue-600 rounded-full font-bold hover:bg-blue-50 transition shadow-lg">
              Browse Products
            </Link>
            <a href="https://wa.me/94786800086" target="_blank" rel="noreferrer" className="px-8 py-3.5 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition shadow-lg">
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
