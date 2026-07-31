import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

interface WriteReviewModalProps {
  visible: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  userId: string;
  onReviewSubmitted?: () => void;
}

export default function WriteReviewModal({
  visible,
  onClose,
  providerId,
  providerName,
  userId,
  onReviewSubmitted
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleStarPress = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    if (reviewText.trim().length === 0) {
      Alert.alert('Review Required', 'Please write a review before submitting.');
      return;
    }

    if (reviewText.trim().length > 100) {
      Alert.alert('Review Too Long', 'Please keep your review under 100 words.');
      return;
    }

    try {
      setSubmitting(true);

      // Insert the review into the service_provider_reviews table
      const { error } = await supabase
        .from('service_provider_reviews')
        .insert({
          service_provider_id: providerId,
          client_id: userId,
          rating: rating,
          review_text: reviewText.trim(),
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error submitting review:', error);
        Alert.alert('Error', 'Failed to submit review. Please try again.');
        return;
      }

      Alert.alert(
        'Review Submitted!', 
        `Thank you for reviewing ${providerName}. Your review helps other users make informed decisions.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setRating(0);
              setReviewText('');
              onClose();
              onReviewSubmitted?.();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setReviewText('');
    onClose();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={32}
            color={i <= rating ? '#FFD700' : '#6B7280'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const wordCount = reviewText.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.providerName}>{providerName}</Text>
          <Text style={styles.subtitle}>Share your experience working with this service provider</Text>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Rating</Text>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            <Text style={styles.ratingText}>
              {rating === 0 ? 'Tap to rate' : `${rating} star${rating !== 1 ? 's' : ''}`}
            </Text>
          </View>

          {/* Review Text */}
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Describe your experience working with this service provider..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={6}
              maxLength={500}
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
            />
            <Text style={[
              styles.wordCount,
              wordCount > 100 && styles.wordCountError
            ]}>
              {wordCount}/100 words
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || reviewText.trim().length === 0 || wordCount > 100 || submitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitReview}
            disabled={rating === 0 || reviewText.trim().length === 0 || wordCount > 100 || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="star" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  ratingSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  reviewSection: {
    marginBottom: 32,
  },
  reviewInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  wordCount: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 8,
  },
  wordCountError: {
    color: '#EF4444',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
