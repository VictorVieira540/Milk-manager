import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Appbar, FAB, List, Searchbar, Card, Text, ActivityIndicator, Button, IconButton, Menu, Divider } from 'react-native-paper';
import { useApp } from '@/src/context/AppContext';
import { Producer } from '@/src/models/Producer';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExportService } from '@/src/services/ExportService';

export default function ProducersScreen() {
  const { producers, collections, loading, refreshProducers } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducers, setFilteredProducers] = useState<Producer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (producers) {
      if (searchQuery) {
        const filtered = producers.filter(
          (producer) => 
            producer.active && 
            producer.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredProducers(filtered);
      } else {
        setFilteredProducers(producers.filter(producer => producer.active));
      }
    }
  }, [producers, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProducers();
    setRefreshing(false);
  };

  const handleAddProducer = () => {
    router.push('/producer-form');
  };

  const handleEditProducer = (producer: Producer) => {
    router.push({ pathname: '/producer-form', params: { id: producer.id } });
  };

  const handleExportProducer = async (producer: Producer) => {
    try {
      Alert.alert(
        "Exportar Dados",
        `Deseja exportar os dados de coleta do produtor ${producer.name}?`,
        [
          {
            text: "Cancelar",
            style: "cancel"
          },
          {
            text: "Exportar",
            onPress: async () => {
              try {
                setRefreshing(true);
                await ExportService.exportProducerCollectionsToExcel(
                  producer,
                  collections,
                  `MilkControl_Coletas_${producer.name.replace(/\s+/g, '_')}`
                );
                Alert.alert("Sucesso", "Dados exportados com sucesso!");
              } catch (error) {
                if (error instanceof Error) {
                  Alert.alert("Erro", error.message);
                } else {
                  Alert.alert("Erro", "Ocorreu um erro ao exportar os dados");
                }
              } finally {
                setRefreshing(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Erro ao exportar produtor:", error);
      Alert.alert("Erro", "Falha ao exportar os dados do produtor");
    }
  };

  const toggleMenu = (id: string) => {
    setMenuVisible(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Produtores" />
      </Appbar.Header>

      <Searchbar
        placeholder="Buscar produtor"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          {filteredProducers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text>Nenhum produtor encontrado</Text>
              <Button 
                mode="contained" 
                onPress={handleAddProducer}
                style={styles.addButton}
              >
                Adicionar Produtor
              </Button>
            </View>
          ) : (
            <FlatList
              data={filteredProducers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <Text variant="titleLarge">{item.name}</Text>
                      <Menu
                        visible={!!menuVisible[item.id]}
                        onDismiss={() => toggleMenu(item.id)}
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            onPress={() => toggleMenu(item.id)}
                          />
                        }
                      >
                        <Menu.Item 
                          title="Editar" 
                          leadingIcon="pencil" 
                          onPress={() => {
                            toggleMenu(item.id);
                            handleEditProducer(item);
                          }} 
                        />
                        <Menu.Item 
                          title="Exportar Dados" 
                          leadingIcon="export" 
                          onPress={() => {
                            toggleMenu(item.id);
                            handleExportProducer(item);
                          }} 
                        />
                      </Menu>
                    </View>
                    {item.phone && <Text variant="bodyMedium">Telefone: {item.phone}</Text>}
                    <Text variant="bodyMedium">Preço por litro: R$ {item.pricePerLiter.toFixed(2)}</Text>
                  </Card.Content>
                </Card>
              )}
              contentContainerStyle={styles.listContent}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          )}
        </>
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddProducer}
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
  listContent: {
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});