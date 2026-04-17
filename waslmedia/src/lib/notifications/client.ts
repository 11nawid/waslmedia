import { apiGet, apiSend } from '@/lib/api/client';
import type { UserNotification } from '@/lib/ads/types';

export async function getUserNotificationsClient() {
  return apiGet<{ items: UserNotification[]; unreadCount: number }>('/api/notifications', {
    cache: 'no-store',
    progressMode: 'silent',
  });
}

export async function getUserNotificationDetailClient(notificationId: string) {
  return apiGet<{ notification: UserNotification }>(`/api/notifications/${notificationId}`, {
    cache: 'no-store',
    progressMode: 'silent',
  });
}

export async function markUserNotificationReadClient(notificationId: string) {
  return apiSend<{ notification: UserNotification }>(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}
