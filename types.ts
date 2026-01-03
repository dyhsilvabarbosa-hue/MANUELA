
export type PaymentMethod = 'Dinheiro' | 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito';

export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'Cílios' | 'Manutenção' | 'Sobrancelhas' | 'Depilação' | 'Outros';
  durationMinutes: number; // Duração em minutos
  imageUrl?: string;
}

export interface BookingState {
  services: Service[];
  date: string;
  time: string;
  name: string;
  paymentMethod: PaymentMethod | null;
}

export enum Step {
  ServiceSelection,
  DateSelection,
  PaymentSelection,
  Confirmation,
  Success,
  Admin
}

export interface RecessDay {
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface AppNotice {
  message: string;
  isActive: boolean;
}
