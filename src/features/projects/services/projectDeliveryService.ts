import { supabase } from '../../../lib/supabase';

export interface DeliveryFile {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  duration?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadCount: number;
  uploadedAt: string;
}

export interface ProjectDelivery {
  id: string;
  projectRequestId: string;
  serviceProviderId: string;
  clientId: string;
  title: string;
  description: string;
  deliveryType: 'initial' | 'revision' | 'final';
  revisionNumber: number;
  fileUrls: string[];
  previewUrls?: string[];
  thumbnailUrls?: string[];
  totalFiles: number;
  totalSizeBytes: number;
  deliveryNotes?: string;
  submissionStatus: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentRequired: boolean;
  paymentAmount?: number;
  paymentIntentId?: string;
  downloadExpiresAt: string;
  downloadCount: number;
  lastDownloadedAt?: string;
  submittedAt: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRevision {
  id: string;
  deliveryId: string;
  clientId: string;
  revisionNotes: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
  requestedAt: string;
  completedAt?: string;
  responseNotes?: string;
}

export interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  filePath?: string;
  error?: string;
}

export interface SubmissionData {
  title: string;
  description: string;
  deliveryType: 'initial' | 'revision' | 'final';
  deliveryNotes?: string;
  paymentAmount?: number;
  files: any[]; // Support both File objects and React Native file objects
}

class ProjectDeliveryService {
  // Upload file to Supabase storage
  static async uploadFile(
    file: any, // Support both File objects and React Native file objects
    projectId: string, 
    providerId: string
  ): Promise<FileUploadResult> {
    try {
      // Validate file size (50MB limit)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_FILE_SIZE) {
        return { 
          success: false, 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        };
      }

      // Validate file type
      const allowedTypes = [
        'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac', 'audio/flac',
        'video/mp4', 'video/mov', 'video/avi', 'video/quicktime',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/zip', 'application/x-zip-compressed'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return { 
          success: false, 
          error: `File type ${file.type} not supported. Allowed types: audio, video, images, PDF, ZIP` 
        };
      }

      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `deliveries/${projectId}/${providerId}/${fileName}`;

