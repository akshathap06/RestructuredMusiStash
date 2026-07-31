import { supabase } from '../../../lib/supabase';
import { ProductionProfileService } from '../../profile/services/productionProfileService';

export interface ProjectRequest {
  id: string;
  client_id: string;
  service_provider_id: string;
  service_type: string;
  project_description: string;
  budget_range?: string;
  timeline?: string;
  additional_requirements?: string;
  urgent_delivery: boolean;
  revision_rounds: number;
  message?: string;
  status: 'pending' | 'responded' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  updated_at: string;
  provider_name?: string;
  provider_business_name?: string;
}

export interface CreateProjectRequestData {
  service_provider_id: string;
  service_type: string;
  project_description: string;
  budget_range?: string;
  timeline?: string;
  additional_requirements?: string;
  urgent_delivery?: boolean;
  revision_rounds?: number;
  message?: string;
}

export interface ProjectNegotiation {
  id: string;
  project_request_id: string;
  negotiator_id: string;
  negotiator_type: 'client' | 'provider';
  proposed_price: number;
  proposed_timeline?: string;
  proposed_terms?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  created_at: string;
  updated_at: string;
}

export interface CreateNegotiationData {
  project_request_id: string;
  proposed_price: number;
  proposed_timeline?: string;
  proposed_terms?: string;
  message?: string;
}

