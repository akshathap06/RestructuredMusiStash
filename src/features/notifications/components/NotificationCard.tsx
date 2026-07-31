import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ProjectNotification } from '../services/notificationService';

interface NotificationCardProps {
  notification: ProjectNotification;
  onPress: () => void;
  onMarkAsRead: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_received':
        return '📥';
      case 'request_accepted':
        return '✅';
      case 'request_rejected':
        return '❌';
      case 'price_proposed':
        return '💰';
      case 'agreement_created':
        return '📋';
      case 'payment_required':
        return '💳';
      case 'payment_completed':
        return '🎉';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'request_accepted':
      case 'agreement_created':
      case 'payment_completed':
        return '#3B82F6'; // Green
      case 'request_rejected':
        return '#EF4444'; // Red
      case 'price_proposed':
      case 'payment_required':
        return '#F59E0B'; // Yellow
      default:
        return '#3B82F6'; // Purple
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.is_read && styles.unreadContainer
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getNotificationIcon(notification.notification_type)}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.timestamp}>
            {formatDate(notification.created_at)}
          </Text>
        </View>

        {!notification.is_read && (
          <View style={[styles.unreadDot, { backgroundColor: getNotificationColor(notification.notification_type) }]} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
  },
  unreadContainer: {
    backgroundColor: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});
