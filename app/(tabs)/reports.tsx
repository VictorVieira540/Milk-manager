import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Appbar, Card, Text, Button, ActivityIndicator, Menu, Divider, List, Chip } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { useApp } from '@/src/context/AppContext';
import { ExportService } from '@/src/services/ExportService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Producer } from '@/src/models/Producer';

export default function ReportsScreen() {
  const { collections, producers, loading } = useApp();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Novo estado para o seletor de produtor
  const [producerMenuVisible, setProducerMenuVisible] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const activeProducers = producers.filter(producer => producer.active);
  
  // Estado para controlar o tipo de exportação por período
  const [exportType, setExportType] = useState<'detailed' | 'summary'>('detailed');

  const handleExportCollections = async () => {
    try {
      if (!startDate || !endDate) {
        Alert.alert('Atenção', 'Selecione um período para exportação');
        return;
      }

      setExporting(true);

      // Filtrar as coletas pelo período selecionado
      const filteredCollections = collections.filter(collection => {
        const collectionDate = new Date(collection.date);
        return collectionDate >= startDate && collectionDate <= endDate;
      });

      if (filteredCollections.length === 0) {
        Alert.alert('Sem dados', 'Não há coletas no período selecionado');
        setExporting(false);
        return;
      }

      let filePath;
      
      // Verificar o tipo de exportação selecionado
      if (exportType === 'detailed') {
        // Exportar detalhadamente (método original)
        filePath = await ExportService.exportCollectionsToExcel(
          filteredCollections,
          producers
        );
      } else {
        // Exportar resumo diário agrupado
        filePath = await ExportService.exportCollectionsByPeriod(
          filteredCollections,
          producers,
          startDate,
          endDate
        );
      }

      Alert.alert(
        'Exportação concluída',
        `Os dados foram exportados com sucesso.\nArquivo: ${filePath}`
      );
    } catch (error) {
      console.error('Erro ao exportar coletas:', error);
      // Tratamento específico por tipo de erro
      if (error instanceof Error) {
        if (error.message === 'Exportação cancelada pelo usuário') {
          // O usuário cancelou a exportação, não exibir alerta de erro
          console.log('Exportação cancelada pelo usuário, nenhuma ação necessária');
        } else if (error.message === 'Compartilhamento não disponível') {
          Alert.alert('Não disponível', 'O compartilhamento não está disponível neste dispositivo');
        } else {
          Alert.alert('Erro', 'Ocorreu um erro ao exportar os dados');
        }
      } else {
        Alert.alert('Erro', 'Ocorreu um erro ao exportar os dados');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportProducers = async () => {
    try {
      setExporting(true);

      // Filtrar apenas produtores ativos
      const activeProducers = producers.filter(producer => producer.active);

      if (activeProducers.length === 0) {
        Alert.alert('Sem dados', 'Não há produtores ativos para exportar');
        setExporting(false);
        return;
      }

      // Exportar para Excel
      const filePath = await ExportService.exportProducersToExcel(activeProducers);

      Alert.alert(
        'Exportação concluída',
        `Os dados foram exportados com sucesso.`
      );
    } catch (error) {
      console.error('Erro ao exportar produtores:', error);
      // Tratamento específico por tipo de erro
      if (error instanceof Error) {
        if (error.message === 'Exportação cancelada pelo usuário') {
          // O usuário cancelou a exportação, não exibir alerta de erro
          console.log('Exportação cancelada pelo usuário, nenhuma ação necessária');
        } else if (error.message === 'Compartilhamento não disponível') {
          Alert.alert('Não disponível', 'O compartilhamento não está disponível neste dispositivo');
        } else {
          Alert.alert('Erro', 'Ocorreu um erro ao exportar os dados');
        }
      } else {
        Alert.alert('Erro', 'Ocorreu um erro ao exportar os dados');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportProducerCollections = async () => {
    try {
      if (!selectedProducer) {
        Alert.alert('Atenção', 'Selecione um produtor para exportação');
        return;
      }

      setExporting(true);

      // Exportar para Excel
      const filePath = await ExportService.exportProducerCollectionsToExcel(
        selectedProducer,
        collections
      );

      Alert.alert(
        'Exportação concluída',
        `Os dados do produtor ${selectedProducer.name} foram exportados com sucesso.`
      );
    } catch (error) {
      console.error('Erro ao exportar coletas do produtor:', error);
      // Tratamento específico por tipo de erro
      if (error instanceof Error) {
        if (error.message === 'Exportação cancelada pelo usuário') {
          // O usuário cancelou a exportação, não exibir alerta de erro
          console.log('Exportação cancelada pelo usuário, nenhuma ação necessária');
        } else if (error.message === 'Compartilhamento não disponível') {
          Alert.alert('Não disponível', 'O compartilhamento não está disponível neste dispositivo');
        } else if (error.message === 'Nenhuma coleta encontrada para este produtor') {
          Alert.alert('Sem dados', 'Não há coletas registradas para este produtor');
        } else {
          Alert.alert('Erro', 'Ocorreu um erro ao exportar os dados');
        }
      } else {
        Alert.alert('Erro', 'Ocorreu um erro ao exportar os dados');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSelectProducer = (producer: Producer) => {
    setSelectedProducer(producer);
    setProducerMenuVisible(false);
  };

  const generateSummary = () => {
    const activeProducers = producers.filter(producer => producer.active);
    
    const totalCollections = collections.length;
    
    let totalMilk = 0;
    
    collections.forEach(collection => {
      totalMilk += collection.quantity;

    });
    
    return {
      activeProducers: activeProducers.length,
      totalCollections,
      totalMilk
    };
  };

  const summary = generateSummary();

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Relatórios" />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
              disabled={exporting}
            />
          }
          contentStyle={styles.menuContent}
          anchorPosition="bottom"
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleExportProducers();
            }}
            title="Exportar Produtores"
            disabled={exporting}
            leadingIcon="file-excel"
            titleStyle={styles.menuItemTitle}
          />
        </Menu>
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Title title="Resumo" />
          <Card.Content>
            <Text variant="bodyLarge">Produtores ativos: {summary.activeProducers}</Text>
            <Text variant="bodyLarge">Total de coletas: {summary.totalCollections}</Text>
            <Text variant="bodyLarge">Volume total: {summary.totalMilk.toFixed(2)} litros</Text>
          </Card.Content>
        </Card>
        <Card style={styles.card}>
          <Card.Title title="Exportar Coletas por Produtor" />
          <Card.Content>
            {activeProducers.length === 0 ? (
              <View>
                <Text variant="bodyMedium" style={styles.warningText}>
                  Não há produtores ativos cadastrados.
                </Text>
                <Button 
                  mode="outlined" 
                  onPress={() => Alert.alert('Sem produtores', 'Cadastre produtores primeiro para poder exportar dados.')}
                  style={styles.exportButton}
                >
                  Selecione um Produtor
                </Button>
              </View>
            ) : (
              <Menu
                visible={producerMenuVisible}
                onDismiss={() => setProducerMenuVisible(false)}
                anchor={
                  <Button mode="outlined" onPress={() => setProducerMenuVisible(true)}>
                    {selectedProducer ? selectedProducer.name : 'Selecione um Produtor'}
                  </Button>
                }
                contentStyle={styles.producerMenuContent}
              >
                {activeProducers.map(producer => (
                  <Menu.Item
                    key={producer.id}
                    onPress={() => handleSelectProducer(producer)}
                    title={producer.name}
                    titleStyle={styles.menuItemTitle}
                  />
                ))}
              </Menu>
            )}
            
            <Button 
              mode="contained" 
              onPress={handleExportProducerCollections}
              style={styles.exportButton}
              loading={exporting}
              disabled={exporting || loading || !selectedProducer || activeProducers.length === 0}
            >
              Exportar para Excel
            </Button>
          </Card.Content>
        </Card>
        <Card style={styles.card}>
          <Card.Title title="Exportar Coletas por Período" />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.label}>Data Inicial:</Text>
            <DatePickerInput
              locale="pt"
              value={startDate}
              onChange={setStartDate}
              inputMode="start"
              style={styles.dateInput}
            />
            
            <Text variant="bodyMedium" style={styles.label}>Data Final:</Text>
            <DatePickerInput
              locale="pt"
              value={endDate}
              onChange={setEndDate}
              inputMode="end"
              style={styles.dateInput}
            />
            
            <Text variant="bodyMedium" style={styles.label}>Tipo de Relatório:</Text>
            <View style={styles.chipContainer}>
              <Chip 
                selected={exportType === 'detailed'} 
                onPress={() => setExportType('detailed')}
                style={styles.chip}
                mode="outlined"
              >
                Detalhado
              </Chip>
              <Chip 
                selected={exportType === 'summary'} 
                onPress={() => setExportType('summary')}
                style={styles.chip}
                mode="outlined"
              >
                Resumo Diário
              </Chip>
            </View>
            
            <Button 
              mode="contained" 
              onPress={handleExportCollections}
              style={styles.exportButton}
              loading={exporting}
              disabled={exporting || loading || !startDate || !endDate}
            >
              Exportar para Excel
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 4,
    marginTop: 0, // Removido padding extra
  },
  menuContent: {
    minWidth: 200,
    marginTop: 40,
  },
  producerMenuContent: {
    minWidth: 250,
    maxHeight: 400,
  },
  menuItemTitle: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  dateInput: {
    marginBottom: 8,
  },
  exportButton: {
    marginTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    // Outros estilos necessários
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
  },
  warningText: {
    color: '#e53935',
    marginBottom: 10,
    fontWeight: '500',
  },
});