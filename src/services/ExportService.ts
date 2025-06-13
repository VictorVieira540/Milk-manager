import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { MilkCollection } from '../models/MilkCollection';
import { Producer } from '../models/Producer';

// Interface para os dados do usuário
interface UserData {
  name: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  phone: string;
}

const USER_DATA_KEY = 'user_data';

// Função auxiliar para obter os dados do usuário
const getUserData = async (): Promise<UserData> => {
  try {
    const storedData = await AsyncStorage.getItem(USER_DATA_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error("Erro ao carregar dados do usuário:", error);
  }
  
  return {
    name: '',
    cnpj: '',
    stateRegistration: '',
    address: '',
    phone: ''
  };
};

// Função para obter o nome do mês em português
const getMonthName = (monthIndex: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  return months[monthIndex];
};

export const ExportService = {
  async exportCollectionsToExcel(
    collections: MilkCollection[],
    producers: Producer[],
    fileName: string = 'MilkControl_Coletas'
  ): Promise<string> {
    try {
      // Carregar dados do usuário
      const userData = await getUserData();
      
      // Criar um mapa de produtores para busca rápida por ID
      const producersMap = new Map<string, Producer>();
      producers.forEach(producer => {
        producersMap.set(producer.id, producer);
      });

      // Obter mês e ano atuais para o relatório
      const currentDate = new Date();
      const currentMonth = getMonthName(currentDate.getMonth());
      const currentYear = currentDate.getFullYear();
      
      // Agrupar coletas por data
      const collectionsByDate = new Map<string, {
        date: Date,
        collections: MilkCollection[]
      }>();

      collections.forEach(collection => {
        const collectionDate = new Date(collection.date);
        // Formatar a data como string para usar como chave (apenas ano-mes-dia)
        const dateKey = `${collectionDate.getFullYear()}-${(collectionDate.getMonth()+1).toString().padStart(2, '0')}-${collectionDate.getDate().toString().padStart(2, '0')}`;
        
        if (!collectionsByDate.has(dateKey)) {
          collectionsByDate.set(dateKey, {
            date: collectionDate,
            collections: []
          });
        }
        
        const dayData = collectionsByDate.get(dateKey)!;
        dayData.collections.push(collection);
      });

      // Ordenar as datas (da mais antiga para a mais recente)
      const sortedDates = Array.from(collectionsByDate.keys())
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      // Filtrar apenas produtores ativos
      const activeProducers = producers.filter(producer => producer.active);
      
      // Preparar cabeçalho
      const headerRow = ['DATA', 'PROBLEMAS'];
      activeProducers.forEach(producer => {
        headerRow.push(producer.name);
      });
      headerRow.push('OBSERVAÇÕES');
      
      // Iniciar com cabeçalho
      const worksheet = XLSX.utils.aoa_to_sheet([
        [`Mês de referência: ${currentMonth} de ${currentYear}`],
        [`Produtor: ${userData.name}`],
        [`Inscrição estadual: ${userData.stateRegistration}`],
        [], // Linha em branco
        headerRow
      ]);
      
      // Adicionar dados agrupados por dia
      sortedDates.forEach(dateKey => {
        const dayData = collectionsByDate.get(dateKey)!;
        const dateFormatted = `${dayData.date.getDate().toString().padStart(2, '0')}/${(dayData.date.getMonth() + 1).toString().padStart(2, '0')}/${dayData.date.getFullYear()}`;
        
        // Coletar todos os problemas do dia
        const allIssues = new Set<string>();
        dayData.collections.forEach(collection => {
          collection.issues.forEach(issue => {
            allIssues.add(issue.name);
          });
        });
        
        // Coletar todas as observações do dia
        const allNotes = new Set<string>();
        dayData.collections.forEach(collection => {
          if (collection.notes) {
            allNotes.add(collection.notes);
          }
        });
        
        // Montar o array para a linha do dia
        const rowData = [
          dateFormatted,
          Array.from(allIssues).join(', ')
        ];
        
        // Para cada produtor, adicionar a quantidade coletada nesse dia
        activeProducers.forEach(producer => {
          const producerCollections = dayData.collections.filter(
            c => c.producerId === producer.id
          );
          
          // Somar todas as coletas desse produtor no dia
          let totalQuantity = 0;
          producerCollections.forEach(c => {
            totalQuantity += c.quantity;
          });
          
          // Adicionar o total à linha (vazio se não houver coleta)
          rowData.push(totalQuantity > 0 ? totalQuantity.toString() : '');
        });
        
        // Adicionar observações
        rowData.push(Array.from(allNotes).join(' | '));
        
        // Adicionar a linha ao worksheet
        XLSX.utils.sheet_add_aoa(worksheet, [rowData], { origin: -1 });
      });

      // Calcular larguras de coluna
      const wscols = [
        { wch: 15 }, // Data
        { wch: 40 }, // Problemas
      ];
      
      // Adicionar larguras para cada produtor
      activeProducers.forEach(producer => {
        wscols.push({ wch: 15 }); // Largura para cada coluna de produtor
      });
      
      // Largura para a coluna de observações
      wscols.push({ wch: 40 });
      
      worksheet['!cols'] = wscols;

      // Criar o workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Coletas');

      // Exportar para arquivo
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName_with_date = `${fileName}_${dateStr}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${fileName_with_date}`;
      
      // Verificar e excluir arquivo existente se necessário
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
        }
      } catch (error) {
        console.log('Arquivo não existia anteriormente, continuando...');
      }
      
      // Escrever o arquivo
      await FileSystem.writeAsStringAsync(filePath, wbout, { encoding: FileSystem.EncodingType.Base64 });
      
      // Compartilhar o arquivo
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(filePath);
          return filePath;
        } else {
          // Lidar com o caso onde o compartilhamento não está disponível
          console.log("O compartilhamento não está disponível nesta plataforma");
          throw new Error('Compartilhamento não disponível');
        }
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
        throw error; // Repassar o erro para ser tratado pelo chamador
      }
    } catch (error) {
      console.error('Erro ao exportar coletas para Excel:', error);
      
      // Repassar qualquer erro para tratamento na interface
      throw new Error('Ocorreu um erro ao exportar coletas: ' + (error instanceof Error ? error.message : String(error)));
    }
  },

  async exportProducerCollectionsToExcel(
    producer: Producer,
    collections: MilkCollection[],
    fileName: string = `MilkControl_Coletas_${producer.name.replace(/\s+/g, '_')}`
  ): Promise<string> {
    try {
      // Carregar dados do usuário
      const userData = await getUserData();
      
      // Filtrar coletas do produtor selecionado
      const producerCollections = collections.filter(
        collection => collection.producerId === producer.id
      );

      if (producerCollections.length === 0) {
        throw new Error('Nenhuma coleta encontrada para este produtor');
      }

      // Obter mês e ano atuais para o relatório
      const currentDate = new Date();
      const currentMonth = getMonthName(currentDate.getMonth());
      const currentYear = currentDate.getFullYear();
      
      // Iniciar com cabeçalho em vez de usar o conversor json_to_sheet
      const worksheet = XLSX.utils.aoa_to_sheet([
        [`Mês de referência: ${currentMonth} de ${currentYear}`],
        [`Produtor: ${producer.name}`],
        [`Inscrição estadual: ${userData.stateRegistration}`],
        [], // Linha em branco
        ['QUANTIDADE', 'VALOR TOTAL', 'PROBLEMAS', 'OBSERVAÇÃO', 'DATA']
      ]);
      
      // Adicionar dados das coletas
      let totalValue = 0;
      
      producerCollections.forEach(collection => {
        const collectionDate = new Date(collection.date);
        const dateFormatted = `${collectionDate.getDate().toString().padStart(2, '0')}/${(collectionDate.getMonth() + 1).toString().padStart(2, '0')}/${collectionDate.getFullYear()}`;
        
        // Calcular valor total mesmo que não seja exibido na interface
        const valorTotal = collection.quantity * producer.pricePerLiter;
        
        totalValue += valorTotal;
        
        XLSX.utils.sheet_add_aoa(worksheet, [
          [
            collection.quantity, 
            valorTotal.toFixed(2),
            collection.issues.map(issue => issue.name).join(', '), 
            collection.notes || '', 
            dateFormatted
          ]
        ], { origin: -1 });
      });
      
      // Adicionar apenas o valor total ao final (sem a quantidade)
      XLSX.utils.sheet_add_aoa(worksheet, [
        [], // Linha em branco
        ['VALOR TOTAL:', '', totalValue.toFixed(2), '', '']
      ], { origin: -1 });

      // Definir largura das colunas
      const wscols = [
        { wch: 15 }, // Quantidade
        { wch: 15 }, // Valor Total
        { wch: 40 }, // Problemas
        { wch: 40 }, // Observações
        { wch: 12 }, // Data
      ];
      worksheet['!cols'] = wscols;

      // Criar o workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${producer.name}`);

      // Exportar para arquivo
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName_with_date = `${fileName}_${producer.name.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${fileName_with_date}`;
      
      // Verificar e excluir arquivo existente se necessário
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
        }
      } catch (error) {
        console.log('Arquivo não existia anteriormente, continuando...');
      }
      
      // Escrever o arquivo
      await FileSystem.writeAsStringAsync(filePath, wbout, { encoding: FileSystem.EncodingType.Base64 });
      
      // Compartilhar o arquivo
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(filePath);
          return filePath;
        } else {
          // Lidar com o caso onde o compartilhamento não está disponível
          console.log("O compartilhamento não está disponível nesta plataforma");
          throw new Error('Compartilhamento não disponível');
        }
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
        throw error; // Repassar o erro para ser tratado pelo chamador
      }
    } catch (error) {
      console.error('Erro ao exportar coletas do produtor para Excel:', error);
      
      // Repassar o erro específico de cancelamento pelo usuário
      if (error instanceof Error && 
          (error.message === 'Exportação cancelada pelo usuário' || 
           error.message === 'Compartilhamento não disponível')) {
        throw error;
      }
      
      throw new Error('Ocorreu um erro ao exportar coletas do produtor: ' + (error instanceof Error ? error.message : String(error)));
    }
  },
  
  async exportProducersToExcel(
    producers: Producer[],
    fileName: string = 'MilkControl_Produtores'
  ): Promise<string> {
    try {
      // Preparar os dados para a planilha
      const worksheet = XLSX.utils.json_to_sheet(
        producers.map(producer => {
          return {
            'Nome': producer.name,
            'Endereço': producer.address || '',
            'Telefone': producer.phone || '',
            'Preço/Litro (R$)': producer.pricePerLiter.toFixed(2),
            'Ativo': producer.active ? 'Sim' : 'Não',
            'Observações': producer.notes || ''
          };
        })
      );

      // Definir largura das colunas
      const wscols = [
        { wch: 30 }, // Nome
        { wch: 40 }, // Endereço
        { wch: 20 }, // Telefone
        { wch: 15 }, // Preço/Litro
        { wch: 10 }, // Ativo
        { wch: 50 }, // Observações
      ];
      worksheet['!cols'] = wscols;

      // Criar o workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtores');

      // Exportar para arquivo
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName_with_date = `${fileName}_${dateStr}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${fileName_with_date}`;
      
      try {
        // Verificar se o arquivo já existe e excluí-lo se necessário
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
        }
      } catch (error) {
        console.log('Arquivo não existia anteriormente, continuando...');
      }
      
      // Escrever o arquivo
      await FileSystem.writeAsStringAsync(filePath, wbout, { encoding: FileSystem.EncodingType.Base64 });
      
      // Compartilhar o arquivo
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(filePath);
          return filePath;
        } else {
          // Lidar com o caso onde o compartilhamento não está disponível
          console.log("O compartilhamento não está disponível nesta plataforma");
          throw new Error('Compartilhamento não disponível');
        }
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
        throw error; // Repassar o erro para ser tratado pelo chamador
      }
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      if (error instanceof Error && error.message === 'Compartilhamento não disponível') {
        throw error; // Repassar apenas erros reais, não o cancelamento pelo usuário
      }
      throw new Error('Falha ao exportar os dados para Excel');
    }
  },

  async exportCollectionsByPeriod(
    collections: MilkCollection[],
    producers: Producer[],
    startDate: Date,
    endDate: Date,
    fileName: string = 'Resumo_Por_Periodo'
  ): Promise<string> {
    try {
      // Carregar dados do usuário
      const userData = await getUserData();
      
      // Criar um mapa de produtores para busca rápida por ID
      const producersMap = new Map<string, Producer>();
      producers.forEach(producer => {
        producersMap.set(producer.id, producer);
      });

      // Filtrar coletas pelo período selecionado
      const filteredCollections = collections.filter(collection => {
        const collectionDate = new Date(collection.date);
        return collectionDate >= startDate && collectionDate <= endDate;
      });

      if (filteredCollections.length === 0) {
        throw new Error('Nenhuma coleta encontrada no período selecionado');
      }

      // Agrupar coletas por data
      const collectionsByDate = new Map<string, {
        date: Date,
        totalQuantity: number,
        totalValue: number,
        collections: MilkCollection[],
        issues: Set<string> // Adicionar conjunto para armazenar problemas
      }>();

      filteredCollections.forEach(collection => {
        const collectionDate = new Date(collection.date);
        // Formatar a data como string para usar como chave (apenas ano-mes-dia)
        const dateKey = `${collectionDate.getFullYear()}-${collectionDate.getMonth()+1}-${collectionDate.getDate()}`;
        
        if (!collectionsByDate.has(dateKey)) {
          collectionsByDate.set(dateKey, {
            date: collectionDate,
            totalQuantity: 0,
            totalValue: 0,
            collections: [],
            issues: new Set<string>() // Inicializar conjunto vazio
          });
        }
        
        const dayData = collectionsByDate.get(dateKey)!;
        dayData.collections.push(collection);
        dayData.totalQuantity += collection.quantity;
        
        // Adicionar problemas ao conjunto
        collection.issues.forEach(issue => {
          dayData.issues.add(issue.name);
        });
        
        // Calcular valor usando o preço do produtor
        const producer = producersMap.get(collection.producerId);
        if (producer) {
          const collectionValue = collection.quantity * producer.pricePerLiter;
          dayData.totalValue += collectionValue;
        }
      });

      // Ordenar as datas (da mais antiga para a mais recente)
      const sortedDates = Array.from(collectionsByDate.keys())
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Obter mês e ano do período para o relatório
      const startMonth = getMonthName(startDate.getMonth());
      const endMonth = getMonthName(endDate.getMonth());
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      const periodLabel = startMonth === endMonth && startYear === endYear
        ? `${startMonth} de ${startYear}`
        : `${startMonth}/${startYear} a ${endMonth}/${endYear}`;
      
      // Iniciar com cabeçalho
      const worksheet = XLSX.utils.aoa_to_sheet([
        [`Período de referência: ${periodLabel}`],
        [`Produtor: ${userData.name}`],
        [`Inscrição estadual: ${userData.stateRegistration}`],
        [], // Linha em branco
        ['DATA', 'QUANTIDADE TOTAL', 'VALOR TOTAL', 'PROBLEMAS'] // Adicionar coluna de problemas
      ]);
      
      // Adicionar dados das coletas agrupados por dia
      let grandTotalQuantity = 0;
      let grandTotalValue = 0;
      
      sortedDates.forEach(dateKey => {
        const dayData = collectionsByDate.get(dateKey)!;
        const dateFormatted = `${dayData.date.getDate().toString().padStart(2, '0')}/${(dayData.date.getMonth() + 1).toString().padStart(2, '0')}/${dayData.date.getFullYear()}`;
        
        grandTotalQuantity += dayData.totalQuantity;
        grandTotalValue += dayData.totalValue;
        
        // Converter o conjunto de problemas em uma string separada por vírgulas
        const issuesText = Array.from(dayData.issues).join(', ');
        
        XLSX.utils.sheet_add_aoa(worksheet, [
          [
            dateFormatted,
            dayData.totalQuantity.toFixed(1),
            dayData.totalValue.toFixed(2),
            issuesText // Adicionar problemas à planilha
          ]
        ], { origin: -1 });
      });
      
      // Adicionar totais ao final
      XLSX.utils.sheet_add_aoa(worksheet, [
        [], // Linha em branco
        ['TOTAL GERAL:', grandTotalQuantity.toFixed(1), grandTotalValue.toFixed(2), ''] // Célula vazia para coluna de problemas
      ], { origin: -1 });

      // Definir largura das colunas
      const wscols = [
        { wch: 15 }, // Data
        { wch: 20 }, // Quantidade Total
        { wch: 20 }, // Valor Total
        { wch: 40 }, // Problemas
      ];
      worksheet['!cols'] = wscols;

      // Criar o workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo por Dia');

      // Exportar para arquivo
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName_with_date = `${fileName}_${dateStr}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${fileName_with_date}`;
      
      // Verificar e excluir arquivo existente se necessário
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
        }
      } catch (error) {
        console.log('Arquivo não existia anteriormente, continuando...');
      }
      
      // Escrever o arquivo
      await FileSystem.writeAsStringAsync(filePath, wbout, { encoding: FileSystem.EncodingType.Base64 });
      
      // Compartilhar o arquivo
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(filePath);
          return filePath;
        } else {
          console.log("O compartilhamento não está disponível nesta plataforma");
          throw new Error('Compartilhamento não disponível');
        }
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
        throw error; // Repassar o erro para ser tratado pelo chamador
      }
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      if (error instanceof Error && (error.message === 'Compartilhamento não disponível' || 
          error.message === 'Nenhuma coleta encontrada no período selecionado')) {
        throw error; // Repassar apenas erros reais, não o cancelamento pelo usuário
      }
      throw new Error('Falha ao exportar os dados para Excel');
    }
  }
};