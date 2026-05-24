import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Search, LogOut, Shield, Package, Home, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { getItemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <>
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone size={12} /> 0786800086</span>
            <span className="hidden sm:flex items-center gap-1"><MapPin size={12} /> Anuradhapura</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="flex items-center gap-1"><User size={12} /> {user.displayName || user.email}</span>
            ) : (
              <Link to="/login" className="hover:text-blue-200 transition">Login / Register</Link>
            )}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src="/images/logo.png" alt="SmartZone" className="h-10 w-10 object-contain rounded-lg" />
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">SmartZone</span>
                <p className="text-[10px] text-gray-400 -mt-1 leading-none">Your Smart Shopping</p>
              </div>
            </Link>

            {/* Search bar - desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm transition"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                  <Search size={18} />
                </button>
              </div>
            </form>

            {/* Nav links - desktop */}
            <div className="hidden md:flex items-center gap-1">
              <Link to="/" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition flex items-center gap-1">
                <Home size={16} /> Home
              </Link>
              <Link to="/products" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition flex items-center gap-1">
                <Package size={16} /> Products
              </Link>
              <Link to="/track-order" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition">
                Track Order
              </Link>
              <Link to="/contact" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition flex items-center gap-1">
                <Phone size={16} /> Contact
              </Link>
              {isAdmin && (
                <Link to="/admin" className="px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 rounded-lg hover:bg-orange-50 transition flex items-center gap-1">
                  <Shield size={16} /> Admin
                </Link>
              )}
              <Link to="/cart" className="relative px-3 py-2 text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition">
                <ShoppingCart size={20} />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {getItemCount()}
                  </span>
                )}
              </Link>
              {user ? (
                <>
                  <Link to="/account" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition flex items-center gap-1">
                    <User size={16} /> Account
                  </Link>
                  <button onClick={handleLogout} className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition flex items-center gap-1">
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition">
                  Login
                </Link>
              )}
            </div>

            {/* Mobile buttons */}
            <div className="flex md:hidden items-center gap-2">
              <Link to="/cart" className="relative p-2 text-gray-700">
                <ShoppingCart size={22} />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {getItemCount()}
                  </span>
                )}
              </Link>
              <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-700">
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t shadow-xl">
            <form onSubmit={handleSearch} className="p-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none text-sm"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={18} />
                </button>
              </div>
            </form>
            <div className="px-4 pb-4 space-y-1">
              <Link to="/" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-gray-700 hover:bg-blue-50 rounded-lg font-medium">Home</Link>
              <Link to="/products" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-gray-700 hover:bg-blue-50 rounded-lg font-medium">Products</Link>
              <Link to="/track-order" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-gray-700 hover:bg-blue-50 rounded-lg font-medium">Track Order</Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-gray-700 hover:bg-blue-50 rounded-lg font-medium">Contact</Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-orange-600 hover:bg-orange-50 rounded-lg font-medium">Admin Panel</Link>
              )}
              <hr className="my-2" />
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-gray-500">Signed in as {user.email}</div>
                  <Link to="/account" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium">My Account</Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium">Logout</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium">Login / Register</Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
