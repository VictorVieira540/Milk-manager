import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Appbar, List, Switch, Button, Divider, Text, TextInput, Modal, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from '@/src/context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import BackupService from '@/src/services/BackupService';

// Interface com indexação apropriada para evitar erros de tipo
interface SettingsState {
  [key: string]: any;
}

// Interface para os dados do usuário
interface UserData {
  name: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  phone: string;
}

const USER_DATA_KEY = 'user_data';

export default function SettingsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { clearData, refreshAllData } = useApp();
  const [settings, setSettings] = useState<SettingsState>({});
  const [userData, setUserData] = useState<UserData>({
    name: '',
    cnpj: '',
    stateRegistration: '',
    address: '',
    phone: ''
  });
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
  };

  const saveUserData = async () => {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      Alert.alert("Sucesso", "Informações salvas com sucesso!");
      setModalVisible(false);
    } catch (error) {
      console.error("Erro ao salvar dados do usuário:", error);
      Alert.alert("Erro", "Não foi possível salvar as informações.");
    }
  };

  const handleBackupData = async () => {
    try {
      setIsLoading(true);
      
      // Criando backup usando o serviço
      const fileUri = await BackupService.createBackup();
      
      if (!fileUri) {
        Alert.alert("Aviso", "Não foi possível criar o backup. Verifique se há dados para fazer backup.");
        setIsLoading(false);
        return;
      }
      
      // Compartilhando o backup
      const shared = await BackupService.shareBackup(fileUri);
      
      if (shared) {
        Alert.alert("Backup", "Arquivo de backup criado e compartilhado com sucesso.");
      } else {
        Alert.alert("Aviso", "Arquivo de backup criado, mas não foi possível compartilhá-lo.");
      }
    } catch (error) {
      console.error("Erro ao fazer backup:", error);
      Alert.alert("Erro", "Ocorreu um erro ao realizar o backup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreData = async () => {
    try {
      setIsLoading(true);
      
      // Selecionar arquivo de backup usando o serviço
      const fileUri = await BackupService.selectBackupFile();
      
      if (!fileUri) {
        Alert.alert("Informação", "Restauração de backup cancelada pelo usuário.");
        setIsLoading(false);
        return;
      }
      
      // Confirmar restauração
      Alert.alert(
        "Restaurar Dados",
        "Esta ação substituirá todos os dados atuais. Deseja continuar?",
        [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => {
              Alert.alert("Informação", "Restauração de backup cancelada pelo usuário.");
              setIsLoading(false);
            }
          },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                // Restaurar dados usando o serviço
                const success = await BackupService.restoreFromFile(fileUri);
                
                if (success) {
                  // Recarregar todos os dados no contexto da aplicação
                  // Adicionando um timeout para dar tempo ao AsyncStorage de processar as alterações
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await refreshAllData();
                  
                  Alert.alert(
                    "Sucesso", 
                    "Dados restaurados com sucesso. O aplicativo será reiniciado.",
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          // Redirecionar para a tela inicial
                          setTimeout(() => {
                            router.replace("/");
                          }, 500);
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert("Erro", "Não foi possível restaurar os dados. O arquivo pode estar corrompido.");
                }
              } catch (error) {
                console.error("Erro durante restauração:", error);
                Alert.alert("Erro", "Ocorreu um erro ao restaurar os dados");
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Erro ao restaurar dados:", error);
      Alert.alert("Erro", "Ocorreu um erro ao acessar o arquivo");
      setIsLoading(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Apagar Todos os Dados",
      "Esta ação apagará permanentemente todos os dados do aplicativo, incluindo informações do usuário, produtores e coletas. Deseja continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => {
            Alert.alert("Informação", "Operação de limpeza cancelada pelo usuário.");
          }
        },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Limpar os dados do contexto da aplicação (produtores e coletas)
              await clearData();
              
              // Limpar dados do usuário
              await AsyncStorage.removeItem(USER_DATA_KEY);
              
              // Reiniciar os dados do usuário no estado local
              setUserData({
                name: '',
                cnpj: '',
                stateRegistration: '',
                address: '',
                phone: ''
              });
              
              // Limpar quaisquer outras configurações
              setSettings({});
              
              Alert.alert("Sucesso", "Todos os dados foram apagados com sucesso");
              
              // Reiniciar o aplicativo
              setTimeout(() => {
                router.replace("/");
              }, 1500);
            } catch (error) {
              console.error("Erro ao apagar dados:", error);
              Alert.alert("Erro", "Ocorreu um erro ao apagar os dados");
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleImportData = async () => {
    try {
      setIsLoading(true);
      
      // Selecionar arquivo de backup usando o serviço
      const fileUri = await BackupService.selectBackupFile();
      
      if (!fileUri) {
        Alert.alert("Informação", "Importação de dados cancelada pelo usuário.");
        setIsLoading(false);
        return;
      }
      
      try {
        // Ler o conteúdo do arquivo
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(fileContent);
        
        // Verifique se data tem a estrutura esperada antes de usá-lo
        if (typeof data === 'object' && data !== null) {
          Alert.alert(
            "Importar Dados",
            "Esta ação irá adicionar novos dados sem apagar os existentes. Deseja continuar?",
            [
              {
                text: "Cancelar",
                style: "cancel",
                onPress: () => {
                  Alert.alert("Informação", "Importação de dados cancelada pelo usuário.");
                  setIsLoading(false);
                }
              },
              {
                text: "Importar",
                onPress: async () => {
                  try {
                    // Importar dados usando o novo método de importação
                    const success = await BackupService.importFromFile(fileUri);
                    
                    if (success) {
                      // Recarregar todos os dados no contexto da aplicação
                      await refreshAllData();
                      
                      Alert.alert("Sucesso", "Novos dados importados com sucesso. O aplicativo será reiniciado.");
                      
                      // Reiniciar o aplicativo
                      setTimeout(() => {
                        router.replace("/");
                      }, 1500);
                    } else {
                      Alert.alert("Aviso", "Não havia novos dados para importar ou os dados já existem no sistema.");
                    }
                  } catch (error) {
                    console.error("Erro ao importar dados:", error);
                    Alert.alert("Erro", "Ocorreu um erro ao importar os dados");
                  } finally {
                    setIsLoading(false);
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert("Erro", "Formato de dados inválido no arquivo.");
          setIsLoading(false);
        }
      } catch (e) {
        Alert.alert("Erro", "O arquivo não contém um JSON válido.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      Alert.alert("Erro", "Não foi possível importar os dados.");
      setIsLoading(false);
    }
  };

  // Função para alterar configurações com tipagem correta
  const handleSettingChange = (settingName: string, value: any) => {
    setSettings((prevSettings) => {
      return {
        ...prevSettings,
        [settingName]: value
      };
    });
  };

  const handleEditUserData = () => {
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Configurações" />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <List.Section>
          <List.Subheader>Perfil</List.Subheader>
          <List.Item
            title="Informações do Usuário"
            description="Nome, CNPJ, Inscrição Estadual e outros dados"
            left={props => <List.Icon {...props} icon="account" />}
            onPress={handleEditUserData}
            titleStyle={styles.itemTitle}
            descriptionStyle={styles.itemDescription}
          />
          
          <Divider style={styles.divider} />
          
          <List.Subheader>Dados</List.Subheader>
          <List.Item
            title="Backup de Dados"
            description="Fazer cópia de segurança dos seus dados"
            left={props => <List.Icon {...props} icon="backup-restore" />}
            onPress={handleBackupData}
            titleStyle={styles.itemTitle}
            descriptionStyle={styles.itemDescription}
          />
          <List.Item
            title="Restaurar Backup"
            description="Recuperar dados de um backup anterior"
            left={props => <List.Icon {...props} icon="database-import" />}
            onPress={handleRestoreData}
            titleStyle={styles.itemTitle}
            descriptionStyle={styles.itemDescription}
          />
          <List.Item
            title="Limpar Dados"
            description="Apagar todos os dados do aplicativo"
            left={props => <List.Icon {...props} icon="delete" color="red" />}
            onPress={handleClearAllData}
            titleStyle={styles.itemTitle}
            descriptionStyle={styles.itemDescription}
          />
          <List.Item
            title="Importar Dados"
            description="Importar dados de um arquivo JSON"
            left={props => <List.Icon {...props} icon="import" />}
            onPress={handleImportData}
            titleStyle={styles.itemTitle}
            descriptionStyle={styles.itemDescription}
          />
          
          <Divider style={styles.divider} />
          
          <List.Subheader>Sobre</List.Subheader>
          <List.Item
            title="Versão do Aplicativo"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
            titleStyle={styles.itemTitle}
            descriptionStyle={styles.itemDescription}
          />
          <List.Item
            title="Política de Privacidade"
            left={props => <List.Icon {...props} icon="shield-account" />}
            onPress={() => Alert.alert('Política', 'Função não implementada')}
            titleStyle={styles.itemTitle}
          />
          <List.Item
            title="Termos de Uso"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => Alert.alert('Termos', 'Função não implementada')}
            titleStyle={styles.itemTitle}
          />
        </List.Section>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>MilkControl v1.0</Text>
          <Text style={styles.footerText}>© 2025 - Todos os direitos reservados</Text>
        </View>
      </ScrollView>

      {/* Modal para edição de dados do usuário */}
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <Text variant="titleLarge">Informações do Usuário</Text>
          <IconButton
            icon="close"
            size={24}
            onPress={() => setModalVisible(false)}
          />
        </View>
        
        <ScrollView style={styles.modalContent}>
          <TextInput
            label="Nome Completo / Razão Social"
            value={userData.name}
            onChangeText={(text) => setUserData({...userData, name: text})}
            style={styles.input}
          />
          
          <TextInput
            label="CNPJ"
            value={userData.cnpj}
            onChangeText={(text) => setUserData({...userData, cnpj: text})}
            style={styles.input}
            keyboardType="numeric"
          />
          
          <TextInput
            label="Inscrição Estadual"
            value={userData.stateRegistration}
            onChangeText={(text) => setUserData({...userData, stateRegistration: text})}
            style={styles.input}
          />
          
          <TextInput
            label="Endereço"
            value={userData.address}
            onChangeText={(text) => setUserData({...userData, address: text})}
            style={styles.input}
          />
          
          <TextInput
            label="Telefone"
            value={userData.phone}
            onChangeText={(text) => setUserData({...userData, phone: text})}
            style={styles.input}
            keyboardType="phone-pad"
          />
          
          <Button
            mode="contained"
            onPress={saveUserData}
            style={styles.saveButton}
          >
            Salvar
          </Button>
        </ScrollView>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 4,
    marginTop: 0,
  },
  scrollView: {
    flex: 1,
  },
  switchContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    minWidth: 50,
    alignItems: 'flex-end',
  },
  divider: {
    marginVertical: 4,
  },
  itemTitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  itemDescription: {
    fontSize: 14,
    flexShrink: 1,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    color: '#888',
    fontSize: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    elevation: 5,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalContent: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 24,
  }
});