import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService, ProjectNotification } from '../services/notificationService';

export const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await NotificationService.getUserNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: ProjectNotification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await NotificationService.markAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, is_read: true }
              : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to project request details
    if (notification.project_request_id) {
      (navigation as any).navigate('ProjectRequestDetails', { 
        requestId: notification.project_request_id 
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      await NotificationService.markAllAsRead(user.id);
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    // Optimistic update - remove immediately from UI
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Delete from server in background (don't await)
    NotificationService.deleteNotification(notificationId).catch(error => {
      console.error('Error deleting notification:', error);
      // Could optionally re-add the notification on failure, but usually not needed
    });
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_accepted':
        return { name: 'checkmark-circle', color: '#3B82F6' };
      case 'price_proposed':
        return { name: 'cash', color: '#F59E0B' };
      case 'agreement_created':
        return { name: 'document-text', color: '#3B82F6' };
      case 'payment_received':
        return { name: 'card', color: '#3B82F6' };
      case 'work_submitted':
        return { name: 'cloud-upload', color: '#3B82F6' };
      case 'like':
        return { name: 'heart', color: '#EF4444' };
      case 'comment':
        return { name: 'chatbubble', color: '#3B82F6' };
      case 'follow':
        return { name: 'person-add', color: '#3B82F6' };
      default:
        return { name: 'notifications', color: '#6B7280' };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item, index }: { item: ProjectNotification; index: number }) => {
    const icon = getNotificationIcon(item.notification_type);
    const isLast = index === notifications.length - 1;
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !isLast && styles.notificationItemBorder]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.6}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={[styles.title, !item.is_read && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
          </View>
          
          <View style={styles.rightSection}>
            {!item.is_read && <View style={styles.unreadDot} />}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteNotification(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-outline" size={48} color="#4B5563" />
      </View>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyMessage}>
        You'll see updates about your project requests, likes, comments, and followers here
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {unreadCount > 0 && (
        <View style={styles.unreadSection}>
          <Text style={styles.unreadText}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Notifications Header - with safe area padding at top */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
        ListHeaderComponent={notifications.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
    backgroundColor: '#000000',
    minHeight: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: {
    width: 44,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  unreadSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  markAllText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
  },
  notificationItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F1F1F',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 2,
    lineHeight: 20,
  },
  titleUnread: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  message: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '400',
  },
  rightSection: {
    alignItems: 'center',
    paddingTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyMessage: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
