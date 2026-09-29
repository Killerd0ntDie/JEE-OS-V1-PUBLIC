export class NotificationManager {
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (_e) {
        return false;
      }
    }
    return false;
  }

  public sendDesktopNotification(title: string, body: string, silent: boolean = false): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, silent, icon: '/favicon.ico' });
      } catch (e) {
        console.error('Failed to send desktop notification', e);
      }
    }
  }
}
