import { USDC_DECIMALS } from "./constants";

export function formatUSDC(raw: any): string {
  if (raw === undefined || raw === null) return '0';
  const n = typeof raw === 'bigint' ? raw : BigInt(raw.toString());
  const whole = n / BigInt(10**USDC_DECIMALS);
  const frac  = n % BigInt(10**USDC_DECIMALS);
  const fracStr = frac.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function parseError(e: any): string {
  if (e?.reason) return e.reason;
  if (e?.data?.message) return e.data.message;
  if (e?.message) {
    const m = e.message;
    const match = m.match(/revert (.+)/);
    if (match) return match[1];
    if (m.length > 80) return m.slice(0,80) + '...';
    return m;
  }
  return 'Unknown error';
}

export function getProductEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('kaos') || n.includes('baju') || n.includes('shirt')) return '👕';
  if (n.includes('celana') || n.includes('pants')) return '👖';
  if (n.includes('sepatu') || n.includes('shoes')) return '👟';
  if (n.includes('tas') || n.includes('bag')) return '👜';
  if (n.includes('topi') || n.includes('hat')) return '🧢';
  if (n.includes('jam') || n.includes('watch')) return '⌚';
  if (n.includes('phone') || n.includes('hp')) return '📱';
  if (n.includes('laptop') || n.includes('komputer')) return '💻';
  if (n.includes('buku') || n.includes('book')) return '📚';
  return '🛍️';
}

export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
