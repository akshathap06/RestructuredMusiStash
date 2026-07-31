import { supabase } from '../../../lib/supabase';

export interface ServiceListingStatus {
  exists: boolean;
  listing_id?: string;
  business_name?: string;
  service_category?: string;
  status?: string;
  active_requests: number;
  paid_requests: number;
  can_remove: boolean;
  removal_reason: string;
  error?: string;
}

export interface RemovalResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
  listing_id?: string;
  removed_at?: string;
}

class ServiceListingService {
  /**
   * Get the status of a service listing to determine if it can be removed
   */
  async getServiceListingStatus(listingId: string, providerId: string): Promise<ServiceListingStatus> {
    try {
      const { data, error } = await supabase
        .rpc('get_service_listing_status', {
          listing_id: listingId,
          provider_id: providerId
        });

      if (error) {
        console.error('Error getting service listing status:', error);
        return {
          exists: false,
          active_requests: 0,
          paid_requests: 0,
          can_remove: false,
          removal_reason: 'Error checking status',
          error: error.message
        };
      }

      return data as ServiceListingStatus;
    } catch (error) {
      console.error('Error in getServiceListingStatus:', error);
      return {
        exists: false,
        active_requests: 0,
        paid_requests: 0,
        can_remove: false,
        removal_reason: 'Error checking status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a service listing can be safely removed
   */
  async canRemoveServiceListing(listingId: string, providerId: string): Promise<{
    can_remove: boolean;
    reason: string;
    active_requests: number;
    paid_requests: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('can_remove_service_listing', {
          listing_id: listingId,
          provider_id: providerId
        });

      if (error) {
        console.error('Error checking if service listing can be removed:', error);
        return {
          can_remove: false,
          reason: 'Error checking removal eligibility',
          active_requests: 0,
          paid_requests: 0
        };
      }

      return {
        can_remove: data.can_remove,
        reason: data.reason,
        active_requests: data.active_requests || 0,
        paid_requests: data.paid_requests || 0
      };
    } catch (error) {
      console.error('Error in canRemoveServiceListing:', error);
      return {
        can_remove: false,
        reason: 'Error checking removal eligibility',
        active_requests: 0,
        paid_requests: 0
      };
    }
  }

  /**
   * Remove a service listing with safety checks
   */
  async removeServiceListing(listingId: string, providerId: string): Promise<RemovalResult> {
    try {
      const { data, error } = await supabase
        .rpc('remove_service_listing', {
          listing_id: listingId,
          provider_id: providerId
        });

      if (error) {
        console.error('Error removing service listing:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return data as RemovalResult;
    } catch (error) {
      console.error('Error in removeServiceListing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all service listings for a provider
   */
  async getProviderServiceListings(providerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id,
          business_name,
          service_category,
          description,
          base_price,
          status,
          created_at,
          updated_at,
          removal_reason
        `)
        .eq('user_id', providerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting provider service listings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProviderServiceListings:', error);
      return [];
    }
  }

  /**
   * Reactivate a service listing (if it was previously removed)
   */
  async reactivateServiceListing(listingId: string, providerId: string): Promise<RemovalResult> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .update({
          status: 'active',
          removal_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId)
        .eq('user_id', providerId)
        .select()
        .single();

      if (error) {
        console.error('Error reactivating service listing:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Service listing reactivated successfully',
        listing_id: listingId
      };
    } catch (error) {
      console.error('Error in reactivateServiceListing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const serviceListingService = new ServiceListingService();
