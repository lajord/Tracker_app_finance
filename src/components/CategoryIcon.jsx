import { 
  ShoppingCart, Coffee, Utensils, CarFront, Ticket, Wallet, Home, 
  ReceiptText, ArrowDownToLine, RefreshCcw, Send, CalendarDays, ArrowLeftRight, Briefcase, BookOpen, HeartPulse
} from 'lucide-react';

export function CategoryIcon({ category, amount, className = "h-[18px] w-[18px]" }) {
  const c = (category || '').toLowerCase();
  
  if (c.includes('courses') && !c.includes('petite')) return <ShoppingCart className={`${className} text-zinc-400`} />;
  if (c.includes('café') || c.includes('redbull') || c.includes('petite')) return <Coffee className={`${className} text-orange-400/80`} />;
  if (c.includes('restaurant')) return <Utensils className={`${className} text-rose-400/80`} />;
  if (c.includes('transport')) return <CarFront className={`${className} text-sky-400/80`} />;
  if (c.includes('loisirs')) return <Ticket className={`${className} text-purple-400/80`} />;
  if (c.includes('abonnement')) return <CalendarDays className={`${className} text-fuchsia-400/80`} />;
  if (c.includes('formation')) return <BookOpen className={`${className} text-indigo-300`} />;
  if (c.includes('santé') || c.includes('coiffeur') || c.includes('sante')) return <HeartPulse className={`${className} text-rose-500/80`} />;
  if (c.includes('logement') || c.includes('loyer')) return <Home className={`${className} text-indigo-400/80`} />;
  if (c.includes('salaire')) return <Wallet className={`${className} text-emerald-400/80`} />;
  if (c.includes('entrepreneuriat')) return <Briefcase className={`${className} text-sky-400`} />;
  if (c.includes('remboursement') || c.includes('reçu')) return <RefreshCcw className={`${className} text-emerald-400/90`} />;
  if (c.includes('virement émis') || c.includes('proches')) return <Send className={`${className} text-zinc-400 ml-0.5`} />;
  if (c.includes('transfert')) return <ArrowLeftRight className={`${className} text-zinc-400`} />;
  
  return amount >= 0 ? <ArrowDownToLine className={`${className} text-emerald-500`} /> : <ReceiptText className={`${className} text-zinc-400`} />;
}
