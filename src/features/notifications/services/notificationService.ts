import { supabase } from '../../../lib/supabase';

/**
 * App notification. Field names kept broadly compatible with the old
 * `project_notifications` shape so the current screen keeps working; Phase 3
 * restyles the screen against `type` / `body` / `read` directly.
 */
export interface AppNotification {
  id: string;
  user_id: string;
  recipient_id: string; // alias of user_id (back-compat)
  type: string;
  notification_type: string; // alias of type (back-compat)
  title: string;
  body: string;
  message: string; // alias of body (back-compat)
  data: Record<string, unknown>;
  read: boolean;
  is_read: boolean; // alias of read (back-compat)
  created_at: string;
}

// Legacy name still imported in a few places.
export type ProjectNotification = AppNotification;

type NotificationRow = {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

function mapNotification(row: NotificationRow): AppNotification {
  const type = row.type ?? 'general';
  const body = row.body ?? '';
  return {
    id: row.id,
    user_id: row.user_id,
    recipient_id: row.user_id,
    type,
    notification_type: type,
    title: row.title,
    body,
    message: body,
    data: row.data ?? {},
    read: row.read,
    is_read: row.read,
    created_at: row.created_at,
  };
}

export class NotificationService {
  static async getUserNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
    return (data as NotificationRow[] | null)?.map(mapNotification) ?? [];
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
    return count ?? 0;
  }

  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /** Create a notification for the acting user (RLS: auth.uid() = user_id). */
  static async create(params: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      data: params.data ?? {},
    });
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}
