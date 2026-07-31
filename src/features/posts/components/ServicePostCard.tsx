import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AdaptiveImage from '../../../components/AdaptiveImage';

const { width } = Dimensions.get('window');

interface ServicePostCardProps {
  username: string;
  userAvatar: string;
  postImage: string;
  /** Original image width for adaptive display */
  imageWidth?: number;
  /** Original image height for adaptive display */
  imageHeight?: number;
  serviceName: string;
  price: string;
  budget: string;
  location: string;
  timeAgo: string;
  onViewServices: () => void;
  onMessage: () => void;
}

export default function ServicePostCard({
  username,
  userAvatar,
  postImage,
  imageWidth,
  imageHeight,
  serviceName,
  price,
  budget,
  location,
  timeAgo,
  onViewServices,
  onMessage,
}: ServicePostCardProps) {
  return (
    <View style={styles.serviceCard}>
      {/* User Header */}
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <View style={styles.serviceAvatar}>
            <Ionicons name="briefcase" size={20} color="#3B82F6" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{username}</Text>
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>
        </View>
      </View>

      {/* Service Image - Adaptive aspect ratio */}
      {postImage && (
        <AdaptiveImage
          uri={postImage}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
        />
      )}

      {/* Service Details */}
      <View style={styles.serviceDetails}>
        <Text style={styles.serviceName}>{serviceName}</Text>
        
        <View style={styles.serviceLocation}>
          <Ionicons name="location" size={16} color="#9CA3AF" />
          <Text style={styles.locationText}>{location}</Text>
        </View>

        <View style={styles.servicePricing}>
          <View>
            <Text style={styles.priceLabel}>Service Price</Text>
            <Text style={styles.priceValue}>{price}</Text>
          </View>
          <View>
            <Text style={styles.priceLabel}>Project Budget</Text>
            <Text style={styles.priceValue}>{budget}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.serviceActions}>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={onMessage}
          >
            <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.viewServicesButton}
            onPress={onViewServices}
          >
            <Ionicons name="eye" size={18} color="#000000" />
            <Text style={styles.viewServicesButtonText}>View Services</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: '#000000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
    paddingBottom: 16,
  },
  
  // Post Header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // Post Image - adaptive sizing handled by AdaptiveImage component
  
  // Service Details
  serviceDetails: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  serviceLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  servicePricing: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Service Actions
  serviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewServicesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  viewServicesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
});

