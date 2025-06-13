import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, BackHandler } from 'react-native';
import { Appbar, FAB, Searchbar, Card, Text, ActivityIndicator, Button, Divider, List } from 'react-native-paper';
import { useApp } from '@/src/context/AppContext';
import { MilkCollection } from '@/src/models/MilkCollection';
import { Producer } from '@/src/models/Producer';
import { router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CollectionsScreen() {
  const { collections, producers, loading, refreshCollections } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();
  
  // Novo estado para controlar o produtor selecionado
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [producerCollections, setProducerCollections] = useState<MilkCollection[]>([]);
  
  // Calcular resumo por produtor
  const producerSummary = producers.map(producer => {
    const producerColls = collections.filter(c => c.producerId === producer.id);
    let totalVolume = 0;
    
    producerColls.forEach(coll => {
      totalVolume += coll.quantity;
    });
    
    return {
      producer,
      totalCollections: producerColls.length,
      totalVolume
    };
  }).sort((a, b) => b.totalCollections - a.totalCollections); // Ordenar por número de coletas (decrescente)
  
  // Filtrar o resumo com base na busca
  const filteredSummary = producerSummary.filter(summary => 
    summary.producer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Função para resetar para a lista de produtores
  const resetToProducersList = () => {
    setSelectedProducer(null);
    return true; // Importante para o BackHandler saber que tratamos o evento
  };

  useEffect(() => {
    if (selectedProducer) {
      // Filtrar e ordenar coletas do produtor selecionado (mais recentes primeiro)
      const filtered = collections
        .filter(collection => collection.producerId === selectedProducer.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setProducerCollections(filtered);
    }
  }, [selectedProducer, collections]);

  // Efeito para adicionar o listener do botão de voltar
  useEffect(() => {
    // Adicionar listener para o botão de voltar físico
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedProducer) {
        resetToProducersList();
        return true; // Previne o comportamento padrão (sair da aplicação)
      }
      return false; // Permite o comportamento padrão
    });

    // Limpar o listener ao desmontar
    return () => backHandler.remove();
  }, [selectedProducer]);

  // Efeito para resetar quando a tela mudar/ficar invisível
  useEffect(() => {
    // Resetar para a lista de produtores quando a tela for montada ou quando mudar de tela
    return () => {
      // Este código será executado quando o componente for desmontado
      // (quando o usuário navegar para outra tela)
      resetToProducersList();
    };
  }, [pathname]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCollections();
    setRefreshing(false);
  };

  const handleAddCollection = () => {
    // Se tiver um produtor selecionado, passa o ID como parâmetro
    if (selectedProducer) {
      router.push({
        pathname: '/collection-form',
        params: { producerId: selectedProducer.id }
      });
    } else {
      router.push('/collection-form');
    }
  };

  const handleEditCollection = (collection: MilkCollection) => {
    router.push({ pathname: '/collection-form', params: { id: collection.id } });
  };

  const handleSelectProducer = (producer: Producer) => {
    setSelectedProducer(producer);
  };

  const handleBackToProducers = () => {
    resetToProducersList();
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Renderizar a lista de coletas de um produtor específico
  const renderProducerCollections = () => {
    return (
      <>
        <View style={styles.producerHeader}>
          <Button 
            icon="arrow-left" 
            mode="text" 
            onPress={handleBackToProducers}
          >
            Voltar
          </Button>
          <Text variant="titleLarge" style={styles.producerTitle}>
            {selectedProducer?.name}
          </Text>
        </View>
        
        {producerCollections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text>Nenhuma coleta encontrada para este produtor</Text>
            <Button 
              mode="contained" 
              onPress={handleAddCollection}
              style={styles.addButton}
            >
              Adicionar Coleta
            </Button>
          </View>
        ) : (
          <FlatList
            data={producerCollections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.collectionCard} onPress={() => handleEditCollection(item)}>
                <Card.Content style={styles.collectionCardContent}>
                  <View style={styles.collectionHeader}>
                    <Text variant="titleMedium">{formatDate(item.date)}</Text>
                    <Text variant="titleMedium">
                      {item.quantity.toFixed(1)} L
                    </Text>
                  </View>
                  
                  {item.issues.length > 0 && (
                    <View style={styles.issuesContainer}>
                      <Text variant="bodySmall">
                        Problemas: {item.issues.map(issue => issue.name).join(', ')}
                      </Text>
                    </View>
                  )}
                  {item.notes && <Text variant="bodySmall" numberOfLines={1}>Obs: {item.notes}</Text>}
                </Card.Content>
              </Card>
            )}
            contentContainerStyle={styles.listContent}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
      </>
    );
  };

  // Renderizar o resumo de produtores
  const renderProducersSummary = () => {
    return (
      <>
        {filteredSummary.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text>Nenhum produtor encontrado</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSummary}
            keyExtractor={(item) => item.producer.id}
            renderItem={({ item }) => (
              <Card 
                style={styles.card} 
                onPress={() => handleSelectProducer(item.producer)}
              >
                <Card.Content>
                  <Text variant="titleLarge">{item.producer.name}</Text>
                  <Divider style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text variant="bodyMedium">Total de coletas:</Text>
                      <Text variant="headlineSmall">{item.totalCollections}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text variant="bodyMedium">Volume total:</Text>
                      <Text variant="headlineSmall">{item.totalVolume.toFixed(1)} L</Text>
                    </View>
                  </View>
                  <Text variant="bodySmall" style={styles.tapForMore}>
                    Toque para ver detalhes
                  </Text>
                </Card.Content>
              </Card>
            )}
            contentContainerStyle={styles.listContent}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title={selectedProducer ? "Coletas do Produtor" : "Resumo de Produtores"} />
      </Appbar.Header>

      {!selectedProducer && (
        <Searchbar
          placeholder="Buscar produtor"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        selectedProducer ? renderProducerCollections() : renderProducersSummary()
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddCollection}
      />
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
  searchBar: {
    margin: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    marginTop: 16,
  },
  card: {
    margin: 8,
  },
  collectionCard: {
    margin: 6,
    marginHorizontal: 8,
  },
  collectionCardContent: {
    paddingVertical: 10, // Reduzindo o padding vertical
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collectionDetails: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  totalPrice: {
    fontWeight: 'bold',
  },
  tapForMore: {
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  issuesContainer: {
    marginTop: 4,
  },
  issue: {
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  producerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  producerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Compensar o espaço do botão voltar
  },
});