      console.log('Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath
      });

      // Skip bucket check and go straight to upload - bucket exists in dashboard

      // For React Native, we need to handle file objects differently
      let uploadData;
      if (file.uri) {
        // React Native file object with URI
        uploadData = {
          uri: file.uri,
          name: file.name,
          type: file.type || 'application/octet-stream'
        };
      } else {
        // Standard File object (web)
        uploadData = file;
      }

      // Upload the file
      const { data, error } = await supabase.storage
        .from('project-files')
        .upload(filePath, uploadData, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        return { success: false, error: `Upload failed: ${error.message}` };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      console.log('File uploaded successfully:', {
        path: data.path,
        url: urlData.publicUrl
      });

      return {
        success: true,
        fileUrl: urlData.publicUrl,
        filePath: filePath
      };
    } catch (error) {
      console.error('Unexpected error uploading file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred during upload' 
      };
    }
  }

  // Submit project delivery
  static async submitDelivery(
    projectRequestId: string,
    providerId: string,
    submissionData: SubmissionData
  ): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
    try {
      console.log('Starting delivery submission:', {
        projectRequestId,
        providerId,
        fileCount: submissionData.files.length,
        title: submissionData.title
      });

      // Upload files one by one for better progress tracking
      const fileUrls: string[] = [];
      const uploadErrors: string[] = [];

      for (let i = 0; i < submissionData.files.length; i++) {
        const file = submissionData.files[i];
        console.log(`Uploading file ${i + 1}/${submissionData.files.length}: ${file.name}`);
        
        const uploadResult = await this.uploadFile(file, projectRequestId, providerId);
        
        if (uploadResult.success && uploadResult.fileUrl) {
          fileUrls.push(uploadResult.fileUrl);
          console.log(`File ${i + 1} uploaded successfully`);
        } else {
          const errorMsg = `Failed to upload ${file.name}: ${uploadResult.error}`;
          uploadErrors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Check if any uploads failed
      if (uploadErrors.length > 0) {
        return { 
          success: false, 
          error: `Upload failed for ${uploadErrors.length} file(s):\n${uploadErrors.join('\n')}` 
        };
      }

      if (fileUrls.length === 0) {
        return { 
          success: false, 
          error: 'No files were uploaded successfully' 
        };
      }

      console.log('All files uploaded, submitting delivery to database:', {
        fileCount: fileUrls.length,
        fileUrls
      });

      // Submit delivery using RPC function with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const { data, error } = await supabase.rpc('submit_project_delivery', {
            p_request_id: projectRequestId,
            p_provider_id: providerId,
            p_title: submissionData.title,
            p_description: submissionData.description,
            p_delivery_type: submissionData.deliveryType,
            p_file_urls: fileUrls,
            p_delivery_notes: submissionData.deliveryNotes || null,
            p_payment_amount: submissionData.paymentAmount || null
          });

          if (error) {
            throw error;
          }

          if (!data || !data.success) {
            return { success: false, error: data?.error || 'Unknown database error' };
          }

          console.log('Delivery submitted successfully:', data);
          return { 
            success: true, 
            deliveryId: data.delivery_id 
          };
        } catch (dbError) {
          retryCount++;
          console.error(`Database submission attempt ${retryCount} failed:`, dbError);
          
          if (retryCount >= maxRetries) {
            return { 
              success: false, 
              error: `Database submission failed after ${maxRetries} attempts: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` 
            };
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      return { success: false, error: 'Unexpected error in submission loop' };
    } catch (error) {
      console.error('Unexpected error submitting delivery:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }

  // Get deliveries for a service provider
  static async getProviderDeliveries(providerId: string): Promise<ProjectDelivery[]> {
    try {
      const { data, error } = await supabase
        .from('project_deliveries')
        .select(`
          *,
          project_requests!project_deliveries_project_request_id_fkey (
            title as project_title,
            service_type
          )
        `)
        .eq('service_provider_id', providerId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching provider deliveries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching provider deliveries:', error);
      return [];
    }
  }

  // Get deliveries for a client
  static async getClientDeliveries(clientId: string): Promise<ProjectDelivery[]> {
    try {
      const { data, error } = await supabase
        .from('project_deliveries')
        .select(`
          *,
          project_requests!project_deliveries_project_request_id_fkey (
            title as project_title,
            service_type
          ),
          users!project_deliveries_service_provider_id_fkey (
            artist_name as provider_name
          )
        `)
        .eq('client_id', clientId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching client deliveries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching client deliveries:', error);
      return [];
    }
  }

  // Get delivery details
  static async getDeliveryDetails(deliveryId: string): Promise<ProjectDelivery | null> {
    try {
      const { data, error } = await supabase
        .from('project_deliveries')
        .select(`
          *,
          project_requests!project_deliveries_project_request_id_fkey (
            title as project_title,
            service_type,
            budget_range,
            timeline
          ),
          users!project_deliveries_service_provider_id_fkey (
            artist_name as provider_name,
            email as provider_email
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (error) {
        console.error('Error fetching delivery details:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching delivery details:', error);
      return null;
    }
  }

  // Check if user can download delivery files
  static async canDownloadDelivery(deliveryId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('can_download_delivery', {
        p_delivery_id: deliveryId,
        p_user_id: userId
      });

      if (error) {
        console.error('Error checking download permission:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Unexpected error checking download permission:', error);
      return false;
    }
  }

  // Download file and log the download
  static async downloadFile(
    deliveryId: string,
    fileUrl: string,
    fileName: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check permission first
      const canDownload = await this.canDownloadDelivery(deliveryId, userId);
      if (!canDownload) {
        return { success: false, error: 'Download not permitted' };
      }

      // Log the download
      await supabase.rpc('log_delivery_download', {
        p_delivery_id: deliveryId,
        p_file_id: null, // We'll enhance this later to track individual files
        p_user_id: userId,
        p_download_type: 'full'
      });

      // For web, create download link
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Download failed' 
      };
    }
  }

  // Approve delivery (for clients)
  static async approveDelivery(
    deliveryId: string, 
    clientId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('approve_project_delivery', {
        p_delivery_id: deliveryId,
        p_client_id: clientId
      });

      if (error) {
        console.error('Error approving delivery:', error);
        return { success: false, error: error.message };
      }

      return { success: data === true };
    } catch (error) {
      console.error('Unexpected error approving delivery:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Request revision (for clients)
  static async requestRevision(
    deliveryId: string,
    clientId: string,
    revisionNotes: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<{ success: boolean; revisionId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('request_delivery_revision', {
        p_delivery_id: deliveryId,
        p_client_id: clientId,
        p_revision_notes: revisionNotes,
        p_priority: priority
      });

      if (error) {
        console.error('Error requesting revision:', error);
        return { success: false, error: error.message };
      }

      return { success: true, revisionId: data };
    } catch (error) {
      console.error('Unexpected error requesting revision:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get delivery revisions
  static async getDeliveryRevisions(deliveryId: string): Promise<DeliveryRevision[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_revisions')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery revisions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching delivery revisions:', error);
      return [];
    }
  }

  // Update payment status (for payment integration)
  static async updatePaymentStatus(
    deliveryId: string,
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded',
    paymentIntentId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_deliveries')
        .update({
          payment_status: paymentStatus,
          payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) {
        console.error('Error updating payment status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error updating payment status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get delivery analytics for service provider
  static async getDeliveryAnalytics(providerId: string) {
    try {
      const { data, error } = await supabase
        .from('project_deliveries')
        .select('submission_status, payment_status, payment_amount, download_count')
        .eq('service_provider_id', providerId);

      if (error) {
        console.error('Error fetching delivery analytics:', error);
        return null;
      }

      const analytics = {
        totalDeliveries: data.length,
        approvedDeliveries: data.filter(d => d.submission_status === 'approved').length,
        pendingDeliveries: data.filter(d => d.submission_status === 'submitted').length,
        revisionRequests: data.filter(d => d.submission_status === 'revision_requested').length,
        totalRevenue: data
          .filter(d => d.payment_status === 'completed')
          .reduce((sum, d) => sum + (d.payment_amount || 0), 0),
        totalDownloads: data.reduce((sum, d) => sum + d.download_count, 0)
      };

      return analytics;
    } catch (error) {
      console.error('Unexpected error fetching delivery analytics:', error);
      return null;
    }
  }
}

export default ProjectDeliveryService;
