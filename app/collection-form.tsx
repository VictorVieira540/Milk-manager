import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';
import { TextInput, Button, HelperText, Checkbox, Text, Divider, List, Appbar, Card, Searchbar, ActivityIndicator } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { CollectionService } from '@/src/services/CollectionService';
import { ProducerService } from '@/src/services/ProducerService';
import { MilkCollection, CollectionFormData, DEFAULT_COLLECTION_ISSUES } from '@/src/models/MilkCollection';
import { Producer } from '@/src/models/Producer';
import { useApp } from '@/src/context/AppContext';

export default function CollectionFormScreen() {
  const { refreshCollections } = useApp();
  const { id, producerId } = useLocalSearchParams<{ id?: string, producerId?: string }>();
  const isEditing = Boolean(id);

  // Estados básicos
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [step, setStep] = useState<'select-producer' | 'collection-details'>(isEditing || producerId ? 'collection-details' : 'select-producer');
  
  // Estados para produtores
  const [activeProducers, setActiveProducers] = useState<Producer[]>([]);
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para os valores do formulário
  const [quantityText, setQuantityText] = useState('0');
  
  const [formData, setFormData] = useState<CollectionFormData>({
    producerId: '',
    date: new Date(),
    quantity: 0,
    pricePerLiter: 0,
    issues: [],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducers();
    if (isEditing) {
      loadCollection();
    } 
    else if (producerId) {
      loadPreselectedProducer(producerId);
    }
  }, [id, producerId]);

  // Função para formatar valores numéricos para texto
  const formatNumberToText = (value: number): string => {
    return value === 0 ? '0' : value.toString();
  };

  const loadProducers = async () => {
    try {
      setLoading(true);
      const producers = await ProducerService.getActive();
      setActiveProducers(producers);
    } catch (error) {
      console.error('Erro ao carregar produtores:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de produtores');
    } finally {
      setLoading(false);
    }
  };

  const loadCollection = async () => {
    try {
      if (!id) return;
      
      setFetching(true);
      const collection = await CollectionService.getById(id);
      
      if (collection) {
        // Encontrar o produtor selecionado
        const producer = await ProducerService.getById(collection.producerId);
        if (producer) {
          setSelectedProducer(producer);
        }
        
        setFormData({
          producerId: collection.producerId,
          date: new Date(collection.date),
          quantity: collection.quantity,
          pricePerLiter: collection.pricePerLiter,
          issues: collection.issues.map(issue => issue.id),
          notes: collection.notes || '',
        });
        
        // Atualizar o estado de texto da quantidade
        setQuantityText(formatNumberToText(collection.quantity));
      } else {
        Alert.alert('Erro', 'Coleta não encontrada');
        router.back();
      }
    } catch (error) {
      console.error('Erro ao carregar coleta:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da coleta');
    } finally {
      setFetching(false);
    }
  };

  const loadPreselectedProducer = async (producerId: string) => {
    try {
      const producer = await ProducerService.getById(producerId);
      if (producer) {
        setSelectedProducer(producer);
        setFormData({
          ...formData,
          producerId: producer.id,
          pricePerLiter: producer.pricePerLiter
        });
      }
    } catch (error) {
      console.error('Erro ao carregar produtor pré-selecionado:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.producerId) {
      newErrors.producerId = 'É necessário selecionar um produtor';
    }

    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantidade deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectProducer = (producer: Producer) => {
    setSelectedProducer(producer);
    setFormData({
      ...formData,
      producerId: producer.id,
      pricePerLiter: producer.pricePerLiter
    });
    setStep('collection-details');
  };

  const handleBackToProducers = () => {
    setStep('select-producer');
  };

  const toggleIssue = (issueId: string) => {
    setFormData(prevData => {
      const issues = [...prevData.issues];
      const index = issues.indexOf(issueId);
      
      if (index === -1) {
        issues.push(issueId);
      } else {
        issues.splice(index, 1);
      }
      
      return {
        ...prevData,
        issues
      };
    });
  };

  const handleSubmit = async () => {
    // Garantir que o preço por litro esteja atualizado
    if (selectedProducer) {
      setFormData(prev => ({
        ...prev,
        pricePerLiter: selectedProducer.pricePerLiter
      }));
    }
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Calcula novamente o preço por litro antes de salvar
      const dataToSave = {
        ...formData,
        pricePerLiter: selectedProducer?.pricePerLiter || 0
      };

      if (isEditing && id) {
        await CollectionService.update(id, dataToSave);
        Alert.alert('Sucesso', 'Coleta atualizada com sucesso');
      } else {
        await CollectionService.save(dataToSave);
        Alert.alert('Sucesso', 'Coleta registrada com sucesso');
      }

      await refreshCollections();
      router.back();
    } catch (error) {
      console.error('Erro ao salvar coleta:', error);
      Alert.alert('Erro', 'Não foi possível salvar os dados da coleta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !id) return;

    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta coleta? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await CollectionService.delete(id);
              await refreshCollections();
              Alert.alert('Sucesso', 'Coleta excluída com sucesso');
              router.back();
            } catch (error) {
              console.error('Erro ao excluir coleta:', error);
              Alert.alert('Erro', 'Não foi possível excluir a coleta');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    const quantity = Number(formData.quantity) || 0;
    const pricePerLiter = selectedProducer?.pricePerLiter || 0;
    return (quantity * pricePerLiter).toFixed(2);
  };

  // Filtragem de produtores pela busca
  const filteredProducers = activeProducers.filter(producer => 
    producer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (fetching) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Carregando..." />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Etapa 1: Seleção do produtor
  if (step === 'select-producer') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Selecionar Produtor" />
        </Appbar.Header>

        <View style={styles.content}>
          <Searchbar
            placeholder="Buscar produtor..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
            </View>
          ) : activeProducers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum produtor ativo encontrado</Text>
              <Button 
                mode="contained" 
                onPress={() => router.push('/producer-form')}
                style={styles.addButton}
              >
                Cadastrar Produtor
              </Button>
            </View>
          ) : (
            <FlatList
              data={filteredProducers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card 
                  style={styles.producerCard} 
                  onPress={() => handleSelectProducer(item)}
                >
                  <Card.Content>
                    <Text variant="titleLarge">{item.name}</Text>
                    <Text variant="bodyMedium">Preço/litro: R$ {item.pricePerLiter.toFixed(2)}</Text>
                    {item.phone && <Text variant="bodySmall">Telefone: {item.phone}</Text>}
                  </Card.Content>
                </Card>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Etapa 2: Detalhes da coleta
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={isEditing ? () => router.back() : handleBackToProducers} />
        <Appbar.Content title={isEditing ? 'Editar Coleta' : 'Nova Coleta'} />
        {isEditing && (
          <Appbar.Action 
            icon="delete" 
            iconColor="red" 
            onPress={handleDelete} 
            disabled={loading}
          />
        )}
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {selectedProducer && (
          <Card style={styles.selectedProducerCard}>
            <Card.Content>
              <Text variant="titleMedium">Produtor: {selectedProducer.name}</Text>
              <Text variant="bodyMedium">Preço por litro: R$ {selectedProducer.pricePerLiter.toFixed(2)}</Text>
            </Card.Content>
          </Card>
        )}

        <Text variant="bodyLarge" style={styles.label}>Data da coleta *</Text>
        <DatePickerInput
          locale="pt"
          value={formData.date}
          onChange={(date) => date && setFormData({ ...formData, date })}
          inputMode="start"
          style={styles.dateInput}
        />
        {errors.date && <HelperText type="error">{errors.date}</HelperText>}

        <TextInput
          label="Quantidade (litros) *"
          value={quantityText}
          onChangeText={(text) => {
            // Permite a digitação apenas de números e um único ponto decimal
            // Substitui vírgula por ponto automaticamente
            let value = text.replace(',', '.');
            
            // Regex que aceita números com até 2 casas decimais
            if (/^(\d+)?([.](\d{0,2})?)?$/.test(value)) {
              setQuantityText(value);
              if (value === '' || value === '.') {
                setFormData({ ...formData, quantity: 0 });
              } else {
                const numValue = parseFloat(value);
                setFormData({ ...formData, quantity: numValue });
              }
            }
          }}
          keyboardType="decimal-pad"
          style={styles.input}
          error={!!errors.quantity}
        />
        {errors.quantity && <HelperText type="error">{errors.quantity}</HelperText>}

        <Divider style={styles.divider} />

        <Text variant="bodyLarge" style={styles.label}>Problemas na coleta:</Text>
        {DEFAULT_COLLECTION_ISSUES.map(issue => (
          <List.Item
            key={issue.id}
            title={issue.name}
            description={issue.description}
            left={props => (
              <Checkbox
                status={formData.issues.includes(issue.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleIssue(issue.id)}
              />
            )}
            onPress={() => toggleIssue(issue.id)}
          />
        ))}

        <TextInput
          label="Observações"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          style={styles.input}
          multiline
          numberOfLines={4}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          {isEditing ? 'Atualizar' : 'Registrar'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  searchBar: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 16,
  },
  producerCard: {
    marginBottom: 10,
  },
  selectedProducerCard: {
    marginBottom: 20,
    backgroundColor: '#f0f8ff',
  },
  listContent: {
    paddingBottom: 20,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  dateInput: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  button: {
    marginTop: 24,
    marginBottom: 32,
  }
});