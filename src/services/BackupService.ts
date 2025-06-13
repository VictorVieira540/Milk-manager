import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

/**
 * Interface para os dados de backup
 */
export interface BackupData {
  [key: string]: string | null;
}

export class BackupService {
  /**
   * Cria um backup de todos os dados do AsyncStorage
   */
  static async createBackup(): Promise<string | null> {
    try {
      // Obter todos os dados armazenados
      const keys = await AsyncStorage.getAllKeys();
      
      // Verificar se há dados para fazer backup
      if (keys.length === 0) {
        return null;
      }
      
      const result = await AsyncStorage.multiGet(keys);
      
      // Converter para formato JSON
      const data: BackupData = {};
      result.forEach(([key, value]) => {
        data[key] = value;
      });
      
      // Criar arquivo de backup
      const backupDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const backupFileName = `controle_produtor_backup_${backupDate}.json`;
      const fileUri = `${FileSystem.documentDirectory}${backupFileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data), {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      return fileUri;
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      return null;
    }
  }

  /**
   * Compartilha um arquivo de backup
   */
  static async shareBackup(fileUri: string): Promise<boolean> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao compartilhar backup:", error);
      return false;
    }
  }

  /**
   * Seleciona um arquivo de backup para restauração
   */
  static async selectBackupFile(): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return null;
      }
      
      return result.assets[0].uri;
    } catch (error) {
      console.error("Erro ao selecionar arquivo de backup:", error);
      return null;
    }
  }

  /**
   * Restaura dados de um arquivo de backup
   */
  static async restoreFromFile(fileUri: string): Promise<boolean> {
    try {
      // Ler o conteúdo do arquivo
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const backupData = JSON.parse(fileContent) as BackupData;
      
      // Validar o arquivo de backup
      if (!backupData || typeof backupData !== 'object') {
        throw new Error("Formato de arquivo inválido");
      }
      
      // Limpar dados existentes
      await AsyncStorage.clear();
      
      // Restaurar dados do backup
      const entries: [string, string | null][] = Object.entries(backupData);
      if (entries.length > 0) {
        // Filtrar valores nulos e converter para string se necessário
        const validEntries: [string, string][] = entries
          .filter(([_, value]) => value !== null)
          .map(([key, value]) => [key, String(value)]);
        
        if (validEntries.length > 0) {
          await AsyncStorage.multiSet(validEntries);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao restaurar dados:", error);
      return false;
    }
  }

  /**
   * Apaga todos os dados do aplicativo
   */
  static async clearAllData(): Promise<boolean> {
    try {
      // Verificar se há dados para apagar
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length === 0) {
        return false;
      }
      
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error("Erro ao apagar dados:", error);
      return false;
    }
  }
  
  /**
   * Valida se um arquivo de backup contém dados válidos
   */
  static async validateBackupFile(fileUri: string): Promise<boolean> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);
      
      // Verificação básica da estrutura do arquivo
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao validar arquivo de backup:", error);
      return false;
    }
  }

  /**
   * Importa dados de um arquivo sem substituir dados existentes
   * Realiza uma fusão (merge) dos dados do arquivo com os dados existentes
   */
  static async importFromFile(fileUri: string): Promise<boolean> {
    try {
      // Ler o conteúdo do arquivo
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const importedData = JSON.parse(fileContent) as BackupData;
      
      // Validar o arquivo
      if (!importedData || typeof importedData !== 'object') {
        throw new Error("Formato de arquivo inválido");
      }
      
      // Obter todas as chaves atuais do AsyncStorage
      const currentKeys = await AsyncStorage.getAllKeys();
      const currentData = await AsyncStorage.multiGet(currentKeys);
      
      // Criar um mapa dos dados atuais para fácil acesso
      const currentDataMap: BackupData = {};
      currentData.forEach(([key, value]) => {
        currentDataMap[key] = value;
      });
      
      // Preparar dados para importação (mesclar com dados existentes)
      const entriesToMerge: [string, string][] = [];
      
      // Para cada item no arquivo importado
      Object.entries(importedData).forEach(([key, value]) => {
        if (value !== null) {
          // Verificar se é um array ou objeto JSON
          if (key.includes('@MilkControl:producers') || key.includes('@MilkControl:collections')) {
            try {
              // Se já existir dados para esta chave, realizar a fusão de arrays
              if (currentDataMap[key]) {
                const existingItems = JSON.parse(currentDataMap[key] || '[]');
                const newItems = JSON.parse(value);
                
                // Criar um mapa de IDs existentes para evitar duplicações
                const existingIds = new Set();
                existingItems.forEach((item: any) => {
                  if (item && item.id) {
                    existingIds.add(item.id);
                  }
                });
                
                // Adicionar apenas novos itens (que não existem ainda)
                const uniqueNewItems = newItems.filter((item: any) => 
                  item && item.id && !existingIds.has(item.id)
                );
                
                // Mesclar os arrays
                const mergedItems = [...existingItems, ...uniqueNewItems];
                
                // Se houver novos itens, adicionar à lista para importação
                if (uniqueNewItems.length > 0) {
                  entriesToMerge.push([key, JSON.stringify(mergedItems)]);
                }
              } else {
                // Se não existir dados para esta chave, adicionar diretamente
                entriesToMerge.push([key, value]);
              }
            } catch (e) {
              // Se houver erro no parsing, simplesmente usar o valor como está
              entriesToMerge.push([key, value]);
            }
          } else {
            // Para outros tipos de dados, apenas importar se não existir
            if (!currentDataMap[key]) {
              entriesToMerge.push([key, value]);
            }
          }
        }
      });
      
      // Verificar se há dados a serem importados
      if (entriesToMerge.length === 0) {
        return false; // Nada para importar
      }
      
      // Salvar os dados mesclados
      await AsyncStorage.multiSet(entriesToMerge);
      
      return true;
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      return false;
    }
  }
}

export default BackupService;
