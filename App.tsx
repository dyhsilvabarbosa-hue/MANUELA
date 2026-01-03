
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Calendar, Clock, User, ArrowLeft, MessageCircle, Info, Banknote, CreditCard, QrCode, X, Eye, CheckCircle2, Sparkles, RefreshCw, AlertTriangle, ImageOff, Plus, Check, ShieldCheck, Trash2, CalendarX, Globe, Settings, Link as LinkIcon, Send, CalendarDays, BellRing, ToggleLeft, ToggleRight } from 'lucide-react';
import { SERVICES, BUSINESS_HOURS, WHATSAPP_NUMBER, CARD_SURCHARGE, GOOGLE_CALENDAR_EMAIL } from './constants';
import { Service, BookingState, Step, PaymentMethod, RecessDay, AppNotice } from './types';

interface BookedSlot {
  time: string;
  duration: number;
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [step, setStep] = useState<Step>(Step.ServiceSelection);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<BookedSlot[]>([]);
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  // States para o intervalo de recesso no admin
  const [recessStart, setRecessStart] = useState('');
  const [recessEnd, setRecessEnd] = useState('');

  // Configurações de Comunicado
  const [notice, setNotice] = useState<AppNotice>(() => {
    const saved = localStorage.getItem('espaco_dmanuela_notice');
    return saved ? JSON.parse(saved) : { message: 'Bem-vinda! Agende seu horário com antecedência.', isActive: false };
  });

  const [bookedSlots, setBookedSlots] = useState<Record<string, BookedSlot[]>>(() => {
    const saved = localStorage.getItem('espaco_dmanuela_bookings');
    return saved ? JSON.parse(saved) : {};
  });

