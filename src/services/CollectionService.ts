import AsyncStorage from '@react-native-async-storage/async-storage';
import { MilkCollection, CollectionFormData, DEFAULT_COLLECTION_ISSUES, CollectionIssue } from '../models/MilkCollection';
// Remover importação da biblioteca uuid
// import { v4 as uuidv4 } from 'uuid';

const COLLECTIONS_STORAGE_KEY = '@MilkControl:collections';

// Reutilizar a mesma função de geração de ID único
const generateUniqueId = (): string => {
  // Combina timestamp atual (em milissegundos) com um número aleatório
  const timestamp = new Date().getTime();
  const randomPart = Math.floor(Math.random() * 1000000);
  return `${timestamp}-${randomPart}`;
};

export const CollectionService = {
  async getAll(): Promise<MilkCollection[]> {
    try {
      const data = await AsyncStorage.getItem(COLLECTIONS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao buscar coletas:', error);
      return [];
    }
  },

  async getById(id: string): Promise<MilkCollection | null> {
    try {
      const collections = await this.getAll();
      return collections.find(collection => collection.id === id) || null;
    } catch (error) {
      console.error('Erro ao buscar coleta por ID:', error);
      return null;
    }
  },

  async getByProducerId(producerId: string): Promise<MilkCollection[]> {
    try {
      const collections = await this.getAll();
      return collections.filter(collection => collection.producerId === producerId);
    } catch (error) {
      console.error('Erro ao buscar coletas do produtor:', error);
      return [];
    }
  },

  async save(collectionData: CollectionFormData): Promise<MilkCollection> {
    try {
      const collections = await this.getAll();
      
      const totalPrice = collectionData.quantity * collectionData.pricePerLiter;
      
      const newCollection: MilkCollection = {
        id: generateUniqueId(), // Usar nossa função personalizada
        ...collectionData,
        totalPrice,
        issues: [], // Será populado posteriormente com base nos IDs das issues
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Converter os IDs das issues para objetos CollectionIssue
      if (collectionData.issues && collectionData.issues.length > 0) {
        newCollection.issues = DEFAULT_COLLECTION_ISSUES.filter(issue => 
          collectionData.issues.includes(issue.id)
        );
      }
      
      const updatedCollections = [...collections, newCollection];
      await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(updatedCollections));
      
      return newCollection;
    } catch (error) {
      console.error('Erro ao salvar coleta:', error);
      throw new Error('Falha ao salvar a coleta');
    }
  },

  async update(id: string, collectionData: CollectionFormData): Promise<MilkCollection | null> {
    try {
      const collections = await this.getAll();
      const collectionIndex = collections.findIndex(collection => collection.id === id);
      
      if (collectionIndex === -1) {
        return null;
      }
      
      const totalPrice = collectionData.quantity * collectionData.pricePerLiter;
      
      // Converter os IDs das issues para objetos CollectionIssue
      const issues: CollectionIssue[] = [];
      if (collectionData.issues && collectionData.issues.length > 0) {
        // Usar diretamente DEFAULT_COLLECTION_ISSUES em vez de importação dinâmica
        const filteredIssues = DEFAULT_COLLECTION_ISSUES.filter(issue => 
          collectionData.issues.includes(issue.id)
        );
        issues.push(...filteredIssues);
      }
      
      const updatedCollection: MilkCollection = {
        ...collections[collectionIndex],
        ...collectionData,
        totalPrice,
        issues,
        updatedAt: new Date()
      };
      
      collections[collectionIndex] = updatedCollection;
      await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
      
      return updatedCollection;
    } catch (error) {
      console.error('Erro ao atualizar coleta:', error);
      throw new Error('Falha ao atualizar a coleta');
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const collections = await this.getAll();
      const updatedCollections = collections.filter(collection => collection.id !== id);
      
      if (collections.length === updatedCollections.length) {
        return false;
      }
      
      await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(updatedCollections));
      return true;
    } catch (error) {
      console.error('Erro ao excluir coleta:', error);
      throw new Error('Falha ao excluir a coleta');
    }
  },

  async getCollectionsByDateRange(startDate: Date, endDate: Date): Promise<MilkCollection[]> {
    try {
      const collections = await this.getAll();
      return collections.filter(collection => {
        const collectionDate = new Date(collection.date);
        return collectionDate >= startDate && collectionDate <= endDate;
      });
    } catch (error) {
      console.error('Erro ao buscar coletas por período:', error);
      return [];
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(COLLECTIONS_STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar coletas:', error);
      throw new Error('Falha ao limpar dados das coletas');
    }
  }
};