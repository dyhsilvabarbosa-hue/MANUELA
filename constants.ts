
import { Service } from './types';

export const SERVICES: Service[] = [
  // Cílios (Duração: 120 min)
  { 
    id: 'c1', 
    name: 'Volume Express', 
    price: 100, 
    category: 'Cílios', 
    durationMinutes: 120,
    imageUrl: './input_file_1.png' 
  },
  { 
    id: 'c2', 
    name: 'Volume Brasileiro', 
    price: 120, 
    category: 'Cílios', 
    durationMinutes: 120,
    imageUrl: './input_file_3.png' 
  },
  { 
    id: 'c3', 
    name: 'Volume 6D', 
    price: 140, 
    category: 'Cílios', 
    durationMinutes: 120,
    imageUrl: './input_file_5.png' 
  },
  { 
    id: 'c4', 
    name: 'Mega Brasileiro', 
    price: 160, 
    category: 'Cílios', 
    durationMinutes: 120,
    imageUrl: './input_file_6.png' 
  },
  
  // Manutenções (Duração: 120 min)
  { id: 'm1', name: 'Manutenção Cílios (15 dias)', price: 85, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm2', name: 'Manutenção Cílios (20 dias)', price: 90, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm3', name: 'Manutenção Cílios (30 dias)', price: 95, category: 'Manutenção', durationMinutes: 120 },

  // Sobrancelhas (Duração: variável)
  { 
    id: 's1', 
    name: 'Design Personalizado', 
    price: 30, 
    category: 'Sobrancelhas', 
    durationMinutes: 30,
    imageUrl: './input_file_2.png' 
  },
  { 
    id: 's2', 
    name: 'Design com Henna', 
    price: 45, 
    category: 'Sobrancelhas', 
    durationMinutes: 60,
    imageUrl: './input_file_0.png' 
  },
  { id: 's4', name: 'Retoque Henna', price: 25, category: 'Sobrancelhas', durationMinutes: 60 },

  // Depilação (Duração: 30 min)
  { id: 'd1', name: 'Buço', price: 20, category: 'Depilação', durationMinutes: 30 },
  { id: 'd2', name: 'Queixo', price: 18, category: 'Depilação', durationMinutes: 30 },
  { id: 'd3', name: 'Axila', price: 35, category: 'Depilação', durationMinutes: 30 },
  { id: 'd7', name: 'Perna Inteira', price: 55, category: 'Depilação', durationMinutes: 30 },
  { id: 'd9', name: 'Virilha Completa', price: 70, category: 'Depilação', durationMinutes: 30 },

  // Outros / Remoções (Duração: 30 min)
  { id: 'o1', name: 'Remoção Cílios (Outra prof.)', price: 40, category: 'Outros', durationMinutes: 30 },
  { id: 'o2', name: 'Remoção Cílios', price: 30, category: 'Outros', durationMinutes: 30 },
];

export const BUSINESS_HOURS = {
  wed_fri: { start: '14:00', end: '19:30' },
  sat: { start: '08:00', end: '12:00' },
};

export const WHATSAPP_NUMBER = '5521981477618';
export const CARD_SURCHARGE = 5.0;
export const GOOGLE_CALENDAR_EMAIL = 'dyh.silva.barbosa@gmail.com';