export interface ProjectAgreement {
  id: string;
  project_request_id: string;
  final_price: number;
  final_timeline: string;
  final_terms?: string;
  payment_status: 'pending' | 'paid' | 'refunded' | 'disputed';
  project_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProjectMessage {
  id: string;
  project_request_id: string;
  sender_id: string;
  sender_type: 'client' | 'provider';
  message: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

class ProjectRequestService {
  // Create a new project request
  // PRODUCTION-READY: Validates and corrects service_provider_id before creating request
  async createProjectRequest(data: CreateProjectRequestData, clientId: string): Promise<ProjectRequest> {
    try {
      console.log('Creating project request with data:', {
        clientId,
        service_provider_id: data.service_provider_id,
        service_type: data.service_type,
        project_description: data.project_description,
        budget_range: data.budget_range,
        timeline: data.timeline
      });

      // CRITICAL: Validate and resolve service_provider_id before creating request
      let validServiceProviderId = data.service_provider_id;
      
      // Step 1: Check if the provided service_provider_id exists
      const { data: providerCheck, error: checkError } = await supabase
        .from('service_providers')
        .select('id, user_id, business_name')
        .eq('id', data.service_provider_id)
        .single();
      
      if (checkError || !providerCheck) {
        console.warn('⚠️ [createProjectRequest] Provider ID not found:', data.service_provider_id);
        console.log('⚠️ [createProjectRequest] Attempting to find valid provider...');
        
        // Step 2: Try to find provider by the ID as user_id (common mistake)
        const { data: providerByUserId, error: userIdError } = await supabase
          .from('service_providers')
          .select('id, user_id, business_name')
          .eq('user_id', data.service_provider_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (providerByUserId && !userIdError) {
          console.log('✅ [createProjectRequest] Found provider by user_id:', providerByUserId.id);
          validServiceProviderId = providerByUserId.id;
        } else {
          // Step 3: Last resort - check if any provider exists and show helpful error
          const { data: anyProviders } = await supabase
            .from('service_providers')
            .select('id, user_id, business_name')
            .limit(5);
          
          console.error('❌ [createProjectRequest] Could not find valid service provider');
          console.error('❌ [createProjectRequest] Attempted ID:', data.service_provider_id);
          console.error('❌ [createProjectRequest] Sample providers in DB:', anyProviders);
          
          throw new Error(`Service provider not found. The provider profile may have been deleted or is no longer available. Please refresh and try again.`);
        }
      } else {
        console.log('✅ [createProjectRequest] Provider ID validated:', providerCheck.id, providerCheck.business_name);
      }

      // Update the data with the validated provider ID
      const validatedData = { ...data, service_provider_id: validServiceProviderId };

      const { data: result, error } = await supabase
        .rpc('create_project_request_simple', {
          p_client_id: clientId,
          p_service_provider_id: validServiceProviderId,
          p_service_type: validatedData.service_type,
          p_project_description: validatedData.project_description,
          p_budget_range: validatedData.budget_range || null,
          p_timeline: validatedData.timeline || null,
          p_additional_requirements: validatedData.additional_requirements || null,
          p_urgent_delivery: validatedData.urgent_delivery || false,
          p_revision_rounds: validatedData.revision_rounds || 2,
          p_message: validatedData.message || null
        });

      console.log('RPC call result:', { result, error });

      if (error) {
        console.error('Error creating project request:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // If the RPC function doesn't exist, try direct insert
        if (error.code === '42883') { // function does not exist
          console.log('RPC function not found, trying direct insert...');
          return await this.createProjectRequestDirect(validatedData, clientId);
        }
        
        throw error;
      }

      if (!result) {
        throw new Error('No result returned from create_project_request_simple');
      }

      // Fetch the created request directly from table (RLS is disabled)
      const { data: request, error: fetchError } = await supabase
        .from('project_requests')
        .select('*')
        .eq('id', result)
        .single();

      console.log('✅ [createProjectRequest] Fetch request result:', { request, fetchError });
      console.log('✅ [createProjectRequest] Request stored with service_provider_id:', request?.service_provider_id);

      if (fetchError) {
        console.error('Error fetching created request:', fetchError);
        throw fetchError;
      }

      if (!request) {
        throw new Error('No request found after creation');
      }

      // Get provider details separately
      const { data: provider, error: providerError } = await supabase
        .from('service_providers')
        .select('business_name')
        .eq('id', request.service_provider_id)
        .single();

      console.log('Provider details:', { provider, providerError });

      const finalRequest = {
        ...request,
        provider_name: provider?.business_name || 'Unknown Provider',
        provider_business_name: provider?.business_name || 'Unknown Provider'
      };

      console.log('Final request object:', finalRequest);
      return finalRequest;
    } catch (error) {
      console.error('Failed to create project request:', error);
      throw error;
    }
  }

  // Fallback method for direct insert if RPC function doesn't exist
  // Note: This is called with already-validated data from createProjectRequest
  async createProjectRequestDirect(data: CreateProjectRequestData, clientId: string): Promise<ProjectRequest> {
    try {
      console.log('🔧 [createProjectRequestDirect] Creating project request via direct insert...');
      console.log('🔧 [createProjectRequestDirect] Service Provider ID:', data.service_provider_id);
      console.log('🔧 [createProjectRequestDirect] Client ID:', clientId);
      
      // Double-check provider exists (in case called directly)
      const { data: providerCheck, error: checkError } = await supabase
        .from('service_providers')
        .select('id, business_name')
        .eq('id', data.service_provider_id)
        .single();
      
      if (checkError || !providerCheck) {
        console.error('❌ [createProjectRequestDirect] Provider not found:', data.service_provider_id);
        throw new Error('Service provider not found. Please refresh and try again.');
      }
      
      console.log('✅ [createProjectRequestDirect] Provider validated:', providerCheck.business_name);
      
      const requestData = {
        client_id: clientId,
        service_provider_id: data.service_provider_id,
        service_type: data.service_type,
        project_description: data.project_description,
        budget_range: data.budget_range || null,
        timeline: data.timeline || null,
        additional_requirements: data.additional_requirements || null,
        urgent_delivery: data.urgent_delivery || false,
        revision_rounds: data.revision_rounds || 2,
        message: data.message || null,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: request, error } = await supabase
        .from('project_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Error in direct insert:', error);
        throw error;
      }

      console.log('✅ [createProjectRequestDirect] Direct insert successful:', request);
      return request;
    } catch (error) {
      console.error('Failed to create project request via direct insert:', error);
      throw error;
    }
  }

  // Get project requests for a user (as client)
  async getUserProjectRequests(userId: string): Promise<ProjectRequest[]> {
    try {
      console.log('Fetching project requests for user (client):', userId);
      
      // Query project_requests directly where user is the client
      const { data: requests, error: requestsError } = await supabase
        .from('project_requests')
        .select('*')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      console.log('Direct query response:', { requests, requestsError });

      if (requestsError) {
        console.error('Error fetching project requests:', requestsError);
        throw requestsError;
      }

      if (!requests || requests.length === 0) {
        console.log('No project requests found for user');
        return [];
      }

      // Get provider details for each request
      const providerIds = [...new Set(requests.map((r: any) => r.service_provider_id))];
      const { data: providers, error: providersError } = await supabase
        .from('service_providers')
        .select('id, business_name, user_id')
        .in('id', providerIds);

      if (providersError) {
        console.error('Error fetching providers:', providersError);
        // Continue without provider names if this fails
      }

      // Create a map of provider details
      const providerMap = new Map();
      if (providers) {
        providers.forEach((provider: any) => {
          providerMap.set(provider.id, {
            business_name: provider.business_name,
            user_id: provider.user_id
          });
        });
      }

      // Transform the data to match ProjectRequest interface
      const transformedData = requests.map((request: any) => {
        const provider = providerMap.get(request.service_provider_id);
        return {
          id: request.id,
          client_id: request.client_id,
          service_provider_id: request.service_provider_id,
          service_type: request.service_type,
          project_description: request.project_description,
          budget_range: request.budget_range,
          timeline: request.timeline,
          additional_requirements: request.additional_requirements,
          urgent_delivery: request.urgent_delivery,
          revision_rounds: request.revision_rounds,
          message: request.message,
          status: request.status,
          created_at: request.created_at,
          updated_at: request.updated_at || request.created_at,
          provider_name: provider?.business_name || 'Unknown Provider',
          provider_business_name: provider?.business_name || 'Unknown Provider'
        };
      });

      console.log('Transformed data:', transformedData);
      return transformedData;
    } catch (error) {
      console.error('Failed to fetch project requests:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  // Check if a request exists for a specific service
  async getRequestForService(clientId: string, serviceProviderId: string, serviceType: string): Promise<ProjectRequest | null> {
    try {
      const { data, error } = await supabase
        .from('project_requests')
        .select('*')
        .eq('client_id', clientId)
        .eq('service_provider_id', serviceProviderId)
        .eq('service_type', serviceType)
        .in('status', ['pending', 'responded', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking for existing request:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Failed to check for existing request:', error);
      return null;
    }
  }

  // Get project request by ID
  async getProjectRequest(requestId: string): Promise<ProjectRequest | null> {
    try {
      console.log('ProjectRequestService - Fetching project request with ID:', requestId);
      console.log('ProjectRequestService - RequestId type:', typeof requestId);
      
      if (!requestId || requestId === 'undefined' || requestId === 'null') {
        throw new Error(`Invalid request ID provided: ${requestId}`);
      }

      // Direct table query instead of RPC function
      console.log('ProjectRequestService - Querying project_requests table for ID:', requestId);
      
      const { data, error } = await supabase
        .from('project_requests')
        .select(`
          id,
          client_id,
          service_provider_id,
          service_type,
          project_description,
          title,
          budget_range,
          timeline,
          status,
          created_at,
          updated_at
        `)
        .eq('id', requestId)
        .single();
        
      console.log('ProjectRequestService - Query result:', { data, error });

      if (error) {
        console.error('ProjectRequestService - Database error:', error);
        console.error('ProjectRequestService - Error code:', error.code);
        console.error('ProjectRequestService - Error message:', error.message);
        
        if (error.code === 'PGRST116') {
          console.log('ProjectRequestService - No project request found with ID:', requestId);
          return null;
        }
        
        // Provide more specific error information
        throw new Error(`Database error (${error.code}): ${error.message}`);
      }

      if (!data) {
        console.log('ProjectRequestService - No project request found with ID:', requestId);
        return null;
      }

      console.log('ProjectRequestService - Project request found:', data);
      
      // Validate the data structure
      if (typeof data !== 'object' || !data.id) {
        throw new Error('Invalid project request data structure received');
      }
      
      return data as ProjectRequest;
    } catch (error) {
      console.error('ProjectRequestService - Failed to fetch project request:', error);
      console.error('ProjectRequestService - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  // Update project request status
  async updateProjectRequestStatus(requestId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating project request status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update project request status:', error);
      throw error;
    }
  }

  // Create a negotiation
  async createNegotiation(data: CreateNegotiationData, negotiatorId: string, negotiatorType: 'client' | 'provider'): Promise<ProjectNegotiation> {
    try {
      console.log('Creating negotiation:', { data, negotiatorId, negotiatorType });
      
      const { data: result, error } = await supabase
        .rpc('create_negotiation', {
          p_project_request_id: data.project_request_id,
          p_negotiator_id: negotiatorId,
          p_negotiator_type: negotiatorType,
          p_proposed_price: data.proposed_price,
          p_proposed_timeline: data.proposed_timeline || null,
          p_proposed_terms: data.proposed_terms || null,
          p_message: data.message || null
        });

      console.log('Negotiation creation result:', { result, error });

      if (error) {
        console.error('Error creating negotiation:', error);
        throw error;
      }

      // Fetch the created negotiation
      const { data: negotiation, error: fetchError } = await supabase
        .from('project_negotiations')
        .select('*')
        .eq('id', result)
        .single();

      if (fetchError) {
        console.error('Error fetching created negotiation:', fetchError);
        throw fetchError;
      }

      // Get the project request to find the other party
      const { data: projectRequest, error: requestError } = await supabase
        .from('project_requests')
        .select('client_id, service_provider_id')
        .eq('id', data.project_request_id)
        .single();

      if (!requestError && projectRequest) {
        // Send notification to the other party
        const otherPartyId = negotiatorType === 'client' ? projectRequest.service_provider_id : projectRequest.client_id;
        await this.sendNotification(
          otherPartyId,
          data.project_request_id,
          'price_proposed',
          'New Price Proposal',
          `A new price proposal has been made: $${data.proposed_price}${data.proposed_timeline ? `, Timeline: ${data.proposed_timeline}` : ''}`
        );
      }

      return negotiation;
    } catch (error) {
      console.error('Failed to create negotiation:', error);
      throw error;
    }
  }

  // Get negotiations for a project request
  async getProjectNegotiations(requestId: string): Promise<ProjectNegotiation[]> {
    try {
      console.log('Fetching negotiations for request ID:', requestId);
      
      if (!requestId || requestId === 'undefined') {
        console.log('Invalid request ID for negotiations, returning empty array');
        return [];
      }

      const { data, error } = await supabase
        .from('project_negotiations')
        .select('*')
        .eq('project_request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching negotiations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch negotiations:', error);
      throw error;
    }
  }

  // Create or update a project agreement (provider quote)
  async createProjectAgreement(
    requestId: string, 
    finalPrice: number, 
    finalTimeline: string, 
    finalTerms?: string
  ): Promise<ProjectAgreement> {
    try {
      console.log('Creating project agreement via upsert:', { requestId, finalPrice, finalTimeline, finalTerms });
      const timestamp = new Date().toISOString();

      const { data: existingAgreement, error: existingError } = await supabase
        .from('project_agreements')
        .select('*')
        .eq('project_request_id', requestId)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error looking up existing agreement:', existingError);
        throw existingError;
      }

      let agreement: ProjectAgreement | null = null;

      if (existingAgreement) {
        const { data: updatedAgreement, error: updateError } = await supabase
          .from('project_agreements')
          .update({
            final_price: finalPrice,
            final_timeline: finalTimeline,
            final_terms: finalTerms ?? existingAgreement.final_terms ?? null,
            payment_status: existingAgreement.payment_status || 'pending',
            project_status: existingAgreement.project_status || 'not_started',
            updated_at: timestamp,
          })
          .eq('id', existingAgreement.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating project agreement:', updateError);
          throw updateError;
        }

        agreement = updatedAgreement as ProjectAgreement;
      } else {
        const { data: insertedAgreement, error: insertError } = await supabase
          .from('project_agreements')
          .insert({
            project_request_id: requestId,
            final_price: finalPrice,
            final_timeline: finalTimeline,
            final_terms: finalTerms || null,
            payment_status: 'pending',
            project_status: 'not_started',
            created_at: timestamp,
            updated_at: timestamp,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting project agreement:', insertError);
          throw insertError;
        }

        agreement = insertedAgreement as ProjectAgreement;
      }

      // Persist snapshot of quote values onto the project request for status cards
      await this.syncRequestWithAgreement(requestId, finalPrice, finalTimeline);

      // Notify the client that a quote is ready (non-blocking)
      const request = await this.getProjectRequest(requestId);
      if (request?.client_id) {
        try {
          await this.sendNotification(
            request.client_id,
            requestId,
            'price_proposed',
            'Quote Ready',
            `Your provider proposed $${finalPrice.toFixed(2)} with timeline ${finalTimeline}.`
          );
        } catch (notificationError) {
          console.warn('[projectRequestService] Failed to send quote notification:', notificationError);
        }
      }

      return agreement;
    } catch (error) {
      console.error('Failed to create project agreement:', error);
      throw error;
    }
  }

  // Get latest project agreement
  async getProjectAgreement(requestId: string): Promise<ProjectAgreement | null> {
    try {
      const { data, error } = await supabase
        .from('project_agreements')
        .select('*')
        .eq('project_request_id', requestId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching project agreement:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Failed to fetch project agreement:', error);
      throw error;
    }
  }

  async syncRequestWithAgreement(
    requestId: string,
    finalPrice: number,
    finalTimeline: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_requests')
        .update({
          budget_range: finalPrice.toString(),
          timeline: finalTimeline,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error syncing request with agreement:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to sync request with agreement:', error);
      throw error;
    }
  }

  async deleteProjectAgreement(requestId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_agreements')
        .delete()
        .eq('project_request_id', requestId);

      if (error) {
        console.error('Error deleting project agreement:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete project agreement:', error);
      throw error;
    }
  }

  async markAgreementAccepted(requestId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_agreements')
        .update({
          project_status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('project_request_id', requestId);

      if (error) {
        console.error('Error updating agreement status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update agreement status:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(
    requestId: string,
    senderId: string,
    senderType: 'client' | 'provider',
    message: string,
    messageType: 'text' | 'file' | 'image' | 'system' = 'text',
    attachmentUrl?: string
  ): Promise<ProjectMessage> {
    try {
      const { data, error } = await supabase
        .from('project_messages')
        .insert({
          project_request_id: requestId,
          sender_id: senderId,
          sender_type: senderType,
          message,
          message_type: messageType,
          attachment_url: attachmentUrl
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Get messages for a project request
  async getProjectMessages(requestId: string): Promise<ProjectMessage[]> {
    try {
      console.log('Fetching messages for request ID:', requestId);
      
      if (!requestId || requestId === 'undefined') {
        console.log('Invalid request ID for messages, returning empty array');
        return [];
      }

      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) {
        console.error('Error marking message as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  // Send notification
  async sendNotification(
    userId: string,
    projectRequestId: string,
    notificationType: 'request_accepted' | 'price_proposed' | 'message_sent' | 'payment_required' | 'payment_received',
    title: string,
    message: string
  ): Promise<void> {
    try {
      console.log('Sending notification:', { userId, projectRequestId, notificationType, title, message });
      
      const rpcResult = await supabase
        .rpc('send_project_notification', {
          p_user_id: userId,
          p_project_request_id: projectRequestId,
          p_notification_type: notificationType,
          p_title: title,
          p_message: message
        });

      if (rpcResult.error) {
        const fallbackCodes = ['42883', 'PGRST202']; // function not found / mismatch
        if (!fallbackCodes.includes(rpcResult.error.code || '')) {
          console.error('Error sending notification via RPC:', rpcResult.error);
          throw rpcResult.error;
        }

        console.warn('[sendNotification] RPC missing, falling back to direct insert:', rpcResult.error.message);
        const now = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('project_notifications')
          .insert({
            recipient_id: userId,
            project_request_id: projectRequestId,
            notification_type: notificationType,
            title,
            message,
            is_read: false,
            created_at: now,
            updated_at: now,
            sender_id: null
          });

        if (insertError) {
          console.error('Fallback notification insert failed:', insertError);
          throw insertError;
        }

        console.log('[sendNotification] Fallback insert succeeded');
      }

      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  async getUserNotifications(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('project_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  // Get project requests for a service provider (incoming requests)
  // PRODUCTION-READY: Handles all edge cases including multiple providers, data mismatches, and legacy accounts
  async getProviderProjectRequests(userId: string): Promise<ProjectRequest[]> {
    try {
      // Step 1: Collect all possible user IDs and provider IDs for this user
      const userIds = new Set<string>([userId]);
      const providerIds = new Set<string>();
      
      // Get alternate user ID from profile (handles legacy/merged accounts)
      try {
        const profileResult = await ProductionProfileService.getCompleteUserProfile(userId, true);
        if (profileResult?.profile?.user_data?.id) {
          userIds.add(profileResult.profile.user_data.id);
        }
        if (profileResult?.profile?.service_provider?.id) {
          providerIds.add(profileResult.profile.service_provider.id);
        }
      } catch (error) {
        // Profile lookup failed, continue with userId only
      }
      
      // Step 2: Find ALL service providers for this user (handles multiple provider profiles)
      const { data: serviceProviders, error: providerError } = await supabase
        .from('service_providers')
        .select('id, user_id, business_name')
        .in('user_id', Array.from(userIds))
        .order('created_at', { ascending: false });
      
      if (providerError) {
        console.error('[getProviderProjectRequests] Error fetching service providers:', providerError);
      }
      
      // Add all found provider IDs to our set
      if (serviceProviders) {
        serviceProviders.forEach(sp => {
          providerIds.add(sp.id);
          // Also add the user_id in case it's used as provider_id
          if (sp.user_id) {
            userIds.add(sp.user_id);
          }
        });
      }
      
      // Step 3: PRIMARY METHOD - Query requests using JOIN (most reliable)
      // This ensures we only get requests where the provider actually belongs to this user
      const { data: requests, error: requestsError } = await supabase
        .from('project_requests')
        .select(`
          *,
          service_providers!inner (
            id,
            user_id,
            business_name
          )
        `)
        .in('service_providers.user_id', Array.from(userIds))
        .order('created_at', { ascending: false });
      
      // Step 4: FALLBACK - If JOIN fails or returns no results, try direct ID lookup
      // This handles edge cases where JOIN might fail but data exists
      let finalRequests = requests;
      
      if (requestsError || !requests || requests.length === 0) {
        if (providerIds.size > 0) {
          const { data: fallbackRequests, error: fallbackError } = await supabase
            .from('project_requests')
            .select('*')
            .in('service_provider_id', Array.from(providerIds))
            .order('created_at', { ascending: false });
          
          if (!fallbackError && fallbackRequests && fallbackRequests.length > 0) {
            finalRequests = fallbackRequests;
          }
        }
      }
      
      // Step 5: If still no results, do a comprehensive reverse lookup
      // This catches cases where provider_id exists but user_id relationship is broken
      if (!finalRequests || finalRequests.length === 0) {
        // Get recent requests and check which providers belong to this user
        const { data: recentRequests } = await supabase
          .from('project_requests')
          .select('service_provider_id')
          .order('created_at', { ascending: false })
          .limit(500);
        
        if (recentRequests && recentRequests.length > 0) {
          const uniqueProviderIds = [...new Set(recentRequests.map(r => r.service_provider_id))];
          
          // Check which of these providers belong to our user
          const { data: matchingProviders } = await supabase
            .from('service_providers')
            .select('id')
            .in('id', uniqueProviderIds)
            .in('user_id', Array.from(userIds));
          
          if (matchingProviders && matchingProviders.length > 0) {
            const matchingIds = matchingProviders.map(p => p.id);
            const { data: reverseLookupRequests } = await supabase
              .from('project_requests')
              .select('*')
              .in('service_provider_id', matchingIds)
              .order('created_at', { ascending: false });
            
            if (reverseLookupRequests && reverseLookupRequests.length > 0) {
              finalRequests = reverseLookupRequests;
            }
          }
        }
      }
      
      // Step 6: Transform and return results
      if (!finalRequests || finalRequests.length === 0) {
        return [];
      }
      
      // Get client names
      const clientIds = [...new Set(finalRequests.map((r: any) => r.client_id))];
      const { data: clients } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', clientIds);
      
      const clientMap = new Map();
      if (clients) {
        clients.forEach(client => {
          clientMap.set(client.id, client.name || client.email || 'Unknown Client');
        });
      }
      
      // Create provider map from JOIN results or separate lookup
      const providerMap = new Map();
      if (serviceProviders) {
        serviceProviders.forEach(sp => {
          providerMap.set(sp.id, sp.business_name || 'Unknown Provider');
        });
      }
      
      // Transform requests
      return finalRequests.map((request: any) => ({
        id: request.id,
        client_id: request.client_id,
        service_provider_id: request.service_provider_id,
        service_type: request.service_type,
        project_description: request.project_description,
        budget_range: request.budget_range,
        timeline: request.timeline,
        additional_requirements: request.additional_requirements,
        urgent_delivery: request.urgent_delivery,
        revision_rounds: request.revision_rounds,
        message: request.message,
        status: request.status,
        created_at: request.created_at,
        updated_at: request.updated_at || request.created_at,
        provider_name: request.service_providers?.business_name || providerMap.get(request.service_provider_id) || 'Unknown Provider',
        provider_business_name: request.service_providers?.business_name || providerMap.get(request.service_provider_id) || 'Unknown Provider',
        client_name: clientMap.get(request.client_id) || 'Unknown Client'
      }));
    } catch (error) {
      console.error('[getProviderProjectRequests] Unexpected error:', error);
      return [];
    }
  }

  // Delete a project request (only if not paid and no submissions)
  async deleteProjectRequest(requestId: string, userId: string): Promise<void> {
    try {
      console.log('Deleting project request:', { requestId, userId });
      
      // First check if there are any work submissions for this request
      const { data: submissions, error: submissionsError } = await supabase
        .from('work_submissions')
        .select('id')
        .eq('project_request_id', requestId);
        
      if (submissionsError) {
        console.error('Error checking submissions:', submissionsError);
        throw new Error('Unable to verify request status');
      }
      
      if (submissions && submissions.length > 0) {
        throw new Error('Cannot delete request: Work has already been submitted for this project');
      }
      
      // First get the request details
      const { data: request, error: fetchError } = await supabase
        .from('project_requests')
        .select('client_id, service_provider_id, status')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('Error fetching request for deletion:', fetchError);
        throw new Error('Request not found');
      }

      if (!request) {
        throw new Error('Request not found');
      }

      console.log('Request details:', request);
      console.log('User ID attempting deletion:', userId);
      
      // Check if user is the client who sent the request
      const isClient = request.client_id === userId;
      console.log('Is client?', isClient);
      
      // Check if user is the service provider who received the request
      let isServiceProvider = false;
      if (request.service_provider_id) {
        const { data: serviceProvider, error: providerError } = await supabase
          .from('service_providers')
          .select('user_id')
          .eq('id', request.service_provider_id)
          .single();
          
        console.log('Service provider lookup:', { serviceProvider, providerError });
        
        if (!providerError && serviceProvider) {
          isServiceProvider = serviceProvider.user_id === userId;
        }
      }
      
      console.log('Is service provider?', isServiceProvider);
      console.log('Authorization check - isClient:', isClient, 'isServiceProvider:', isServiceProvider);
      
      if (!isClient && !isServiceProvider) {
        throw new Error('Unauthorized: You can only delete requests you sent or received');
      }

      // Check if there's an agreement (which means payment might be involved)
      const { data: agreement, error: agreementError } = await supabase
        .from('project_agreements')
        .select('payment_status')
        .eq('project_request_id', requestId)
        .single();

      if (!agreementError && agreement && agreement.payment_status === 'completed') {
        throw new Error('Cannot delete request: Payment has already been made');
      }

      // Delete related data first (due to foreign key constraints)
      // Try to delete related data, but don't fail if tables don't exist
      try {
        await supabase
          .from('project_notifications')
          .delete()
          .eq('project_request_id', requestId);
      } catch (e) {
        console.log('No project_notifications to delete or table does not exist');
      }

      try {
        await supabase
          .from('project_messages')
          .delete()
          .eq('project_request_id', requestId);
      } catch (e) {
        console.log('No project_messages to delete or table does not exist');
      }

      try {
        await supabase
          .from('project_negotiations')
          .delete()
          .eq('project_request_id', requestId);
      } catch (e) {
        console.log('No project_negotiations to delete or table does not exist');
      }

      try {
        await supabase
          .from('project_agreements')
          .delete()
          .eq('project_request_id', requestId);
      } catch (e) {
        console.log('No project_agreements to delete or table does not exist');
      }

      // Finally delete the request
      const { error } = await supabase
        .from('project_requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        console.error('Error deleting project request:', error);
        throw error;
      }

      console.log('Project request deleted successfully');
    } catch (error) {
      console.error('Failed to delete project request:', error);
      throw error;
    }
  }

  // Debug method to directly query project_requests table
  async debugGetAllRequests(): Promise<any[]> {
    try {
      console.log('DEBUG: Fetching all project requests...');
      const { data, error } = await supabase
        .from('project_requests')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('DEBUG: All requests result:', { data, error });
      return data || [];
    } catch (error) {
      console.error('DEBUG: Failed to fetch all requests:', error);
      return [];
    }
  }

  // Debug method to check service providers table
  async debugGetAllServiceProviders(): Promise<any[]> {
    try {
      console.log('DEBUG: Fetching all service providers...');
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('DEBUG: All service providers result:', { data, error });
      return data || [];
    } catch (error) {
      console.error('DEBUG: Failed to fetch all service providers:', error);
      return [];
    }
  }
}

export default new ProjectRequestService();
