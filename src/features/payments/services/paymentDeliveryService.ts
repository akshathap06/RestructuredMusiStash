import { supabase } from '../../../lib/supabase';

export interface ProjectPayment {
  id: string;
  project_request_id: string;
  client_id: string;
  service_provider_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_intent_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDelivery {
  id: string;
  project_request_id: string;
  service_provider_id: string;
  client_id: string;
  delivery_type: 'initial' | 'revision' | 'final';
  title: string;
  description?: string;
  file_urls: string[];
  delivery_notes?: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'revision_requested' | 'revision_delivered' | 'approved' | 'completed';
  delivered_at?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRevision {
  id: string;
  project_request_id: string;
  delivery_id: string;
  client_id: string;
  service_provider_id: string;
  revision_number: number;
  feedback: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'approved' | 'rejected';
  requested_at: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWorkflowStatus {
  request_id: string;
  status: string;
  payment_status: string;
  delivery_status: string;
  latest_delivery_id?: string;
  latest_delivery_title?: string;
  latest_delivery_files?: string[];
  latest_revision_id?: string;
  latest_revision_feedback?: string;
  latest_revision_status?: string;
}

export class PaymentDeliveryService {
  // Create a payment record
  static async createPayment(
    projectRequestId: string,
    amount: number,
    clientId: string,
    providerId: string,
    currency: string = 'usd',
    paymentMethod: string = 'stripe'
  ): Promise<ProjectPayment> {
    try {
      const { data, error } = await supabase
        .from('project_payments')
        .insert({
          project_request_id: projectRequestId,
          client_id: clientId,
          service_provider_id: providerId,
          amount,
          currency,
          payment_method: paymentMethod,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating payment:', error);
        throw error;
      }

      return data as ProjectPayment;
    } catch (error) {
      console.error('Error in createPayment:', error);
      throw error;
    }
  }

  static async getActivePayment(projectRequestId: string): Promise<ProjectPayment | null> {
    try {
      const { data, error } = await supabase
        .from('project_payments')
        .select('*')
        .eq('project_request_id', projectRequestId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching active payment:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getActivePayment:', error);
      throw error;
    }
  }

  // Get payment details
  static async getPayment(paymentId: string): Promise<ProjectPayment | null> {
    try {
      const { data, error } = await supabase
        .from('project_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('Error fetching payment:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPayment:', error);
      throw error;
    }
  }

  // Get payments for a project request
  static async getProjectPayments(projectRequestId: string): Promise<ProjectPayment[]> {
    try {
      const { data, error } = await supabase
        .from('project_payments')
        .select('*')
        .eq('project_request_id', projectRequestId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project payments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectPayments:', error);
      throw error;
    }
  }

  // Update payment status
  static async updatePaymentStatus(
    paymentId: string,
    status: ProjectPayment['status'],
    paymentIntentId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.paid_at = new Date().toISOString();
      }

      if (paymentIntentId) {
        updateData.payment_intent_id = paymentIntentId;
      }

      const { error } = await supabase
        .from('project_payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) {
        console.error('Error updating payment status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updatePaymentStatus:', error);
      throw error;
    }
  }

  // Create a delivery
  static async createDelivery(
    projectRequestId: string,
    title: string,
    description: string,
    fileUrls: string[],
    deliveryNotes?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_project_delivery', {
        p_project_request_id: projectRequestId,
        p_title: title,
        p_description: description,
        p_file_urls: fileUrls,
        p_delivery_notes: deliveryNotes
      });

      if (error) {
        console.error('Error creating delivery:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createDelivery:', error);
      throw error;
    }
  }

  // Get deliveries for a project request
  static async getProjectDeliveries(projectRequestId: string): Promise<ProjectDelivery[]> {
    try {
      const { data, error } = await supabase
        .from('project_deliveries')
        .select('*')
        .eq('project_request_id', projectRequestId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project deliveries:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectDeliveries:', error);
      throw error;
    }
  }

  // Create a revision request
  static async createRevisionRequest(
    projectRequestId: string,
    deliveryId: string,
    feedback: string,
    dueDate?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_revision_request', {
        p_project_request_id: projectRequestId,
        p_delivery_id: deliveryId,
        p_feedback: feedback,
        p_due_date: dueDate
      });

      if (error) {
        console.error('Error creating revision request:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createRevisionRequest:', error);
      throw error;
    }
  }

  // Get revisions for a project request
  static async getProjectRevisions(projectRequestId: string): Promise<ProjectRevision[]> {
    try {
      const { data, error } = await supabase
        .from('project_revisions')
        .select('*')
        .eq('project_request_id', projectRequestId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project revisions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectRevisions:', error);
      throw error;
    }
  }

  // Get complete workflow status
  static async getProjectWorkflowStatus(projectRequestId: string): Promise<ProjectWorkflowStatus | null> {
    try {
      console.log('Workflow status requested for project:', projectRequestId);
      
      // Query actual payment status from the database
      const { data: paymentData, error: paymentError } = await supabase
        .from('project_payments')
        .select('*')
        .eq('project_request_id', projectRequestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (paymentError && paymentError.code !== 'PGRST116') {
        console.error('Error fetching payment status:', paymentError);
      }
      
      // Determine payment status
      let paymentStatus = 'pending';
      if (paymentData) {
        paymentStatus = paymentData.status === 'completed' ? 'completed' : paymentData.status;
      }
      
      console.log('Payment status for project:', projectRequestId, '=', paymentStatus, paymentData);
      
      // Query work submissions to check delivery status
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('work_submissions')
        .select('*')
        .eq('project_request_id', projectRequestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (submissionsError && submissionsError.code !== 'PGRST116') {
        console.error('Error fetching submission status:', submissionsError);
      }
      
      // Determine delivery status
      let deliveryStatus = 'pending';
      let latestDeliveryId = null;
      let latestDeliveryTitle = null;
      let latestDeliveryFiles: string[] = [];
      
      if (submissionsData) {
        deliveryStatus = 'delivered';
        latestDeliveryId = submissionsData.id;
        latestDeliveryTitle = submissionsData.title;
        latestDeliveryFiles = submissionsData.file_urls || [];
      }
      
      // Return the proper workflow status matching the interface
      return {
        request_id: projectRequestId,
        status: paymentStatus === 'completed' ? 'paid' : 'pending',
        payment_status: paymentStatus,
        delivery_status: deliveryStatus,
        latest_delivery_id: latestDeliveryId,
        latest_delivery_title: latestDeliveryTitle,
        latest_delivery_files: latestDeliveryFiles,
        latest_revision_id: undefined,
        latest_revision_feedback: undefined,
        latest_revision_status: undefined,
      };
    } catch (error) {
      console.error('Error in getProjectWorkflowStatus:', error);
      // Return default status instead of null to prevent UI issues
      return {
        request_id: projectRequestId,
        status: 'pending',
        payment_status: 'pending',
        delivery_status: 'pending',
        latest_delivery_id: undefined,
        latest_delivery_title: undefined,
        latest_delivery_files: [],
      };
    }
  }

  // Approve a delivery
  static async approveDelivery(deliveryId: string): Promise<void> {
    try {
      // For now, just log since we're using the new work_submissions system
      console.log('Delivery approval requested for:', deliveryId);
      
      // TODO: Update this to work with work_submissions table when needed
      // For now, just return success to prevent errors
      return;
    } catch (error) {
      console.error('Error in approveDelivery:', error);
      // Don't throw error to prevent app crashes
      return;
    }
  }

  // Complete a revision
  static async completeRevision(revisionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_revisions')
        .update({
          status: 'delivered',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', revisionId);

      if (error) {
        console.error('Error completing revision:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in completeRevision:', error);
      throw error;
    }
  }
}
