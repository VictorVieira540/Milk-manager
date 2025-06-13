import React from 'react';
import { en, registerTranslation } from 'react-native-paper-dates';

// Definir o tipo de tradução diretamente em vez de importá-lo
interface CustomTranslation {
  save: string;
  selectSingle: string;
  selectMultiple: string;
  selectRange: string;
  notAccordingToDateFormat: (inputFormat: string) => string;
  mustBeHigherThan: (date: string) => string;
  mustBeLowerThan: (date: string) => string;
  mustBeBetween: (startDate: string, endDate: string) => string;
  dateIsDisabled: string;
  previous: string;
  next: string;
  typeInDate: string;
  pickDateFromCalendar: string;
  close: string;
  cancel: string;
  startDate: string;
  endDate: string;
  todayLabel: string;
  hour: string;
  minute: string;
}

// Registrar traduções em português
export const ptBR: CustomTranslation = {
  save: 'Salvar',
  selectSingle: 'Selecionar data',
  selectMultiple: 'Selecionar datas',
  selectRange: 'Selecionar período',
  notAccordingToDateFormat: (inputFormat: string) =>
    `O formato de data deve ser ${inputFormat}`,
  mustBeHigherThan: (date: string) => `Deve ser posterior a ${date}`,
  mustBeLowerThan: (date: string) => `Deve ser anterior a ${date}`,
  mustBeBetween: (startDate: string, endDate: string) =>
    `Deve estar entre ${startDate} - ${endDate}`,
  dateIsDisabled: 'Dia não é permitido',
  previous: 'Anterior',
  next: 'Próximo',
  typeInDate: 'Digite a data',
  pickDateFromCalendar: 'Escolher data do calendário',
  close: 'Fechar',
  cancel: 'Cancelar',
  startDate: 'Data inicial',
  endDate: 'Data final',
  todayLabel: 'Hoje',
  hour: 'Hora',
  minute: 'Minuto',
};

registerTranslation('pt', ptBR);
registerTranslation('pt-BR', ptBR);

// Exportar um singleton para facilitar o uso em outros componentes
export const DateUtils = {
  registerTranslation,
};