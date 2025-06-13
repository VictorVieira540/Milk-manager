import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, HelperText, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ProducerService } from '@/src/services/ProducerService';
import { Producer, ProducerFormData } from '@/src/models/Producer';
import { useApp } from '@/src/context/AppContext';

export default function ProducerFormScreen() {
  const { refreshProducers } = useApp();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  // Estado intermediário para o campo de preço
  const [priceText, setPriceText] = useState('0');
  
  const [formData, setFormData] = useState<ProducerFormData>({
    name: '',
    pricePerLiter: 0,
    phone: '',
    address: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing) {
      loadProducer();
    }
  }, [id]);

  // Função para formatar valores numéricos para texto
  const formatNumberToText = (value: number): string => {
    return value === 0 ? '0' : value.toString();
  };

  const loadProducer = async () => {
    try {
      if (!id) return;
      
      setFetching(true);
      const producer = await ProducerService.getById(id);
      
      if (producer) {
        setFormData({
          name: producer.name,
          pricePerLiter: producer.pricePerLiter,
          phone: producer.phone || '',
          address: producer.address || '',
          notes: producer.notes || '',
        });
        
        // Atualizar o estado de texto com o valor formatado
        setPriceText(formatNumberToText(producer.pricePerLiter));
      } else {
        Alert.alert('Erro', 'Produtor não encontrado');
        router.back();
      }
    } catch (error) {
      console.error('Erro ao carregar produtor:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do produtor');
    } finally {
      setFetching(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (formData.pricePerLiter <= 0) {
      newErrors.pricePerLiter = 'Preço por litro deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      if (isEditing && id) {
        await ProducerService.update(id, formData);
        Alert.alert('Sucesso', 'Produtor atualizado com sucesso');
      } else {
        await ProducerService.save(formData);
        Alert.alert('Sucesso', 'Produtor cadastrado com sucesso');
      }

      await refreshProducers();
      router.back();
    } catch (error) {
      console.error('Erro ao salvar produtor:', error);
      Alert.alert('Erro', 'Não foi possível salvar os dados do produtor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !id) return;

    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este produtor? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await ProducerService.delete(id);
              await refreshProducers();
              Alert.alert('Sucesso', 'Produtor excluído com sucesso');
              router.back();
            } catch (error) {
              console.error('Erro ao excluir produtor:', error);
              Alert.alert('Erro', 'Não foi possível excluir o produtor');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Carregando..." />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          {/* Conteúdo de carregamento */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditing ? 'Editar Produtor' : 'Novo Produtor'} />
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
        <TextInput
          label="Nome do produtor *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          style={styles.input}
          error={!!errors.name}
        />
        {errors.name && <HelperText type="error">{errors.name}</HelperText>}

        <TextInput
          label="Preço por litro (R$) *"
          value={priceText}
          onChangeText={(text) => {
            // Permite a digitação apenas de números e um único ponto decimal
            // Substitui vírgula por ponto automaticamente
            let value = text.replace(',', '.');
            
            // Regex que aceita números com até 2 casas decimais
            // Formato: dígitos opcionais seguidos de ponto opcional e até 2 dígitos
            if (/^(\d+)?([.](\d{0,2})?)?$/.test(value)) {
              setPriceText(value);
              if (value === '' || value === '.') {
                setFormData({ ...formData, pricePerLiter: 0 });
              } else {
                const numValue = parseFloat(value);
                setFormData({ ...formData, pricePerLiter: numValue });
              }
            }
          }}
          keyboardType="decimal-pad"
          style={styles.input}
          error={!!errors.pricePerLiter}
        />
        {errors.pricePerLiter && <HelperText type="error">{errors.pricePerLiter}</HelperText>}

        <TextInput
          label="Telefone"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          style={styles.input}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Endereço"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          style={styles.input}
        />

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
          {isEditing ? 'Atualizar' : 'Cadastrar'}
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  deleteButton: {
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    marginTop: 16,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    marginBottom: 32,
  },
});