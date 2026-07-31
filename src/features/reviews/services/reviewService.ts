import { supabase } from '../../../lib/supabase';

export interface Review {
  id: string;
  service_provider_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  heading: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewData {
  service_provider_id: string;
  reviewer_name: string;
  rating: number;
  heading: string;
  description: string;
}

class ReviewService {
  // Get all reviews for a specific service provider
  async getReviewsForProvider(providerId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('service_provider_simple_reviews')
        .select('*')
        .eq('service_provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      throw error;
    }
  }

  // Create a new review
  async createReview(reviewData: CreateReviewData, userId: string): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('service_provider_simple_reviews')
        .insert({
          ...reviewData,
          reviewer_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating review:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  }

  // Update an existing review
  async updateReview(reviewId: string, reviewData: Partial<CreateReviewData>, userId: string): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('service_provider_simple_reviews')
        .update(reviewData)
        .eq('id', reviewId)
        .eq('reviewer_id', userId) // Ensure user can only update their own reviews
        .select()
        .single();

      if (error) {
        console.error('Error updating review:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update review:', error);
      throw error;
    }
  }

  // Delete a review
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('service_provider_simple_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', userId); // Ensure user can only delete their own reviews

      if (error) {
        console.error('Error deleting review:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      throw error;
    }
  }

  // Get user's review for a specific service provider
  async getUserReviewForProvider(providerId: string, userId: string): Promise<Review | null> {
    try {
      const { data, error } = await supabase
        .from('service_provider_simple_reviews')
        .select('*')
        .eq('service_provider_id', providerId)
        .eq('reviewer_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching user review:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Failed to fetch user review:', error);
      throw error;
    }
  }

  // Get service provider stats (average rating and review count)
  async getProviderStats(providerId: string): Promise<{ average_rating: number; review_count: number }> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('average_rating, total_ratings_count')
        .eq('id', providerId)
        .single();

      if (error) {
        console.error('Error fetching provider stats:', error);
        throw error;
      }

      return {
        average_rating: data.average_rating || 0,
        review_count: data.total_ratings_count || 0,
      };
    } catch (error) {
      console.error('Failed to fetch provider stats:', error);
      throw error;
    }
  }
}

export default new ReviewService();
