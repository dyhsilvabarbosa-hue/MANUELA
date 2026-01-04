
import { Service } from './types';

export const SERVICES: Service[] = [
  // Cílios
  { id: 'c1', name: 'Volume Express', price: 100, category: 'Cílios', durationMinutes: 120 },
  { id: 'c2', name: 'Volume Brasileiro', price: 120, category: 'Cílios', durationMinutes: 120 },
  { id: 'c3', name: 'Volume 6D', price: 140, category: 'Cílios', durationMinutes: 120 },
  { id: 'c4', name: 'Fox eyes', price: 130, category: 'Cílios', durationMinutes: 120 },
  { id: 'c5', name: 'Mega Brasileiro', price: 160, category: 'Cílios', durationMinutes: 120 },

  // Sobrancelhas
  { id: 's1', name: 'Design Personalizado', price: 30, category: 'Sobrancelhas', durationMinutes: 30 },
  { id: 's2', name: 'Design com Henna', price: 40, category: 'Sobrancelhas', durationMinutes: 60 },

  // Depilação
  { id: 'd1', name: 'Buço (Depilação)', price: 20, category: 'Depilação', durationMinutes: 30 },
  { id: 'd2', name: 'Axila (Depilação)', price: 30, category: 'Depilação', durationMinutes: 30 },
  { id: 'd3', name: 'Virilha Completa', price: 65, category: 'Depilação', durationMinutes: 45 },
  { id: 'd4', name: 'Braço ( depilação )', price: 40, category: 'Depilação', durationMinutes: 30 },
  { id: 'd5', name: 'Linha do umbigo ( Depilação )', price: 15, category: 'Depilação', durationMinutes: 20 },
  { id: 'd6', name: 'Meia perna ( Depilação )', price: 35, category: 'Depilação', durationMinutes: 20 },
  { id: 'd7', name: 'Pernas ( Depilação )', price: 50, category: 'Depilação', durationMinutes: 30 },
  { id: 'd8', name: 'Virilha simples ( Depilação )', price: 40, category: 'Depilação', durationMinutes: 30 },
  { id: 'd9', name: 'Nádegas ( Depilação )', price: 30, category: 'Depilação', durationMinutes: 30 },

  // Manutenção
  { id: 'm1', name: 'Manutenção ( 15 dias - Volume Brasileiro)', price: 85, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm2', name: 'Manutenção ( 20 dias - Volume Brasileiro)', price: 90, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm3', name: 'Manutenção ( 30 dias - Volume Brasileiro)', price: 95, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm4', name: 'Manutenção ( 15 dias Fox Eyes )', price: 95, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm5', name: 'Manutenção ( 20 dias Fox Eyes )', price: 100, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm6', name: 'Manutenção ( 30 dias Fox Eyes )', price: 105, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm7', name: 'Manutenção ( 15 dias - Volume 6D )', price: 100, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm8', name: 'Manutenção ( 20 dias - Volume 6D )', price: 105, category: 'Manutenção', durationMinutes: 120 },
  { id: 'm9', name: 'Manutenção ( 30 dias - Volume 6D )', price: 110, category: 'Manutenção', durationMinutes: 120 },

  // Outros
  { id: 'c6', name: 'Remoção Cílios', price: 30, category: 'Outros', durationMinutes: 30 },
  { id: 'c7', name: 'Retoque Henna', price: 20, category: 'Outros', durationMinutes: 40 },
  { id: 'o1', name: 'Remoção Cílios (outra profissional)', price: 35, category: 'Outros', durationMinutes: 30 },
];

export const BUSINESS_HOURS = {
  wed_fri: { start: '14:00', end: '19:30' },
  sat: { start: '08:00', end: '12:00' },
};

export const WHATSAPP_NUMBER = '5521981477618';
export const CARD_SURCHARGE = 5.0;
export const GOOGLE_CALENDAR_EMAIL = 'dyh.silva.barbosa@gmail.com';
