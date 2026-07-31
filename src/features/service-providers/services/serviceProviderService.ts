import { supabase } from '../../../lib/supabase';

export interface ServiceProviderProfile {
  id?: string;
  user_id: string;
  provider_type: string;
  business_name: string;
  tagline: string;
  bio: string;
  about_section?: string;
  profile_photo?: string;
  banner_photo?: string;
  location: string;
  email: string;
  phone?: string;
  website_url?: string;
  social_links?: any;
  genres: string[];
  specializations: string[];
  years_of_experience: number;
  base_price: number;
  currency: string;
  price_per_hour?: number;
  min_project_budget?: number;
  max_project_budget?: number;
  turnaround_time_days?: number;
  portfolio_description?: string;
  sample_work_urls?: string[];
  accepts_remote_work: boolean;
  available_for_hire: boolean;
  is_verified: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  // Onboarding status fields
  onboarding_step?: number;
  business_info_completed?: boolean;
  stripe_verification_completed?: boolean;
  stripe_verification_date?: string;
  can_list_services?: boolean;
  verification_notes?: string;
  // Stripe fields
  stripe_account_id?: string;
  stripe_onboarding_url?: string;
  stripe_account_status?: string;
}

export interface ServiceProviderSpecialization {
  id?: string;
  service_provider_id: string;
  specializations?: string[];
  software?: string[];
  equipment?: string[];
  portfolio_urls?: string[];
}

class ServiceProviderService {
  async createProfile(profile: ServiceProviderProfile): Promise<ServiceProviderProfile | null> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .insert([profile])
        .select()
        .single();

      if (error) {
        console.error('Error creating service provider profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create service provider profile:', error);
      throw error;
    }
  }

  async getProfileByUserId(userId: string): Promise<ServiceProviderProfile | null> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching service provider profile:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Failed to fetch service provider profile:', error);
      throw error;
    }
  }

  async updateProfile(profileId: string, updates: Partial<ServiceProviderProfile>): Promise<ServiceProviderProfile | null> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        console.error('Error updating service provider profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update service provider profile:', error);
      throw error;
    }
  }

  async getAllApprovedProviders(limit = 50, offset = 0): Promise<ServiceProviderProfile[]> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('status', 'approved')
        .eq('available_for_hire', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching approved service providers:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch approved service providers:', error);
      throw error;
    }
  }

  async getProvidersByType(providerType: string, limit = 50, offset = 0): Promise<ServiceProviderProfile[]> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('provider_type', providerType)
        .eq('status', 'approved')
        .eq('available_for_hire', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching service providers by type:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch service providers by type:', error);
      throw error;
    }
  }

  async searchProviders(query: string, providerType?: string, genres?: string[]): Promise<ServiceProviderProfile[]> {
    try {
      let queryBuilder = supabase
        .from('service_providers')
        .select('*')
        .eq('status', 'approved')
        .eq('available_for_hire', true);

      if (providerType) {
        queryBuilder = queryBuilder.eq('provider_type', providerType);
      }

      if (genres && genres.length > 0) {
        queryBuilder = queryBuilder.overlaps('genres', genres);
      }

      if (query) {
        queryBuilder = queryBuilder.or(`business_name.ilike.%${query}%,tagline.ilike.%${query}%,bio.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error searching service providers:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search service providers:', error);
      throw error;
    }
  }

  async createSpecialization(specialization: ServiceProviderSpecialization): Promise<ServiceProviderSpecialization | null> {
    try {
      const { data, error } = await supabase
        .from('service_provider_specializations')
        .insert([specialization])
        .select()
        .single();

      if (error) {
        console.error('Error creating specialization:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create specialization:', error);
      throw error;
    }
  }

  async getSpecializations(serviceProviderId: string): Promise<ServiceProviderSpecialization | null> {
    try {
      const { data, error} = await supabase
        .from('service_provider_specializations')
        .select('*')
        .eq('service_provider_id', serviceProviderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching specializations:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch specializations:', error);
      throw error;
    }
  }

  // Onboarding status management
  async updateOnboardingStatus(
    profileId: string,
    updates: {
      onboarding_step?: number;
      business_info_completed?: boolean;
      stripe_verification_completed?: boolean;
      stripe_verification_date?: string;
      can_list_services?: boolean;
      verification_notes?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update(updates)
        .eq('id', profileId);

      if (error) {
        console.error('Error updating onboarding status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
      return false;
    }
  }

  async markBusinessInfoCompleted(profileId: string): Promise<boolean> {
    return this.updateOnboardingStatus(profileId, {
      business_info_completed: true,
      onboarding_step: 2, // Move to Stripe verification step
    });
  }

  async markStripeVerificationCompleted(profileId: string): Promise<boolean> {
    return this.updateOnboardingStatus(profileId, {
      stripe_verification_completed: true,
      stripe_verification_date: new Date().toISOString(),
      onboarding_step: 3, // Move to approved step
      can_list_services: true, // Allow service listing
    });
  }

  async checkCanListServices(profileId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('can_list_services, stripe_verification_completed')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        console.error('Error checking service listing permission:', error);
        return false;
      }

      return data.can_list_services === true && data.stripe_verification_completed === true;
    } catch (error) {
      console.error('Failed to check service listing permission:', error);
      return false;
    }
  }
}

export const serviceProviderService = new ServiceProviderService();
export default serviceProviderService;
