import { supabase } from '../../../lib/supabase';
import paymentIntegrationService from '../../payments/services/paymentIntegrationService';

export interface FileTransferData {
  project_id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  description: string;
  files: TransferFileData[];
  payment_required: boolean;
  payment_amount?: number;
  access_duration_days?: number;
}

export interface TransferFileData {
  name: string;
  type: 'audio' | 'video' | 'image' | 'document';
  size: number;
  url: string;
  thumbnail?: string;
  duration?: string;
  metadata?: any;
}

export interface FileTransfer {
  id: string;
  project_id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  description: string;
  files: TransferFile[];
  payment_required: boolean;
  payment_amount?: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  access_expires_at?: string;
  status: 'pending' | 'delivered' | 'downloaded' | 'expired';
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface TransferFile {
  id: string;
  transfer_id: string;
  name: string;
  type: 'audio' | 'video' | 'image' | 'document';
  size: number;
  url: string;
  secure_url?: string;
  thumbnail?: string;
  duration?: string;
  metadata?: any;
  download_count: number;
  uploaded_at: string;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

class FileTransferService {
  // Create a new file transfer
  async createFileTransfer(data: FileTransferData): Promise<FileTransfer> {
    try {
      console.log('Creating file transfer:', data);

      // Validate input data
      const validation = this.validateTransferData(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Calculate access expiration date
      const accessDurationDays = data.access_duration_days || 30;
      const accessExpiresAt = new Date();
      accessExpiresAt.setDate(accessExpiresAt.getDate() + accessDurationDays);

      // Create transfer record
      const transferData = {
        project_id: data.project_id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        title: data.title,
        description: data.description,
        payment_required: data.payment_required,
        payment_amount: data.payment_amount,
        payment_status: data.payment_required ? 'pending' : 'completed',
        access_expires_at: accessExpiresAt.toISOString(),
        status: 'delivered',
        download_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: transfer, error: transferError } = await supabase
        .from('file_transfers')
        .insert([transferData])
        .select()
        .single();

      if (transferError) {
        console.error('Error creating transfer:', transferError);
        throw transferError;
      }

      // Create file records
      const filePromises = data.files.map(file => 
        this.createTransferFile(transfer.id, file)
      );

      const files = await Promise.all(filePromises);

      return {
        ...transfer,
        files
      };
    } catch (error) {
      console.error('Failed to create file transfer:', error);
      throw error;
    }
  }

  // Create a transfer file record
  private async createTransferFile(transferId: string, fileData: TransferFileData): Promise<TransferFile> {
    try {
      const fileRecord = {
        transfer_id: transferId,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        url: fileData.url,
        secure_url: await this.generateSecureUrl(fileData.url),
        thumbnail: fileData.thumbnail,
        duration: fileData.duration,
        metadata: fileData.metadata || {},
        download_count: 0,
        uploaded_at: new Date().toISOString(),
      };

      const { data: file, error } = await supabase
        .from('transfer_files')
        .insert([fileRecord])
        .select()
        .single();

      if (error) {
        console.error('Error creating transfer file:', error);
        throw error;
      }

      return file;
    } catch (error) {
      console.error('Failed to create transfer file:', error);
      throw error;
    }
  }

  // Upload file with progress tracking
  async uploadFileWithProgress(
    file: { uri: string; name: string; type: string; size: number },
    transferId: string,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<TransferFile> {
    try {
      const fileId = `tf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Start upload progress
      onProgress?.({
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      });

      // Simulate upload progress (in production, use actual upload with progress)
      const uploadPromise = this.uploadToSecureStorage(file);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        const randomProgress = Math.random() * 30;
        onProgress?.({
          fileId,
          fileName: file.name,
          progress: Math.min(90, randomProgress),
          status: 'uploading'
        });
      }, 500);

      const uploadResult = await uploadPromise;
      clearInterval(progressInterval);

      if (!uploadResult.success) {
        onProgress?.({
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'failed',
          error: uploadResult.error
        });
        throw new Error(uploadResult.error);
      }

      // Complete upload
      onProgress?.({
        fileId,
        fileName: file.name,
        progress: 100,
        status: 'completed'
      });

      // Create file record
      const transferFile = await this.createTransferFile(transferId, {
        name: file.name,
        type: this.getFileTypeFromMime(file.type),
        size: file.size,
        url: uploadResult.url!,
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString()
        }
      });

      return transferFile;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Upload file to secure storage
  private async uploadToSecureStorage(file: {
    uri: string;
    name: string;
    type: string;
    size: number;
  }): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // In production, this would upload to Supabase Storage, AWS S3, or similar
      console.log('Uploading file to secure storage:', file.name);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate secure storage URL
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageUrl = `https://secure-storage.musistash.com/transfers/${timestamp}_${sanitizedName}`;

      return {
        success: true,
        url: storageUrl
      };
    } catch (error) {
      console.error('Upload to secure storage failed:', error);
      return {
        success: false,
        error: 'Failed to upload file to secure storage'
      };
    }
  }

  // Generate secure URL for protected access
  private async generateSecureUrl(originalUrl: string): Promise<string> {
    try {
      // In production, this would generate a signed URL with expiration
      const secureToken = Math.random().toString(36).substr(2, 16);
      return `${originalUrl}?token=${secureToken}&expires=${Date.now() + (24 * 60 * 60 * 1000)}`;
    } catch (error) {
      console.error('Failed to generate secure URL:', error);
      return originalUrl;
    }
  }

  // Get user's received transfers
  async getReceivedTransfers(userId: string): Promise<FileTransfer[]> {
    try {
      const { data: transfers, error } = await supabase
        .from('file_transfers')
        .select(`
          *,
          files:transfer_files(*)
        `)
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received transfers:', error);
        throw error;
      }

      return transfers || [];
    } catch (error) {
      console.error('Failed to fetch received transfers:', error);
      throw error;
    }
  }

  // Get user's sent transfers
  async getSentTransfers(userId: string): Promise<FileTransfer[]> {
    try {
      const { data: transfers, error } = await supabase
        .from('file_transfers')
        .select(`
          *,
          files:transfer_files(*)
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent transfers:', error);
        throw error;
      }

      return transfers || [];
    } catch (error) {
      console.error('Failed to fetch sent transfers:', error);
      throw error;
    }
  }

  // Process payment for file transfer
  async processTransferPayment(
    transferId: string,
    paymentMethod: string,
    paymentToken: string
  ): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    try {
      console.log('Processing transfer payment:', { transferId, paymentMethod });

      // Get transfer details
      const { data: transfer, error: transferError } = await supabase
        .from('file_transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (transferError || !transfer) {
        throw new Error('Transfer not found');
      }

      if (!transfer.payment_required || !transfer.payment_amount) {
        return { success: true }; // No payment required
      }

      // Create payment intent
      const paymentIntent = await paymentIntegrationService.createPaymentIntent(
        transfer.project_id,
        transfer.payment_amount,
        'usd',
        paymentMethod as any
      );

      // Process payment based on method
      let paymentSuccess = false;
      switch (paymentMethod) {
        case 'card':
          paymentSuccess = await paymentIntegrationService.processCardPayment(
            paymentIntent.id,
            { token: paymentToken }
          );
          break;
        case 'paypal':
          paymentSuccess = await paymentIntegrationService.processPayPalPayment(
            paymentIntent.id,
            paymentToken
          );
          break;
        case 'apple_pay':
          paymentSuccess = await paymentIntegrationService.processApplePayPayment(
            paymentIntent.id,
            paymentToken
          );
          break;
        default:
          throw new Error('Unsupported payment method');
      }

      if (paymentSuccess) {
        // Update transfer payment status
        await this.updateTransferPaymentStatus(transferId, 'completed', paymentIntent.id);
        
        // Create payment receipt
        await paymentIntegrationService.createPaymentReceipt(paymentIntent.id, true);

        return { success: true, paymentIntentId: paymentIntent.id };
      } else {
        await this.updateTransferPaymentStatus(transferId, 'failed');
        return { success: false, error: 'Payment processing failed' };
      }
    } catch (error) {
      console.error('Transfer payment processing failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment failed' 
      };
    }
  }

  // Update transfer payment status
  private async updateTransferPaymentStatus(
    transferId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded',
    paymentIntentId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };

      if (paymentIntentId) {
        updateData.payment_intent_id = paymentIntentId;
      }

      const { error } = await supabase
        .from('file_transfers')
        .update(updateData)
        .eq('id', transferId);

      if (error) {
        console.error('Error updating transfer payment status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update transfer payment status:', error);
      throw error;
    }
  }

  // Check if user can download files
  async canDownloadFiles(transferId: string, userId: string): Promise<boolean> {
    try {
      const { data: transfer, error } = await supabase
        .from('file_transfers')
        .select('*')
        .eq('id', transferId)
        .eq('receiver_id', userId)
        .single();

      if (error || !transfer) {
        return false;
      }

      // Check if payment is required and completed
      if (transfer.payment_required && transfer.payment_status !== 'completed') {
        return false;
      }

      // Check if access has expired
      if (transfer.access_expires_at && new Date(transfer.access_expires_at) < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking download permission:', error);
      return false;
    }
  }

  // Process file download
  async processFileDownload(
    transferId: string,
    fileId: string,
    userId: string
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      // Check download permission
      const canDownload = await this.canDownloadFiles(transferId, userId);
      if (!canDownload) {
        return {
          success: false,
          error: 'Download not authorized. Payment may be required or access may have expired.'
        };
      }

      // Get file details
      const { data: file, error: fileError } = await supabase
        .from('transfer_files')
        .select('*')
        .eq('id', fileId)
        .eq('transfer_id', transferId)
        .single();

      if (fileError || !file) {
        return { success: false, error: 'File not found' };
      }

      // Generate secure download URL
      const downloadUrl = await this.generateSecureDownloadUrl(file.secure_url || file.url);

      // Log download activity
      await this.logFileDownload(transferId, fileId, userId);

      // Update download counts
      await this.updateDownloadCounts(transferId, fileId);

      return {
        success: true,
        downloadUrl
      };
    } catch (error) {
      console.error('File download processing failed:', error);
      return {
        success: false,
        error: 'Download processing failed'
      };
    }
  }

  // Generate secure download URL with time-limited access
  private async generateSecureDownloadUrl(fileUrl: string): Promise<string> {
    try {
      // In production, this would generate a signed URL with short expiration
      const downloadToken = Math.random().toString(36).substr(2, 20);
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
      
      return `${fileUrl}?download_token=${downloadToken}&expires=${expiresAt}`;
    } catch (error) {
      console.error('Failed to generate secure download URL:', error);
      return fileUrl;
    }
  }

  // Log file download activity
  private async logFileDownload(transferId: string, fileId: string, userId: string): Promise<void> {
    try {
      const logData = {
        transfer_id: transferId,
        file_id: fileId,
        user_id: userId,
        action: 'download',
        timestamp: new Date().toISOString(),
        metadata: {
          user_agent: 'Mobile App',
          ip_address: 'Unknown' // In production, get actual IP
        }
      };

      await supabase
        .from('file_download_logs')
        .insert([logData]);
    } catch (error) {
      console.error('Failed to log file download:', error);
      // Don't throw error as this is not critical
    }
  }

  // Update download counts
  private async updateDownloadCounts(transferId: string, fileId: string): Promise<void> {
    try {
      // Update file download count
      await supabase.rpc('increment_file_download_count', { file_id: fileId });
      
      // Update transfer download count
      await supabase.rpc('increment_transfer_download_count', { transfer_id: transferId });
    } catch (error) {
      console.error('Failed to update download counts:', error);
      // Don't throw error as this is not critical
    }
  }

  // Get file transfer analytics
  async getTransferAnalytics(transferId: string): Promise<{
    total_downloads: number;
    unique_downloaders: number;
    popular_files: Array<{ file_name: string; download_count: number }>;
    download_timeline: Array<{ date: string; count: number }>;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_transfer_analytics', {
        p_transfer_id: transferId
      });

      if (error) {
        console.error('Error fetching transfer analytics:', error);
        throw error;
      }

      return data || {
        total_downloads: 0,
        unique_downloaders: 0,
        popular_files: [],
        download_timeline: []
      };
    } catch (error) {
      console.error('Failed to fetch transfer analytics:', error);
      throw error;
    }
  }

  // Validate transfer data
  private validateTransferData(data: FileTransferData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }

    if (!data.description || data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    if (!data.files || data.files.length === 0) {
      errors.push('At least one file must be included');
    }

    if (data.files && data.files.length > 20) {
      errors.push('Maximum 20 files allowed per transfer');
    }

    if (data.payment_required && (!data.payment_amount || data.payment_amount <= 0)) {
      errors.push('Payment amount is required when payment is enabled');
    }

    if (data.payment_amount && data.payment_amount > 10000) {
      errors.push('Payment amount cannot exceed $10,000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get file type from MIME type
  private getFileTypeFromMime(mimeType: string): 'audio' | 'video' | 'image' | 'document' {
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
  }

  // Clean up expired transfers
  async cleanupExpiredTransfers(): Promise<void> {
    try {
      console.log('Cleaning up expired transfers...');

      // Mark expired transfers
      const { error: updateError } = await supabase
        .from('file_transfers')
        .update({ status: 'expired' })
        .lt('access_expires_at', new Date().toISOString())
        .neq('status', 'expired');

      if (updateError) {
        console.error('Error marking expired transfers:', updateError);
      }

      // In production, you might also want to clean up files from storage
      console.log('Expired transfers cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup expired transfers:', error);
    }
  }
}

export default new FileTransferService();
