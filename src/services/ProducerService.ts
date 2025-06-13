import AsyncStorage from '@react-native-async-storage/async-storage';
import { Producer, ProducerFormData } from '../models/Producer';
// Remover importação da biblioteca uuid 
// import { v4 as uuidv4 } from 'uuid';

const PRODUCERS_STORAGE_KEY = '@MilkControl:producers';

// Função para gerar IDs únicos sem depender de crypto.getRandomValues()
const generateUniqueId = (): string => {
  // Combina timestamp atual (em milissegundos) com um número aleatório
  const timestamp = new Date().getTime();
  const randomPart = Math.floor(Math.random() * 1000000);
  return `${timestamp}-${randomPart}`;
};

export const ProducerService = {
  async getAll(): Promise<Producer[]> {
    try {
      const data = await AsyncStorage.getItem(PRODUCERS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao buscar produtores:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Producer | null> {
    try {
      const producers = await this.getAll();
      return producers.find(producer => producer.id === id) || null;
    } catch (error) {
      console.error('Erro ao buscar produtor por ID:', error);
      return null;
    }
  },

  async save(producerData: ProducerFormData): Promise<Producer> {
    try {
      const producers = await this.getAll();
      
      const newProducer: Producer = {
        id: generateUniqueId(), // Usar nossa função personalizada
        ...producerData,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const updatedProducers = [...producers, newProducer];
      await AsyncStorage.setItem(PRODUCERS_STORAGE_KEY, JSON.stringify(updatedProducers));
      
      return newProducer;
    } catch (error) {
      console.error('Erro ao salvar produtor:', error);
      throw new Error('Falha ao salvar o produtor');
    }
  },

  async update(id: string, producerData: ProducerFormData): Promise<Producer | null> {
    try {
      const producers = await this.getAll();
      const producerIndex = producers.findIndex(producer => producer.id === id);
      
      if (producerIndex === -1) {
        return null;
      }
      
      const updatedProducer: Producer = {
        ...producers[producerIndex],
        ...producerData,
        updatedAt: new Date()
      };
      
      producers[producerIndex] = updatedProducer;
      await AsyncStorage.setItem(PRODUCERS_STORAGE_KEY, JSON.stringify(producers));
      
      return updatedProducer;
    } catch (error) {
      console.error('Erro ao atualizar produtor:', error);
      throw new Error('Falha ao atualizar o produtor');
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const producers = await this.getAll();
      const producerIndex = producers.findIndex(producer => producer.id === id);
      
      if (producerIndex === -1) {
        return false;
      }
      
      // Desativar em vez de excluir permanentemente
      producers[producerIndex] = {
        ...producers[producerIndex],
        active: false,
        updatedAt: new Date()
      };
      
      await AsyncStorage.setItem(PRODUCERS_STORAGE_KEY, JSON.stringify(producers));
      return true;
    } catch (error) {
      console.error('Erro ao excluir produtor:', error);
      throw new Error('Falha ao excluir o produtor');
    }
  },

  async getActive(): Promise<Producer[]> {
    try {
      const producers = await this.getAll();
      return producers.filter(producer => producer.active);
    } catch (error) {
      console.error('Erro ao buscar produtores ativos:', error);
      return [];
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PRODUCERS_STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar produtores:', error);
      throw new Error('Falha ao limpar dados dos produtores');
    }
  }
};