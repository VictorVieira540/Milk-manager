import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Image, Alert } from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Appbar,
  Menu,
} from "react-native-paper";
import { router } from "expo-router";
import { useApp } from "@/src/context/AppContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { producers, loading } = useApp();
  const [menuVisible, setMenuVisible] = useState(false);

  const activeProducers = producers.filter((p) => p.active);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content
          title="Controle de Produtor"
          subtitle="Gerenciamento de Coleta de Leite"
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="cog"
              onPress={() => setMenuVisible(true)}
            />
          }
          contentStyle={styles.menuContent}
          anchorPosition="bottom"
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              router.push('/settings');
            }}
            title="Configurações"
            leadingIcon="cog-outline"
            titleStyle={styles.menuItemTitle}
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              Alert.alert('Sobre', 'MilkControl v1.0\n© 2025 - Todos os direitos reservados');
            }}
            title="Sobre"
            leadingIcon="information-outline"
            titleStyle={styles.menuItemTitle}
          />
        </Menu>
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Title style={styles.sectionTitle}>Acesso Rápido</Title>

        <Card
          style={styles.actionCard}
          onPress={() => router.push("/producer-form")}
        >
          <Card.Content>
            <Title>Cadastrar Produtor</Title>
            <Paragraph>Adicione um novo produtor ao sistema</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button>Cadastrar</Button>
          </Card.Actions>
        </Card>

        <Card
          style={styles.actionCard}
          onPress={() => router.push("/collection-form")}
        >
          <Card.Content>
            <Title>Nova Coleta</Title>
            <Paragraph>Registre uma nova coleta de leite</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button>Registrar</Button>
          </Card.Actions>
        </Card>

        <Card style={styles.actionCard} onPress={() => router.push("/reports")}>
          <Card.Content>
            <Title>Relatórios</Title>
            <Paragraph>Exporte seus dados para Excel</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button>Acessar</Button>
          </Card.Actions>
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
    minWidth: 200,  // Garante largura mínima
    marginTop: 40,  // Posiciona o menu abaixo da barra de navegação
  },
  menuItemTitle: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    marginBottom: 24,
  },
  coverImage: {
    height: 120,
    resizeMode: "contain",
    backgroundColor: "transparent",
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionCard: {
    marginBottom: 16,
  },
});