  const [recessDays, setRecessDays] = useState<RecessDay[]>(() => {
    const saved = localStorage.getItem('espaco_dmanuela_recess');
    return saved ? JSON.parse(saved) : [];
  });

  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('espaco_dmanuela_webhook') || '');

  const [booking, setBooking] = useState<BookingState>({
    services: [],
    date: '',
    time: '',
    name: '',
    paymentMethod: null,
  });

  useEffect(() => {
    localStorage.setItem('espaco_dmanuela_bookings', JSON.stringify(bookedSlots));
    localStorage.setItem('espaco_dmanuela_recess', JSON.stringify(recessDays));
    localStorage.setItem('espaco_dmanuela_webhook', webhookUrl);
    localStorage.setItem('espaco_dmanuela_notice', JSON.stringify(notice));
  }, [bookedSlots, recessDays, webhookUrl, notice]);

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
      console.warn("Agenda offline ou URL inválida.");
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
      const description = `Procedimentos: ${booking.services.map(s => s.name).join(', ')}\nPagamento: ${booking.paymentMethod}\nTotal: R$ ${calculateFinalTotal().toFixed(2)}`;
      
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
      console.error("Erro de sincronização", error);
      return true;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const categories = Array.from(new Set(SERVICES.map(s => s.category)));

  const toggleService = (service: Service) => {
    setBooking(prev => {
      const exists = prev.services.some(s => s.id === service.id);
      if (exists) return { ...prev, services: prev.services.filter(s => s.id !== service.id) };
      return { ...prev, services: [...prev.services, service] };
    });
  };

  const totalDuration = useMemo(() => booking.services.reduce((acc, s) => acc + s.durationMinutes, 0), [booking.services]);
  const totalServicesPrice = useMemo(() => booking.services.reduce((acc, s) => acc + s.price, 0), [booking.services]);

  const isRecessDay = (dateString: string) => recessDays.some(rd => rd.date === dateString);

  const isAvailableDay = (dateString: string) => {
    if (!dateString || isRecessDay(dateString)) return false;
    const dateParts = dateString.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayOfWeek = date.getDay(); 
    return dayOfWeek >= 3 && dayOfWeek <= 6; 
  };

  const addRecessRange = () => {
    if (!recessStart) return;
    
    const start = new Date(recessStart + 'T00:00:00');
    const end = recessEnd ? new Date(recessEnd + 'T00:00:00') : new Date(recessStart + 'T00:00:00');
    
    if (end < start) {
      alert("A data final não pode ser anterior à inicial.");
      return;
    }

    const newDays: RecessDay[] = [];
    let current = new Date(start);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (!recessDays.some(rd => rd.date === dateStr)) {
        newDays.push({ date: dateStr, reason: 'Recesso' });
      }
      current.setDate(current.getDate() + 1);
    }

    setRecessDays(prev => [...prev, ...newDays].sort((a, b) => a.date.localeCompare(b.date)));
    setRecessStart('');
    setRecessEnd('');
  };

  const allTimeSlots = useMemo(() => {
    if (!booking.date || booking.services.length === 0) return [];
    const dateParts = booking.date.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayOfWeek = date.getDay();
    
    const { wed_fri, sat } = BUSINESS_HOURS;
    const { start, end } = (dayOfWeek === 6) ? sat : wed_fri;

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

      if (curEndMin <= (endH * 60 + endM)) {
        slots.push({ time: timeStr, isOccupied });
      }
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  }, [booking.date, totalDuration, bookedSlots, googleEvents]);

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

    const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const total = calculateFinalTotal();
    const servicesList = booking.services.map(s => `- ${s.name}`).join('%0A');
    
    const message = `Olá! Acabei de agendar no Espaço D'Manuela:%0A%0A*Cliente:* ${booking.name}%0A*Procedimentos:*%0A${servicesList}%0A*Data:* ${formattedDate}%0A*Horário:* ${booking.time}%0A*Pagamento:* ${booking.paymentMethod}%0A*Total:* R$ ${total.toFixed(2).replace('.', ',')}%0A%0A_Agendamento confirmado automaticamente na sua agenda._`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    setStep(Step.Success);
  };

  return (
    <div className="min-h-screen bg-[#faf7f7] flex flex-col items-center px-4 py-6 md:py-10 pb-24 relative overflow-x-hidden">
      {(isLoading || isSyncing) && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#faf7f7]/95 backdrop-blur-md">
           <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-[#E6B8B1] border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-6 font-black text-[#8c6b65] uppercase tracking-widest text-[9px] md:text-[10px] animate-pulse px-6 text-center">
              {isSyncing ? 'Sincronizando Agenda...' : 'Espaço D\'Manuela'}
           </p>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Técnica" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl animate-zoom-in" />
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
            className="mb-4 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-2 border-[#E6B8B1] overflow-hidden p-1 hover:rotate-6 transition-transform relative"
          >
            <div className="w-full h-full bg-[#E6B8B1] rounded-full flex items-center justify-center shadow-inner">
               <span className="text-white text-2xl md:text-3xl font-serif font-bold italic">M</span>
            </div>
          </button>
          <h1 className="text-2xl md:text-4xl font-serif text-[#8c6b65] font-bold">Espaço D'Manuela</h1>
          <p className="text-[#a68d88] tracking-[0.3em] md:tracking-[0.4em] text-[8px] md:text-[9px] mt-1 uppercase font-black">POR: DYANNE BARBOSA</p>
        </div>
      </header>

      {/* Comunicado Importante para o Cliente */}
      {notice.isActive && step !== Step.Admin && step !== Step.Success && (
        <div className="w-full max-w-lg mb-4 animate-slide-up">
           <div className="bg-[#8c6b65] text-white p-4 rounded-3xl shadow-lg border border-white/20 flex gap-3 items-center">
              <BellRing className="shrink-0 animate-bounce" size={20} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Comunicado Importante</p>
                <p className="text-xs font-medium leading-tight">{notice.message}</p>
              </div>
           </div>
        </div>
      )}

      <main className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden z-10 border border-white/50">
        <div className="flex h-1.5 bg-[#f3e9e7]">
          <div className="bg-[#E6B8B1] transition-all duration-700" style={{ width: `${((step + 1) / 6) * 100}%` }}></div>
        </div>

        {step !== Step.Success && (
          <div className="p-4 md:p-5 border-b border-[#f3e9e7] flex items-center justify-between">
            <button onClick={() => setStep(prev => prev === Step.Admin ? Step.ServiceSelection : Math.max(0, prev - 1))} className={`p-2 rounded-full ${step === 0 ? 'opacity-0' : 'text-[#8c6b65] active:bg-rose-50 transition-colors'}`}><ArrowLeft size={20} /></button>
            <h2 className="text-base md:text-lg font-serif text-[#634e4a] font-black text-center px-2 line-clamp-1">
                {step === Step.ServiceSelection && 'Escolha seus Procedimentos'}
                {step === Step.DateSelection && 'Data e Horário'}
                {step === Step.PaymentSelection && 'Pagamento'}
                {step === Step.Confirmation && 'Confirmar'}
                {step === Step.Admin && 'Painel de Gestão'}
            </h2>
            <div className="w-10"></div>
          </div>
        )}

        <div className="p-4 md:p-6 max-h-[65vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar">
          {step === Step.ServiceSelection && (
            <div className="space-y-6 pb-20">
              {categories.map(cat => (
                <div key={cat} className="space-y-3">
                  <h3 className="text-[#8c6b65] font-black text-[9px] uppercase tracking-widest px-2">{cat}</h3>
                  <div className="grid gap-3">
                    {SERVICES.filter(s => s.category === cat).map(service => {
                      const isSelected = booking.services.some(s => s.id === service.id);
                      return (
                        <div key={service.id} className={`flex flex-col rounded-[1.5rem] md:rounded-3xl border-2 transition-all ${isSelected ? 'border-[#E6B8B1] bg-[#fdfafa] shadow-md' : 'border-[#f3e9e7] bg-white'}`}>
                          {service.imageUrl && (
                            <div className="relative h-28 md:h-32 overflow-hidden bg-[#faf7f7] rounded-t-[1.3rem] md:rounded-t-3xl">
                               <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                               <button onClick={(e) => { e.stopPropagation(); setSelectedImage(service.imageUrl!); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-[#8c6b65] shadow-sm"><Eye size={14} /></button>
                            </div>
                          )}
                          <button onClick={() => toggleService(service)} className="p-3 md:p-4 flex items-center justify-between text-left">
                            <div className="flex-1 pr-2">
                               <p className="font-bold text-sm text-[#634e4a] leading-snug">{service.name}</p>
                               <p className="text-[10px] font-black text-[#8c6b65] mt-0.5">R$ {service.price.toFixed(2).replace('.', ',')} • {service.durationMinutes} min</p>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#E6B8B1] text-white' : 'bg-[#fdf2f0] text-[#E6B8B1]'}`}>
                               {isSelected ? <Check size={16} /> : <Plus size={16} />}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 z-20">
                <button onClick={() => setStep(Step.DateSelection)} disabled={booking.services.length === 0} className="w-full max-w-sm bg-[#8c6b65] text-white py-4 rounded-full font-black shadow-2xl disabled:opacity-50 transition-all hover:bg-[#725752] active:scale-95 text-xs md:text-sm tracking-widest">ESCOLHER HORÁRIO</button>
              </div>
            </div>
          )}

          {step === Step.DateSelection && (
            <div className="space-y-6">
              <div className="bg-[#fdf2f0] p-4 rounded-2xl flex items-center gap-3 border border-[#E6B8B1]/20">
                <Clock size={18} className="text-[#E6B8B1] shrink-0" />
                <p className="text-[11px] font-black text-[#8c6b65]">Duração estimada: {Math.floor(totalDuration / 60)}h {totalDuration % 60}min</p>
              </div>

              <div className="space-y-2 px-1">
                <label className="text-[9px] font-black text-[#a68d88] uppercase tracking-widest ml-1">Selecione o Dia</label>
                <input type="date" value={booking.date} onChange={(e) => setBooking(prev => ({ ...prev, date: e.target.value, time: '' }))} min={new Date().toISOString().split('T')[0]} className="w-full p-4 rounded-2xl border-2 border-[#f3e9e7] text-[#634e4a] font-bold outline-none focus:border-[#E6B8B1] transition-colors" />
              </div>

              {booking.date && (
                <div className="animate-slide-up space-y-4">
                  {isAvailableDay(booking.date) ? (
                    <div className="space-y-4">
                       <div className="flex items-center justify-between px-1">
                          <p className="text-[9px] font-black text-[#a68d88] uppercase tracking-widest flex items-center gap-2">
                            <Globe size={10} /> {isSyncing ? 'Sincronizando...' : 'Horários Livres'}
                          </p>
                          {isSyncing && <RefreshCw size={10} className="text-[#E6B8B1] animate-spin" />}
                       </div>
                       <div className="grid grid-cols-3 xs:grid-cols-4 gap-2">
                          {allTimeSlots.map(slot => (
                            <button
                              key={slot.time}
                              disabled={slot.isOccupied}
                              onClick={() => setBooking(prev => ({ ...prev, time: slot.time }))}
                              className={`py-3 px-2 rounded-xl border-2 text-xs font-black transition-all ${
                                booking.time === slot.time ? 'bg-[#8c6b65] text-white border-[#8c6b65] scale-105 shadow-md' : 
                                slot.isOccupied ? 'bg-[#f3e9e7]/50 text-[#d9c5c2] line-through border-transparent cursor-not-allowed opacity-40' : 'bg-white border-[#f3e9e7] text-[#634e4a] hover:border-[#E6B8B1] active:bg-[#fdfafa]'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-rose-50/50 rounded-3xl text-center border border-rose-100 flex flex-col items-center">
                       <CalendarX size={32} className="text-rose-300 mb-3" />
                       <p className="text-[11px] text-rose-800 font-black uppercase tracking-widest">{isRecessDay(booking.date) ? 'Recesso Programado' : 'Espaço Fechado'}</p>
                       <div className="mt-2 text-[10px] text-rose-600 font-medium space-y-1">
                          <p>Qua a Sex: 14h às 19:30</p>
                          <p>Sábado: 8h às 12h</p>
                       </div>
                    </div>
                  )}
                </div>
              )}

              {booking.time && (
                <div className="pt-4">
                  <button onClick={() => setStep(Step.PaymentSelection)} className="w-full bg-[#E6B8B1] text-white py-4 rounded-2xl font-black shadow-lg hover:bg-[#d8a8a1] transition-colors active:scale-95 uppercase text-xs md:text-sm tracking-widest">PRÓXIMO PASSO</button>
                </div>
              )}
            </div>
          )}

          {step === Step.PaymentSelection && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-[#a68d88] uppercase tracking-widest px-1">Como deseja pagar?</p>
              <div className="space-y-2.5">
                {['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito'].map(p => (
                  <button 
                    key={p} 
                    onClick={() => setBooking(prev => ({ ...prev, paymentMethod: p as PaymentMethod }))} 
                    className={`w-full p-4 rounded-2xl border-2 font-black text-sm flex items-center justify-between transition-all ${booking.paymentMethod === p ? 'border-[#E6B8B1] bg-[#fdfafa] text-[#8c6b65] shadow-sm' : 'border-[#f3e9e7] text-[#a68d88] bg-white hover:border-[#E6B8B1]/30'}`}
                  >
                    <span>{p}</span>
                    {booking.paymentMethod === p && <Check size={16} className="text-[#E6B8B1]" />}
                  </button>
                ))}
              </div>
              {booking.paymentMethod && (
                <button onClick={() => setStep(Step.Confirmation)} className="w-full bg-[#8c6b65] text-white py-4 rounded-2xl font-black mt-6 shadow-xl active:scale-95 transition-all uppercase text-xs md:text-sm tracking-widest">REVISAR DADOS</button>
              )}
            </div>
          )}

          {step === Step.Confirmation && (
            <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-[#a68d88] uppercase tracking-widest ml-1">Seu Nome para a Agenda</label>
                 <input 
                   type="text" 
                   placeholder="Nome e Sobrenome" 
                   value={booking.name} 
                   onChange={(e) => setBooking(prev => ({ ...prev, name: e.target.value }))} 
                   className="w-full p-4 rounded-2xl border-2 border-[#f3e9e7] font-black text-center text-[#634e4a] focus:border-[#E6B8B1] outline-none transition-colors" 
                 />
              </div>
              
              <div className="bg-white p-5 rounded-3xl border border-[#f3e9e7] shadow-sm space-y-4">
                 <div className="flex items-center gap-2 border-b border-[#f3e9e7] pb-2 mb-2">
                    <div className="w-6 h-6 bg-[#E6B8B1]/20 rounded-full flex items-center justify-center">
                       <Info size={14} className="text-[#E6B8B1]" />
                    </div>
                    <p className="text-[10px] font-black text-[#8c6b65] uppercase">Resumo da Visita</p>
                 </div>
                 <div className="flex justify-between text-sm font-black text-[#634e4a]">
                    <span>Valor Total:</span>
                    <span className="text-[#8c6b65]">R$ {calculateFinalTotal().toFixed(2).replace('.', ',')}</span>
                 </div>
                 <div className="space-y-1.5 pt-2 border-t border-[#f3e9e7]/50">
                    <div className="flex justify-between text-[11px] text-[#a68d88] font-medium"><span>Data Agendada:</span><span>{new Date(booking.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
                    <div className="flex justify-between text-[11px] text-[#a68d88] font-medium"><span>Horário:</span><span>{booking.time}h</span></div>
                    <div className="flex justify-between text-[11px] text-[#a68d88] font-medium"><span>Pagamento:</span><span>{booking.paymentMethod}</span></div>
                 </div>
              </div>

              <button onClick={confirmBooking} disabled={!booking.name} className="w-full bg-[#25D366] text-white py-4 md:py-5 rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 hover:bg-[#1eb954] active:scale-95 transition-all text-sm md:text-base tracking-widest">
                <MessageCircle size={22} /> FINALIZAR NO WHATSAPP
              </button>
            </div>
          )}

          {step === Step.Admin && (
            <div className="space-y-6 animate-slide-up pb-10">
              <div className="flex items-center gap-2 text-[#8c6b65]">
                 <div className="w-10 h-10 bg-[#E6B8B1]/20 rounded-full flex items-center justify-center">
                    <Settings size={22} />
                 </div>
                 <h3 className="font-serif font-bold text-lg md:text-xl">Painel Administrativo</h3>
              </div>

              {/* Seção de Comunicados Importantes */}
              <div className="bg-[#fdf2f0] p-4 md:p-5 rounded-3xl border border-[#E6B8B1]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#8c6b65] font-black text-[10px] uppercase">
                    <BellRing size={14} /> Comunicado aos Clientes
                  </div>
                  <button 
                    onClick={() => setNotice(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className="transition-transform active:scale-90"
                  >
                    {notice.isActive ? <ToggleRight className="text-green-500" size={32} /> : <ToggleLeft className="text-gray-300" size={32} />}
                  </button>
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] text-[#a68d88] leading-tight">Escreva um aviso que aparecerá no topo do app (ex: Férias, avisos de cartão, etc).</p>
                   <textarea 
                     value={notice.message}
                     onChange={(e) => setNotice(prev => ({ ...prev, message: e.target.value }))}
                     placeholder="Digite seu comunicado aqui..."
                     className="w-full p-3 rounded-xl border-2 border-[#f3e9e7] text-xs font-medium focus:border-[#E6B8B1] outline-none shadow-inner min-h-[80px] resize-none"
                   />
                </div>
              </div>

              <div className="bg-[#fdf2f0] p-4 md:p-5 rounded-3xl border border-[#E6B8B1]/30 space-y-4">
                <div className="flex items-center gap-2 text-[#8c6b65] font-black text-[10px] uppercase">
                   <LinkIcon size={14} /> Integração Google Agenda
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-[#a68d88] leading-tight">
                    Cole a <strong>URL de Implantação</strong> do Google Apps Script abaixo para que o app leia sua agenda.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://script.google.com/macros/s/..." 
                      value={webhookUrl} 
                      onChange={(e) => setWebhookUrl(e.target.value)} 
                      className="flex-1 p-3 rounded-xl border-2 border-[#f3e9e7] text-[10px] font-mono focus:border-[#E6B8B1] outline-none shadow-inner"
                    />
                    <button 
                      onClick={testConnection} 
                      disabled={!webhookUrl || connStatus === 'testing'}
                      className={`p-3 rounded-xl transition-all ${
                        connStatus === 'success' ? 'bg-green-500 text-white' : 
                        connStatus === 'error' ? 'bg-rose-500 text-white' : 
                        'bg-[#8c6b65] text-white hover:bg-[#725752]'
                      }`}
                    >
                      {connStatus === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : 
                       connStatus === 'success' ? <Check size={14} /> : 
                       connStatus === 'error' ? <X size={14} /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#8c6b65] font-black text-[10px] uppercase px-1">
                   <CalendarDays size={14} /> Bloquear Período (Recessos)
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#f3e9e7] space-y-4 shadow-sm">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-[#a68d88] uppercase">Data Início</label>
                         <input 
                           type="date" 
                           value={recessStart} 
                           onChange={(e) => setRecessStart(e.target.value)} 
                           className="w-full p-2.5 rounded-xl border-2 border-[#f3e9e7] text-xs font-bold outline-none focus:border-[#E6B8B1]" 
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-[#a68d88] uppercase">Data Fim (Opcional)</label>
                         <input 
                           type="date" 
                           value={recessEnd} 
                           onChange={(e) => setRecessEnd(e.target.value)} 
                           className="w-full p-2.5 rounded-xl border-2 border-[#f3e9e7] text-xs font-bold outline-none focus:border-[#E6B8B1]" 
                         />
                      </div>
                   </div>
                   <button 
                     onClick={addRecessRange} 
                     disabled={!recessStart}
                     className="w-full bg-[#E6B8B1] text-white py-3 rounded-xl font-black text-[10px] hover:bg-[#8c6b65] transition-colors shadow-sm disabled:opacity-50"
                   >
                     BLOQUEAR DATAS SELECIONADAS
                   </button>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                   {recessDays.length === 0 && <p className="text-center text-[10px] text-[#a68d88] py-6 italic border border-dashed border-[#f3e9e7] rounded-xl">Nenhuma data bloqueada.</p>}
                   {recessDays.map((rd, i) => (
                     <div key={rd.date} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#f3e9e7] shadow-sm">
                        <span className="text-[11px] font-black text-[#634e4a]">{new Date(rd.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        <button onClick={() => setRecessDays(prev => prev.filter(day => day.date !== rd.date))} className="text-rose-400 p-2 hover:bg-rose-50 rounded-full transition-colors active:scale-90"><Trash2 size={16} /></button>
                     </div>
                   ))}
                </div>
              </div>

              <button onClick={() => setStep(Step.ServiceSelection)} className="w-full py-4 bg-[#8c6b65] text-white rounded-2xl font-black text-xs md:text-sm tracking-widest uppercase shadow-lg hover:bg-[#725752] transition-colors">SALVAR E SAIR</button>
            </div>
          )}

          {step === Step.Success && (
            <div className="text-center py-10 md:py-14 space-y-6 animate-step-enter">
               <div className="relative inline-block">
                 <div className="w-20 h-20 md:w-24 md:h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-inner border border-green-100">
                    <CheckCircle2 size={56} className="text-[#25D366]" />
                 </div>
                 <div className="absolute -top-1 -right-1">
                    <Sparkles className="text-amber-400 animate-pulse" size={20} />
                 </div>
               </div>
               <div className="space-y-2">
                 <h3 className="text-2xl md:text-3xl font-serif font-black text-[#8c6b65]">Tudo Pronto!</h3>
                 <p className="text-xs md:text-sm text-[#a68d88] px-6 leading-relaxed">
                   Seu horário foi reservado e a confirmação foi enviada para o WhatsApp. Te esperamos com carinho!
                 </p>
               </div>
               <div className="pt-4">
                 <button onClick={() => { setBooking({ services: [], date: '', time: '', name: '', paymentMethod: null }); setConnStatus('idle'); setStep(Step.ServiceSelection); }} className="w-full bg-[#8c6b65] text-white py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform active:scale-95 text-xs md:text-sm uppercase tracking-widest">NOVO AGENDAMENTO</button>
               </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-8 text-center opacity-40 px-6">
         <p className="font-serif italic text-sm text-[#8c6b65] font-bold">Espaço D'Manuela</p>
         <p className="text-[8px] md:text-[9px] uppercase font-black tracking-[0.2em] mt-1">Sincronizado via Google Cloud Services</p>
      </footer>

      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes step-enter { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-step-enter { animation: step-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E6B8B1; border-radius: 10px; }
        .animate-zoom-in { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
