import { supabase, supabaseStorage, DIRECT_SUPABASE_URL } from '../../../lib/supabase';

export interface WorkSubmissionData {
  title: string;
  description: string;
  submissionType: 'initial' | 'revision' | 'final';
  files: any[]; // Support both File objects and React Native file objects
  notes?: string;
  paymentAmount?: number;
}

export interface WorkSubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
  message?: string;
}

export interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
}

class WorkSubmissionService {
  
  // Upload a single file to Supabase storage
  static async uploadFile(file: any, submissionId: string): Promise<FileUploadResult> {
    try {
      console.log('Uploading file:', file.name, 'Size:', file.size);
      
      // Validate file size (20MB limit)
      const MAX_SIZE = 20 * 1024 * 1024;
      if (file.size && file.size > MAX_SIZE) {
        return {
          success: false,
          error: `File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB`
        };
      }

      // Create unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${submissionId}_${timestamp}.${extension}`;
      const filePath = `work-submissions/${fileName}`;

      console.log('Uploading to path:', filePath);

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

      // Upload to Supabase storage
      const { data, error } = await supabaseStorage.storage
        .from('project-files')
        .upload(filePath, uploadData, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL - use direct Supabase URL for storage (custom domains don't work well)
      const { data: urlData } = supabaseStorage.storage
        .from('project-files')
        .getPublicUrl(filePath);

      // Replace custom domain with direct Supabase URL if needed
      let publicUrl = urlData.publicUrl;
      if (publicUrl.includes('api.musistash.com')) {
        publicUrl = publicUrl.replace('https://api.musistash.com', DIRECT_SUPABASE_URL);
      }

      console.log('File uploaded successfully:', publicUrl);

      return {
        success: true,
        fileUrl: publicUrl
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Submit work with files
  static async submitWork(
    projectRequestId: string,
    providerId: string,
    submissionData: WorkSubmissionData
  ): Promise<WorkSubmissionResult> {
    try {
      console.log('Starting work submission:', {
        projectRequestId,
        providerId,
        fileCount: submissionData.files.length,
        title: submissionData.title
      });

      // Get the agreed price from project agreement
      let paymentAmount = submissionData.paymentAmount;
      
      try {
        const { data: agreement, error: agreementError } = await supabase
          .from('project_agreements')
          .select('final_price')
          .eq('project_request_id', projectRequestId)
          .single();
          
        if (!agreementError && agreement?.final_price) {
          paymentAmount = agreement.final_price;
          console.log('💰 Using agreed price from project agreement:', paymentAmount);
        } else {
          console.log('⚠️ No project agreement found, using provided payment amount:', paymentAmount);
        }
      } catch (error) {
        console.log('⚠️ Error fetching project agreement, using provided payment amount:', error);
      }

      // Generate submission ID for file organization
      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload files first
      const fileUrls: string[] = [];
      const uploadErrors: string[] = [];

      for (let i = 0; i < submissionData.files.length; i++) {
        const file = submissionData.files[i];
        console.log(`Uploading file ${i + 1}/${submissionData.files.length}: ${file.name}`);
        
        const uploadResult = await this.uploadFile(file, submissionId);
        
        if (uploadResult.success && uploadResult.fileUrl) {
          fileUrls.push(uploadResult.fileUrl);
          console.log(`✅ File ${i + 1} uploaded: ${file.name}`);
        } else {
          const errorMsg = `❌ Failed to upload ${file.name}: ${uploadResult.error}`;
          uploadErrors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Check if any uploads failed
      if (uploadErrors.length > 0) {
        return {
          success: false,
          error: `Upload failed for ${uploadErrors.length} file(s)`,
          message: uploadErrors.join('\n')
        };
      }

      if (fileUrls.length === 0) {
        return {
          success: false,
          error: 'No files were uploaded successfully'
        };
      }

      console.log('✅ All files uploaded successfully, creating submission...');

      // Submit to database using the new function
      const { data, error } = await supabase.rpc('create_work_submission', {
        request_id: projectRequestId,
        provider_id: providerId,
        submission_title: submissionData.title,
        submission_description: submissionData.description,
        submission_type: submissionData.submissionType,
        file_urls: fileUrls,
        notes: submissionData.notes || null,
        payment_amount: paymentAmount
      });

      if (error) {
        console.error('Database submission error:', error);
        return {
          success: false,
          error: `Database error: ${error.message}`,
          message: 'Failed to save submission to database'
        };
      }

      if (!data || !data.success) {
        console.error('Database submission failed:', data);
        return {
          success: false,
          error: data?.error || 'Unknown database error',
          message: data?.message || 'Submission failed'
        };
      }

      console.log('✅ Work submission completed successfully:', data);

      return {
        success: true,
        submissionId: data.submission_id,
        message: 'Work submitted successfully!'
      };

    } catch (error) {
      console.error('Unexpected error in submitWork:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'An unexpected error occurred during submission'
      };
    }
  }

  // Get submissions for a specific project request
  static async getProjectSubmissions(projectRequestId: string) {
    try {
      console.log('Getting submissions for project:', projectRequestId);
      
      // Try RPC function first
      try {
        const { data, error } = await supabase.rpc('get_project_work_submissions', {
          request_id: projectRequestId
        });

        if (!error && data) {
          console.log('✅ Project submissions found via RPC:', data);
          return data || [];
        }
      } catch (rpcError) {
        console.log('⚠️ RPC function not available, using fallback');
      }

      // Fallback to direct query with joins
      console.log('🔄 Using direct query fallback...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('work_submissions')
        .select(`
          *,
          service_provider:service_providers!service_provider_id (
            business_name,
            provider_type
          ),
          user:users!service_provider_id (
            email,
            name
          ),
          artist_profile:artist_profiles!service_provider_id (
            name
          )
        `)
        .eq('project_request_id', projectRequestId)
        .order('submitted_at', { ascending: false });
        
      if (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        
        // Last resort: simple query without joins
        const { data: simpleData, error: simpleError } = await supabase
          .from('work_submissions')
          .select('*')
          .eq('project_request_id', projectRequestId)
          .order('submitted_at', { ascending: false });
          
        if (simpleError) {
          console.error('❌ Simple query also failed:', simpleError);
          return [];
        }
        
        console.log('✅ Simple query succeeded:', simpleData?.length || 0, 'submissions');
        return simpleData || [];
      }
      
      console.log('✅ Fallback query succeeded:', fallbackData?.length || 0, 'submissions');
      return fallbackData || [];
      
    } catch (error) {
      console.error('❌ Error fetching project submissions:', error);
      return [];
    }
  }

  // Get submissions for a provider
  static async getProviderSubmissions(providerId: string) {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .select(`
          *,
          project_requests (
            title,
            service_type
          )
        `)
        .eq('service_provider_id', providerId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching provider submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching provider submissions:', error);
      return [];
    }
  }

  // Get submissions for a client
  static async getClientSubmissions(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .select(`
          *,
          project_requests (
            title,
            service_type
          )
        `)
        .eq('client_id', clientId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching client submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching client submissions:', error);
      return [];
    }
  }

  // Approve a submission (client action)
  static async approveSubmission(submissionId: string, clientId: string) {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .update({
          status: 'approved',
          payment_status: 'completed',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .eq('client_id', clientId);

      if (error) {
        console.error('Error approving submission:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error approving submission:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Request revision (client action)
  static async requestRevision(submissionId: string, clientId: string, feedback: string) {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .update({
          status: 'revision_requested',
          client_feedback: feedback,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .eq('client_id', clientId);

      if (error) {
        console.error('Error requesting revision:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error requesting revision:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get secure file URL for download/preview
  static async getSecureFileUrl(fileUrl: string, submissionId: string): Promise<string> {
    try {
      console.log('Getting secure URL for:', fileUrl);
      
      // If it's already a signed URL, return as-is
      if (fileUrl.includes('token=') || fileUrl.includes('signed')) {
        console.log('URL already signed, returning as-is');
        return fileUrl;
      }

      // Extract bucket and path from Supabase URL
      const supabaseUrl = 'https://dwbetxanfumneukrqodd.supabase.co';
      if (fileUrl.includes(supabaseUrl)) {
        // Parse the URL to get bucket and file path
        const urlParts = fileUrl.split('/storage/v1/object/');
        if (urlParts.length > 1) {
          const pathParts = urlParts[1].split('/');
          if (pathParts[0] === 'public') {
            // Public URL format: /public/bucket/path/file
            const bucket = pathParts[1];
            const filePath = pathParts.slice(2).join('/');
            
            console.log('Extracted bucket:', bucket, 'path:', filePath);
            
            // Get signed URL from Supabase (use direct storage client)
            const { data, error } = await supabaseStorage.storage
              .from(bucket)
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (error) {
              console.error('Error creating signed URL:', error);
              // If signing fails, try the original URL
              return fileUrl;
            }
            
            if (data?.signedUrl) {
              console.log('Got signed URL successfully');
              return data.signedUrl;
            }
          }
        }
      }
      
      // Try the Edge Function as fallback
      try {
        const { data, error } = await supabase.functions.invoke('get-secure-file-url', {
          body: { fileUrl, submissionId }
        });

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (edgeFunctionError) {
        console.error('Edge function failed:', edgeFunctionError);
      }
      
      // Final fallback to original URL
      console.log('Using original URL as fallback');
      return fileUrl;
      
    } catch (error) {
      console.error('Error getting secure file URL:', error);
      // Fallback to original URL if secure URL fails
      return fileUrl;
    }
  }
}

export default WorkSubmissionService;
