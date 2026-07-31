import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReviewCardProps {
  review: {
    id: string;
    reviewer_id: string;
    reviewer_name: string;
    rating: number;
    heading: string;
    description: string;
    created_at: string;
  };
  currentUserId?: string;
  onDelete?: (reviewId: string) => void;
}

export default function ReviewCard({ review, currentUserId, onDelete }: ReviewCardProps) {
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(review.id);
            }
          },
        },
      ]
    );
  };

  const isCurrentUserReview = currentUserId && review.reviewer_id === currentUserId;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
          <View style={styles.starsContainer}>
            {renderStars(review.rating)}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.date}>{formatDate(review.created_at)}</Text>
          {isCurrentUserReview && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={styles.heading}>{review.heading}</Text>
      <Text style={styles.description}>{review.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
});
