/**
 * Browser Notifications Utility
 *
 * Shows system notifications for incoming calls when HubSpot tab is in background.
 * This helps users know about calls even when they're on a different tab.
 */

class NotificationService {
  private hasPermission: boolean = false;
  private originalTitle: string = '';

  constructor() {
    this.originalTitle = document.title;
    this.checkPermission();
  }

  /**
   * Check and request notification permission
   */
  async checkPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  /**
   * Request notification permission (call this after user interaction)
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.hasPermission = permission === 'granted';
    return this.hasPermission;
  }

  /**
   * Show incoming call notification
   */
  showIncomingCallNotification(
    fromNumber: string,
    contactName?: string,
    onAccept?: () => void
  ): Notification | null {
    // Flash the tab title
    this.flashTitle('Incoming Call!');

    if (!this.hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    const title = 'Incoming Call';
    const body = contactName
      ? `${contactName} (${fromNumber}) is calling...`
      : `${fromNumber} is calling...`;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'incoming-call', // Prevents duplicate notifications
      requireInteraction: true, // Keeps notification visible until user interacts
      silent: false,
    });

    // Handle notification click - focus the HubSpot tab
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onAccept) {
        onAccept();
      }
    };

    return notification;
  }

  /**
   * Close any existing incoming call notification
   */
  closeIncomingCallNotification(): void {
    this.resetTitle();
  }

  /**
   * Flash the document title to attract attention
   */
  private flashTitle(message: string): void {
    let isOriginal = false;
    const flashInterval = setInterval(() => {
      document.title = isOriginal ? message : this.originalTitle;
      isOriginal = !isOriginal;
    }, 1000);

    // Store interval to clear later
    (window as any).__titleFlashInterval = flashInterval;
  }

  /**
   * Reset the document title
   */
  resetTitle(): void {
    if ((window as any).__titleFlashInterval) {
      clearInterval((window as any).__titleFlashInterval);
      (window as any).__titleFlashInterval = null;
    }
    document.title = this.originalTitle;
  }

  /**
   * Play notification sound
   */
  playRingtone(): HTMLAudioElement | null {
    try {
      // Use a simple beep/ring sound (you can replace with a custom ringtone URL)
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA9fkNjYqGoZCUGS2uO0eBxYjNbhtHwkE0OH1+G7gioZP4DU4MGHLiE6etHgxowzJzV0zunKkjotLnDL5c+YPzEob8rlz5hANCdvy+XPmEA0J2/L5c+YQDQnb8vlz5hANCdvy+XQmEA0J2/L5dCYPzQnb8vl0JhANCdvy+XQmEA0J2/L5dCYQDQnb8vl0JhANCdvy+XQl0A0J2/L5c+XQDQnb8vlz5dANCdvy+XPl0A0J2/L5c+XQDQnb8vlz5dANCdvy+XPl0A0J2/L5c+XQDQnb8vlz5dANCVvy+XPl0AzJW/L5c+WQDMlbsvl0JZAMyVuyuXQlkAyJW7K5dCWQDIlbsrl0JZAM');
      audio.loop = true;
      audio.play().catch(() => {
        console.log('Could not play ringtone - user interaction required');
      });
      return audio;
    } catch (e) {
      console.log('Could not create audio:', e);
      return null;
    }
  }

  /**
   * Stop ringtone
   */
  stopRingtone(audio: HTMLAudioElement | null): void {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
