import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { theme } from './theme';

// Importar e utilizar o provedor de datas
import { registerTranslation } from 'react-native-paper-dates';
import './dateUtils';

export function PaperDateProvider({ children }: { children: React.ReactNode }) {
  return (
    <PaperProvider theme={theme}>
      {children}
    </PaperProvider>
  );
}