// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle, ViewStyle } from 'react-native';

// Mapeamento de ícones SFSymbols para MaterialIcons
const MAPPING: Record<string, any> = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'person.crop.circle.fill': 'person',
  'cup.and.saucer.fill': 'coffee', // Corrigido de 'local_cafe' para 'coffee'
  'chart.bar.fill': 'insert-chart', // Corrigido de 'bar_chart' para 'insert-chart'
  'person.fill': 'person',
  'drop.fill': 'opacity',
  'doc.text.fill': 'description',
};

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] || 'help-outline'; // Fallback para ícone padrão
  return <MaterialIcons color={color} size={size} name={iconName} style={style as StyleProp<TextStyle>} />;
}
