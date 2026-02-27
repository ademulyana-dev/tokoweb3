/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import { ToastProvider } from './contexts/ToastContext';
import Topbar from './components/Topbar';
import StorePage from './pages/StorePage';
import MyOrdersPage from './pages/MyOrdersPage';
import OwnerPage from './pages/OwnerPage';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<'store' | 'myorders' | 'owner'>('store');
  const { isOwner } = useWeb3();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-200">
      <Topbar />
      
      {/* Navigation */}
      <nav className="sticky top-[60px] z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 flex justify-center gap-8">
        <button
          onClick={() => setActiveTab('store')}
          className={`py-4 text-sm tracking-widest uppercase transition-colors relative ${
            activeTab === 'store' ? 'text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Collection
          {activeTab === 'store' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('myorders')}
          className={`py-4 text-sm tracking-widest uppercase transition-colors relative ${
            activeTab === 'myorders' ? 'text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          My Orders
          {activeTab === 'myorders' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900" />
          )}
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('owner')}
            className={`py-4 text-sm tracking-widest uppercase transition-colors relative ${
              activeTab === 'owner' ? 'text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Dashboard
            {activeTab === 'owner' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900" />
            )}
          </button>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'store' && <StorePage />}
        {activeTab === 'myorders' && <MyOrdersPage />}
        {activeTab === 'owner' && <OwnerPage />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-xl font-bold mb-4">TokoWeb3.</h3>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              A decentralized premium clothing store. Experience the future of fashion commerce with Web3 technology.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-zinc-900 mb-4">Information</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-zinc-900 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-zinc-900 transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-zinc-900 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-zinc-900 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-zinc-900 mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>Email: support@tokoweb3.com</li>
              <li>Phone: +62 812 3456 7890</li>
              <li className="pt-4">
                <span className="block text-xs uppercase tracking-widest font-medium text-zinc-900 mb-1">Created By</span>
                <span className="font-serif italic text-lg text-zinc-800">Ade Mulyana</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-400">
          <p>&copy; {new Date().getFullYear()} TokoWeb3. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Powered by Ethereum & Web3</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Web3Provider>
        <MainLayout />
      </Web3Provider>
    </ToastProvider>
  );
}
