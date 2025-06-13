import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50',     // Verde para representar o campo/rural
    accent: '#8BC34A',      // Verde claro
    background: '#F5F5F5',  // Fundo claro
    surface: '#FFFFFF',     // Superfícies brancas
    text: '#212121',        // Texto escuro
    error: '#D32F2F',       // Vermelho para erros
    success: '#4CAF50',     // Verde para sucesso
    warning: '#FFC107',     // Amarelo para avisos
    placeholder: '#9E9E9E',  // Cinza para placeholders
  },
};