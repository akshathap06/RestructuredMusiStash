import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import projectRequestService, { ProjectRequest, ProjectNegotiation, ProjectMessage } from '../../../services/projectRequestService';
import { PaymentDeliveryService, ProjectWorkflowStatus } from '../../../services/paymentDeliveryService';
import WorkSubmissionService from '../../../services/WorkSubmissionService';
import { ProductionProfileService, ProductionProfileData } from '../../../services/productionProfileService';
import serviceProviderService from '../../../services/serviceProviderService';
import { messagingService } from '../../../services/messagingService';
import { supabase } from '../../../lib/supabase';
import WorkSubmissionFileDownload from '../components/WorkSubmissionFileDownload';

interface ProjectRequestDetailsScreenProps {
  route: {
    params: {
      requestId: string;
    };
  };
  navigation: any;
}

type QuoteTone = 'default' | 'pending' | 'success' | 'danger';

export default function ProjectRequestDetailsScreen({ route, navigation }: ProjectRequestDetailsScreenProps) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [request, setRequest] = useState<ProjectRequest | null>(null);
  const [negotiations, setNegotiations] = useState<ProjectNegotiation[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<ProjectWorkflowStatus | null>(null);
  const [workSubmissions, setWorkSubmissions] = useState<any[]>([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [agreement, setAgreement] = useState<any>(null);
  const [otherPartyProfile, setOtherPartyProfile] = useState<ProductionProfileData | null>(null);
  const [loadingOtherParty, setLoadingOtherParty] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteTimeline, setQuoteTimeline] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterTimeline, setCounterTimeline] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  useEffect(() => {
    if (request?.status !== 'responded' && showCounterForm) {
      setShowCounterForm(false);
    }
  }, [request?.status]);

  const loadWorkSubmissions = async (requestId: string) => {
    try {
      setSubmissionLoading(true);
      console.log('Loading work submissions for request:', requestId);
      
      // Get submissions for this specific request using the new method
      const submissions = await WorkSubmissionService.getProjectSubmissions(requestId);
      
      console.log('Work submissions loaded:', submissions);
      setWorkSubmissions(submissions);
      
      // If there are submissions, update UI to show "Submit Another Work" button
      if (submissions.length > 0) {
        console.log('Found submissions, updating UI state');
      }
      
    } catch (error) {
      console.error('Error loading work submissions:', error);
    } finally {
      setSubmissionLoading(false);
    }
  };

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      console.log('Loading request details for ID:', requestId);
      
      if (!requestId || requestId === 'undefined') {
        Alert.alert('Error', 'Invalid request ID');
        navigation.goBack();
        return;
      }
      
      const [requestData, negotiationsData, messagesData, workflowData, agreementData] = await Promise.all([
        projectRequestService.getProjectRequest(requestId),
        projectRequestService.getProjectNegotiations(requestId),
        projectRequestService.getProjectMessages(requestId),
        PaymentDeliveryService.getProjectWorkflowStatus(requestId),
        projectRequestService.getProjectAgreement(requestId)
      ]);
      
      console.log('Request data loaded:', { requestData, negotiationsData, messagesData, workflowData, agreementData });
      setRequest(requestData);
      setNegotiations(negotiationsData);
      setMessages(messagesData);
      setWorkflowStatus(workflowData);
      setAgreement(agreementData);
      
      // Load work submissions for this request
      if (requestData) {
        loadWorkSubmissions(requestId);
        // Load the other party's profile
        loadOtherPartyProfile(requestData);
        setQuoteTimeline(requestData.timeline || '');
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const loadOtherPartyProfile = async (requestData: ProjectRequest) => {
    try {
      setLoadingOtherParty(true);
      
      // Always load the service provider (the one who received the request)
      // This is a transaction view, so we always show the service provider details
      const serviceProviderId = requestData.service_provider_id;
      
      console.log('🔍 Loading service provider profile...');
      console.log('Request service provider ID:', serviceProviderId);
      
      if (!serviceProviderId) {
        console.warn('⚠️ No service provider ID found');
        return;
      }
      
      // Try multiple approaches to load profile data
      let profileData = null;
      
      // Approach 1: Try ProductionProfileService (using service provider's user_id)
      // First, get the service provider to find their user_id
      let serviceProviderUserId = null;
      try {
        const { data: spData, error: spError } = await supabase
          .from('service_providers')
          .select('user_id')
          .eq('id', serviceProviderId)
          .maybeSingle();
        
        if (!spError && spData) {
          serviceProviderUserId = spData.user_id;
          console.log('✅ Found service provider user_id:', serviceProviderUserId);
        }
      } catch (error) {
        console.warn('⚠️ Could not get service provider user_id:', error);
      }
      
      // Try ProductionProfileService with the user_id if we found it
      if (serviceProviderUserId) {
        try {
          const result = await ProductionProfileService.getCompleteUserProfile(serviceProviderUserId);
        if (result.profile && !result.error) {
          profileData = result.profile;
          console.log('✅ Profile loaded via ProductionProfileService');
        } else {
          console.warn('⚠️ ProductionProfileService returned error:', result.error);
        }
      } catch (error) {
        console.warn('⚠️ ProductionProfileService failed:', error);
        }
      }
      
      // Approach 2: If ProductionProfileService failed, try direct database queries
      if (!profileData) {
        console.log('🔄 Trying direct database queries...');
        try {
          // Always get service provider data (this is a transaction view)
          let serviceProviderData = null;
          let userData = null; // Declare userData at the top level
          console.log('🔍 Looking for service provider with ID:', serviceProviderId);
            
            // CRITICAL FIX: Try multiple approaches to find service provider
            let spData = null;
            let spError = null;
            
            // Approach 1: Look by service provider ID
            if (serviceProviderId) {
              const { data: spDataById, error: spErrorById } = await supabase
                .from('service_providers')
                .select('*')
                .eq('id', serviceProviderId)
                .maybeSingle();
                
              if (!spErrorById && spDataById) {
                spData = spDataById;
                console.log('✅ Service provider found by ID');
              } else {
                console.log('⚠️ Service provider not found by ID, trying user_id...');
                
                // Approach 2: Look by user_id (if service_provider_id is actually a user_id)
                const { data: spDataByUserId, error: spErrorByUserId } = await supabase
                  .from('service_providers')
                  .select('*')
                  .eq('user_id', serviceProviderId)
                  .maybeSingle();
                  
                if (!spErrorByUserId && spDataByUserId) {
                  spData = spDataByUserId;
                  console.log('✅ Service provider found by user_id');
                } else {
                  // Approach 3: Search by business_name or contact_email if available
                  console.log('⚠️ Service provider not found by user_id either');
                  spError = spErrorByUserId || spErrorById;
                }
              }
            }
              
            if (spData) {
              serviceProviderData = spData;
              console.log('✅ Service provider data loaded:', {
                id: spData.id,
                business_name: spData.business_name,
                user_id: spData.user_id,
                contact_email: spData.contact_email,
                provider_type: spData.provider_type
              });
            } else {
              console.warn('❌ Service provider not found for ID:', serviceProviderId);
              console.warn('Error details:', spError);
              
              // Try to get user data first before creating fallback
              let fallbackUserData = null;
              try {
                const { data: fallbackUser, error: fallbackUserError } = await supabase
                  .from('users')
                  .select('id, name, email, phone, role, avatar')
                  .eq('id', serviceProviderId)
                  .maybeSingle();
                  
                if (!fallbackUserError && fallbackUser) {
                  fallbackUserData = fallbackUser;
                  console.log('✅ Found user data for fallback:', fallbackUser.name, fallbackUser.email);
                }
              } catch (error) {
                console.warn('⚠️ Could not load fallback user data:', error);
              }
              
              // Create fallback service provider with user data if available
              serviceProviderData = {
                id: serviceProviderId,
                business_name: fallbackUserData?.name || `${requestData.service_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Provider` || 'Service Provider',
                contact_email: fallbackUserData?.email || 'Contact information unavailable',
                provider_type: requestData.service_type || 'service_provider',
                user_id: serviceProviderId,
                status: 'approved',
                bio: 'This service provider\'s information is currently unavailable. Please contact support if you need assistance.',
                location: 'Location not specified',
                years_of_experience: 0,
                tagline: 'Professional service provider',
                phone: fallbackUserData?.phone || 'Contact information not available',
                website_url: null,
                specializations: [requestData.service_type || 'general'],
                base_price: 0,
                accepts_remote_work: true,
                available_for_hire: true
              };
              
              // Set user data for fallback if we found it
              if (fallbackUserData) {
                userData = fallbackUserData;
                console.log('✅ Using fallback user data:', userData.name, userData.email);
              }
              
              console.log('✅ Fallback service provider created:', serviceProviderData.business_name);
            }
          
          // Get user data for the service provider - IMPORTANT: Get full user account details
          // Use the same lookup strategies as the messaging function
          // (userData is already declared above, so we just populate it if not already set)
          
          // Strategy 1: Get user_id from service provider
          if (serviceProviderData?.user_id) {
            console.log('🔍 Strategy 1: Loading user data from service provider user_id:', serviceProviderData.user_id);
            const { data: userDataResult, error: userError } = await supabase
              .from('users')
              .select('id, name, email, role, avatar, phone, created_at')
              .eq('id', serviceProviderData.user_id)
              .maybeSingle();
            
            if (!userError && userDataResult) {
              userData = userDataResult;
              console.log('✅ User data loaded for service provider:', {
                name: userData.name,
                email: userData.email,
                phone: userData.phone
              });
            } else {
              console.warn('⚠️ Could not load user data:', userError);
            }
          }
          
          // Strategy 2: If service provider not found, try to get user_id from service post
          if (!userData && requestData.service_type) {
            console.log('🔍 Strategy 2: Looking for user_id from service post...');
            const { data: servicePost } = await supabase
              .from('posts')
              .select('user_id')
              .eq('post_type', 'service_offer')
              .ilike('title', `%${requestData.service_type}%`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (servicePost?.user_id) {
              console.log('✅ Found user_id from service post:', servicePost.user_id);
              const { data: userFromPost, error: userFromPostError } = await supabase
                .from('users')
                .select('id, name, email, role, avatar, phone, created_at')
                .eq('id', servicePost.user_id)
                .maybeSingle();
              
              if (!userFromPostError && userFromPost) {
                userData = userFromPost;
                console.log('✅ User data loaded from service post:', {
                  name: userData.name,
                  email: userData.email
                });
              }
            }
          }
          
          // Strategy 3: Try using serviceProviderId as user_id directly (same as messaging function)
          if (!userData && serviceProviderId) {
            console.log('🔍 Strategy 3: Trying serviceProviderId as user_id:', serviceProviderId);
            const { data: userById, error: userByIdError } = await supabase
              .from('users')
              .select('id, name, email, role, avatar, phone, created_at')
              .eq('id', serviceProviderId)
              .maybeSingle();
            
            if (!userByIdError && userById) {
              userData = userById;
              console.log('✅ User data found using serviceProviderId as user_id:', {
                name: userData.name,
                email: userData.email
              });
            }
          }
          
          // Strategy 4: Try looking up service provider by user_id if serviceProviderId might be a user_id
          if (!userData && serviceProviderId) {
            console.log('🔍 Strategy 4: Looking for service provider by user_id...');
            const { data: spByUserId } = await supabase
              .from('service_providers')
              .select('user_id')
              .eq('user_id', serviceProviderId)
              .maybeSingle();
            
            if (spByUserId?.user_id) {
              const { data: userFromSP } = await supabase
                .from('users')
                .select('id, name, email, role, avatar, phone, created_at')
                .eq('id', spByUserId.user_id)
                .maybeSingle();
              
              if (userFromSP) {
                userData = userFromSP;
                console.log('✅ User data found via service provider user_id lookup:', {
                  name: userData.name,
                  email: userData.email
                });
              }
            }
          }
          
          // Get artist profile data (if service provider also has artist profile)
          let artistProfileData = null;
          const targetUserId = userData?.id || serviceProviderData?.user_id || serviceProviderId;
          const { data: artistData, error: artistError } = await supabase
            .from('artist_profiles')
            .select('*')
            .eq('user_id', targetUserId)
            .maybeSingle();
            
          if (!artistError && artistData) {
            artistProfileData = artistData;
            console.log('✅ Artist profile data loaded directly');
          }
          
          // Construct profile data - use service provider data if available
          if (serviceProviderData || userData) {
            profileData = {
              user_data: userData || {
                id: serviceProviderData?.user_id || serviceProviderId,
                name: serviceProviderData?.business_name || 'Unknown User',
                email: serviceProviderData?.contact_email || '',
                role: 'user',
                avatar: serviceProviderData?.profile_photo || undefined,
                created_at: serviceProviderData?.created_at || new Date().toISOString()
              },
              service_provider: serviceProviderData,
              artist_profile: artistProfileData,
              stats: {
                followers_count: 0,
                following_count: 0,
                posts_count: 0
              },
              posts: [],
              last_updated: new Date().toISOString()
            };
            
            console.log('✅ Profile constructed from direct queries');
          }
          
        } catch (directError) {
          console.error('❌ Direct database queries failed:', directError);
        }
      }
      
      if (profileData) {
        setOtherPartyProfile(profileData);
        console.log('✅ Other party profile loaded:', profileData.user_data?.name || profileData.service_provider?.business_name);
      } else {
        console.warn('⚠️ Failed to load other party profile with all approaches');
        // Set a fallback profile with basic info
        setOtherPartyProfile({
          user_data: {
            id: serviceProviderId,
            name: 'Unknown User',
            email: '',
            role: 'user',
            avatar: undefined,
            created_at: new Date().toISOString()
          },
          service_provider: undefined,
          artist_profile: undefined,
          stats: {
            followers_count: 0,
            following_count: 0,
            posts_count: 0
          },
          posts: [],
          last_updated: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading other party profile:', error);
    } finally {
      setLoadingOtherParty(false);
    }
  };

  const handleViewProfile = () => {
    if (!otherPartyProfile) return;
    
    // Navigate to the appropriate profile screen based on what type of profile they have
    if (otherPartyProfile.service_provider) {
      navigation.navigate('ServiceProviderDetail', { 
        providerId: otherPartyProfile.service_provider.id,
        provider: otherPartyProfile.service_provider 
      });
    } else if (otherPartyProfile.artist_profile) {
      navigation.navigate('ArtistProfileView', { 
        artistId: otherPartyProfile.artist_profile.id,
        artistData: otherPartyProfile.artist_profile 
      });
    } else {
      // For regular users, we could navigate to a basic profile view
      Alert.alert('Profile', `${otherPartyProfile.user_data?.name || 'User'}'s profile`);
    }
  };

  const handleMessageOtherParty = async () => {
    if (!otherPartyProfile || !user || !request) return;
    
    try {
      console.log('📨 Starting message flow...');
      console.log('Request:', {
        service_provider_id: request.service_provider_id,
        service_type: request.service_type
      });
      
      let recipientUserId = null;
      let recipientName = '';
      
      // Strategy 1: Try to get user_id from service provider record
      if (request.service_provider_id) {
        console.log('🔍 Strategy 1: Looking up service provider by ID:', request.service_provider_id);
        
        // Try by service provider ID first
        const { data: spById, error: spByIdError } = await supabase
          .from('service_providers')
          .select('id, user_id, business_name')
          .eq('id', request.service_provider_id)
          .maybeSingle();
        
        if (spById && spById.user_id) {
          recipientUserId = spById.user_id;
          console.log('✅ Found service provider, user_id:', recipientUserId);
        } else if (!spById) {
          // Try by user_id (maybe the service_provider_id is actually a user_id)
          console.log('🔍 Strategy 1b: Trying service_provider_id as user_id...');
          const { data: spByUserId, error: spByUserIdError } = await supabase
            .from('service_providers')
            .select('id, user_id, business_name')
            .eq('user_id', request.service_provider_id)
            .maybeSingle();
          
          if (spByUserId && spByUserId.user_id) {
            recipientUserId = spByUserId.user_id;
            console.log('✅ Found service provider by user_id lookup, user_id:', recipientUserId);
          } else {
            // Maybe the service_provider_id IS the user_id
            console.log('🔍 Strategy 1c: Checking if service_provider_id is a user_id...');
            const { data: userCheck } = await supabase
              .from('users')
              .select('id, name')
              .eq('id', request.service_provider_id)
              .maybeSingle();
            
            if (userCheck) {
              recipientUserId = userCheck.id;
              console.log('✅ service_provider_id is actually a user_id:', recipientUserId);
            }
          }
        }
      }
      
      // Strategy 2: Try to get user_id from the service post (service_offer)
      if (!recipientUserId && request.service_type) {
        console.log('🔍 Strategy 2: Looking up service post by service_type:', request.service_type);
        
        // Find the service post that matches this service
        const { data: servicePost } = await supabase
          .from('posts')
          .select('user_id, title')
          .eq('post_type', 'service_offer')
          .ilike('title', `%${request.service_type}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (servicePost && servicePost.user_id) {
          recipientUserId = servicePost.user_id;
          console.log('✅ Found user_id from service post:', recipientUserId);
        }
      }
      
      // Strategy 3: Use otherPartyProfile if available
      if (!recipientUserId) {
        console.log('🔍 Strategy 3: Checking otherPartyProfile...');
        
        if (otherPartyProfile.service_provider?.user_id) {
          recipientUserId = otherPartyProfile.service_provider.user_id;
          console.log('✅ Found user_id from otherPartyProfile.service_provider:', recipientUserId);
        } else if (otherPartyProfile.user_data?.id) {
          // Check if this is a user_id or service_provider_id
          const { data: userCheck } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', otherPartyProfile.user_data.id)
            .maybeSingle();
          
          if (userCheck) {
            recipientUserId = userCheck.id;
            console.log('✅ Found user_id from otherPartyProfile.user_data:', recipientUserId);
          }
        }
      }
      
      if (!recipientUserId) {
        Alert.alert('Error', 'Could not find user account linked to this service provider.');
        console.error('❌ Could not determine recipient user_id after all strategies');
        return;
      }
      
      // Now get the user account details
      console.log('🔍 Fetching user account for user_id:', recipientUserId);
      const { data: userAccount, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', recipientUserId)
        .maybeSingle();
      
      if (userError) {
        console.error('❌ Error fetching user account:', userError);
        Alert.alert('Error', 'Could not find user account information.');
        return;
      }
      
      if (!userAccount) {
        console.error('❌ User account not found for user_id:', recipientUserId);
        Alert.alert('Error', 'User account not found.');
        return;
      }
      
      console.log('✅ Found user account:', {
        id: userAccount.id,
        name: userAccount.name,
        email: userAccount.email
      });
      
      // Navigate with the actual user account name
      console.log('📨 Navigating to NewMessage with user account:', {
        recipientId: userAccount.id,
        recipientName: userAccount.name,
        recipientEmail: userAccount.email
      });
      
      navigation.navigate('NewMessage', {
        recipientId: userAccount.id,
        recipientName: userAccount.name, // Use the actual user account name
        recipientEmail: userAccount.email || ''
      });
      
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };


  const handleApproveDelivery = async () => {
    if (!workflowStatus?.latest_delivery_id) return;

    try {
      await PaymentDeliveryService.approveDelivery(workflowStatus.latest_delivery_id);
      Alert.alert('Success', 'Delivery approved! The project is now complete.');
      loadRequestDetails(); // Reload to get updated status
    } catch (error) {
      console.error('Error approving delivery:', error);
      Alert.alert('Error', 'Failed to approve delivery');
    }
  };

  const handleRequestRevision = async () => {
    if (!workflowStatus?.latest_delivery_id) return;

    Alert.prompt(
      'Request Revision',
      'Please provide feedback for the revision:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (feedback?: string) => {
            if (!feedback?.trim()) {
              Alert.alert('Error', 'Please provide feedback');
              return;
            }

            try {
              await PaymentDeliveryService.createRevisionRequest(
                requestId,
                workflowStatus.latest_delivery_id!,
                feedback.trim()
              );
              Alert.alert('Success', 'Revision requested successfully!');
              loadRequestDetails(); // Reload to get updated status
            } catch (error) {
              console.error('Error requesting revision:', error);
              Alert.alert('Error', 'Failed to request revision');
            }
          }
        }
      ],
      'plain-text'
    );
  };


  const handleQuoteAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const segments = sanitized.split('.');
    const normalized = segments.length > 2 ? `${segments[0]}.${segments.slice(1).join('')}` : sanitized;
    setQuoteAmount(normalized);
  };

  const handleCounterPriceChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const segments = sanitized.split('.');
    const normalized = segments.length > 2 ? `${segments[0]}.${segments.slice(1).join('')}` : sanitized;
    setCounterPrice(normalized);
  };

  const handleSubmitQuote = async () => {
    if (!user || !request) return;

    const parsedQuote = quoteAmount ? parseFloat(quoteAmount) : NaN;
    if (!parsedQuote || parsedQuote <= 0) {
      Alert.alert('Invalid Quote', 'Please enter a valid numeric amount before locking the price.');
      return;
    }

    const trimmedTimeline = quoteTimeline?.trim() || '';
    const existingTimeline = request.timeline?.trim() || '';
    if (!trimmedTimeline && !existingTimeline) {
      Alert.alert('Add Timeline', 'Please include an estimated timeline before sending the quote.');
      return;
    }

    const finalTimeline = trimmedTimeline || existingTimeline;
    const finalTerms = quoteNotes?.trim() || undefined;

    try {
      console.log('Creating agreement with:', { parsedQuote, finalTimeline, finalTerms });
      await projectRequestService.createProjectAgreement(requestId, parsedQuote, finalTimeline, finalTerms);
      await projectRequestService.updateProjectRequestStatus(requestId, 'responded');
      setQuoteAmount('');
      setQuoteNotes('');
      setQuoteTimeline(finalTimeline);
      await loadRequestDetails();
      Alert.alert('Quote Sent', `Client has been notified of your quote: $${parsedQuote}. Waiting for approval.`);
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to submit quote');
    }
  };

  const handleClientAcceptQuote = async () => {
    if (!request || !agreement) return;
    if (lockedPriceMissing) {
      Alert.alert('Price missing', 'Ask your provider to submit a valid price before approving.');
      return;
    }
    if (timelineMissing) {
      Alert.alert('Timeline missing', 'Ask your provider to include an estimated timeline before approving.');
      return;
    }
    try {
      setShowCounterForm(false);
      await projectRequestService.updateProjectRequestStatus(requestId, 'accepted');
      await projectRequestService.markAgreementAccepted(requestId);
      await loadRequestDetails();
      Alert.alert('Quote Accepted', 'Price locked. You can proceed to payment when ready.');
    } catch (error) {
      console.error('Error approving quote:', error);
      Alert.alert('Error', 'Failed to accept quote. Please try again.');
    }
  };

  const handleDeclineRequest = async () => {
    if (!user) return;

    try {
      await projectRequestService.updateProjectRequestStatus(requestId, 'declined');
      await loadRequestDetails();
      Alert.alert('Request Declined', 'The request has been declined.');
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline request');
    }
  };

  const handleDeleteRequest = async () => {
    if (!user || !request) return;

    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this request? This action cannot be undone and will remove all related data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectRequestService.deleteProjectRequest(requestId, user.id);
              Alert.alert('Success', 'Request deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Error deleting request:', error);
              Alert.alert('Error', (error as Error).message || 'Failed to delete request');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Request not found</Text>
      </View>
    );
  }

  const normalizeCurrencyValue = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const numeric = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  };

  const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

  const latestNegotiation = negotiations.length > 0 ? negotiations[negotiations.length - 1] : null;
  const parsedBudget = normalizeCurrencyValue(request?.budget_range);
  const lockedPrice = normalizeCurrencyValue(agreement?.final_price);
  const negotiationPrice = normalizeCurrencyValue(latestNegotiation?.proposed_price);
  const displayPrice = lockedPrice ?? negotiationPrice ?? parsedBudget ?? null;
  const timelineDisplay =
    timelineFromAgreement ||
    latestNegotiation?.proposed_timeline ||
    request.timeline ||
    'TBD';
  const timelineFromAgreement = agreement?.final_timeline?.trim() || '';
  const statusBudgetDisplay = lockedPrice !== null ? formatCurrency(lockedPrice) : request.budget_range || 'Contact for pricing';
  const statusTimelineDisplay = timelineFromAgreement || request.timeline || 'TBD';
  const isClient = request?.client_id === user?.id;
  const isProvider = !isClient;
  const hasQuote = Boolean(agreement);
  const awaitingClientApproval = hasQuote && request.status === 'responded';
  const clientAcceptedQuote = hasQuote && request.status === 'accepted';
  const lockedPriceMissing = lockedPrice === null || lockedPrice <= 0;
  const timelineMissing = !timelineFromAgreement || timelineFromAgreement.toLowerCase() === 'tbd';
  const allowQuoteSubmission =
    !hasQuote || request.status === 'pending' || request.status === 'declined' || lockedPriceMissing || timelineMissing;

  const providerQuoteMeta = (() => {
    if (!hasQuote || lockedPriceMissing) {
      return {
        tone: 'default' as QuoteTone,
        title: 'Send your final quote',
        description: 'Lock in price and timeline so the client can approve and pay.'
      };
    }
    if (timelineMissing) {
      return {
        tone: 'danger' as QuoteTone,
        title: 'Timeline missing',
        description: 'Add an estimated timeline so the client can review the quote.'
      };
    }
    if (request.status === 'responded') {
      return {
        tone: 'pending' as QuoteTone,
        title: 'Awaiting client approval',
        description: 'We notified the client. They must approve before payment unlocks.'
      };
    }
    if (request.status === 'accepted') {
      return {
        tone: 'success' as QuoteTone,
        title: 'Client accepted this quote',
        description: 'Payment is now available. Complete delivery after they pay.'
      };
    }
    if (request.status === 'pending') {
      return {
        tone: 'danger' as QuoteTone,
        title: 'Client requested changes',
        description: 'Review their counter offer and send an updated quote.'
      };
    }
    if (request.status === 'declined') {
      return {
        tone: 'danger' as QuoteTone,
        title: 'Quote declined',
        description: 'Send a fresh quote with updated scope.'
      };
    }
    return {
      tone: 'default' as QuoteTone,
      title: 'Quote saved',
      description: 'Keep communication in chat if other adjustments are needed.'
    };
  })();

  const clientQuoteMeta = (() => {
    if (!hasQuote || lockedPriceMissing) {
      return {
        tone: 'default' as QuoteTone,
        title: 'Waiting for provider quote',
        description: 'We will notify you when they send a final price.'
      };
    }
    if (timelineMissing) {
      return {
        tone: 'pending' as QuoteTone,
        title: 'Waiting for timeline',
        description: 'Provider needs to add an estimated timeline before you can approve.'
      };
    }
    if (request.status === 'responded') {
      return {
        tone: 'pending' as QuoteTone,
        title: 'Quote ready for approval',
        description: 'Accept to lock the project or send a counter offer.'
      };
    }
    if (request.status === 'accepted') {
      return {
        tone: 'success' as QuoteTone,
        title: 'You approved this quote',
        description: 'Head to payment to continue the workflow.'
      };
    }
    if (request.status === 'pending') {
      return {
        tone: 'pending' as QuoteTone,
        title: 'Counter offer sent',
        description: 'Waiting for your provider to respond with an updated quote.'
      };
    }
    if (request.status === 'declined') {
      return {
        tone: 'danger' as QuoteTone,
        title: 'Quote declined',
        description: 'Chat with your provider to outline new terms.'
      };
    }
    return {
      tone: 'default' as QuoteTone,
      title: 'Quote stored with project',
      description: 'Stay in touch with your provider for next steps.'
    };
  })();

  const getBannerToneStyle = (tone: QuoteTone) => {
    switch (tone) {
      case 'pending':
        return styles.quoteStatusBannerPending;
      case 'success':
        return styles.quoteStatusBannerSuccess;
      case 'danger':
        return styles.quoteStatusBannerDanger;
      default:
        return styles.quoteStatusBannerDefault;
    }
  };

  const getIconToneStyle = (tone: QuoteTone) => {
    switch (tone) {
      case 'pending':
        return styles.quoteStatusIconPending;
      case 'success':
        return styles.quoteStatusIconSuccess;
      case 'danger':
        return styles.quoteStatusIconDanger;
      default:
        return styles.quoteStatusIconDefault;
    }
  };

  const getToneIcon = (tone: QuoteTone) => {
    switch (tone) {
      case 'pending':
        return 'time-outline';
      case 'success':
        return 'checkmark-circle-outline';
      case 'danger':
        return 'alert-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const providerBannerStyle = getBannerToneStyle(providerQuoteMeta.tone);
  const providerIconStyle = getIconToneStyle(providerQuoteMeta.tone);
  const providerToneIcon = getToneIcon(providerQuoteMeta.tone);
  const clientBannerStyle = getBannerToneStyle(clientQuoteMeta.tone);
  const clientIconStyle = getIconToneStyle(clientQuoteMeta.tone);
  const clientToneIcon = getToneIcon(clientQuoteMeta.tone);

  const handleToggleCounterForm = () => {
    if (!showCounterForm) {
      setCounterPrice(lockedPrice ? lockedPrice.toFixed(2) : '');
      setCounterTimeline(timelineDisplay !== 'TBD' ? timelineDisplay : '');
      setCounterNotes('');
    }
    setShowCounterForm(prev => !prev);
  };

  const handleSendCounterOffer = async () => {
    if (!request || !user) return;
    const parsedCounter = counterPrice ? parseFloat(counterPrice) : NaN;
    if (!parsedCounter || parsedCounter <= 0) {
      Alert.alert('Enter a valid price', 'Add the amount you would like to offer.');
      return;
    }

    try {
      setSubmittingCounter(true);
      await projectRequestService.createNegotiation(
        {
          project_request_id: requestId,
          proposed_price: parsedCounter,
          proposed_timeline: counterTimeline || undefined,
          proposed_terms: counterNotes || undefined,
          message: counterNotes || undefined
        },
        user.id,
        'client'
      );
      await projectRequestService.updateProjectRequestStatus(requestId, 'pending');
      setShowCounterForm(false);
      setCounterPrice('');
      setCounterTimeline('');
      setCounterNotes('');
      await loadRequestDetails();
      Alert.alert('Counter sent', 'We let your provider know about your offer.');
    } catch (error) {
      console.error('Error sending counter offer:', error);
      Alert.alert('Error', 'Failed to send counter offer. Please try again.');
    } finally {
      setSubmittingCounter(false);
    }
  };

  const renderStatusOverview = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Project Status</Text>
          <Text style={styles.cardSubtitle}>Track every milestone in one place</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusPillText}>{request.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.statusGrid}>
        <View style={styles.statusColumn}>
          <Text style={styles.statusLabel}>Service</Text>
          <Text style={styles.statusValue}>{request.service_type}</Text>
        </View>
        <View style={styles.statusColumn}>
          <Text style={styles.statusLabel}>Timeline</Text>
          <Text style={styles.statusValue}>{statusTimelineDisplay}</Text>
        </View>
        <View style={styles.statusColumn}>
          <Text style={styles.statusLabel}>Budget</Text>
          <Text style={styles.statusValue}>{statusBudgetDisplay}</Text>
        </View>
      </View>
    </View>
  );

  const renderProjectSummary = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Client Brief</Text>
      <Text style={styles.summaryDescription}>{request.project_description}</Text>
      {request.additional_requirements && (
        <View style={styles.summaryNote}>
          <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
          <Text style={styles.summaryNoteText}>{request.additional_requirements}</Text>
        </View>
      )}
    </View>
  );

  const renderProviderQuoteSection = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Quote & Scope</Text>
          <Text style={styles.cardSubtitle}>Send the client a final price before payment</Text>
        </View>
        {hasQuote && (
          <View style={styles.readyBadge}>
            <Ionicons
              name={clientAcceptedQuote ? 'shield-checkmark' : 'time-outline'}
              size={16}
              color="#3B82F6"
            />
            <Text style={styles.readyBadgeText}>
              {clientAcceptedQuote ? 'Price Locked' : request.status === 'pending' ? 'Needs Update' : 'Quote Sent'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.quoteRow}>
        <View style={[styles.quoteValue, styles.quoteValueLeft]}>
          <Text style={styles.quoteLabel}>Final Price</Text>
          <Text style={styles.quoteAmount}>
            {displayPrice !== null ? formatCurrency(displayPrice) : 'Awaiting quote'}
          </Text>
        </View>
        <View style={styles.quoteValue}>
          <Text style={styles.quoteLabel}>Timeline</Text>
          <Text style={styles.quoteAmount}>{timelineDisplay}</Text>
        </View>
      </View>

      {agreement?.final_terms && (
        <View style={styles.summaryNote}>
          <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
          <Text style={styles.summaryNoteText}>{agreement.final_terms}</Text>
        </View>
      )}

      {hasQuote && (
        <View style={[styles.quoteStatusBanner, providerBannerStyle]}>
          <View style={[styles.quoteStatusIcon, providerIconStyle]}>
            <Ionicons name={providerToneIcon as any} size={18} color="#FFFFFF" />
          </View>
          <View style={styles.quoteStatusCopy}>
            <Text style={styles.quoteStatusTitle}>{providerQuoteMeta.title}</Text>
            <Text style={styles.quoteStatusSubtitle}>{providerQuoteMeta.description}</Text>
          </View>
        </View>
      )}

      {allowQuoteSubmission && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Quote Amount (USD)</Text>
            <View style={styles.amountInputField}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountField}
                value={quoteAmount}
                onChangeText={handleQuoteAmountChange}
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Estimated Timeline</Text>
            <TextInput
              style={styles.inputField}
              value={quoteTimeline}
              onChangeText={setQuoteTimeline}
              placeholder="ex: 10 business days"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.inputField, styles.notesField]}
              value={quoteNotes}
              onChangeText={setQuoteNotes}
              placeholder="Share deliverables, rounds, or revision policy"
              placeholderTextColor="#6B7280"
              multiline
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.actionButtonLeft]}
              onPress={() => Alert.alert('Coming soon', 'Quote save flow will be available after backend update.')}
            >
              <Text style={styles.secondaryButtonText}>Save Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitQuote}>
              <Text style={styles.primaryButtonText}>Send Quote</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderClientQuoteApproval = () => {
    const awaitingDecision = request.status === 'responded' && !lockedPriceMissing && !timelineMissing;
    const awaitingProviderFix = request.status === 'responded' && (lockedPriceMissing || timelineMissing);
  return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Provider Quote</Text>
        <Text style={styles.cardSubtitle}>
          Review the final price and timeline before the project goes live.
        </Text>

        <View style={styles.quoteRow}>
          <View style={[styles.quoteValue, styles.quoteValueLeft]}>
            <Text style={styles.quoteLabel}>Final Price</Text>
            <Text style={styles.quoteAmount}>
              {lockedPrice !== null ? formatCurrency(lockedPrice) : 'Awaiting quote'}
            </Text>
          </View>
          <View style={styles.quoteValue}>
            <Text style={styles.quoteLabel}>Timeline</Text>
            <Text style={styles.quoteAmount}>{timelineDisplay}</Text>
          </View>
        </View>

        {agreement?.final_terms && (
          <View style={styles.summaryNote}>
            <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
            <Text style={styles.summaryNoteText}>{agreement.final_terms}</Text>
          </View>
        )}

        <View style={[styles.quoteStatusBanner, clientBannerStyle]}>
          <View style={[styles.quoteStatusIcon, clientIconStyle]}>
            <Ionicons name={clientToneIcon as any} size={18} color="#FFFFFF" />
          </View>
          <View style={styles.quoteStatusCopy}>
            <Text style={styles.quoteStatusTitle}>{clientQuoteMeta.title}</Text>
            <Text style={styles.quoteStatusSubtitle}>{clientQuoteMeta.description}</Text>
          </View>
        </View>

        {awaitingDecision ? (
          <>
            <View style={styles.actionRow}>
        <TouchableOpacity 
                style={[styles.secondaryButton, styles.actionButtonLeft]}
                onPress={() =>
                  Alert.alert(
                    'Request Changes',
                    'Let your provider know what needs to change. We will open chat so you can discuss the quote.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Messages', onPress: handleMessageOtherParty },
                    ]
                  )
                }
              >
                <Text style={styles.secondaryButtonText}>Request Changes</Text>
        </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleClientAcceptQuote}>
                <Text style={styles.primaryButtonText}>Approve Quote</Text>
              </TouchableOpacity>
      </View>
            <TouchableOpacity style={styles.ghostButton} onPress={handleToggleCounterForm}>
              <Text style={styles.ghostButtonText}>
                {showCounterForm ? 'Cancel Counter Offer' : 'Offer Counter Price'}
              </Text>
            </TouchableOpacity>

            {showCounterForm && (
              <View style={styles.counterForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Your Offer (USD)</Text>
                  <View style={styles.amountInputField}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountField}
                      value={counterPrice}
                      onChangeText={handleCounterPriceChange}
                      placeholder={lockedPrice ? lockedPrice.toFixed(2) : '0.00'}
                      placeholderTextColor="#6B7280"
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                    />
          </View>
          </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Preferred Timeline</Text>
                  <TextInput
                    style={styles.inputField}
                    value={counterTimeline}
                    onChangeText={setCounterTimeline}
                    placeholder="ex: 5 days"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.inputField, styles.notesField]}
                    value={counterNotes}
                    onChangeText={setCounterNotes}
                    placeholder="Share the changes you’d like to see"
                    placeholderTextColor="#6B7280"
                    multiline
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, submittingCounter && styles.disabledButton]}
                  disabled={submittingCounter}
                  onPress={handleSendCounterOffer}
                >
                  <Text style={styles.primaryButtonText}>
                    {submittingCounter ? 'Sending…' : 'Send Counter Offer'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.counterHelperText}>
                  Sending a counter pauses payment until your provider responds with a new quote.
                </Text>
            </View>
          )}
          </>
        ) : awaitingProviderFix ? (
          <View style={styles.quotePendingRow}>
            <Ionicons name="alert-circle" size={18} color="#FBBF24" />
            <Text style={styles.quotePendingText}>
              Waiting for your provider to add a valid price and timeline. Message them for an update.
            </Text>
          </View>
        ) : (
          <View style={styles.quoteAcceptedRow}>
            <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
            <Text style={styles.quoteAcceptedText}>
              Quote approved. Continue to payment below when you’re ready.
            </Text>
            </View>
          )}
            </View>
    );
  };

  const renderClientPaymentCallout = () => {
    const paymentBlocked = lockedPriceMissing || timelineMissing;
    const paymentStatusText =
      paymentBlocked || request.status === 'pending'
        ? 'Awaiting quote'
        : request.status === 'responded'
        ? 'Awaiting approval'
        : workflowStatus?.payment_status === 'completed'
        ? 'Paid'
        : 'Pending';

    const amountLabel =
      !paymentBlocked && request.status !== 'pending' && lockedPrice !== null ? formatCurrency(lockedPrice) : 'Awaiting quote';

    const canPay =
      !paymentBlocked &&
      request.status === 'accepted' &&
      workflowStatus?.payment_status !== 'completed';

    return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Payment</Text>
      <Text style={styles.cardSubtitle}>
        Review the final quote and continue to secure checkout when you’re ready.
      </Text>

      <View style={styles.quoteRow}>
        <View style={[styles.quoteValue, styles.quoteValueLeft]}>
          <Text style={styles.quoteLabel}>Amount Due</Text>
          <Text style={styles.quoteAmount}>
            {amountLabel}
          </Text>
        </View>
        <View style={styles.quoteValue}>
          <Text style={styles.quoteLabel}>Status</Text>
          <Text style={styles.quoteAmount}>{paymentStatusText}</Text>
          </View>
        </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!canPay) && styles.disabledButton,
        ]}
        disabled={!canPay}
        onPress={() => navigation.navigate('PaymentScreen', { requestId: request.id })}
      >
        <Text style={styles.primaryButtonText}>
          {workflowStatus?.payment_status === 'completed' ? 'Payment Complete' : 'Continue to Payment'}
          </Text>
      </TouchableOpacity>
      {!canPay && (
        <Text style={styles.paymentHelperText}>
          Lock a valid price and timeline (and have it approved) before continuing to payment.
        </Text>
      )}
    </View>
  );
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Request</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* PRIORITY: Work Submission for Provider - Show at TOP when project is accepted */}
        {isProvider && request.status === 'accepted' && (
          <TouchableOpacity 
            style={styles.deliverWorkBanner}
            onPress={() => navigation.navigate('SubmitWork', { 
              requestId: request.id,
              projectTitle: request.project_description,
              clientName: otherPartyProfile?.display_name || 'Client',
              serviceType: request.service_type,
              agreedPrice: agreement?.final_price
            })}
            activeOpacity={0.8}
          >
            <View style={styles.deliverWorkIcon}>
              <Ionicons name="cloud-upload" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.deliverWorkContent}>
              <Text style={styles.deliverWorkTitle}>Ready to Deliver?</Text>
              <Text style={styles.deliverWorkSubtitle}>Upload your completed work for the client</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {renderStatusOverview()}
        {renderProjectSummary()}
        {isProvider && renderProviderQuoteSection()}
        {isClient && agreement && ['responded', 'accepted', 'pending'].includes(request.status) && renderClientQuoteApproval()}
        {isClient && renderClientPaymentCallout()}

        {/* Service Provider Information - Always show the service provider who received the request */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Provider</Text>
          
          {loadingOtherParty ? (
            <View style={styles.loadingOtherParty}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : otherPartyProfile ? (
            <View style={styles.otherPartyContainer}>
              <View style={styles.otherPartyInfo}>
                <View style={styles.otherPartyAvatar}>
                  {otherPartyProfile.artist_profile?.profile_photo || otherPartyProfile.service_provider?.profile_photo ? (
                    <Image 
                      source={{ 
                        uri: otherPartyProfile.artist_profile?.profile_photo || otherPartyProfile.service_provider?.profile_photo 
                      }} 
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.defaultAvatar}>
                      <Ionicons name="person" size={24} color="#3B82F6" />
                    </View>
                  )}
                </View>
                
                <View style={styles.otherPartyDetails}>
                  <Text style={styles.otherPartyName}>
                    {otherPartyProfile.service_provider?.business_name || 
                     otherPartyProfile.artist_profile?.artist_name || 
                     otherPartyProfile.user_data?.name || 'Unknown User'}
                  </Text>
                  
                  {otherPartyProfile.service_provider && (
                    <>
                      <Text style={styles.otherPartyType}>
                        {otherPartyProfile.service_provider.provider_type?.replace('_', ' ') || 'Service Provider'}
                        {otherPartyProfile.service_provider.tagline && ` • ${otherPartyProfile.service_provider.tagline}`}
                      </Text>
                      
                      {/* User Account Information - Show actual user account details */}
                      {otherPartyProfile.user_data?.name && (
                        <Text style={styles.otherPartyContact}>
                          👤 {otherPartyProfile.user_data.name}
                        </Text>
                      )}
                      
                      {otherPartyProfile.user_data?.email && (
                        <Text style={styles.otherPartyContact}>
                          📧 {otherPartyProfile.user_data.email}
                        </Text>
                      )}
                      
                      {/* Phone number - check user_data first, then service_provider */}
                      {(otherPartyProfile.user_data?.phone || otherPartyProfile.service_provider?.contact_phone) && (
                        <Text style={styles.otherPartyContact}>
                          📞 {otherPartyProfile.user_data?.phone || otherPartyProfile.service_provider.contact_phone}
                        </Text>
                      )}
                      
                      {/* Show "Contact information unavailable" only if we don't have user data */}
                      {!otherPartyProfile.user_data?.name && !otherPartyProfile.user_data?.email && (
                        <Text style={styles.otherPartyContact}>
                          📧 Contact information unavailable
                        </Text>
                      )}
                      
                      {otherPartyProfile.service_provider.location && (
                        <Text style={styles.otherPartyLocation}>
                          📍 {otherPartyProfile.service_provider.location}
                        </Text>
                      )}
                      
                      {otherPartyProfile.service_provider.years_of_experience && (
                        <Text style={styles.otherPartyExperience}>
                          🎵 {otherPartyProfile.service_provider.years_of_experience} years experience
                        </Text>
                      )}
                      
                      {/* Business Hours */}
                      {otherPartyProfile.service_provider.business_hours && (
                        <Text style={styles.otherPartyHours}>
                          🕒 {otherPartyProfile.service_provider.business_hours}
                        </Text>
                      )}
                      
                      {/* Status */}
                      <Text style={styles.otherPartyStatus}>
                        Status: <Text style={[styles.statusText, { 
                          color: otherPartyProfile.service_provider.status === 'approved' ? '#3B82F6' : '#F59E0B' 
                        }]}>
                          {otherPartyProfile.service_provider.status?.charAt(0).toUpperCase() + 
                           otherPartyProfile.service_provider.status?.slice(1) || 'Active'}
                        </Text>
                      </Text>
                    </>
                  )}
                  
                  {otherPartyProfile.artist_profile && (
                    <>
                      <Text style={styles.otherPartyType}>
                        Artist • {otherPartyProfile.artist_profile.genre?.join(', ') || 'Various Genres'}
                      </Text>
                      {otherPartyProfile.artist_profile.monthly_listeners && (
                        <Text style={styles.otherPartyStats}>
                          🎧 {otherPartyProfile.artist_profile.monthly_listeners.toLocaleString()} monthly listeners
                        </Text>
                      )}
                    </>
                  )}
                  
                  {!otherPartyProfile.service_provider && !otherPartyProfile.artist_profile && (
                    <Text style={styles.otherPartyType}>Client</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.otherPartyActions}>
                <TouchableOpacity 
                  style={styles.partyActionButton}
                  onPress={handleViewProfile}
                >
                  <Ionicons name="person-outline" size={20} color="#3B82F6" />
                  <Text style={styles.partyActionButtonText}>View Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.partyActionButton}
                  onPress={handleMessageOtherParty}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
                  <Text style={styles.partyActionButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.otherPartyError}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="person-outline" size={24} color="#6B7280" />
              </View>
              <Text style={styles.errorText}>Profile information unavailable</Text>
              <Text style={styles.errorSubtext}>
                Service provider details could not be loaded
              </Text>
            </View>
          )}
        </View>

        {/* Negotiations */}
        {negotiations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Negotiations</Text>
            {negotiations.map((negotiation, index) => (
              <View key={negotiation.id} style={styles.negotiationCard}>
                <View style={styles.negotiationHeader}>
                  <Text style={styles.negotiatorType}>
                    {negotiation.negotiator_type === 'client' ? 'Client' : 'Provider'}
                  </Text>
                  <Text style={styles.negotiationPrice}>${negotiation.proposed_price}</Text>
                </View>
                {negotiation.proposed_timeline && (
                  <Text style={styles.negotiationTimeline}>Timeline: {negotiation.proposed_timeline}</Text>
                )}
                {negotiation.message && (
                  <Text style={styles.negotiationMessage}>{negotiation.message}</Text>
                )}
                <Text style={styles.negotiationDate}>
                  {new Date(negotiation.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Messages</Text>
            {messages.map((message) => (
              <View key={message.id} style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>
                    {message.sender_type === 'client' ? 'Client' : 'Provider'}
                  </Text>
                  <Text style={styles.messageDate}>
                    {new Date(message.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.messageText}>{message.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons for Provider */}
        {isProvider && request.status === 'pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleSubmitQuote}
              >
                <Text style={styles.actionButtonText}>Accept Request</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.declineButton]}
                onPress={handleDeclineRequest}
              >
                <Text style={styles.actionButtonText}>Decline Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Delete Button - Restrictions apply based on user role */}
        {/* Client can't delete if: payment made OR submission exists */}
        {/* Provider can't delete if: payment made */}
        {isClient && workflowStatus?.payment_status !== 'completed' && workSubmissions.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Management</Text>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteRequest}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Delete Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Provider can delete only if payment NOT made */}
        {isProvider && workflowStatus?.payment_status !== 'completed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Management</Text>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteRequest}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Delete Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Work Submissions Section for Client - Always show after payment section */}
        {isClient && (request.status === 'accepted' || workSubmissions.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Delivery</Text>
            
            {workSubmissions.length > 0 ? (
              <View style={styles.submissionsContainer}>
                {workSubmissions.map((submission) => {
                  const isPaid = workflowStatus?.payment_status === 'completed' || submission.payment_status === 'paid';
                  const fileCount = submission.file_urls?.length || 0;
                  
                  return (
                    <View key={submission.id} style={styles.clientSubmissionCard}>
                      {/* Header with status */}
                      <View style={styles.deliveredHeader}>
                        <View style={styles.deliveredIconContainer}>
                          <Ionicons name="folder" size={24} color="#3B82F6" />
                        </View>
                        <View style={styles.deliveredInfo}>
                          <Text style={styles.deliveredTitle}>{submission.title}</Text>
                          <Text style={styles.deliveredMeta}>
                            {fileCount} file{fileCount !== 1 ? 's' : ''} • {new Date(submission.submitted_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      
                      {submission.description && (
                        <Text style={styles.deliveredDescription}>{submission.description}</Text>
                      )}
                      
                      {/* Files - Locked or Unlocked based on payment */}
                      {fileCount > 0 && (
                        <View style={styles.filesAccessSection}>
                          {isPaid ? (
                            <>
                              {/* UNLOCKED - Show download buttons */}
                              <View style={styles.unlockedBanner}>
                                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                                <Text style={styles.unlockedText}>Files unlocked - Ready to download</Text>
                              </View>
                              
                              {submission.file_urls.map((fileUrl: string, fileIndex: number) => {
                                // Extract the actual filename from the URL or use a generated name
                                const urlParts = fileUrl.split('/');
                                const urlFileName = urlParts[urlParts.length - 1]?.split('?')[0] || '';
                                const extension = urlFileName.includes('.') ? '.' + urlFileName.split('.').pop() : '';
                                const displayName = urlFileName || `${submission.title.replace(/[^a-zA-Z0-9]/g, '_')}_${fileIndex + 1}${extension}`;
                                
                                return (
                                  <WorkSubmissionFileDownload
                                    key={fileIndex}
                                    fileUrl={fileUrl}
                                    fileName={displayName}
                                    submissionId={submission.id}
                                    onDownloadComplete={() => {
                                      console.log('File downloaded:', displayName);
                                    }}
                                  />
                                );
                              })}
                            </>
                          ) : (
                            <>
                              {/* LOCKED - Show payment required */}
                              <View style={styles.lockedBanner}>
                                <Ionicons name="lock-closed" size={20} color="#F59E0B" />
                                <View style={styles.lockedInfo}>
                                  <Text style={styles.lockedTitle}>{fileCount} file{fileCount !== 1 ? 's' : ''} ready</Text>
                                  <Text style={styles.lockedSubtitle}>Complete payment to download</Text>
                                </View>
                              </View>
                              
                              <TouchableOpacity 
                                style={styles.unlockButton}
                                onPress={() => navigation.navigate('PaymentScreen', { requestId: request.id })}
                              >
                                <Ionicons name="card" size={20} color="#FFFFFF" />
                                <Text style={styles.unlockButtonText}>Pay to Unlock Files</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Empty state - Awaiting submission */
              <View style={styles.awaitingSubmissionCard}>
                <View style={styles.awaitingIconContainer}>
                  <Ionicons name="time-outline" size={32} color="#6B7280" />
                </View>
                <Text style={styles.awaitingTitle}>Awaiting Delivery</Text>
                <Text style={styles.awaitingSubtitle}>
                  Your service provider will upload files here once the work is complete. You'll be notified when files are ready.
                </Text>
                <View style={styles.awaitingInfo}>
                  <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.awaitingInfoText}>
                    Files can only be downloaded after payment is made
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Provider: Show submitted work summary (view only - submit button is in banner at top) */}
        {isProvider && request.status === 'accepted' && workSubmissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Submissions</Text>
            <View style={styles.submissionsContainer}>
              {workSubmissions.map((submission) => (
                <View key={submission.id} style={styles.submissionCard}>
                  <View style={styles.submissionHeader}>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color="#3B82F6" 
                    />
                    <Text style={styles.submissionTitle}>{submission.title}</Text>
                  </View>
                  <Text style={styles.submissionFiles}>
                    {submission.file_urls?.length || 0} file(s) delivered
                  </Text>
                  <Text style={styles.submissionDate}>
                    {new Date(submission.submitted_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Delivery Review Section for Client */}
        {isClient && workflowStatus?.delivery_status === 'delivered' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review Delivery</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>{workflowStatus.latest_delivery_title}</Text>
              {workflowStatus.latest_delivery_files && workflowStatus.latest_delivery_files.length > 0 && (
                <View style={styles.fileList}>
                  {workflowStatus.latest_delivery_files.map((file, index) => (
                    <TouchableOpacity key={index} style={styles.fileItem}>
                      <Ionicons name="document" size={20} color="#3B82F6" />
                      <Text style={styles.fileName}>{file.split('/').pop()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.reviewActions}>
                <TouchableOpacity 
                  style={[styles.reviewButton, styles.approveButton]}
                  onPress={() => handleApproveDelivery()}
                >
                  <Text style={styles.reviewButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.reviewButton, styles.revisionButton]}
                  onPress={() => handleRequestRevision()}
                >
                  <Text style={styles.reviewButtonText}>Request Revision</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'responded': return '#3B82F6';
    case 'accepted': return '#3B82F6';
    case 'declined': return '#EF4444';
    case 'cancelled': return '#6B7280';
    default: return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    backgroundColor: '#000000',
  },
  backButton: {
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
  scrollView: {
    flex: 1,
  },
  deliverWorkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  deliverWorkIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliverWorkContent: {
    flex: 1,
  },
  deliverWorkTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  deliverWorkSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusColumn: {
    flex: 1,
    paddingRight: 12,
  },
  statusLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 6,
  },
  statusValue: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDescription: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
  },
  summaryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  summaryNoteText: {
    color: '#C4B5FD',
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readyBadgeText: {
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 6,
  },
  quoteStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
  },
  quoteStatusBannerDefault: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  quoteStatusBannerPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  quoteStatusBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  quoteStatusBannerDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  quoteStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quoteStatusIconDefault: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  quoteStatusIconPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  quoteStatusIconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  quoteStatusIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  quoteStatusCopy: {
    flex: 1,
  },
  quoteStatusTitle: {
    color: '#F9FAFB',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  quoteStatusSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
  },
  quoteRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  quoteValue: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  quoteValueLeft: {
    marginRight: 12,
  },
  quoteLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  quoteAmount: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    marginBottom: 8,
  },
  amountInputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    color: '#6B7280',
    fontSize: 18,
    marginRight: 6,
  },
  amountField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    paddingVertical: 12,
  },
  inputField: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
  },
  notesField: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButtonLeft: {
    marginRight: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4C1D95',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#C4B5FD',
    fontWeight: '700',
  },
  ghostButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  quoteHint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  paymentHelperText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  counterForm: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingTop: 16,
  },
  counterHelperText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  quoteAcceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  quoteAcceptedText: {
    color: '#D1FAE5',
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  quotePendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  quotePendingText: {
    color: '#FDE68A',
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  negotiationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  negotiationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  negotiatorType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  negotiationPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  negotiationTimeline: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  negotiationMessage: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  negotiationDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  messageDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#3B82F6',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1E293B',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1E293B',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  proposeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  proposeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  deliveryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginTop: 8,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryDetails: {
    flex: 1,
    marginLeft: 12,
  },
  deliveryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deliveryDescription: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  deliveryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  deliveryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginTop: 8,
  },
  reviewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fileList: {
    marginBottom: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#3B82F6',
  },
  revisionButton: {
    backgroundColor: '#F59E0B',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // New submission styles
  submissionsContainer: {
    marginTop: 8,
  },
  submissionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  submissionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  submissionStatus: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submissionDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  submissionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  submissionFiles: {
    color: '#3B82F6',
    fontSize: 12,
  },
  submissionPayment: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  submissionDateOld: {
    color: '#6B7280',
    fontSize: 12,
  },
  addWorkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addWorkButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filesSectionOld: {
    marginTop: 12,
    marginBottom: 8,
  },
  filesTitleOld: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  // Other Party Styles
  loadingOtherParty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  otherPartyContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  otherPartyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  otherPartyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherPartyDetails: {
    flex: 1,
  },
  otherPartyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  otherPartyType: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  otherPartyLocation: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  otherPartyExperience: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  otherPartyContact: {
    color: '#3B82F6',
    fontSize: 12,
    marginTop: 2,
  },
  otherPartyHours: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  otherPartyStatus: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  statusText: {
    fontWeight: '600',
  },
  otherPartyStats: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  otherPartyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 0.48,
  },
  partyActionButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  otherPartyError: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  errorIconContainer: {
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Client submission styles
  sectionSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20,
  },
  clientSubmissionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  submissionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  submissionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  submissionPaymentAmount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentStatusLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '400',
  },
  submissionNotes: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  notesLabel: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },
  filesSection: {
    marginTop: 16,
  },
  filesTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  submissionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  submissionDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  submissionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewDetailsText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Delivered work styles for client
  deliveredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveredIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveredInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deliveredTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deliveredMeta: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  deliveredDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  filesAccessSection: {
    marginTop: 8,
  },
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F620',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  unlockedText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  lockedInfo: {
    flex: 1,
  },
  lockedTitle: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
  },
  lockedSubtitle: {
    color: '#F59E0B',
    fontSize: 13,
    opacity: 0.8,
    marginTop: 2,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Awaiting submission styles
  awaitingSubmissionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  awaitingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  awaitingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  awaitingSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  awaitingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  awaitingInfoText: {
    color: '#9CA3AF',
    fontSize: 13,
    flex: 1,
  },
});
