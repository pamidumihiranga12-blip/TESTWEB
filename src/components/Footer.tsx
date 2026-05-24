import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageCircle, Globe, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/logo.png" alt="SmartZone" className="h-10 w-10 object-contain rounded-lg" />
              <span className="text-xl font-bold text-white">SmartZone</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Your trusted destination for smart shopping. Quality products at the best prices, delivered to your doorstep.</p>
            <div className="flex gap-3">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition">
                <Globe size={16} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition">
                <Heart size={16} />
              </a>
              <a href="https://wa.me/94786800086" target="_blank" rel="noreferrer" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition">
                <MessageCircle size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition">Home</Link></li>
              <li><Link to="/products" className="hover:text-white transition">All Products</Link></li>
              <li><Link to="/track-order" className="hover:text-white transition">Track Order</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">Contact Us</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white transition">My Account</Link></li>
              <li><Link to="/cart" className="hover:text-white transition">Shopping Cart</Link></li>
              <li><Link to="/track-order" className="hover:text-white transition">Order Tracking</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">Help & Support</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="shrink-0 mt-0.5 text-blue-400" />
                <span>Anuradhapura, Sri Lanka</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="shrink-0 text-blue-400" />
                <a href="tel:0786800086" className="hover:text-white transition">0786800086</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="shrink-0 text-blue-400" />
                <a href="mailto:smartzonelk101@gmail.com" className="hover:text-white transition">smartzonelk101@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SmartZone. All rights reserved. | Anuradhapura, Sri Lanka
        </div>
      </div>
    </footer>
  );
};

export default Footer;
