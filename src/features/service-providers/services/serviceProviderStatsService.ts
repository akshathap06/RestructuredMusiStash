import { supabase } from '../../../lib/supabase';

export interface ServiceProviderStats {
  projectsCompleted: number;
  averageRating: number;
  totalReviews: number;
  responseTimeHours: number;
  totalEarnings?: number;
  completionRate?: number;
}

export interface ProjectStats {
  total: number;
  completed: number;
  inProgress: number;
  cancelled: number;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentReviews: Array<{
    id: string;
    rating: number;
    reviewText?: string;
    clientName: string;
    createdAt: string;
  }>;
}

export class ServiceProviderStatsService {
  
  /**
   * Get comprehensive stats for a service provider - FIXED to use actual data
   */
  static async getProviderStats(providerId: string): Promise<ServiceProviderStats> {
    try {
      console.log('📊 Calculating REAL stats for provider:', providerId);

      // Get the service provider's user_id
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('user_id, response_time_hours')
        .eq('id', providerId)
        .single();

      if (providerError) {
        console.error('Error fetching provider data:', providerError);
        return this.getDefaultStats();
      }

      const userId = providerData.user_id;

      // Calculate REAL statistics from actual data only
      const [projectStats, reviewStats, submissionStats] = await Promise.all([
        this.calculateProjectStats(userId),
        this.calculateReviewStats(providerId),
        this.calculateSubmissionStats(userId)
      ]);

      // Use ONLY real data - no cached values that might be fake
      const stats: ServiceProviderStats = {
        projectsCompleted: Math.max(projectStats.completed, submissionStats.approvedSubmissions),
        averageRating: reviewStats.averageRating, // Only use real reviews
        totalReviews: reviewStats.totalReviews, // Only use real reviews
        responseTimeHours: providerData.response_time_hours || 24,
        totalEarnings: submissionStats.totalEarnings,
        completionRate: projectStats.total > 0 ? (projectStats.completed / projectStats.total) * 100 : 
                       submissionStats.totalSubmissions > 0 ? (submissionStats.approvedSubmissions / submissionStats.totalSubmissions) * 100 : 100
      };

      console.log('📊 REAL calculated stats:', stats);
      console.log('📊 Project stats:', projectStats);
      console.log('📊 Review stats:', reviewStats);
      console.log('📊 Submission stats:', submissionStats);

      // Update the cached stats with REAL values
      await this.updateCachedStats(providerId, stats);

      return stats;

    } catch (error) {
      console.error('Error calculating provider stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Calculate project statistics from project_requests table
   */
  private static async calculateProjectStats(userId: string): Promise<ProjectStats> {
    try {
      const { data, error } = await supabase
        .from('project_requests')
        .select('status')
        .eq('service_provider_id', userId);

      if (error) {
        console.error('Error fetching project stats:', error);
        return { total: 0, completed: 0, inProgress: 0, cancelled: 0 };
      }

      const stats = {
        total: data.length,
        completed: data.filter(p => 
          p.status === 'completed' || 
          p.status === 'delivered' || 
          p.status === 'submitted' // Consider submitted as completed work
        ).length,
        inProgress: data.filter(p => p.status === 'accepted' || p.status === 'in_progress').length,
        cancelled: data.filter(p => p.status === 'cancelled' || p.status === 'declined').length
      };

      console.log('📈 Project stats:', stats);
      return stats;

    } catch (error) {
      console.error('Error calculating project stats:', error);
      return { total: 0, completed: 0, inProgress: 0, cancelled: 0 };
    }
  }

  /**
   * Calculate review statistics - ONLY from service_provider_reviews table
   */
  private static async calculateReviewStats(providerId: string): Promise<{ totalReviews: number; averageRating: number }> {
    try {
      console.log('⭐ Checking service_provider_reviews for provider:', providerId);
      
      const { data, error } = await supabase
        .from('service_provider_reviews')
        .select('rating')
        .eq('service_provider_id', providerId);

      if (error) {
        console.error('Error fetching reviews:', error.message);
        return { totalReviews: 0, averageRating: 0 };
      }

      if (!data || data.length === 0) {
        console.log('⭐ No reviews found - returning zeros');
        return { totalReviews: 0, averageRating: 0 };
      }

      const totalReviews = data.length;
      const averageRating = data.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
      
      console.log('⭐ REAL review stats:', { totalReviews, averageRating });
      return { totalReviews, averageRating };

    } catch (error) {
      console.error('Error calculating review stats:', error);
      return { totalReviews: 0, averageRating: 0 };
    }
  }

  /**
   * Calculate submission statistics - ONLY from work_submissions table
   */
  private static async calculateSubmissionStats(userId: string): Promise<{ 
    totalSubmissions: number; 
    approvedSubmissions: number; 
    totalEarnings: number 
  }> {
    try {
      console.log('📁 Checking work_submissions for user:', userId);
      
      const { data: submissions, error } = await supabase
        .from('work_submissions')
        .select('status, payment_amount, payment_status')
        .eq('service_provider_id', userId);

      if (error) {
        console.error('Error fetching work submissions:', error.message);
        return { totalSubmissions: 0, approvedSubmissions: 0, totalEarnings: 0 };
      }

      if (!submissions || submissions.length === 0) {
        console.log('📁 No work submissions found - returning zeros');
        return { totalSubmissions: 0, approvedSubmissions: 0, totalEarnings: 0 };
      }

      const totalSubmissions = submissions.length;
      const approvedSubmissions = submissions.filter(s => 
        s.status === 'approved' || s.status === 'completed'
      ).length;

      // Calculate earnings from completed payments
      const totalEarnings = submissions
        .filter(s => s.payment_status === 'completed')
        .reduce((sum, submission) => sum + (submission.payment_amount || 0), 0);

      const stats = { totalSubmissions, approvedSubmissions, totalEarnings };
      console.log('📁 REAL submission stats:', stats);
      return stats;

    } catch (error) {
      console.error('Error calculating submission stats:', error);
      return { totalSubmissions: 0, approvedSubmissions: 0, totalEarnings: 0 };
    }
  }

  /**
   * Get detailed review statistics
   */
  static async getDetailedReviewStats(providerId: string): Promise<ReviewStats> {
    try {
      const { data: reviews, error } = await supabase
        .from('service_provider_reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          users!service_provider_reviews_client_id_fkey (
            name
          )
        `)
        .eq('service_provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching detailed reviews:', error);
        return this.getDefaultReviewStats();
      }

      if (!reviews || reviews.length === 0) {
        return this.getDefaultReviewStats();
      }

      const totalReviews = reviews.length;
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

      const ratingDistribution = {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      };

      const recentReviews = reviews.slice(0, 5).map(review => ({
        id: review.id,
        rating: review.rating,
        reviewText: review.review_text,
        clientName: review.users?.name || 'Anonymous',
        createdAt: review.created_at
      }));

      return {
        totalReviews,
        averageRating,
        ratingDistribution,
        recentReviews
      };

    } catch (error) {
      console.error('Error getting detailed review stats:', error);
      return this.getDefaultReviewStats();
    }
  }

  /**
   * Update cached statistics in the service_providers table
   */
  private static async updateCachedStats(providerId: string, stats: ServiceProviderStats): Promise<void> {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({
          total_projects_completed: stats.projectsCompleted,
          average_rating: stats.averageRating,
          total_ratings_count: stats.totalReviews,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId);

      if (error) {
        console.error('Error updating cached stats:', error);
      } else {
        console.log('✅ Updated cached stats for provider:', providerId);
      }

    } catch (error) {
      console.error('Error updating cached stats:', error);
    }
  }

  /**
   * Get stats by user ID (for profile screen)
   */
  static async getStatsByUserId(userId: string): Promise<ServiceProviderStats> {
    try {
      // First get the provider ID from user ID
      const { data: providerData, error } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error || !providerData) {
        console.log('No service provider profile found for user:', userId);
        return this.getDefaultStats();
      }

      return await this.getProviderStats(providerData.id);

    } catch (error) {
      console.error('Error getting stats by user ID:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Refresh all stats for a provider (call this after project completion, review submission, etc.)
   */
  static async refreshProviderStats(providerId: string): Promise<ServiceProviderStats> {
    console.log('🔄 Refreshing stats for provider:', providerId);
    return await this.getProviderStats(providerId);
  }

  /**
   * Get default stats when no data is available
   */
  private static getDefaultStats(): ServiceProviderStats {
    return {
      projectsCompleted: 0,
      averageRating: 0,
      totalReviews: 0,
      responseTimeHours: 24,
      totalEarnings: 0,
      completionRate: 100
    };
  }

  /**
   * Get default review stats when no data is available
   */
  private static getDefaultReviewStats(): ReviewStats {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recentReviews: []
    };
  }
}

export default ServiceProviderStatsService;
