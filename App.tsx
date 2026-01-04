
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, MessageCircle, Info, Eye, CheckCircle2, Sparkles, RefreshCw, 
  Plus, Check, Trash2, CalendarX, Settings, 
  Link as LinkIcon, Send, CalendarDays, BellRing, ToggleLeft, ToggleRight, 
  Lock, ShoppingBag, Clock, Heart, Edit3, LayoutList, RotateCcw, Calendar
} from 'lucide-react';
import { SERVICES as INITIAL_SERVICES, BUSINESS_HOURS, WHATSAPP_NUMBER, CARD_SURCHARGE } from './constants';
import { Service, BookingState, Step, PaymentMethod, AppNotice } from './types';

interface BookedSlot {
  time: string;
  duration: number;
}

const ADMIN_PASSWORD = '280218';
const STORAGE_KEYS = {
  SERVICES: 'espaco_dmanuela_services_v_final_rectified_v4',
  BOOKINGS: 'espaco_dmanuela_bookings_v_final',
  RECESS: 'espaco_dmanuela_recess_dates_v2',
  WEBHOOK: 'espaco_dmanuela_webhook_url_v2',
  NOTICE: 'espaco_dmanuela_notice_v2'
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [step, setStep] = useState<Step>(Step.ServiceSelection);
  const [adminTab, setAdminTab] = useState<'config' | 'editor'>('config');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<BookedSlot[]>([]);
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [recessRange, setRecessRange] = useState<{start: string, end: string}>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECESS);
      return saved ? JSON.parse(saved) : { start: '', end: '' };
    } catch(e) { return { start: '', end: '' }; }
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '',
    category: 'Cílios' as Service['category']
  });

  const [services, setServices] = useState<Service[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SERVICES);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : INITIAL_SERVICES;
      }
    } catch (e) {}
    return INITIAL_SERVICES;
  });

  const [notice, setNotice] = useState<AppNotice>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTICE);
      return saved ? JSON.parse(saved) : { message: 'Bem-vinda!', isActive: false };
    } catch(e) { return { message: 'Bem-vinda!', isActive: false }; }
  });

  const [bookedSlots, setBookedSlots] = useState<Record<string, BookedSlot[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
  });

  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem(STORAGE_KEYS.WEBHOOK) || 'https://script.google.com/macros/s/AKfycbwaqKwmD2vm_iCmPtZdQkhGweMgLYFNwzLXPouffqRFiJuKW_Suab6iN24AgFeT6kKUGQ/exec');

  const [booking, setBooking] = useState<BookingState>({
    services: [],
    date: '',
    time: '',
    name: '',
    paymentMethod: null,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookedSlots));
      localStorage.setItem(STORAGE_KEYS.WEBHOOK, webhookUrl);
      localStorage.setItem(STORAGE_KEYS.NOTICE, JSON.stringify(notice));
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
      localStorage.setItem(STORAGE_KEYS.RECESS, JSON.stringify(recessRange));
    } catch (e) {
      console.error("Erro ao salvar dados no LocalStorage");
    }
  }, [bookedSlots, webhookUrl, notice, services, recessRange]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const testConnection = async () => {
    if (!webhookUrl) return;
    setConnStatus('testing');
    try {
      const response = await fetch(webhookUrl);
      if (response.ok) setConnStatus('success');
      else setConnStatus('error');
    } catch (e) {
      setConnStatus('error');
    }
  };

  const fetchOccupiedSlots = async (date: string) => {
    if (!webhookUrl) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${webhookUrl}?action=getEvents&date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setGoogleEvents(data.events || []);
      }
    } catch (error) {
      console.warn("Agenda offline.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (booking.date) {
      fetchOccupiedSlots(booking.date);
    }
  }, [booking.date, webhookUrl]);

  const saveToGoogleCalendar = async () => {
    if (!webhookUrl) return true;
    setIsSyncing(true);
    try {
      const startDateTime = `${booking.date}T${booking.time}:00`;
      const description = `Procedimentos: ${booking.services.map(s => s.name).join(', ')}\nTotal: R$ ${calculateFinalTotal().toFixed(2)}`;
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `D'Manuela: ${booking.name}`,
          description: description,
          start: startDateTime,
          duration: totalDuration
        })
      });
      return true;
    } catch (error) {
      return true;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const categories = useMemo(() => Array.from(new Set(services.map(s => s.category))), [services]);

  const toggleService = (service: Service) => {
    setBooking(prev => {
      const exists = prev.services.some(s => s.id === service.id);
      if (exists) return { ...prev, services: prev.services.filter(s => s.id !== service.id) };
      return { ...prev, services: [...prev.services, service] };
    });
  };

  const totalDuration = useMemo(() => booking.services.reduce((acc, s) => acc + s.durationMinutes, 0), [booking.services]);
  const totalServicesPrice = useMemo(() => booking.services.reduce((acc, s) => acc + s.price, 0), [booking.services]);

  const isRecessDate = (dateString: string) => {
    if (!recessRange.start || !recessRange.end) return false;
    const current = new Date(dateString + 'T00:00:00');
    const start = new Date(recessRange.start + 'T00:00:00');
    const end = new Date(recessRange.end + 'T00:00:00');
    return current >= start && current <= end;
  };

  const isAvailableDay = (dateString: string) => {
    if (!dateString) return false;
    if (isRecessDate(dateString)) return false;
    const dateParts = dateString.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayOfWeek = date.getDay(); 
    return dayOfWeek >= 2 && dayOfWeek <= 6; // Terça a Sábado
  };

  const allTimeSlots = useMemo(() => {
    if (!booking.date || booking.services.length === 0) return [];
    const dateParts = booking.date.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayOfWeek = date.getDay();
    const { tue_fri, sat } = BUSINESS_HOURS;
    const { start, end } = (dayOfWeek === 6) ? sat : tue_fri;
    const slots = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const allOccupied = [...(bookedSlots[booking.date] || []), ...googleEvents];
    let current = new Date(2000, 0, 1, startH, startM);
    const endLimit = new Date(2000, 0, 1, endH, endM);

    while (current < endLimit) {
      const curStartMin = current.getHours() * 60 + current.getMinutes();
      const curEndMin = curStartMin + totalDuration;
      const timeStr = current.toTimeString().slice(0, 5);
      const isOccupied = allOccupied.some(b => {
        const [bH, bM] = b.time.split(':').map(Number);
        const bStart = bH * 60 + bM;
        const bEnd = bStart + b.duration;
        return (curStartMin < bEnd) && (curEndMin > bStart);
      });
      if (curEndMin <= (endH * 60 + endM)) slots.push({ time: timeStr, isOccupied });
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  }, [booking.date, totalDuration, bookedSlots, googleEvents, services]);

  const calculateFinalTotal = () => {
    let total = totalServicesPrice;
    if (booking.paymentMethod?.includes('Cartão')) total += CARD_SURCHARGE;
    return total;
  };

  const confirmBooking = async () => {
    if (!booking.name || !booking.time) return;
    await saveToGoogleCalendar();
    const newSlot: BookedSlot = { time: booking.time, duration: totalDuration };
    setBookedSlots(prev => ({ ...prev, [booking.date]: [...(prev[booking.date] || []), newSlot] }));
    const total = calculateFinalTotal();
    const servicesList = booking.services.map(s => `- ${s.name}`).join('%0A');
    const message = `Olá Dyanne! Gostaria de agendar:%0A%0A*Cliente:* ${booking.name}%0A*Procedimentos:*%0A${servicesList}%0A*Data:* ${new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR')}%0A*Horário:* ${booking.time}%0A*Pagamento:* ${booking.paymentMethod}%0A*Total:* R$ ${total.toFixed(2).replace('.', ',')}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    setStep(Step.Success);
  };

  const updateServiceDetail = (id: string, field: keyof Service, value: any) => {
    setServices(prev => prev.map(s => {
      if (s.id === id) {
        if ((field === 'price' || field === 'durationMinutes') && (isNaN(value) || value === '')) return s;
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const addNewService = () => {
    if (!newService.name || !newService.price || !newService.duration) return;
    const service: Service = {
      id: `extra-${Date.now()}`,
      name: newService.name,
      price: parseFloat(newService.price) || 0,
      durationMinutes: parseInt(newService.duration) || 60,
      category: newService.category
    };
    setServices(prev => [...prev, service]);
    setNewService({ name: '', price: '', duration: '', category: 'Cílios' });
  };

  const deleteService = (id: string) => {
    if (window.confirm("Deseja realmente excluir este serviço permanentemente?")) {
      setServices(prev => [...prev.filter(s => s.id !== id)]);
      setBooking(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
    }
  };

  const resetServicesToDefault = () => {
    if (window.confirm("Isso apagará todas as suas edições e voltará ao catálogo original. Continuar?")) {
       setServices(INITIAL_SERVICES);
       localStorage.removeItem(STORAGE_KEYS.SERVICES);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f7] flex flex-col items-center px-2 sm:px-4 py-4 md:py-10 pb-24 relative overflow-x-hidden container-main">
      {(isLoading || isSyncing) && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#faf7f7]/95 backdrop-blur-md transition-opacity duration-300">
           <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-[#E6B8B1] border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-6 font-bold text-[#8c6b65] uppercase tracking-widest text-[10px] animate-pulse px-6 text-center">
              {isSyncing ? 'Sincronizando Agenda...' : 'Espaço D\'Manuela'}
           </p>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Portfólio" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl animate-zoom-in object-contain" />
        </div>
      )}

      <header className="w-full max-w-lg mb-4 text-center z-10">
        <div className="flex flex-col items-center">
          <button 
            onContextMenu={(e) => { e.preventDefault(); setStep(Step.Admin); }}
            onTouchStart={(e) => {
              const timer = setTimeout(() => setStep(Step.Admin), 2000);
              e.currentTarget.addEventListener('touchend', () => clearTimeout(timer), { once: true });
            }}
            className="mb-4 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-[#E6B8B1] overflow-hidden p-1 hover:scale-105 transition-transform"
          >
            <div className="w-full h-full bg-[#E6B8B1] rounded-full flex items-center justify-center shadow-inner">
               <span className="text-white text-2xl md:text-3xl font-serif font-bold italic">M</span>
            </div>
          </button>
          <h1 className="text-2xl md:text-3xl font-serif text-[#8c6b65] font-bold">Espaço D'Manuela</h1>
          <p className="text-[#a68d88] tracking-[0.3em] text-[8px] md:text-[9px] mt-1 uppercase font-bold">EXCELÊNCIA EM ESTÉTICA</p>
        </div>
      </header>

      {notice.isActive && step !== Step.Admin && step !== Step.Success && (
        <div className="w-full max-w-lg mb-4 animate-slide-up px-2 sm:px-0">
           <div className="bg-[#8c6b65] text-white p-4 rounded-3xl shadow-lg border border-white/20 flex gap-3 items-center">
              <BellRing className="shrink-0 animate-bounce" size={20} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Comunicado Importante</p>
                <p className="text-xs font-medium leading-tight">{notice.message}</p>
              </div>
           </div>
        </div>
      )}

      <main className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl overflow-hidden z-10 border border-white/50 flex flex-col h-[75vh] sm:h-[80vh] md:h-[82vh]">
        <div className="h-1.5 bg-[#f3e9e7]">
          <div className="h-full bg-[#E6B8B1] transition-all duration-700 ease-out" style={{ width: `${((step + 1) / 6) * 100}%` }}></div>
        </div>

        {step !== Step.Success && (
          <div className="p-4 md:p-5 border-b border-[#f3e9e7] flex items-center justify-between shrink-0">
            <button 
              onClick={() => {
                if (step === Step.Admin) {
                  setStep(Step.ServiceSelection);
                  setIsAdminAuthenticated(false);
                } else {
                  setStep(prev => Math.max(0, prev - 1));
                }
              }} 
              className={`p-2 rounded-full ${step === 0 ? 'opacity-0 pointer-events-none' : 'text-[#8c6b65] active:bg-rose-50 transition-colors'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-base md:text-lg font-serif text-[#634e4a] font-bold text-center px-2 line-clamp-1">
                {step === Step.ServiceSelection && 'Escolha os Procedimentos'}
                {step === Step.DateSelection && 'Data e Horário'}
                {step === Step.PaymentSelection && 'Pagamento'}
                {step === Step.Confirmation && 'Confirmar'}
                {step === Step.Admin && (isAdminAuthenticated ? 'Painel de Gestão' : 'Área Restrita')}
            </h2>
            <div className="w-10"></div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto custom-scrollbar relative">
          {step === Step.ServiceSelection && (
            <div className="space-y-6 sm:space-y-8 pb-24">
              {categories.map(cat => (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Heart size={14} className="text-[#E6B8B1]" />
                    <h3 className="text-[#8c6b65] font-black text-[10px] uppercase tracking-widest">{cat}</h3>
                  </div>
                  <div className="grid gap-4">
                    {services.filter(s => s.category === cat).map(service => {
                      const isSelected = booking.services.some(s => s.id === service.id);
                      return (
                        <div key={service.id} className={`flex flex-col rounded-3xl border-2 transition-all duration-300 transform group ${isSelected ? 'border-[#8c6b65] bg-[#fdfafa] shadow-lg scale-[1.01]' : 'border-[#f3e9e7] bg-white'}`}>
                          {service.imageUrl && (
                            <div className="relative aspect-[16/9] overflow-hidden bg-[#faf7f7] rounded-t-3xl">
                               <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                               <button onClick={(e) => { e.stopPropagation(); setSelectedImage(service.imageUrl!); }} className="absolute top-3 right-3 bg-white/95 p-2 rounded-full text-[#8c6b65] shadow-md hover:bg-white transition-colors z-10 active:scale-90"><Eye size={16} /></button>
                               <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none"></div>
                            </div>
                          )}
                          <button onClick={() => toggleService(service)} className={`p-4 flex items-center justify-between text-left active:bg-rose-50 transition-colors ${!service.imageUrl ? 'rounded-3xl' : ''}`}>
                            <div className="flex-1 pr-3">
                               <p className="font-bold text-sm text-[#634e4a] leading-tight uppercase tracking-tight">{service.name}</p>
                               <p className="text-[10px] font-black text-[#8c6b65] mt-1 opacity-80">R$ {service.price.toFixed(2).replace('.', ',')} • {service.durationMinutes} min</p>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm ${isSelected ? 'bg-[#8c6b65] text-white rotate-0' : 'bg-[#fdf2f0] text-[#E6B8B1]'}`}>
                               {isSelected ? <Check size={18} /> : <Plus size={18} />}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {booking.services.length > 0 && (
                <div className="fixed bottom-6 left-0 right-0 px-4 sm:px-6 z-20 animate-slide-up">
                  <div className="bg-[#8c6b65]/95 p-3 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/20 backdrop-blur-md">
                     <div className="flex items-center gap-3 sm:gap-4 pl-2 sm:pl-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center text-white relative">
                           <ShoppingBag size={18} />
                           <span className="absolute -top-1 -right-1 bg-white text-[#8c6b65] text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#8c6b65]">{booking.services.length}</span>
                        </div>
                        <div className="text-left">
                           <p className="text-white font-black text-xs">R$ {totalServicesPrice.toFixed(2).replace('.', ',')}</p>
                           <p className="text-white/70 text-[8px] font-bold uppercase tracking-widest truncate max-w-[80px] sm:max-w-none">{totalDuration} min</p>
                        </div>
                     </div>
                     <button onClick={() => setStep(Step.DateSelection)} className="bg-white text-[#8c6b65] px-6 sm:px-8 py-3 rounded-full font-black text-[10px] tracking-widest uppercase hover:bg-rose-50 transition-colors shadow-lg active:scale-95">AVANÇAR</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === Step.DateSelection && (
            <div className="space-y-6">
              <button onClick={() => setStep(Step.ServiceSelection)} className="w-full flex items-center justify-between bg-white border border-[#f3e9e7] p-4 rounded-3xl hover:bg-rose-50/30 transition-colors group shadow-sm active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#8c6b65]/10 rounded-full flex items-center justify-center text-[#8c6b65]"><ShoppingBag size={16} /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-[#8c6b65] uppercase leading-none">{booking.services.length} Procedimento(s)</p>
                    <p className="text-[10px] font-medium text-[#a68d88] mt-1">{totalDuration} min de duração</p>
                  </div>
                </div>
                <Edit3 size={14} className="text-[#E6B8B1] opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#a68d88] uppercase tracking-widest ml-1">Data da Visita</label>
                <input type="date" value={booking.date} onChange={(e) => setBooking(prev => ({ ...prev, date: e.target.value, time: '' }))} min={new Date().toISOString().split('T')[0]} className="w-full p-4 rounded-2xl border-2 border-[#f3e9e7] text-[#634e4a] font-bold outline-none focus:border-[#E6B8B1] transition-all bg-white shadow-inner text-sm" />
              </div>

              {booking.date && (
                <div className="animate-slide-up space-y-4">
                  {isAvailableDay(booking.date) ? (
                    <div className="space-y-5">
                       <div className="flex items-center justify-between px-2">
                          <p className="text-[9px] font-black text-[#a68d88] uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Horários Livres</p>
                          {isSyncing && <RefreshCw size={12} className="text-[#E6B8B1] animate-spin" />}
                       </div>
                       <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {allTimeSlots.map(slot => (
                            <button
                              key={slot.time}
                              disabled={slot.isOccupied}
                              onClick={() => setBooking(prev => ({ ...prev, time: slot.time }))}
                              className={`py-4 px-1 rounded-2xl border-2 text-[11px] sm:text-xs font-black transition-all duration-300 transform ${
                                booking.time === slot.time ? 'bg-[#8c6b65] text-white border-[#8c6b65] scale-[1.05] shadow-md' : 
                                slot.isOccupied ? 'bg-[#f3e9e7]/50 text-[#d9c5c2] line-through border-transparent cursor-not-allowed opacity-30' : 'bg-white border-[#f3e9e7] text-[#634e4a] hover:border-[#E6B8B1] active:bg-rose-50 hover:scale-105 hover:shadow-md'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <div className="p-8 sm:p-10 bg-rose-50/50 rounded-[2.5rem] text-center border border-rose-100 flex flex-col items-center shadow-inner">
                       <CalendarX size={32} className="text-rose-300 mb-4" />
                       <p className="text-[10px] sm:text-[11px] text-rose-800 font-black uppercase tracking-widest">
                         {isRecessDate(booking.date) ? 'Salão em Recesso' : 'Sem Agenda Hoje'}
                       </p>
                       {isRecessDate(booking.date) && (
                         <p className="mt-2 text-[10px] font-medium text-rose-600 italic">
                           Bloqueado de {new Date(recessRange.start+'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(recessRange.end+'T00:00:00').toLocaleDateString('pt-BR')}.
                         </p>
                       )}
                       {!isRecessDate(booking.date) && (
                         <div className="mt-3 text-[10px] text-rose-600 font-medium space-y-1">
                            <p>Ter a Sex: 14h às 19:30</p>
                            <p>Sábado: 8h às 12h</p>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              )}

              {booking.time && (
                <div className="pt-4 sticky bottom-0 bg-white/95 backdrop-blur-sm py-4">
                  <button onClick={() => setStep(Step.PaymentSelection)} className="w-full bg-[#E6B8B1] text-white py-4 rounded-3xl font-black shadow-lg hover:bg-[#d8a8a1] transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em]">ESCOLHER PAGAMENTO</button>
                </div>
              )}
            </div>
          )}

          {step === Step.PaymentSelection && (
            <div className="space-y-6">
              <p className="text-[10px] font-black text-[#a68d88] uppercase tracking-widest px-2">Forma de pagamento</p>
              <div className="space-y-3">
                {['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito'].map(p => (
                  <button key={p} onClick={() => setBooking(prev => ({ ...prev, paymentMethod: p as PaymentMethod }))} className={`w-full p-4 sm:p-5 rounded-3xl border-2 font-black text-xs sm:text-sm flex items-center justify-between transition-all active:scale-[0.98] ${booking.paymentMethod === p ? 'border-[#E6B8B1] bg-[#fdfafa] text-[#8c6b65] shadow-md' : 'border-[#f3e9e7] text-[#a68d88] bg-white'}`}>
                    <span>{p}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${booking.paymentMethod === p ? 'bg-[#E6B8B1] border-[#E6B8B1]' : 'border-[#f3e9e7]'}`}>
                      {booking.paymentMethod === p && <Check size={14} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
              {booking.paymentMethod && <button onClick={() => setStep(Step.Confirmation)} className="w-full bg-[#8c6b65] text-white py-5 rounded-3xl font-black mt-6 shadow-xl active:scale-95 transition-all uppercase text-[10px] tracking-[0.2em]">REVISAR AGENDAMENTO</button>}
            </div>
          )}

          {step === Step.Confirmation && (
            <div className="space-y-6 animate-fade-in pb-6">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-[#a68d88] uppercase tracking-widest ml-2">Qual seu nome?</label>
                 <input type="text" placeholder="Ex: Maria Silva" value={booking.name} onChange={(e) => setBooking(prev => ({ ...prev, name: e.target.value }))} className="w-full p-4 rounded-3xl border-2 border-[#f3e9e7] font-black text-center text-[#634e4a] focus:border-[#E6B8B1] outline-none transition-all bg-white shadow-inner text-sm" />
              </div>
              
              <div className="bg-white p-5 rounded-[2rem] border border-[#f3e9e7] shadow-lg space-y-6 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E6B8B1]"></div>
                 <div className="flex items-center gap-3 border-b border-[#f3e9e7] pb-4">
                    <Info size={18} className="text-[#E6B8B1]" /><p className="text-[10px] font-black text-[#8c6b65] uppercase tracking-widest">Resumo do Cuidado</p>
                 </div>
                 <div className="space-y-3">
                    {booking.services.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-[11px] font-bold text-[#634e4a]">
                        <span className="truncate pr-4">{s.name}</span><span className="text-[#a68d88] shrink-0">R$ {s.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm font-black text-[#8c6b65] pt-4 border-t border-[#f3e9e7]">
                       <span>Total Estimado:</span><span>R$ {calculateFinalTotal().toFixed(2).replace('.', ',')}</span>
                    </div>
                 </div>
              </div>
              <button onClick={confirmBooking} disabled={!booking.name} className="w-full bg-[#25D366] text-white py-4 rounded-[2.5rem] font-black flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 hover:bg-[#1eb954] active:scale-95 transition-all text-xs tracking-widest uppercase">
                <MessageCircle size={22} /> AGENDAR PELO WHATSAPP
              </button>
            </div>
          )}

          {step === Step.Admin && (
            <div className="space-y-6 animate-slide-up pb-10">
              {!isAdminAuthenticated ? (
                <div className="py-12 text-center space-y-8">
                  <Lock size={32} className="text-[#8c6b65] mx-auto" />
                  <form onSubmit={handleAdminAuth} className="space-y-5 max-w-[280px] mx-auto px-4">
                    <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Senha" autoFocus className={`w-full p-4 rounded-3xl border-2 text-center text-xl font-black outline-none transition-all ${loginError ? 'border-rose-500 bg-rose-50 animate-shake' : 'border-[#f3e9e7] focus:border-[#E6B8B1] bg-white'}`} />
                    <button type="submit" className="w-full py-4 bg-[#8c6b65] text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95">ACESSAR</button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 p-1 bg-[#f3e9e7]/50 rounded-[1.2rem] overflow-x-auto no-scrollbar">
                    {[{ id: 'config', label: 'Geral' }, { id: 'editor', label: 'Editor' }].map(tab => (
                      <button key={tab.id} onClick={() => setAdminTab(tab.id as any)} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all ${adminTab === tab.id ? 'bg-white shadow-md text-[#8c6b65]' : 'text-[#a68d88]'}`}>{tab.label}</button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
                    {adminTab === 'config' && (
                      <div className="space-y-8 animate-fade-in pt-4 px-1">
                        {/* Mensagem de Alerta */}
                        <div className="bg-white p-5 rounded-[2rem] border border-[#f3e9e7] space-y-4 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-[9px] uppercase tracking-widest flex items-center gap-2"><BellRing size={14}/> Comunicado</span>
                            <button onClick={() => setNotice(prev => ({ ...prev, isActive: !prev.isActive }))}>{notice.isActive ? <ToggleRight className="text-green-500" size={32} /> : <ToggleLeft className="text-gray-300" size={32} />}</button>
                          </div>
                          <textarea value={notice.message} onChange={(e) => setNotice(prev => ({ ...prev, message: e.target.value }))} className="w-full p-4 rounded-2xl border-2 border-[#f3e9e7] text-[11px] font-medium outline-none h-24 resize-none focus:border-[#E6B8B1] transition-all" placeholder="Digite o aviso..."/>
                        </div>

                        {/* Recesso */}
                        <div className="bg-white p-5 rounded-[2rem] border border-[#f3e9e7] space-y-4 shadow-sm">
                          <span className="font-black text-[9px] uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> Recesso / Férias / Folga</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-[#a68d88] uppercase tracking-tighter">Início do Recesso</label>
                               <input type="date" value={recessRange.start} onChange={(e) => setRecessRange(prev => ({...prev, start: e.target.value}))} className="w-full p-3 rounded-xl border-2 border-[#f3e9e7] text-[10px] font-black outline-none focus:border-[#E6B8B1]"/>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[8px] font-black text-[#a68d88] uppercase tracking-tighter">Final do Recesso</label>
                               <input type="date" value={recessRange.end} onChange={(e) => setRecessRange(prev => ({...prev, end: e.target.value}))} className="w-full p-3 rounded-xl border-2 border-[#f3e9e7] text-[10px] font-black outline-none focus:border-[#E6B8B1]"/>
                            </div>
                          </div>
                          <p className="text-[8px] text-[#a68d88] font-medium italic">* Durante essas datas, os clientes verão um aviso de fechado.</p>
                        </div>

                        {/* Script URL */}
                        <div className="bg-white p-5 rounded-[2rem] border border-[#f3e9e7] space-y-4 shadow-sm">
                          <span className="font-black text-[9px] uppercase tracking-widest flex items-center gap-2"><LinkIcon size={14}/> Link do Script App Web</span>
                          <div className="flex gap-2">
                             <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://script.google.com/..." className="flex-1 p-3 rounded-xl border-2 border-[#f3e9e7] text-[9px] font-mono outline-none focus:border-[#E6B8B1]"/>
                             <button onClick={testConnection} className={`p-3 rounded-xl transition-all shadow-md active:scale-90 ${connStatus === 'success' ? 'bg-green-500 text-white' : connStatus === 'error' ? 'bg-rose-500 text-white' : 'bg-[#8c6b65] text-white'}`}><Send size={16}/></button>
                          </div>
                          {connStatus === 'error' && <p className="text-[8px] text-rose-500 font-bold uppercase tracking-tighter">Link inválido ou Script não publicado como 'Qualquer pessoa'.</p>}
                        </div>
                      </div>
                    )}
                    
                    {adminTab === 'editor' && (
                      <div className="space-y-6 animate-fade-in pt-4 px-1">
                        {/* Novo Procedimento */}
                        <div className="bg-white p-5 rounded-[2.5rem] border border-[#f3e9e7] shadow-sm space-y-4">
                           <div className="flex items-center gap-2 text-[#8c6b65] font-black text-[9px] uppercase border-b border-[#f3e9e7] pb-3"><Plus size={14}/> Adicionar Novo Procedimento</div>
                           <div className="space-y-3">
                              <input type="text" placeholder="Nome" value={newService.name} onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))} className="w-full p-3 rounded-xl border-2 border-[#f3e9e7] text-[11px] font-bold outline-none focus:border-[#E6B8B1]"/>
                              <div className="grid grid-cols-2 gap-2">
                                <select value={newService.category} onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value as any }))} className="p-3 rounded-xl border-2 border-[#f3e9e7] text-[11px] font-bold outline-none focus:border-[#E6B8B1] bg-white">
                                  {['Cílios', 'Sobrancelhas', 'Depilação', 'Manutenção', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="relative">
                                  <input type="number" placeholder="Preço" value={newService.price} onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))} className="w-full p-3 pl-7 rounded-xl border-2 border-[#f3e9e7] text-[11px] font-bold outline-none focus:border-[#E6B8B1]"/>
                                  <span className="absolute left-2.5 top-3.5 text-[9px] font-black text-[#a68d88]">R$</span>
                                </div>
                              </div>
                              <input type="number" placeholder="Duração (minutos)" value={newService.duration} onChange={(e) => setNewService(prev => ({ ...prev, duration: e.target.value }))} className="w-full p-3 rounded-xl border-2 border-[#f3e9e7] text-[11px] font-bold outline-none focus:border-[#E6B8B1]"/>
                              <button onClick={addNewService} className="w-full bg-[#8c6b65] text-white py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-[0.98]">CADASTRAR</button>
                           </div>
                        </div>

                        {/* Lista e Retificação */}
                        <div className="space-y-3">
                           <div className="flex items-center justify-between px-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#a68d88] flex items-center gap-2"><LayoutList size={14}/> Retificação de Valores</span>
                              <button onClick={resetServicesToDefault} className="text-rose-400 font-bold text-[8px] uppercase flex items-center gap-1"><RotateCcw size={10}/> Resetar Original</button>
                           </div>
                           {services.map(s => (
                             <div key={s.id} className="bg-white p-4 rounded-[1.8rem] border border-[#f3e9e7] shadow-sm space-y-3 group transition-all hover:border-[#E6B8B1]/30">
                                <div className="flex items-center gap-2">
                                   <input type="text" value={s.name} onChange={(e) => updateServiceDetail(s.id, 'name', e.target.value)} className="flex-1 p-2 rounded-lg border-2 border-transparent hover:border-[#f3e9e7] focus:border-[#E6B8B1] outline-none text-[11px] font-bold text-[#634e4a]"/>
                                   <button onClick={() => deleteService(s.id)} className="text-rose-300 hover:text-rose-500 p-2 active:scale-90"><Trash2 size={16}/></button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                   <div className="relative">
                                      <span className="absolute left-2 top-2.5 text-[8px] font-black text-[#a68d88]">R$</span>
                                      <input type="number" value={s.price || ''} onChange={(e) => updateServiceDetail(s.id, 'price', parseFloat(e.target.value))} className="w-full p-2 pl-6 rounded-lg border border-[#f3e9e7] text-[10px] font-black text-[#8c6b65] outline-none focus:border-[#E6B8B1]"/>
                                   </div>
                                   <div className="relative">
                                      <input type="number" value={s.durationMinutes || ''} onChange={(e) => updateServiceDetail(s.id, 'durationMinutes', parseInt(e.target.value))} className="w-full p-2 pr-6 rounded-lg border border-[#f3e9e7] text-[10px] font-black text-center outline-none focus:border-[#E6B8B1]"/>
                                      <span className="absolute right-2 top-2.5 text-[8px] font-black text-[#a68d88]">min</span>
                                   </div>
                                   <select value={s.category} onChange={(e) => updateServiceDetail(s.id, 'category', e.target.value)} className="w-full p-2 rounded-lg border border-[#f3e9e7] text-[8px] font-black uppercase bg-[#fafafa]">
                                      {['Cílios', 'Sobrancelhas', 'Depilação', 'Manutenção', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setStep(Step.ServiceSelection); setIsAdminAuthenticated(false); }} className="w-full py-4 bg-[#8c6b65] text-white rounded-3xl font-black text-[10px] uppercase shadow-xl mt-4 shrink-0 active:scale-[0.98]">FINALIZAR GESTÃO</button>
                </>
              )}
            </div>
          )}

          {step === Step.Success && (
            <div className="text-center py-12 space-y-8 animate-step-enter flex flex-col items-center justify-center h-full">
               <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center border border-green-100"><CheckCircle2 size={64} className="text-[#25D366]" /></div>
               <div className="space-y-3 px-6"><h3 className="text-2xl font-serif font-bold text-[#8c6b65]">Agendamento Enviado!</h3><p className="text-[11px] text-[#a68d88]">Fique atenta ao WhatsApp para a confirmação da Dyanne.</p></div>
               <button onClick={() => { setBooking({ services: [], date: '', time: '', name: '', paymentMethod: null }); setStep(Step.ServiceSelection); }} className="w-full max-w-[240px] bg-[#8c6b65] text-white py-4 rounded-3xl font-black uppercase text-[10px]">INÍCIO</button>
            </div>
          )}
        </div>
      </main>
      
      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes step-enter { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-step-enter { animation: step-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E6B8B1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;