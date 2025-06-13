export interface MilkCollection {
  id: string;
  producerId: string;
  date: Date;
  quantity: number; // em litros
  pricePerLiter: number;
  totalPrice: number;
  issues: CollectionIssue[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionIssue {
  id: string;
  name: string;
  description?: string;
}

export const DEFAULT_COLLECTION_ISSUES: CollectionIssue[] = [
    {id: '0', name: 'Acidez', description: 'O leite apresentou acidez acima do esperado'},
  { id: '1', name: 'Qualidade baixa', description: 'O leite apresentou qualidade abaixo do esperado' },
  { id: '2', name: 'Contaminação', description: 'Foram encontrados contaminantes no leite' },
  { id: '3', name: 'Problemas no transporte', description: 'Ocorreram problemas durante o transporte' },
  { id: '4', name: 'Atraso na coleta', description: 'A coleta foi realizada com atraso' },
  { id: '5', name: 'Volume abaixo do esperado', description: 'O volume coletado foi menor que o esperado' },
];

export interface CollectionFormData {
  producerId: string;
  date: Date;
  quantity: number;
  pricePerLiter: number;
  issues: string[]; // IDs das issues selecionadas
  notes?: string;
}