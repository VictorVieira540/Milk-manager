import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Producer } from '../models/Producer';
import { MilkCollection } from '../models/MilkCollection';
import { ProducerService } from '../services/ProducerService';
import { CollectionService } from '../services/CollectionService';

interface AppContextData {
  producers: Producer[];
  collections: MilkCollection[];
  loading: boolean;
  refreshProducers: () => Promise<void>;
  refreshCollections: () => Promise<void>;
  refreshAllData: () => Promise<boolean>;
  clearData: () => Promise<void>;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProducers = async () => {
    try {
      const data = await ProducerService.getAll();
      setProducers(data);
    } catch (error) {
      console.error('Erro ao carregar produtores:', error);
    }
  };

  const refreshCollections = async () => {
    try {
      const data = await CollectionService.getAll();
      setCollections(data);
    } catch (error) {
      console.error('Erro ao carregar coletas:', error);
    }
  };

  const clearData = async () => {
    try {
      setLoading(true);
      // Limpa os dados dos serviços
      await ProducerService.clearAll();
      await CollectionService.clearAll();
      // Atualiza o estado
      setProducers([]);
      setCollections([]);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      setLoading(false);
      throw error; // Propaga o erro para tratamento na UI
    }
  };

  // Função para recarregar todos os dados após restauração
  const refreshAllData = async () => {
    try {
      setLoading(true);
      
      // Limpar o cache em memória primeiro
      setProducers([]);
      setCollections([]);
      
      // Forçar uma pequena pausa para garantir que o AsyncStorage seja 
      // completamente atualizado antes de tentar ler os dados
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Carregar dados do AsyncStorage
      await Promise.all([
        refreshProducers(),
        refreshCollections()
      ]);
      
      setLoading(false);
      
      // Retornar um valor para confirmar o sucesso
      return true;
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        producers,
        collections,
        loading,
        refreshProducers,
        refreshCollections,
        refreshAllData,
        clearData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);