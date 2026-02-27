import { useWeb3 } from '../contexts/Web3Context';
import { shortenAddress } from '../lib/utils';
import { Wallet } from 'lucide-react';

export default function Topbar() {
  const { walletAddress, connectWallet } = useWeb3();

  return (
    <div className="sticky top-0 z-50 h-[60px] bg-white border-b border-zinc-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-serif font-bold text-2xl tracking-tight text-zinc-900">TokoWeb3.</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center px-3 py-1 bg-zinc-100 text-zinc-500 text-xs font-mono tracking-wider uppercase">
          Sepolia
        </div>
        
        <button
          onClick={connectWallet}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-medium transition-all duration-200 ${
            walletAddress 
              ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          {walletAddress ? shortenAddress(walletAddress) : 'Connect Wallet'}
        </button>
      </div>
    </div>
  );
}
