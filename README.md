# MilkControl - Aplicativo de Gestão de Produção Leiteira 🥛

Este é um aplicativo móvel desenvolvido com [Expo](https://expo.dev) e React Native para ajudar produtores e gestores a controlar a produção de leite.

## Funcionalidades

- Cadastro e gerenciamento de produtores
- Registro de coletas de leite
- Controle de preços e quantidades
- Identificação de problemas na qualidade do leite
- Relatórios e estatísticas
- Exportação de dados
- Backup e restauração

## Como iniciar

1. Instale as dependências

   ```bash
   npm install
   ```

2. Inicie o aplicativo

   ```bash
   npx expo start
   ```

## Opções para executar o aplicativo

Após iniciar, você pode abrir o aplicativo em:

- [Emulador Android](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Simulador iOS](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go) no seu dispositivo físico (escaneando o QR code)
- [Build de desenvolvimento](https://docs.expo.dev/develop/development-builds/introduction/)

## Estrutura do projeto

- **/app**: Telas principais e rotas da aplicação
- **/src/models**: Modelos de dados (Produtores, Coletas)
- **/src/services**: Serviços de backend (Dados, Exportação, Notificações)
- **/src/context**: Contextos para gerenciamento de estado
- **/components**: Componentes reutilizáveis

## Desenvolvido com

- React Native
- Expo
- TypeScript
- React Native Paper
- AsyncStorage
