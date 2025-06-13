import React from 'react';
import { View, Text } from 'react-native';

const Header = ({ title }) => {
  const appName = "Controle de Produtor";

  return (
    <View className="bg-blue-500 p-4">
      <Text className="font-bold text-xl text-white">{title || appName}</Text>
    </View>
  );
};

export default Header;