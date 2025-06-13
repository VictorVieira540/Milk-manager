export interface Producer {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  stateRegistration?: string; // Adicionando campo para Inscrição Estadual
  pricePerLiter: number;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProducerFormData {
  name: string;
  address?: string;
  phone?: string;
  stateRegistration?: string; // Adicionando campo para Inscrição Estadual
  pricePerLiter: number;
  notes?: string;
}