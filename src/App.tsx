import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, LogIn, Plus, LogOut, Package, Trash2, Edit2, MapPin, User as UserIcon, Phone, Home, CheckCircle2, Settings as SettingsIcon } from 'lucide-react';
import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Product, CartItem, Customer, AppSettings, Combo, Banner } from './types';
import { cn, formatCurrency, getWhatsAppUrl } from './lib/utils';
import * as XLSX from 'xlsx';
import { ImageUpload } from './components/ImageUpload';

// --- Components ---

function Navbar({ cartCount, onOpenCart, isAdminPanel, onToggleAdmin, storeName, logoUrl }: { 
  cartCount: number; 
  onOpenCart: () => void; 
  isAdminPanel: boolean;
  onToggleAdmin: () => void;
  storeName: string;
  logoUrl?: string;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const nameParts = storeName.split(' ');
  const lastPart = nameParts.pop();
  const rest = nameParts.join(' ');

  return (
    <nav className="sticky top-0 z-50 bg-bg-sidebar border-b border-white/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isAdminPanel && window.scrollTo({ top: 0, behavior: 'smooth' })}>
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center font-black text-black">
              {storeName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className={cn(logoUrl && "hidden sm:block text-amber-50")}>
            <h1 className="font-black text-lg tracking-tighter uppercase leading-none">{rest} <span className="text-brand-primary">{lastPart}</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={onToggleAdmin}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all",
                  isAdminPanel ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
                )}
              >
                {isAdminPanel ? "Ver Loja" : "Painel ADM"}
              </button>
              <button onClick={handleLogout} className="p-2 text-white/30 hover:text-red-500 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 text-xs font-bold uppercase text-white/70 hover:text-white transition-colors">
              <LogIn size={18} />
              <span>Entrar</span>
            </button>
          )}

          {!isAdminPanel && (
            <button 
              onClick={onOpenCart} 
              className="relative p-2.5 bg-brand-primary rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
            >
              <ShoppingCart size={20} className="text-black" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-bg-sidebar">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function ProductModal({ product, onClose, onAddToCart }: { 
  product: Product; 
  onClose: () => void; 
  onAddToCart: (item: CartItem) => void 
}) {
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<'unit' | 'pack'>('unit');
  const [temp, setTemp] = useState<'natural' | 'cold'>('cold');

  const currentPrice = type === 'unit' 
    ? (temp === 'cold' ? product.priceCold : product.priceNatural)
    : (temp === 'cold' ? (product.pricePackCold || 0) : (product.pricePackNatural || 0));

  const handleAdd = () => {
    onAddToCart({
      id: Math.random().toString(36).substr(2, 9),
      product,
      quantity,
      type,
      temp
    });
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-bg-sidebar w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-t border-white/10 sm:border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-72 bg-gradient-to-b from-white/5 to-transparent">
          <img 
            src={product.imageUrl || 'https://images.unsplash.com/photo-1543258102-430eccc43ec9?w=800&auto=format&fit=crop&q=60'} 
            referrerPolicy="no-referrer"
            alt={product.name}
            className="w-full h-full object-contain p-12"
          />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{product.category}</span>
            <h2 className="text-3xl font-black mt-2 uppercase italic tracking-tighter leading-none">{product.name}</h2>
            <p className="text-4xl font-black text-brand-primary mt-3 tracking-tighter">{formatCurrency(currentPrice)}</p>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase mb-3 text-white/30 tracking-widest">Escolha a Temperatura</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setTemp('cold')}
                  className={cn(
                    "py-4 rounded-2xl border-2 transition-all font-bold text-xs uppercase flex items-center justify-center gap-2",
                    temp === 'cold' ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-lg shadow-brand-primary/10" : "border-white/5 bg-white/5 text-white/30"
                  )}
                >
                  ❄️ Gelada
                </button>
                <button 
                  onClick={() => setTemp('natural')}
                  className={cn(
                    "py-4 rounded-2xl border-2 transition-all font-bold text-xs uppercase flex items-center justify-center gap-2",
                    temp === 'natural' ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-lg shadow-brand-primary/10" : "border-white/5 bg-white/5 text-white/30"
                  )}
                >
                  📦 Natural
                </button>
              </div>
            </div>

            {product.packQuantity && (
              <div>
                <p className="text-[10px] font-black uppercase mb-3 text-white/30 tracking-widest">Escolha o Formato</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setType('unit')}
                    className={cn(
                      "py-4 rounded-2xl border-2 transition-all font-bold text-xs uppercase",
                      type === 'unit' ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-lg shadow-brand-primary/10" : "border-white/5 bg-white/5 text-white/30"
                    )}
                  >
                    Unidade
                  </button>
                  <button 
                    onClick={() => setType('pack')}
                    className={cn(
                      "py-4 rounded-2xl border-2 transition-all font-bold text-xs uppercase flex flex-col items-center justify-center leading-tight",
                      type === 'pack' ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-lg shadow-brand-primary/10" : "border-white/5 bg-white/5 text-white/30"
                    )}
                  >
                    <span>Pacote ({product.packQuantity} uni)</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center font-bold text-2xl hover:bg-white/10 rounded-xl transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center font-black text-xl">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center font-bold text-2xl hover:bg-white/10 rounded-xl transition-colors"
                >
                  +
                </button>
              </div>
              <button 
                onClick={handleAdd}
                className="flex-1 ml-4 bg-brand-primary py-5 rounded-[1.25rem] font-black text-black text-xs uppercase tracking-widest shadow-xl shadow-brand-primary/20 transform active:scale-95 transition-all"
              >
                ADICIONAR {formatCurrency(currentPrice * quantity)}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CartDrawer({ cart, customer, settings, onClose, onRemove, onClear, onOpenRegistration }: { 
  cart: CartItem[]; 
  customer: Customer | null;
  settings: AppSettings;
  onClose: () => void; 
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpenRegistration: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const subtotal = cart.reduce((acc, item) => {
    const price = item.type === 'unit' 
      ? (item.temp === 'cold' ? item.product.priceCold : item.product.priceNatural)
      : (item.temp === 'cold' ? (item.product.pricePackCold || 0) : (item.product.pricePackNatural || 0));
    return acc + (price * item.quantity);
  }, 0);

  const isFreeDelivery = !!(settings.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold);
  const deliveryFee = subtotal > 0 ? (isFreeDelivery ? 0 : (settings.deliveryFee || 0)) : 0;
  const total = subtotal + deliveryFee;

   const handleFinish = () => {
    if (cart.length === 0) return;
    if (settings.minOrder && subtotal < settings.minOrder) {
      alert(`O pedido mínimo é de ${formatCurrency(settings.minOrder)}. Adicione mais itens ao seu carrinho.`);
      return;
    }
    if (!customer) {
      onOpenRegistration();
      return;
    }

    if (!paymentMethod) {
      alert("Por favor, selecione uma forma de pagamento.");
      return;
    }
    
    let message = `🍻 *Novo Pedido - ${settings.storeName}*\n\n`;
    
    message += "👤 *DADOS DO CLIENTE*\n";
    message += `Nome: ${customer.name}\n`;
    message += `Telefone: ${customer.phone}\n`;
    message += `Bairro: ${customer.neighborhood || 'Não informado'}\n`;
    message += `Endereço: ${customer.address}\n`;
    if (customer.location) {
      message += `📍 Localização: https://www.google.com/maps?q=${customer.location.lat},${customer.location.lng}\n`;
    }
    message += "\n💳 *FORMA DE PAGAMENTO*\n";
    message += `${paymentMethod}\n`;

    message += "\n🛒 *ITENS DO PEDIDO*\n";
    
    cart.forEach(item => {
      const unitPrice = item.type === 'unit' 
        ? (item.temp === 'cold' ? item.product.priceCold : item.product.priceNatural)
        : (item.temp === 'cold' ? (item.product.pricePackCold || 0) : (item.product.pricePackNatural || 0));
      
      const categoryEmoji = item.product.category === 'Cerveja' ? '🍺' : 
                            item.product.category === 'Destilado' ? '🥃' : 
                            item.product.category === 'Combo' ? '⚡' : '🥤';

      message += `*${item.quantity}x* ${item.product.name} ${categoryEmoji}\n`;
      message += `Opção: ${item.type === 'unit' ? 'Unidade' : `Pacote (${item.product.packQuantity} un)`}\n`;
      message += `Temp: ${item.temp === 'cold' ? 'Gelada' : 'Natural'}\n`;
      message += `Preço un: ${formatCurrency(unitPrice)}\n`;
      message += `Subtotal: ${formatCurrency(unitPrice * item.quantity)}\n`;
      message += "------------------\n";
    });
    
    message += `💰 *Subtotal: ${formatCurrency(subtotal)}*\n`;
    message += `🚚 *Taxa de Entrega: ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'GRÁTIS'}*\n`;
    message += `✨ *Total: ${formatCurrency(total)}*\n\n`;
    message += `⏳ Aguardando confirmação...`;

    const whatsappUrl = `https://wa.me/55${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-bg-sidebar border-l border-white/10 w-full max-w-md h-full flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <ShoppingCart size={24} className="text-brand-primary" />
            Meu Pedido
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/10 space-y-4">
              <ShoppingCart size={64} strokeWidth={1} />
              <p className="font-black uppercase tracking-widest text-xs">Vazio</p>
            </div>
          ) : (
            cart.map(item => {
               const price = item.type === 'unit' 
                ? (item.temp === 'cold' ? item.product.priceCold : item.product.priceNatural)
                : (item.temp === 'cold' ? (item.product.pricePackCold || 0) : (item.product.pricePackNatural || 0));
                return (
                  <div key={item.id} className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl relative group">
                    <img src={item.product.imageUrl} className="w-16 h-16 object-contain" />
                    <div className="flex-1">
                      <p className="font-bold uppercase text-[13px] leading-tight pr-6">{item.product.name}</p>
                      <p className="text-[9px] text-white/30 font-black uppercase mt-1.5 tracking-wider">
                        {item.quantity}x {item.type === 'unit' ? 'Uni' : 'Pkt'} • {item.temp === 'cold' ? 'Gelada' : 'Natural'}
                      </p>
                      <p className="font-black text-brand-primary mt-1.5">{formatCurrency(price * item.quantity)}</p>
                    </div>
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="absolute top-4 right-4 p-1.5 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-8 space-y-6 bg-bg-card border-t border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
            {settings.minOrder && subtotal < settings.minOrder && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                <p className="text-[10px] font-black text-red-500 uppercase text-center tracking-tighter">
                  ⚠️ Faltam {formatCurrency(settings.minOrder - subtotal)} para o pedido mínimo
                </p>
              </div>
            )}
            {customer ? (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <UserIcon size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-white/40 leading-none">Entrega para</p>
                    <p className="text-sm font-bold truncate max-w-[150px]">{customer.name}</p>
                  </div>
                </div>
                <button onClick={onOpenRegistration} className="text-[10px] font-black text-brand-primary uppercase">Alterar</button>
              </div>
            ) : (
              <button 
                onClick={onOpenRegistration}
                className="w-full p-4 bg-white/5 border border-dashed border-white/20 rounded-xl text-center"
              >
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">+ Adicionar Dados de Entrega</p>
              </button>
            )}

            {customer && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Forma de Pagamento</p>
                <div className="grid grid-cols-2 gap-2">
                  {settings.paymentMethods?.pix && (
                    <button 
                      onClick={() => setPaymentMethod('PIX')}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                        paymentMethod === 'PIX' ? "bg-brand-primary text-black border-brand-primary shadow-lg shadow-brand-primary/10" : "bg-white/5 border-white/5 text-white/40"
                      )}
                    >PIX</button>
                  )}
                  {settings.paymentMethods?.money && (
                    <button 
                      onClick={() => setPaymentMethod('Dinheiro')}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                        paymentMethod === 'Dinheiro' ? "bg-brand-primary text-black border-brand-primary shadow-lg shadow-brand-primary/10" : "bg-white/5 border-white/5 text-white/40"
                      )}
                    >Dinheiro</button>
                  )}
                  {settings.paymentMethods?.debit && (
                    <button 
                      onClick={() => setPaymentMethod('Cartão Débito')}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                        paymentMethod === 'Cartão Débito' ? "bg-brand-primary text-black border-brand-primary shadow-lg shadow-brand-primary/10" : "bg-white/5 border-white/5 text-white/40"
                      )}
                    >Débito</button>
                  )}
                  {settings.paymentMethods?.credit && (
                    <button 
                      onClick={() => setPaymentMethod('Cartão Crédito')}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                        paymentMethod === 'Cartão Crédito' ? "bg-brand-primary text-black border-brand-primary shadow-lg shadow-brand-primary/10" : "bg-white/5 border-white/5 text-white/40"
                      )}
                    >Crédito</button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-white/40 uppercase font-black tracking-widest">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/40 uppercase font-black tracking-widest">
                <span>Taxa de Entrega</span>
                <span className={cn(deliveryFee === 0 && subtotal > 0 ? "text-green-500" : "")}>
                  {deliveryFee === 0 && subtotal > 0 ? "GRÁTIS" : formatCurrency(deliveryFee)}
                </span>
              </div>
              {settings.freeDeliveryThreshold && subtotal > 0 && subtotal < settings.freeDeliveryThreshold && (
                <p className="text-[9px] text-brand-primary/60 font-medium uppercase tracking-tighter text-right italic">
                  + {formatCurrency(settings.freeDeliveryThreshold - subtotal)} para frete grátis
                </p>
              )}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-sm font-bold uppercase tracking-widest">Total Geral</span>
                <span className="text-3xl font-black text-brand-primary tracking-tighter">{formatCurrency(total)}</span>
              </div>
            </div>
            
            <button 
              onClick={handleFinish}
              disabled={settings.minOrder ? subtotal < settings.minOrder : false}
              className={cn(
                "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                (settings.minOrder && subtotal < settings.minOrder) 
                  ? "bg-white/10 text-white/20 cursor-not-allowed" 
                  : !customer 
                    ? "bg-white/10 text-white/20" 
                    : "bg-[#25D366] hover:bg-[#128C7E] text-black shadow-xl shadow-green-500/10 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              { (settings.minOrder && subtotal < settings.minOrder) 
                ? "PEDIDO MÍNIMO NÃO ATINGIDO" 
                : customer 
                  ? "FINALIZAR NO WHATSAPP" 
                  : "ADICIONE SEUS DADOS PARA FINALIZAR"
              }
            </button>
            <p className="text-center text-[9px] text-white/20 uppercase tracking-[0.3em] font-black italic">
              {settings.storeName}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function AdminPanel({ products, combos, banners, settings, onUpdateSettings, onSeed }: { 
  products: Product[]; 
  combos: Combo[];
  banners: Banner[];
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onSeed: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdminTab, setIsAdminTab] = useState<'products' | 'combos' | 'banners' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [settingsForm, setSettingsForm] = useState<AppSettings>({
    ...settings,
    minOrder: settings.minOrder || 50,
    logoUrl: settings.logoUrl || '',
    deliveryFee: settings.deliveryFee || 0,
    freeDeliveryThreshold: settings.freeDeliveryThreshold || 0,
    paymentMethods: settings.paymentMethods || { pix: true, money: true, debit: true, credit: true }
  });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Cerveja',
    imageUrl: '',
    priceNatural: 0,
    priceCold: 0,
    packQuantity: 12,
    pricePackNatural: 0,
    pricePackCold: 0,
    isCombo: false
  });

  const [comboFormData, setComboFormData] = useState<Partial<Combo>>({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    productIds: []
  });

  const [bannerFormData, setBannerFormData] = useState<Partial<Banner>>({
    title: '',
    imageUrl: '',
    link: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), formData);
      } else {
        await addDoc(collection(db, 'products'), formData);
      }
      setIsAdding(false);
      setEditingProduct(null);
      setFormData({ name: '', category: 'Cerveja', imageUrl: '', priceNatural: 0, priceCold: 0, packQuantity: 12, pricePackNatural: 0, pricePackCold: 0, isCombo: false });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, 'settings', 'config'), settingsForm);
    onUpdateSettings(settingsForm);
    alert("Configurações salvas com sucesso!");
  };

  const handleComboSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingCombo) {
        await updateDoc(doc(db, 'combos', editingCombo.id), comboFormData);
      } else {
        await addDoc(collection(db, 'combos'), comboFormData);
      }
      setIsAdding(false);
      setEditingCombo(null);
      setComboFormData({ name: '', description: '', price: 0, imageUrl: '', productIds: [] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBannerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), bannerFormData);
      } else {
        await addDoc(collection(db, 'banners'), bannerFormData);
      }
      setIsAdding(false);
      setEditingBanner(null);
      setBannerFormData({ title: '', imageUrl: '', link: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExcelImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        for (const item of data) {
          if (item.Nome && item.PrecoNatural) {
            await addDoc(collection(db, 'products'), {
              name: item.Nome,
              category: item.Categoria || 'Cerveja',
              imageUrl: item.UrlImagem || 'https://images.unsplash.com/photo-1543258102-430eccc43ec9?w=800',
              priceNatural: Number(item.PrecoNatural),
              priceCold: Number(item.PrecoGelado) || Number(item.PrecoNatural) + 0.5,
              packQuantity: Number(item.QtdFardo) || 12,
              pricePackNatural: Number(item.PrecoFardoNatural) || Number(item.PrecoNatural) * 11,
              pricePackCold: Number(item.PrecoFardoGelado) || (Number(item.PrecoNatural) + 0.5) * 11,
              isCombo: !!item.Combo
            });
            importedCount++;
          }
        }
        alert(`${importedCount} produtos importados com sucesso!`);
        setIsImportModalOpen(false);
      } catch (err) {
        console.error(err);
        alert("Erro ao ler o arquivo Excel. Verifique se o formato está correto.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const handleDeleteCombo = async (id: string) => {
    if (confirm("Deseja realmente excluir este combo?")) {
      await deleteDoc(doc(db, 'combos', id));
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (confirm("Deseja realmente excluir esta propaganda?")) {
      await deleteDoc(doc(db, 'banners', id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setIsAdminTab('products')}
          className={cn(
            "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
            isAdminTab === 'products' ? "bg-brand-primary text-black" : "bg-white/5 text-white/40"
          )}
        >
          Produtos
        </button>
        <button 
          onClick={() => setIsAdminTab('combos')}
          className={cn(
            "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
            isAdminTab === 'combos' ? "bg-brand-primary text-black" : "bg-white/5 text-white/40"
          )}
        >
          Combos
        </button>
        <button 
          onClick={() => setIsAdminTab('banners')}
          className={cn(
            "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
            isAdminTab === 'banners' ? "bg-brand-primary text-black" : "bg-white/5 text-white/40"
          )}
        >
          Propagandas
        </button>
        <button 
          onClick={() => setIsAdminTab('settings')}
          className={cn(
            "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
            isAdminTab === 'settings' ? "bg-brand-primary text-black" : "bg-white/5 text-white/40"
          )}
        >
          Configurações
        </button>
      </div>

      {isAdminTab === 'products' ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Gestão de Produtos</h2>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl font-bold text-white/50 flex items-center gap-2 text-xs uppercase hover:bg-white/10 transition-all"
              >
                📊 Importar Excel
              </button>
              {products.length === 0 && (
                <button 
                  onClick={onSeed}
                  className="bg-white/5 px-5 py-2.5 rounded-xl font-bold text-white/50 flex items-center gap-2 text-xs uppercase border border-white/10 hover:bg-white/10 transition-all"
                >
                  🚀 Carregar Marcas
                </button>
              )}
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-brand-primary px-5 py-2.5 rounded-xl font-bold text-black flex items-center gap-2 text-xs uppercase shadow-lg shadow-brand-primary/10"
              >
                <Plus size={18} /> Novo Produto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-bg-card p-5 rounded-[2rem] flex gap-5 border border-white/5 relative group shadow-xl">
                <div className="w-20 h-20 bg-white/5 rounded-2xl p-2 flex items-center justify-center">
                  <img src={p.imageUrl} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold uppercase text-[13px] leading-none mb-2">{p.name}</h3>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-wider">{p.category}</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-[9px] font-black bg-white/5 text-brand-primary px-2 py-1 rounded border border-white/5 uppercase">Gel: {formatCurrency(p.priceCold)}</span>
                    <span className="text-[9px] font-black bg-white/5 text-white/50 px-2 py-1 rounded border border-white/5 uppercase">Nat: {formatCurrency(p.priceNatural)}</span>
                  </div>
                </div>
                <div className="flex gap-2 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditingProduct(p); setFormData(p); setIsAdding(true); }} className="p-2 text-white/20 hover:text-brand-primary"><Edit2 size={18} /></button>
                   <button onClick={() => handleDelete(p.id)} className="p-2 text-white/20 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : isAdminTab === 'combos' ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Gestão de Combos</h2>
            <button 
              onClick={() => { setEditingCombo(null); setComboFormData({ name: '', description: '', price: 0, imageUrl: '', productIds: [] }); setIsAdding(true); }}
              className="bg-brand-primary px-5 py-2.5 rounded-xl font-bold text-black flex items-center gap-2 text-xs uppercase shadow-lg shadow-brand-primary/10"
            >
              <Plus size={18} /> Novo Combo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {combos.map(c => (
              <div key={c.id} className="bg-bg-card p-5 rounded-[2rem] flex gap-5 border border-white/5 relative group shadow-xl">
                <div className="w-20 h-20 bg-white/5 rounded-2xl p-2 flex items-center justify-center">
                  <img src={c.imageUrl || 'https://images.unsplash.com/photo-1543258102-430eccc43ec9?w=800'} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold uppercase text-[13px] leading-none mb-2">{c.name}</h3>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-wider line-clamp-1">{c.description}</p>
                  <p className="font-black text-brand-primary mt-2">{formatCurrency(c.price)}</p>
                </div>
                <div className="flex gap-2 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditingCombo(c); setComboFormData(c); setIsAdding(true); }} className="p-2 text-white/20 hover:text-brand-primary"><Edit2 size={18} /></button>
                   <button onClick={() => handleDeleteCombo(c.id)} className="p-2 text-white/20 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : isAdminTab === 'banners' ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Gestão de Propagandas</h2>
            <button 
              onClick={() => { setEditingBanner(null); setBannerFormData({ title: '', imageUrl: '', link: '' }); setIsAdding(true); }}
              className="bg-brand-primary px-5 py-2.5 rounded-xl font-bold text-black flex items-center gap-2 text-xs uppercase shadow-lg shadow-brand-primary/10"
            >
              <Plus size={18} /> Nova Propaganda
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map(b => (
              <div key={b.id} className="bg-bg-card p-5 rounded-[2rem] flex gap-5 border border-white/5 relative group shadow-xl overflow-hidden h-32">
                <div className="w-40 bg-white/5 rounded-2xl overflow-hidden">
                  <img src={b.imageUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold uppercase text-[13px] leading-tight mb-1">{b.title}</h3>
                  {b.link && <p className="text-[9px] text-white/30 truncate">{b.link}</p>}
                </div>
                <div className="flex gap-2 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditingBanner(b); setBannerFormData(b); setIsAdding(true); }} className="p-2 text-white/20 hover:text-brand-primary bg-black/40 rounded-full backdrop-blur-sm"><Edit2 size={16} /></button>
                   <button onClick={() => handleDeleteBanner(b.id)} className="p-2 text-white/20 hover:text-red-500 bg-black/40 rounded-full backdrop-blur-sm"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSettingsSubmit} className="bg-bg-sidebar p-8 rounded-[2.5rem] border border-white/10 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon size={24} className="text-brand-primary" />
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Configurações da Loja</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Nome do Estabelecimento</label>
              <input 
                required 
                value={settingsForm.storeName} 
                onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})} 
                className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">WhatsApp de Contato (Com DDD)</label>
              <input 
                required 
                value={settingsForm.whatsappNumber} 
                onChange={e => setSettingsForm({...settingsForm, whatsappNumber: e.target.value})} 
                placeholder="Ex: 91980263626"
                className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Pedido Mínimo (R$)</label>
              <input 
                type="number"
                step="0.01"
                required 
                value={settingsForm.minOrder} 
                onChange={e => setSettingsForm({...settingsForm, minOrder: Number(e.target.value)})} 
                className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
              />
            </div>
            <div className="space-y-2">
              <ImageUpload 
                label="Logo do Estabelecimento"
                value={settingsForm.logoUrl || ''} 
                onChange={val => setSettingsForm({...settingsForm, logoUrl: val})} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Taxa de Entrega (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  required 
                  value={settingsForm.deliveryFee} 
                  onChange={e => setSettingsForm({...settingsForm, deliveryFee: Number(e.target.value)})} 
                  className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Frete Grátis acima de (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  required 
                  value={settingsForm.freeDeliveryThreshold} 
                  onChange={e => setSettingsForm({...settingsForm, freeDeliveryThreshold: Number(e.target.value)})} 
                  className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="text-[10px] font-black text-brand-primary uppercase mb-4 block tracking-[0.2em] italic">Formas de Pagamento Aceitas</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(settingsForm.paymentMethods || {}).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={value}
                      onChange={e => setSettingsForm({
                        ...settingsForm, 
                        paymentMethods: { ...settingsForm.paymentMethods, [key]: e.target.checked }
                      })}
                      className="w-5 h-5 rounded border-white/10 text-brand-primary focus:ring-brand-primary bg-black/40"
                    />
                    <span className="text-[10px] font-black uppercase text-white/60 tracking-wider">
                      {key === 'pix' ? 'PIX' : key === 'money' ? 'Dinheiro' : key === 'debit' ? 'Cartão Débito' : 'Cartão Crédito'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-brand-primary py-5 rounded-2xl font-black text-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-primary/10">
            Salvar Alterações
          </button>
        </form>
      )}

      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-bg-sidebar w-full max-w-2xl p-8 rounded-[2.5rem] border border-white/10 space-y-6 max-h-[90vh] overflow-y-auto shadow-3xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-brand-primary">Importação via Excel</h3>
                <button onClick={() => setIsImportModalOpen(false)} className="text-white/30 hover:text-white text-3xl font-light">&times;</button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-white/60">Crie um arquivo Excel (.xlsx) com as colunas exatas indicadas na tabela abaixo para importar seus produtos: </p>
                
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
                  <table className="w-full text-left font-mono leading-relaxed">
                    <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase text-[9px]">
                      <tr>
                        <th className="p-3">Coluna</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Exemplo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[10px]">
                      <tr><td className="p-3 font-bold text-brand-primary">Nome</td><td className="p-3">Nome do produto</td><td className="p-3">Skol Lata 350ml</td></tr>
                      <tr><td className="p-3 font-bold text-brand-primary">Categoria</td><td className="p-3">Categoria (Cerveja, etc)</td><td className="p-3">Cerveja</td></tr>
                      <tr><td className="p-3 font-bold text-brand-primary">UrlImagem</td><td className="p-3">Link da foto (URL)</td><td className="p-3">http://...</td></tr>
                      <tr><td className="p-3 font-bold text-brand-primary">PrecoNatural</td><td className="p-3">Valor natural</td><td className="p-3">4.50</td></tr>
                      <tr><td className="p-3 font-bold text-brand-primary">PrecoGelado</td><td className="p-3">Valor gelado</td><td className="p-3">5.00</td></tr>
                      <tr><td className="p-3 font-bold text-brand-primary">QtdFardo</td><td className="p-3">Produtos no fardo</td><td className="p-3">12</td></tr>
                      <tr><td className="p-3 font-bold text-brand-primary">PrecoFardoNatural</td><td className="p-3">Fardo natural</td><td className="p-3">50.00</td></tr>
                      <tr><td className="p-3 font-bold text-brand-primary">PrecoFardoGelado</td><td className="p-3">Fardo gelado</td><td className="p-3">55.00</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-10 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-4 hover:border-brand-primary/40 transition-all group relative">
                  <Package size={54} className="text-white/10 group-hover:text-brand-primary transition-colors" />
                  <div className="text-center">
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1">Selecione seu Arquivo Excel</p>
                    <p className="text-[9px] text-white/30 uppercase">Formatos: .xlsx, .xls</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="bg-brand-primary text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-brand-primary/10">
                    Escolher Arquivo
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="w-full bg-white/5 py-4 rounded-2xl font-black text-white/30 uppercase tracking-widest text-[9px] hover:bg-white/10 transition-colors"
              >
                Voltar ao Painel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isAdminTab === 'products' && isAdding) && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 scrollbar-hide overflow-y-auto"
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleSubmit}
              className="bg-bg-sidebar w-full max-w-lg p-8 rounded-[2.5rem] space-y-6 my-8 border border-white/10 shadow-3xl"
            >
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{editingProduct ? 'Editar Produto' : 'Cadastrar Produto'}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Nome</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Categoria</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm">
                    <option>Cerveja</option>
                    <option>Refrigerante</option>
                    <option>Água</option>
                    <option>Destilado</option>
                    <option>Combo</option>
                    <option>Vinho</option>
                  </select>
                </div>
              </div>

              <ImageUpload 
                label="Foto do Produto"
                value={formData.imageUrl || ''} 
                onChange={val => setFormData({...formData, imageUrl: val})} 
              />

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Preço Natural</label>
                    <input type="number" step="0.01" required value={formData.priceNatural} onChange={e => setFormData({...formData, priceNatural: Number(e.target.value)})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Preço Gelado</label>
                    <input type="number" step="0.01" required value={formData.priceCold} onChange={e => setFormData({...formData, priceCold: Number(e.target.value)})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                 </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                 <p className="text-[10px] font-black text-brand-primary uppercase mb-4 tracking-[0.3em] italic">Opções de Pacote (Fardo)</p>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Uni por Fardo</label>
                      <input type="number" value={formData.packQuantity} onChange={e => setFormData({...formData, packQuantity: Number(e.target.value)})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Preço Nat.</label>
                      <input type="number" step="0.01" value={formData.pricePackNatural} onChange={e => setFormData({...formData, pricePackNatural: Number(e.target.value)})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Preço Gel.</label>
                      <input type="number" step="0.01" value={formData.pricePackCold} onChange={e => setFormData({...formData, pricePackCold: Number(e.target.value)})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setIsAdding(false); setEditingProduct(null); }} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-white/40 uppercase tracking-widest text-[10px] transition-colors hover:bg-white/10">Cancelar</button>
                <button type="submit" className="flex-[2] bg-brand-primary py-4 rounded-2xl font-black text-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-primary/10">Salvar Produto</button>
              </div>
            </motion.form>
          </motion.div>
        )}

        {(isAdminTab === 'combos' && isAdding) && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 scrollbar-hide overflow-y-auto"
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleComboSubmit}
              className="bg-bg-sidebar w-full max-w-lg p-8 rounded-[2.5rem] space-y-6 my-8 border border-white/10 shadow-3xl"
            >
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{editingCombo ? 'Editar Combo' : 'Novo Combo Promocional'}</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Nome do Combo</label>
                  <input required value={comboFormData.name} onChange={e => setComboFormData({...comboFormData, name: e.target.value})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Descrição / O que vem no combo</label>
                  <textarea required value={comboFormData.description} onChange={e => setComboFormData({...comboFormData, description: e.target.value})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm resize-none" rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Preço Promo</label>
                    <input type="number" step="0.01" required value={comboFormData.price} onChange={e => setComboFormData({...comboFormData, price: Number(e.target.value)})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                  </div>
                  <div className="space-y-2">
                    <ImageUpload 
                      label="Foto do Combo"
                      value={comboFormData.imageUrl || ''} 
                      onChange={val => setComboFormData({...comboFormData, imageUrl: val})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-primary uppercase mb-2 tracking-widest">Selecionar Produtos</label>
                  <div className="bg-bg-input rounded-2xl border border-white/5 p-4 max-h-48 overflow-y-auto space-y-2">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={comboFormData.productIds?.includes(p.id)}
                          onChange={e => {
                            const ids = [...(comboFormData.productIds || [])];
                            if (e.target.checked) ids.push(p.id);
                            else {
                              const idx = ids.indexOf(p.id);
                              if (idx > -1) ids.splice(idx, 1);
                            }
                            setComboFormData({...comboFormData, productIds: ids});
                          }}
                          className="w-4 h-4 rounded border-white/10 text-brand-primary focus:ring-brand-primary bg-white/5"
                        />
                        <span className="text-[11px] group-hover:text-brand-primary transition-colors">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setIsAdding(false); setEditingCombo(null); }} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-white/40 uppercase tracking-widest text-[10px] transition-colors hover:bg-white/10">Cancelar</button>
                <button type="submit" className="flex-[2] bg-brand-primary py-4 rounded-2xl font-black text-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-primary/10">Salvar Combo</button>
              </div>
            </motion.form>
          </motion.div>
        )}

        {(isAdminTab === 'banners' && isAdding) && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleBannerSubmit}
              className="bg-bg-sidebar w-full max-w-lg p-8 rounded-[2.5rem] space-y-6 border border-white/10 shadow-3xl"
            >
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{editingBanner ? 'Editar Propaganda' : 'Nova Propaganda / Banner'}</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Título da Propaganda</label>
                  <input required value={bannerFormData.title} onChange={e => setBannerFormData({...bannerFormData, title: e.target.value})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" />
                </div>

                <div className="space-y-2">
                  <ImageUpload 
                    label="Banner (Link da Imagem)"
                    value={bannerFormData.imageUrl || ''} 
                    onChange={val => setBannerFormData({...bannerFormData, imageUrl: val})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Link de Ação (Opcional)</label>
                  <input value={bannerFormData.link} onChange={e => setBannerFormData({...bannerFormData, link: e.target.value})} className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" placeholder="Ex: https://wa.me/..." />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setIsAdding(false); setEditingBanner(null); }} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-white/40 uppercase tracking-widest text-[10px] transition-colors hover:bg-white/10">Cancelar</button>
                <button type="submit" className="flex-[2] bg-brand-primary py-4 rounded-2xl font-black text-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-primary/10">Salvar Propaganda</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomerModal({ customer, onSave, onClose }: {
  customer: Customer | null;
  onSave: (c: Customer) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Customer>(customer || { name: '', phone: '', address: '', neighborhood: '', photoUrl: '' });
  const [gettingLocation, setGettingLocation] = useState(false);

  const captureLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({ ...formData, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        setGettingLocation(false);
      },
      (err) => {
        console.error(err);
        alert("Não foi possível capturar sua localização. Por favor, verifique as permissões.");
        setGettingLocation(false);
      }
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-bg-sidebar w-full max-w-md p-8 rounded-[2.5rem] space-y-6 border border-white/10 shadow-3xl overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter">Dados de Entrega</h3>
          {formData.photoUrl && (
            <img src={formData.photoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-brand-primary" />
          )}
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
              <UserIcon size={12} /> Seu Nome
            </label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Alan Silveira"
              className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
              📸 Foto (Link/URL)
            </label>
            <input 
              value={formData.photoUrl} 
              onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
              placeholder="Ex: https://.../sua_foto.jpg"
              className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
              <Phone size={12} /> WhatsApp
            </label>
            <input 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ex: 91980263626"
              className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
              🏠 Bairro
            </label>
            <input 
              value={formData.neighborhood} 
              onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Ex: Reduto"
              className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm" 
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
              <Home size={12} /> Endereço Completo
            </label>
            <textarea 
              value={formData.address} 
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, Número, Bairro, Ponto de Referência"
              rows={3}
              className="w-full bg-bg-input p-4 rounded-2xl border border-white/5 outline-none focus:border-brand-primary transition-colors text-sm resize-none" 
            />
          </div>

          <button 
            type="button" 
            onClick={captureLocation}
            disabled={gettingLocation}
            className={cn(
              "w-full p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all font-bold uppercase text-[10px] tracking-widest",
              formData.location ? "border-green-500/50 bg-green-500/10 text-green-500" : "border-brand-primary/20 bg-brand-primary/5 text-brand-primary"
            )}
          >
            {formData.location ? (
              <CheckCircle2 size={18} />
            ) : gettingLocation ? (
              <span className="animate-spin">🔄</span>
            ) : (
              <MapPin size={18} />
            )}
            {formData.location ? "LOCALIZAÇÃO CAPTURADA!" : "CAPTURAR MINHA LOCALIZAÇÃO"}
          </button>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-white/40 uppercase tracking-widest text-[10px] transition-colors hover:bg-white/10">Pular</button>
          <button 
            onClick={() => {
              if (!formData.name || !formData.phone || !formData.address) {
                alert("Por favor, preencha todos os campos.");
                return;
              }
              onSave(formData);
              onClose();
            }}
            className="flex-[2] bg-brand-primary py-4 rounded-2xl font-black text-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-primary/10"
          >
            Salvar Dados
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ComboModal({ combo, products, onClose, onAddToCart }: {
  combo: Combo;
  products: Product[];
  onClose: () => void;
  onAddToCart: (c: Combo) => void;
}) {
  const comboProducts = products.filter(p => combo.productIds.includes(p.id));

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        className="bg-bg-sidebar w-full max-w-xl p-8 rounded-[2.5rem] border border-white/10 shadow-3xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-brand-primary">{combo.name}</h3>
            <p className="text-xs text-white/40 uppercase font-black tracking-widest">Combo Promocional</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-3xl font-light">&times;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/5 rounded-3xl p-6 flex items-center justify-center border border-white/5">
            <img 
              src={combo.imageUrl || 'https://images.unsplash.com/photo-1543258102-430eccc43ec9?w=800'} 
              className="w-full aspect-square object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-6 flex flex-col">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">O que vem no combo:</p>
              <p className="text-sm text-white/70 leading-relaxed font-medium">{combo.description}</p>
            </div>

            <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-48 pr-2 scrollbar-hide">
              {comboProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <img src={p.imageUrl} className="w-8 h-8 object-contain" />
                  <span className="text-[11px] font-bold uppercase truncate">{p.name}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-black uppercase text-white/30 tracking-widest">Total do Combo</span>
                <span className="text-3xl font-black text-brand-primary italic">{formatCurrency(combo.price)}</span>
              </div>
              <button 
                onClick={() => { onAddToCart(combo); onClose(); }}
                className="w-full bg-brand-primary py-5 rounded-2xl font-black text-black uppercase tracking-widest text-[11px] shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PromotionsCarousel({ banners }: { banners: Banner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full h-48 md:h-64 mb-8 overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl group">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="absolute inset-0"
        >
          <img 
            src={banners[currentIndex].imageUrl} 
            alt={banners[currentIndex].title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10">
            <h3 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-lg">
              {banners[currentIndex].title}
            </h3>
            {banners[currentIndex].link && (
              <a 
                href={banners[currentIndex].link} 
                target="_blank" 
                rel="noreferrer"
                className="mt-4 bg-brand-primary text-black px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest self-start shadow-xl shadow-brand-primary/20 hover:scale-105 transition-transform"
              >
                Confira Agora
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <div className="absolute bottom-4 right-8 flex gap-2">
          {banners.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentIndex === idx ? "bg-brand-primary w-6" : "bg-white/20"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    storeName: 'Conveniência do Alan',
    whatsappNumber: '91980263626',
    minOrder: 50,
    deliveryFee: 10,
    freeDeliveryThreshold: 150,
    paymentMethods: {
      pix: true,
      money: true,
      debit: true,
      credit: true
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isAdminPanel, setIsAdminPanel] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todas');
  
  const [loading, setLoading] = useState(true);

  const seedProducts = async () => {
    const beers = [
      { name: 'Skol Lata 350ml', price: 4.5, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1618883593410-dc7582b5be04?q=80&w=400&auto=format&fit=crop' },
      { name: 'Amstel Lata 350ml', price: 4.8, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1597075484447-e50d0322d73f?q=80&w=400&auto=format&fit=crop' },
      { name: 'Império Gold Long Neck', price: 7.5, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1623910609489-3d0263e1ed55?q=80&w=400&auto=format&fit=crop' },
      { name: 'Petra Puro Malte Lata', price: 4.2, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=400&auto=format&fit=crop' },
      { name: 'Itaipava Lata 350ml', price: 3.8, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?q=80&w=400&auto=format&fit=crop' },
      { name: 'Tijuca Cerpa Lata', price: 5.5, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1518176259641-0afb0a21f0c3?q=80&w=400&auto=format&fit=crop' },
      { name: 'Heineken Long Neck 330ml', price: 9.0, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1618885472179-5e4aa40add50?q=80&w=400&auto=format&fit=crop' },
      { name: 'Spaten Long Neck 330ml', price: 8.5, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1584225064785-c62a8b438148?q=80&w=400&auto=format&fit=crop' },
      { name: 'Budweiser Lata 350ml', price: 5.2, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1558644029-41712a88470a?q=80&w=400&auto=format&fit=crop' },
      { name: 'Antarctica Boa Lata', price: 4.3, cat: 'Cerveja', img: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=400&auto=format&fit=crop' },
      { name: 'Coca-Cola 2L', price: 12.0, cat: 'Refrigerante', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop' },
      { name: 'Coca-Cola Lata 350ml', price: 5.0, cat: 'Refrigerante', img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=400&auto=format&fit=crop' },
      { name: 'Guaraná Antarctica 2L', price: 10.0, cat: 'Refrigerante', img: 'https://images.unsplash.com/photo-1622766815178-641bef2b4630?q=80&w=400&auto=format&fit=crop' },
      { name: 'Fanta Laranja 2L', price: 9.5, cat: 'Refrigerante', img: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?q=80&w=400&auto=format&fit=crop' },
      { name: 'Sprite 2L', price: 9.5, cat: 'Refrigerante', img: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?q=80&w=400&auto=format&fit=crop' },
    ];

    for (const beer of beers) {
      await addDoc(collection(db, 'products'), {
        name: beer.name,
        category: beer.cat,
        imageUrl: beer.img,
        priceNatural: beer.price,
        priceCold: beer.price + 0.5,
        packQuantity: 12,
        pricePackNatural: beer.price * 11.5,
        pricePackCold: (beer.price + 0.5) * 11.5,
        isCombo: false
      });
    }

    const initialBanners = [
      { title: 'Combos Exclusivos!', imageUrl: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&q=80', link: '' },
      { title: 'Vai ter Festa? Peça seu Gelo!', imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&q=80', link: '' },
      { title: 'Cerveja Gelada em 15 Minutos', imageUrl: 'https://images.unsplash.com/photo-1532634896-26909d0d4b89?w=1200&q=80', link: '' }
    ];

    for (const b of initialBanners) {
      await addDoc(collection(db, 'banners'), b);
    }
  };

  useEffect(() => {
    // Load customer from localStorage
    const savedCustomer = localStorage.getItem('alan_conveniencia_customer');
    if (savedCustomer) {
      setCustomer(JSON.parse(savedCustomer));
    }

    // Subscribe to settings
    onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
    });

    onSnapshot(collection(db, 'combos'), (snapshot) => {
      setCombos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Combo)));
    });

    onSnapshot(collection(db, 'banners'), (snapshot) => {
      setBanners(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Banner)));
    });

    return onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(prods);
      setLoading(false);
      
      // Auto-seed if empty
      if (prods.length === 0 && !loading) {
        // seedProducts(); // Uncomment to auto-seed on first run if needed
      }
    });
  }, [loading]);

  const saveCustomer = (c: Customer) => {
    setCustomer(c);
    localStorage.setItem('alan_conveniencia_customer', JSON.stringify(c));
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const addComboToCart = (combo: Combo) => {
    // Create a pseudo-product for the combo
    const comboProduct: Product = {
      id: `combo-${combo.id}`,
      name: combo.name,
      category: 'Combo',
      imageUrl: combo.imageUrl || 'https://images.unsplash.com/photo-1543258102-430eccc43ec9?w=800',
      priceNatural: combo.price,
      priceCold: combo.price,
      isCombo: true
    };
    
    setCart(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      product: comboProduct,
      quantity: 1,
      type: 'unit',
      temp: 'cold' // Not really relevant for curated combos, but required by type
    }]);
    alert(`${combo.name} adicionado ao carrinho!`);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];
  if (combos.length > 0 && !categories.includes('Combo')) {
    categories.push('Combo');
  }

  const filteredProducts = activeCategory === 'Todas' ? products : products.filter(p => p.category === activeCategory);
  const filteredCombos = (activeCategory === 'Todas' || activeCategory === 'Combo') ? combos : [];

  return (
    <div className="min-h-screen bg-bg-main text-white pb-20 sm:pb-0">
      <Navbar 
        cartCount={cart.length} 
        onOpenCart={() => setIsCartOpen(true)} 
        isAdminPanel={isAdminPanel}
        onToggleAdmin={() => setIsAdminPanel(!isAdminPanel)}
        storeName={settings.storeName}
        logoUrl={settings.logoUrl}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isAdminPanel ? (
          <AdminPanel 
            products={products} 
            combos={combos}
            banners={banners}
            settings={settings} 
            onUpdateSettings={setSettings} 
            onSeed={seedProducts}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Categories Desktop */}
            <aside className="hidden lg:flex w-64 flex-col gap-2 shrink-0">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Categorias</div>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-sm uppercase",
                    activeCategory === cat ? "bg-brand-primary text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  <span className="opacity-70">
                    {cat === 'Todas' ? '📦' : cat === 'Cerveja' ? '🍺' : cat === 'Destilado' ? '🥃' : cat === 'Combo' ? '⚡' : '🥤'}
                  </span>
                  {cat}
                </button>
              ))}
            </aside>

            <div className="flex-1 space-y-8">
              {!isAdminPanel && activeCategory === 'Todas' && <PromotionsCarousel banners={banners} />}
              
              {/* Mobile Category Scroll */}
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all border",
                      activeCategory === cat ? "bg-brand-primary text-black border-brand-primary" : "bg-white/5 text-white/50 border-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-pulse">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="aspect-[3/4] bg-bg-card rounded-[2rem] border border-white/5" />
                  ))}
                </div>
              ) : (filteredProducts.length === 0 && filteredCombos.length === 0) ? (
                <div className="text-center py-20 text-white/20">
                  <Package size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-bold uppercase text-xs tracking-widest">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCombos.map(combo => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={combo.id}
                      className="bg-bg-card rounded-[2rem] p-5 flex flex-col border border-brand-primary/20 hover:border-brand-primary/50 hover:-translate-y-1 transition-all group cursor-pointer shadow-2xl shadow-black/80 ring-1 ring-brand-primary/5"
                      onClick={() => setSelectedCombo(combo)}
                    >
                      <div className="relative w-full aspect-square bg-gradient-to-br from-brand-primary/5 to-transparent rounded-2xl flex items-center justify-center p-8 overflow-hidden mb-4">
                        <img 
                          src={combo.imageUrl || 'https://images.unsplash.com/photo-1543258102-430eccc43ec9?w=800'} 
                          alt={combo.name}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-3 left-3 bg-brand-primary text-black text-[9px] font-black px-2 py-1 rounded uppercase shadow-lg">Combo Especial</span>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.1em] mb-1">Oferta Exclusiva</p>
                        <h3 className="font-bold text-base uppercase leading-tight line-clamp-2">{combo.name}</h3>
                        <p className="text-[10px] text-white/30 mt-2 line-clamp-2 font-medium">{combo.description}</p>
                        
                        <div className="mt-auto pt-4 flex flex-col gap-1.5">
                           <div className="flex justify-between items-center">
                             <span className="text-white/40 italic font-medium text-[11px]">Preço Único:</span>
                             <span className="text-brand-primary font-black text-lg">{formatCurrency(combo.price)}</span>
                           </div>
                           
                           <button className="mt-3 w-full bg-brand-primary text-black py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-brand-primary/20">
                             Escolher Combo
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {filteredProducts.map(product => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={product.id}
                      className="bg-bg-card rounded-[2rem] p-5 flex flex-col border border-white/5 hover:border-brand-primary/30 hover:-translate-y-1 transition-all group cursor-pointer shadow-2xl shadow-black/80"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="relative w-full aspect-square bg-gradient-to-br from-white/5 to-transparent rounded-2xl flex items-center justify-center p-8 overflow-hidden mb-4">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        {product.isCombo && (
                          <span className="absolute top-3 left-3 bg-brand-primary text-black text-[9px] font-black px-2 py-1 rounded uppercase">Combo Promo</span>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em] mb-1">{product.category}</p>
                        <h3 className="font-bold text-base uppercase leading-tight line-clamp-2">{product.name}</h3>
                        
                        <div className="mt-auto pt-4 flex flex-col gap-1.5">
                           <div className="flex justify-between items-center text-[11px]">
                             <span className="text-white/40 italic font-medium">Gelado:</span>
                             <span className="text-brand-primary font-bold">{formatCurrency(product.priceCold)}</span>
                           </div>
                           <div className="flex justify-between items-center text-[11px]">
                             <span className="text-white/40 font-medium">Natural:</span>
                             <span className="text-white/60 font-medium">{formatCurrency(product.priceNatural)}</span>
                           </div>
                           
                           <button className="mt-3 w-full bg-white/5 border border-white/10 group-hover:bg-brand-primary group-hover:text-black group-hover:border-brand-primary py-2.5 rounded-xl text-[10px] font-black uppercase transition-all">
                             Adicionar
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) }
      </main>

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onAddToCart={addToCart}
          />
        )}
        {isCartOpen && (
          <CartDrawer 
            cart={cart} 
            customer={customer}
            settings={settings}
            onClose={() => setIsCartOpen(false)} 
            onRemove={removeFromCart}
            onClear={() => setCart([])}
            onOpenRegistration={() => setIsRegistrationOpen(true)}
          />
        )}
        {isRegistrationOpen && (
          <CustomerModal 
            customer={customer}
            onSave={saveCustomer}
            onClose={() => setIsRegistrationOpen(false)}
          />
        )}
        {selectedCombo && (
          <ComboModal 
            combo={selectedCombo}
            products={products}
            onClose={() => setSelectedCombo(null)}
            onAddToCart={addComboToCart}
          />
        )}
      </AnimatePresence>

      {/* Floating Cart Button Mobile */}
      {!isAdminPanel && cart.length > 0 && !isCartOpen && (
        <motion.button 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-6 right-6 z-40 bg-brand-primary p-4 rounded-2xl flex items-center justify-between font-black shadow-2xl shadow-brand-primary/40 sm:hidden"
          onClick={() => setIsCartOpen(true)}
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-sm">{cart.length}</div>
             <span className="uppercase">Ver Carrinho</span>
          </div>
          <span>{formatCurrency(cart.reduce((a, i) => a + (i.type === 'unit' ? (i.temp === 'cold' ? i.product.priceCold : i.product.priceNatural) : (i.temp === 'cold' ? (i.product.pricePackCold || 0) : (i.product.pricePackNatural || 0))) * i.quantity, 0))}</span>
        </motion.button>
      )}
    </div>
  );
}
