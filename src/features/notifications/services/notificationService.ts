import { supabase } from '../../../lib/supabase';

export interface ProjectNotification {
  id: string;
  project_request_id: string;
  recipient_id: string;
  sender_id: string | null;
  notification_type: 'request_received' | 'request_accepted' | 'request_rejected' | 'price_proposed' | 'agreement_created' | 'payment_required' | 'payment_completed';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export class NotificationService {
  // Get all notifications for the current user
  static async getUserNotifications(userId: string): Promise<ProjectNotification[]> {
    try {
      const { data, error } = await supabase
        .from('project_notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('project_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw error;
    }
  }

  // Get notifications for a specific project request
  static async getProjectNotifications(projectRequestId: string): Promise<ProjectNotification[]> {
    try {
      const { data, error } = await supabase
        .from('project_notifications')
        .select('*')
        .eq('project_request_id', projectRequestId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectNotifications:', error);
      throw error;
    }
  }
}
