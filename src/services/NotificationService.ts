import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configuração das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  /**
   * Verifica se as notificações estão habilitadas
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const storedValue = await AsyncStorage.getItem('notificationsEnabled');
      return storedValue === 'true';
    } catch (error) {
      console.error('Erro ao verificar estado das notificações:', error);
      return false;
    }
  }

  /**
   * Configura as notificações
   */
  static async setup(): Promise<void> {
    try {
      // Configurar canal de notificação no Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
    }
  }

  /**
   * Agenda uma notificação
   */
  static async scheduleNotification(
    title: string, 
    body: string, 
    data: any = {}, 
    trigger: Notifications.NotificationTriggerInput = null
  ): Promise<string | null> {
    try {
      if (!(await this.areNotificationsEnabled())) {
        return null;
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger,
      });
      
      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      return null;
    }
  }

  /**
   * Envia uma notificação imediata
   */
  static async sendImmediateNotification(
    title: string, 
    body: string, 
    data: any = {}
  ): Promise<string | null> {
    return this.scheduleNotification(title, body, data);
  }

  /**
   * Cancela todas as notificações agendadas
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
    }
  }

  /**
   * Cancela uma notificação específica
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error(`Erro ao cancelar notificação ${notificationId}:`, error);
    }
  }

  /**
   * Solicita permissões de notificação
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissões de notificação:', error);
      return false;
    }
  }
}

export default NotificationService;
