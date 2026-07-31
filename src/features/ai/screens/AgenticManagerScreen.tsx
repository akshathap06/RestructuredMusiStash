import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { agenticManagerService, Venue, EmailData } from '../../../services/agenticManagerService';
import { moderationService } from '../../../services/moderationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// API Configuration - Use the same backend as the web app
const BACKEND_URL = 'https://musistash-platform-production-3168.up.railway.app';

// Types
interface AITool {
  id: 'artist-analysis' | 'venue-finder' | 'email-generator';
  title: string;
  description: string;
  icon: string;
  status: 'live' | 'beta' | 'coming-soon';
  gradient: string[];
}

interface ArtistAnalysis {
  artist: {
    name: string;
    avatar?: string;
    genres: string[];
    followers: number;
    popularity?: number;
    market_stats?: {
      monthly_streams_millions: number;
      youtube_subscribers: number;
      instagram_followers: number;
      net_worth_millions?: number;
    };
  };
  similar_artist?: {
    name: string;
    avatar?: string;
    genres: string[];
    followers: number;
    popularity?: number;
    market_stats?: {
      youtube_subscribers: number;
    };
  } | null;
  resonance_score: number;
  genre_compatibility: number;
  resonance_explanation: string;
  resonance_details?: {
    commercial_potential: string;
    musical_similarities: string[];
  };
}

// AI Tools Configuration
const AI_TOOLS: AITool[] = [
  {
    id: 'artist-analysis',
    title: 'Artist Analysis',
    description: 'Analyze artist market potential and find similar artists',
    icon: 'analytics',
    status: 'live',
    gradient: ['#3B82F6', '#8B5CF6'],
  },
  {
    id: 'venue-finder',
    title: 'Venue Finder',
    description: 'Discover venues perfect for your music style',
    icon: 'location',
    status: 'live',
    gradient: ['#3B82F6', '#06B6D4'],
  },
  {
    id: 'email-generator',
    title: 'Email Generator',
    description: 'Generate professional pitch emails for venues and promoters',
    icon: 'mail',
    status: 'live',
    gradient: ['#8B5CF6', '#EC4899'],
  },
];

// Utility Functions
const formatNumber = (num: number): string => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Circular Progress Component
const CircularProgress = ({ value, size = 100, color = '#3B82F6' }: { value: number; size?: number; color?: string }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View style={[styles.circularProgress, { width: size, height: size }]}>
      <View style={[styles.circularProgressBg, { width: size, height: size, borderRadius: size / 2 }]} />
      <View style={styles.circularProgressInner}>
        <Text style={[styles.circularProgressValue, { color }]}>{Math.round(value)}%</Text>
      </View>
    </View>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: 'live' | 'beta' | 'coming-soon' }) => {
  const colors = {
    live: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.3)' },
    beta: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
    'coming-soon': { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.3)' },
  };
  const c = colors[status];
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.statusBadgeText, { color: c.text }]}>
        {status === 'live' ? 'Live' : status === 'beta' ? 'Beta' : 'Soon'}
      </Text>
    </View>
  );
};

export default function AgenticManagerScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTool, setActiveTool] = useState<AITool['id'] | null>(null);
  
  // AI Consent State
  const [hasAIConsent, setHasAIConsent] = useState<boolean | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingTool, setPendingTool] = useState<AITool['id'] | null>(null);

  // Check AI consent on mount
  useEffect(() => {
    const checkConsent = async () => {
      if (user?.id) {
        const consent = await moderationService.hasAIConsent(user.id);
        setHasAIConsent(consent);
      }
    };
    checkConsent();
  }, [user?.id]);

  // Handle tool selection with consent check
  const handleToolSelect = (toolId: AITool['id']) => {
    if (hasAIConsent) {
      setActiveTool(toolId);
    } else {
      setPendingTool(toolId);
      setShowConsentModal(true);
    }
  };

  // Handle consent acceptance
  const handleAcceptConsent = async () => {
    if (user?.id) {
      await moderationService.setAIConsent(user.id, true);
      setHasAIConsent(true);
      setShowConsentModal(false);
      if (pendingTool) {
        setActiveTool(pendingTool);
        setPendingTool(null);
      }
    }
  };

  // Handle consent decline
  const handleDeclineConsent = () => {
    setShowConsentModal(false);
    setPendingTool(null);
    Alert.alert(
      'AI Features Unavailable',
      'You need to accept the AI data processing terms to use these features. You can change this in your profile settings later.',
      [{ text: 'OK' }]
    );
  };
  
  // Artist Analysis State
  const [artistName, setArtistName] = useState('');
  const [compareArtist, setCompareArtist] = useState('');
  const [artistAnalysis, setArtistAnalysis] = useState<ArtistAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [loadingStage, setLoadingStage] = useState('');
  
  // Venue Finder State
  const [venueLocation, setVenueLocation] = useState('');
  const [venueGenre, setVenueGenre] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [venueError, setVenueError] = useState('');
  const [favoriteVenues, setFavoriteVenues] = useState<Set<string>>(new Set());
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  
  // Email Generator State
  const [selectedTemplate, setSelectedTemplate] = useState('venue-booking');
  const [emailData, setEmailData] = useState<EmailData>({
    recipientName: '',
    recipientEmail: '',
    venueName: '',
    venueLocation: '',
    proposedDate: '',
    customMessage: '',
  });
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Artist Analysis Handler
  const handleAnalyzeArtist = async () => {
    if (!artistName.trim()) {
      Alert.alert('Artist Required', 'Please enter an artist name to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    setArtistAnalysis(null);

    try {
      setLoadingStage('🎵 Fetching artist profiles...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      // Use the same endpoint format as the web app: /analyze-artist/{name}?comparable_artist={compare}
      const baseUrl = `${BACKEND_URL}/analyze-artist/${encodeURIComponent(artistName.trim())}`;
      const apiUrl = compareArtist.trim() 
        ? `${baseUrl}?comparable_artist=${encodeURIComponent(compareArtist.trim())}` 
        : baseUrl;
      
      console.log('🔍 Analyzing artist:', apiUrl);
      
      setTimeout(() => setLoadingStage('🔍 Analyzing music patterns...'), 2000);
      setTimeout(() => setLoadingStage('📊 Computing compatibility scores...'), 4000);
      setTimeout(() => setLoadingStage('🤖 Generating AI insights...'), 6000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Analysis failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Analysis result:', result);
      
      if (!result.resonance_score) {
        throw new Error('Invalid response from analysis API');
      }
      
      setArtistAnalysis(result);
    } catch (err: any) {
      console.error('❌ Analysis error:', err);
      let errorMessage = 'An error occurred during analysis';
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setAnalysisError(errorMessage);
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  // Venue Finder Handler
  const handleSearchVenues = async () => {
    if (!venueLocation.trim()) {
      Alert.alert('Location Required', 'Please enter a city to search for venues.');
      return;
    }

    setIsSearchingVenues(true);
    setVenueError('');
    setVenues([]);

    try {
      console.log('🎯 Searching venues in:', venueLocation);
      
      // Create FormData for the request (same as web app)
      const formData = new FormData();
      formData.append('location', venueLocation.trim());
      formData.append('venue_types', '');
      formData.append('artist_genre', venueGenre.trim() || '');
      formData.append('capacity_range', '');

      const apiUrl = `${BACKEND_URL}/api/agent/discover-venues`;
      console.log('📍 Venue API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Don't set Content-Type for FormData - browser/RN will set it automatically with boundary
        },
      });

      console.log('📍 Venue API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Venue API error response:', errorText);
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Venue API response:', data);

      if (data.status === 'success' && data.venues) {
        setVenues(data.venues);
        console.log(`✅ Found ${data.venues.length} venues`);
      } else {
        throw new Error(data.detail || 'No venues found');
      }
    } catch (err: any) {
      console.error('❌ Venue search error:', err);
      setVenueError(err.message || 'Failed to search venues');
    } finally {
      setIsSearchingVenues(false);
    }
  };

  // Email Generator Handler
  const handleGenerateEmail = () => {
    if (!selectedTemplate) {
      Alert.alert('Template Required', 'Please select an email template first.');
      return;
    }

    setIsGeneratingEmail(true);
    
    setTimeout(() => {
      const email = agenticManagerService.generateEmail(selectedTemplate, emailData, user);
      setGeneratedEmail(email);
      setIsGeneratingEmail(false);
    }, 1500);
  };

  const handleCopyEmail = () => {
    // Note: In production, use expo-clipboard with a dev build
    Alert.alert('Copied!', 'Email content ready to paste.');
  };

  // Venue Favorite Toggle
  const toggleFavoriteVenue = (venueId: string) => {
    setFavoriteVenues(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(venueId)) {
        newFavorites.delete(venueId);
      } else {
        newFavorites.add(venueId);
      }
      return newFavorites;
    });
  };

  // Open Venue Detail Modal
  const openVenueDetail = (venue: Venue) => {
    setSelectedVenue(venue);
    setShowVenueModal(true);
  };

  // Handle Generate Pitch Email from Venue Modal
  const handleGeneratePitchFromVenue = (venue: Venue) => {
    setEmailData(prev => ({
      ...prev,
      venueName: venue.name,
      venueLocation: venue.address,
    }));
    setShowVenueModal(false);
    setActiveTool('email-generator');
  };

  // Get Google Maps URL for venue
  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  // Open venue in Google Maps
  const openInGoogleMaps = (address: string) => {
    Linking.openURL(getGoogleMapsUrl(address));
  };

  // Call venue phone number
  const callVenue = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    // Note: In production, use expo-clipboard with a dev build
    Alert.alert('Copied!', `${text} - ready to use.`);
  };

  const handleSendEmail = () => {
    if (!emailData.recipientEmail) {
      Alert.alert('Email Required', 'Please enter a recipient email address.');
      return;
    }
    const subject = 'Booking Inquiry';
    const mailtoUrl = `mailto:${emailData.recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generatedEmail)}`;
    Linking.openURL(mailtoUrl);
  };

  // Render Tool Selector
  const renderToolSelector = () => (
    <View style={styles.toolSelector}>
      {AI_TOOLS.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={[
            styles.toolCard,
            activeTool === tool.id && styles.toolCardActive,
          ]}
          onPress={() => handleToolSelect(tool.id)}
          activeOpacity={0.8}
        >
          <View style={styles.toolCardHeader}>
            <LinearGradient
              colors={tool.gradient as [string, string]}
              style={styles.toolIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={tool.icon as any} size={24} color="#FFFFFF" />
            </LinearGradient>
            <StatusBadge status={tool.status} />
          </View>
          <Text style={styles.toolTitle}>{tool.title}</Text>
          <Text style={styles.toolDescription} numberOfLines={2}>{tool.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render Artist Analysis
  const renderArtistAnalysis = () => (
    <View style={styles.toolContent}>
      <View style={styles.toolHeader}>
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          style={styles.toolHeaderIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="analytics" size={24} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.toolHeaderText}>
          <Text style={styles.toolHeaderTitle}>AI Artist Analysis</Text>
          <Text style={styles.toolHeaderSubtitle}>Discover commercial potential with multi-source AI analysis</Text>
        </View>
      </View>

      <View style={styles.searchForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Artist to Analyze</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Drake, Taylor Swift"
              placeholderTextColor="#6B7280"
              value={artistName}
              onChangeText={setArtistName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Compare With (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="people" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Kanye West, Ed Sheeran"
              placeholderTextColor="#6B7280"
              value={compareArtist}
              onChangeText={setCompareArtist}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isAnalyzing && styles.primaryButtonDisabled]}
          onPress={handleAnalyzeArtist}
          disabled={isAnalyzing}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Analyze Artist</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.poweredBy}>Powered by Spotify, Last.fm, Deezer & AI</Text>
      </View>

      {/* Loading State */}
      {isAnalyzing && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
          <Text style={styles.loadingText}>{loadingStage || 'Analyzing artist data...'}</Text>
          <View style={styles.loadingSources}>
            {['Spotify', 'Last.fm', 'Deezer', 'AI'].map((source, i) => (
              <View key={source} style={styles.sourceTag}>
                <Text style={styles.sourceTagText}>{source}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Error State */}
      {analysisError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{analysisError}</Text>
        </View>
      )}

      {/* Analysis Results */}
      {artistAnalysis && !isAnalyzing && (
        <View style={styles.resultsContainer}>
          {/* Commercial Potential Banner */}
          <LinearGradient
            colors={artistAnalysis.resonance_score >= 70 ? ['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.1)'] : ['rgba(59, 130, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.commercialBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.commercialBannerContent}>
              <View style={styles.commercialBannerLeft}>
                <View style={[styles.commercialIcon, { backgroundColor: artistAnalysis.resonance_score >= 70 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)' }]}>
                  <Ionicons name="trending-up" size={24} color={artistAnalysis.resonance_score >= 70 ? '#22C55E' : '#3B82F6'} />
                </View>
                <View>
                  <Text style={styles.commercialTitle}>Commercial Potential</Text>
                  <Text style={[styles.commercialValue, { color: artistAnalysis.resonance_score >= 70 ? '#22C55E' : '#3B82F6' }]}>
                    {artistAnalysis.resonance_details?.commercial_potential || (artistAnalysis.resonance_score >= 80 ? 'Exceptional' : artistAnalysis.resonance_score >= 60 ? 'Strong' : 'Moderate')}
                  </Text>
                </View>
              </View>
              <View style={styles.commercialBannerRight}>
                <Text style={styles.commercialScore}>{Math.round(artistAnalysis.resonance_score)}</Text>
                <Text style={styles.commercialScoreLabel}>out of 100</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Artist Cards - Show Both Artists */}
          <View style={styles.artistCardsRow}>
            {/* Primary/Target Artist */}
            <View style={[styles.artistCard, styles.artistCardHalf]}>
              <View style={styles.artistCardHeader}>
                <View style={styles.artistAvatar}>
                  {artistAnalysis.artist.avatar ? (
                    <Image 
                      source={{ uri: artistAnalysis.artist.avatar }} 
                      style={styles.artistAvatarImage}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#3B82F6', '#06B6D4']}
                      style={styles.artistAvatarGradient}
                    >
                      <Ionicons name="mic" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.artistInfo}>
                  <Text style={styles.artistLabel}>TARGET ARTIST</Text>
                  <Text style={styles.artistName}>{artistAnalysis.artist.name}</Text>
                  <View style={styles.artistStats}>
                    <Ionicons name="people" size={12} color="#9CA3AF" />
                    <Text style={styles.artistStatsText}>{formatNumber(artistAnalysis.artist.followers)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.genreTags}>
                {artistAnalysis.artist.genres.slice(0, 4).map((genre, i) => (
                  <View key={i} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{genre}</Text>
                  </View>
                ))}
              </View>
              {artistAnalysis.artist.market_stats?.youtube_subscribers && (
                <View style={styles.youtubeStats}>
                  <Text style={styles.youtubeNumber}>
                    {formatNumber(artistAnalysis.artist.market_stats.youtube_subscribers)}
                  </Text>
                  <Text style={styles.youtubeLabel}>YouTube Subs</Text>
                </View>
              )}
            </View>

            {/* Similar/Comparison Artist */}
            {artistAnalysis.similar_artist && (
              <View style={[styles.artistCard, styles.artistCardHalf, styles.artistCardSecondary]}>
                <View style={styles.artistCardHeader}>
                  <View style={styles.artistAvatar}>
                    {artistAnalysis.similar_artist.avatar ? (
                      <Image 
                        source={{ uri: artistAnalysis.similar_artist.avatar }} 
                        style={styles.artistAvatarImage}
                      />
                    ) : (
                      <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        style={styles.artistAvatarGradient}
                      >
                        <Ionicons name="mic" size={20} color="#FFFFFF" />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.artistInfo}>
                    <Text style={[styles.artistLabel, { color: '#8B5CF6' }]}>MOST SIMILAR ARTIST</Text>
                    <Text style={styles.artistName}>{artistAnalysis.similar_artist.name}</Text>
                    <View style={styles.artistStats}>
                      <Ionicons name="people" size={12} color="#9CA3AF" />
                      <Text style={styles.artistStatsText}>{formatNumber(artistAnalysis.similar_artist.followers)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.genreTags}>
                  {artistAnalysis.similar_artist.genres.slice(0, 4).map((genre, i) => (
                    <View key={i} style={[styles.genreTag, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.25)' }]}>
                      <Text style={[styles.genreTagText, { color: '#C4B5FD' }]}>{genre}</Text>
                    </View>
                  ))}
                </View>
                {artistAnalysis.similar_artist.market_stats?.youtube_subscribers && (
                  <View style={styles.youtubeStats}>
                    <Text style={styles.youtubeNumber}>
                      {formatNumber(artistAnalysis.similar_artist.market_stats.youtube_subscribers)}
                    </Text>
                    <Text style={styles.youtubeLabel}>YouTube Subs</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Score Breakdown */}
          <View style={styles.scoreBreakdown}>
            <Text style={styles.sectionTitle}>Compatibility Analysis</Text>
            <View style={styles.scoreCards}>
              <View style={styles.scoreCard}>
                <CircularProgress value={artistAnalysis.resonance_score} color="#3B82F6" />
                <Text style={styles.scoreCardLabel}>Resonance Score</Text>
              </View>
              <View style={styles.scoreCard}>
                <CircularProgress value={artistAnalysis.genre_compatibility * 100} color="#8B5CF6" />
                <Text style={styles.scoreCardLabel}>Genre Match</Text>
              </View>
            </View>
          </View>

          {/* Analysis Summary */}
          {artistAnalysis.resonance_explanation && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles" size={20} color="#3B82F6" />
                <Text style={styles.summaryTitle}>Analysis Summary</Text>
              </View>
              <Text style={styles.summaryText}>{artistAnalysis.resonance_explanation}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Render Venue Finder
  const renderVenueFinder = () => (
    <View style={styles.toolContent}>
      <View style={styles.toolHeader}>
        <LinearGradient
          colors={['#3B82F6', '#06B6D4']}
          style={styles.toolHeaderIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="location" size={24} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.toolHeaderText}>
          <Text style={styles.toolHeaderTitle}>Venue Finder</Text>
          <Text style={styles.toolHeaderSubtitle}>Discover venues perfect for your music style</Text>
        </View>
      </View>

      <View style={styles.searchForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>City</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Los Angeles"
              placeholderTextColor="#6B7280"
              value={venueLocation}
              onChangeText={setVenueLocation}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your Genre (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="musical-notes" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Hip-Hop, Rock, Jazz"
              placeholderTextColor="#6B7280"
              value={venueGenre}
              onChangeText={setVenueGenre}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSearchingVenues && styles.primaryButtonDisabled]}
          onPress={handleSearchVenues}
          disabled={isSearchingVenues}
        >
          <LinearGradient
            colors={['#3B82F6', '#06B6D4']}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isSearchingVenues ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Searching...</Text>
              </>
            ) : (
              <>
                <Ionicons name="search" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Find Venues</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {venueError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{venueError}</Text>
        </View>
      )}

      {venues.length > 0 && (
        <View style={styles.venueResults}>
          <View style={styles.venueResultsHeader}>
            <Text style={styles.sectionTitle}>{venues.length} Venues Found</Text>
            <View style={styles.liveDataBadge}>
              <Ionicons name="location" size={12} color="#22C55E" />
              <Text style={styles.liveDataText}>Live Data</Text>
            </View>
          </View>

          {venues.map((venue, index) => (
            <TouchableOpacity 
              key={venue.id || index} 
              style={styles.venueCard}
              onPress={() => openVenueDetail(venue)}
              activeOpacity={0.7}
            >
              <View style={styles.venueCardContent}>
                <View style={styles.venueCardMain}>
                  <View style={styles.venueNameRow}>
                    <Text style={styles.venueName}>{venue.name}</Text>
                    <TouchableOpacity 
                      style={styles.favoriteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavoriteVenue(venue.id);
                      }}
                    >
                      <Ionicons 
                        name={favoriteVenues.has(venue.id) ? "heart" : "heart-outline"} 
                        size={20} 
                        color={favoriteVenues.has(venue.id) ? "#EF4444" : "#6B7280"} 
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.venueAddress} numberOfLines={1}>{venue.address}</Text>
                  <View style={styles.venueStats}>
                    <View style={[styles.difficultyBadge, { 
                      backgroundColor: venue.booking_difficulty === 'easy' ? 'rgba(34, 197, 94, 0.2)' : 
                                      venue.booking_difficulty === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 
                                      'rgba(239, 68, 68, 0.2)' 
                    }]}>
                      <Text style={[styles.difficultyText, {
                        color: venue.booking_difficulty === 'easy' ? '#22C55E' : 
                               venue.booking_difficulty === 'medium' ? '#F59E0B' : '#EF4444'
                      }]}>
                        {venue.booking_difficulty === 'easy' ? 'Easy' : 
                         venue.booking_difficulty === 'medium' ? 'Moderate' : 'Competitive'}
                      </Text>
                    </View>
                    <Text style={styles.venueCapacity}>{venue.estimated_capacity} cap</Text>
                  </View>
                </View>
                <View style={styles.venueCardRight}>
                  {venue.rating > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!isSearchingVenues && venues.length === 0 && !venueError && (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="location" size={48} color="#4B5563" />
          </View>
          <Text style={styles.emptyStateTitle}>Discover Music Venues</Text>
          <Text style={styles.emptyStateText}>
            Enter a city to find real venues with contact info, ratings, and booking insights
          </Text>
        </View>
      )}
    </View>
  );

  // Render Email Generator
  const renderEmailGenerator = () => {
    const templates = [
      { id: 'venue-booking', name: 'Venue Booking', category: 'Venues', icon: 'location' },
      { id: 'promoter-outreach', name: 'Promoter Outreach', category: 'Promoters', icon: 'megaphone' },
      { id: 'festival-application', name: 'Festival Application', category: 'Festivals', icon: 'musical-notes' },
      { id: 'press-outreach', name: 'Press & Media', category: 'Media', icon: 'newspaper' },
    ];

    return (
      <View style={styles.toolContent}>
        <View style={styles.toolHeader}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            style={styles.toolHeaderIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="mail" size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.toolHeaderText}>
            <Text style={styles.toolHeaderTitle}>Email Generator</Text>
            <Text style={styles.toolHeaderSubtitle}>Generate professional pitch emails</Text>
          </View>
        </View>

        {/* Template Selection */}
        <View style={styles.templateSection}>
          <Text style={styles.sectionTitle}>Choose Template</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate === template.id && styles.templateCardActive,
                ]}
                onPress={() => setSelectedTemplate(template.id)}
              >
                <Ionicons 
                  name={template.icon as any} 
                  size={20} 
                  color={selectedTemplate === template.id ? '#8B5CF6' : '#6B7280'} 
                />
                <Text style={[
                  styles.templateName,
                  selectedTemplate === template.id && styles.templateNameActive,
                ]}>{template.name}</Text>
                <Text style={styles.templateCategory}>{template.category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Email Form */}
        <View style={styles.emailForm}>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Recipient Name</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="John Doe"
                placeholderTextColor="#6B7280"
                value={emailData.recipientName}
                onChangeText={(text) => setEmailData(prev => ({ ...prev, recipientName: text }))}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="john@venue.com"
                placeholderTextColor="#6B7280"
                value={emailData.recipientEmail}
                onChangeText={(text) => setEmailData(prev => ({ ...prev, recipientEmail: text }))}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Venue Name</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="The Grand Hall"
                placeholderTextColor="#6B7280"
                value={emailData.venueName}
                onChangeText={(text) => setEmailData(prev => ({ ...prev, venueName: text }))}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Proposed Date</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="March 15, 2024"
                placeholderTextColor="#6B7280"
                value={emailData.proposedDate}
                onChangeText={(text) => setEmailData(prev => ({ ...prev, proposedDate: text }))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Custom Message (Optional)</Text>
            <TextInput
              style={[styles.inputSmall, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Add any personal touches..."
              placeholderTextColor="#6B7280"
              value={emailData.customMessage}
              onChangeText={(text) => setEmailData(prev => ({ ...prev, customMessage: text }))}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isGeneratingEmail && styles.primaryButtonDisabled]}
            onPress={handleGenerateEmail}
            disabled={isGeneratingEmail}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              style={styles.primaryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isGeneratingEmail ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Generate Email</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Generated Email */}
        {generatedEmail && (
          <View style={styles.generatedEmailSection}>
            <View style={styles.generatedEmailHeader}>
              <Text style={styles.sectionTitle}>Generated Email</Text>
              <View style={styles.emailActions}>
                <TouchableOpacity style={styles.emailActionButton} onPress={handleCopyEmail}>
                  <Ionicons name="copy-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.emailActionButton} onPress={handleSendEmail}>
                  <Ionicons name="send" size={18} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.emailPreview}>
              <Text style={styles.emailPreviewText}>{generatedEmail}</Text>
            </View>
            <TouchableOpacity style={styles.sendEmailButton} onPress={handleSendEmail}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.sendEmailButtonText}>Open in Email App</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render Active Tool Content
  const renderActiveToolContent = () => {
    switch (activeTool) {
      case 'artist-analysis':
        return renderArtistAnalysis();
      case 'venue-finder':
        return renderVenueFinder();
      case 'email-generator':
        return renderEmailGenerator();
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          {!activeTool && (
            <View style={styles.heroSection}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={14} color="#3B82F6" />
                <Text style={styles.heroBadgeText}>MusiStash AI</Text>
              </View>
              <Text style={styles.heroTitle}>Try Our AI Tools</Text>
              <Text style={styles.heroSubtitle}>
                Analyze artists, discover venues, and generate emails to grow your music career.
              </Text>
            </View>
          )}

          {/* Tool Selector */}
          {!activeTool ? (
            renderToolSelector()
          ) : (
            <View style={styles.activeToolContainer}>
              <TouchableOpacity 
                style={styles.toolBackButton}
                onPress={() => setActiveTool(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                <Text style={styles.toolBackText}>Back to Tools</Text>
              </TouchableOpacity>
              {renderActiveToolContent()}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Venue Detail Modal */}
      <Modal
        visible={showVenueModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVenueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.venueModal, { paddingBottom: insets.bottom + 16 }]}>
            {selectedVenue && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <LinearGradient
                      colors={['#3B82F6', '#06B6D4']}
                      style={styles.venueModalIcon}
                    >
                      <Ionicons name="location" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.modalHeaderInfo}>
                      <Text style={styles.venueModalName}>{selectedVenue.name}</Text>
                      <View style={styles.venueModalAddress}>
                        <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                        <Text style={styles.venueModalAddressText} numberOfLines={2}>
                          {selectedVenue.address}
                        </Text>
                      </View>
                      {selectedVenue.rating > 0 && (
                        <View style={styles.venueModalRating}>
                          <Ionicons name="star" size={16} color="#F59E0B" />
                          <Text style={styles.venueModalRatingText}>
                            {selectedVenue.rating.toFixed(1)} ({selectedVenue.total_ratings} reviews)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setShowVenueModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Map Preview */}
                <TouchableOpacity 
                  style={styles.mapPreview}
                  onPress={() => openInGoogleMaps(selectedVenue.address)}
                >
                  <View style={styles.mapPlaceholder}>
                    <Ionicons name="map" size={48} color="#3B82F6" />
                    <Text style={styles.mapPlaceholderText}>View on Google Maps</Text>
                  </View>
                  <View style={styles.mapDirectionsButton}>
                    <Ionicons name="navigate" size={16} color="#22C55E" />
                    <Text style={styles.mapDirectionsText}>Get Directions</Text>
                  </View>
                </TouchableOpacity>

                {/* Venue Stats */}
                <View style={styles.venueModalStats}>
                  <View style={styles.venueStatCard}>
                    <Ionicons name="people" size={24} color="#3B82F6" />
                    <Text style={styles.venueStatValue}>{selectedVenue.estimated_capacity}</Text>
                    <Text style={styles.venueStatLabel}>Capacity</Text>
                  </View>
                  <View style={styles.venueStatCard}>
                    <View style={[styles.difficultyDot, {
                      backgroundColor: selectedVenue.booking_difficulty === 'easy' ? '#22C55E' : 
                                       selectedVenue.booking_difficulty === 'medium' ? '#F59E0B' : '#EF4444'
                    }]} />
                    <Text style={styles.venueStatValue}>
                      {selectedVenue.booking_difficulty === 'easy' ? 'Easy' : 
                       selectedVenue.booking_difficulty === 'medium' ? 'Moderate' : 'Hard'}
                    </Text>
                    <Text style={styles.venueStatLabel}>Booking</Text>
                  </View>
                  <View style={styles.venueStatCard}>
                    <Ionicons name="musical-notes" size={24} color="#8B5CF6" />
                    <Text style={styles.venueStatValue}>{selectedVenue.genre_suitability * 10}%</Text>
                    <Text style={styles.venueStatLabel}>Genre Match</Text>
                  </View>
                </View>

                {/* About Section */}
                <View style={styles.venueModalSection}>
                  <Text style={styles.venueModalSectionTitle}>About</Text>
                  <Text style={styles.venueModalDescription}>
                    {selectedVenue.description || `Music venue in ${venueLocation}`}
                  </Text>
                </View>

                {/* Contact Information */}
                <View style={styles.venueModalSection}>
                  <Text style={styles.venueModalSectionTitle}>Contact Information</Text>
                  
                  {selectedVenue.phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={18} color="#9CA3AF" />
                      <Text style={styles.contactText}>{selectedVenue.phone}</Text>
                      <View style={styles.contactActions}>
                        <TouchableOpacity 
                          style={styles.contactActionButton}
                          onPress={() => copyToClipboard(selectedVenue.phone)}
                        >
                          <Ionicons name="copy-outline" size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.contactActionButton, styles.callButton]}
                          onPress={() => callVenue(selectedVenue.phone)}
                        >
                          <Text style={styles.callButtonText}>Call</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {selectedVenue.website && (
                    <TouchableOpacity 
                      style={styles.contactRow}
                      onPress={() => Linking.openURL(selectedVenue.website)}
                    >
                      <Ionicons name="globe-outline" size={18} color="#9CA3AF" />
                      <Text style={[styles.contactText, { color: '#3B82F6' }]} numberOfLines={1}>
                        {selectedVenue.website}
                      </Text>
                      <Ionicons name="open-outline" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.venueModalActions}>
                  <TouchableOpacity 
                    style={styles.generatePitchButton}
                    onPress={() => handleGeneratePitchFromVenue(selectedVenue)}
                  >
                    <LinearGradient
                      colors={['#3B82F6', '#8B5CF6']}
                      style={styles.generatePitchGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="mail" size={18} color="#FFFFFF" />
                      <Text style={styles.generatePitchText}>Generate Pitch Email</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.closeModalButton}
                    onPress={() => setShowVenueModal(false)}
                  >
                    <Text style={styles.closeModalText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* AI Consent Modal */}
      <Modal
        visible={showConsentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View style={styles.consentModalOverlay}>
          <View style={[styles.consentModal, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.consentModalHeader}>
              <View style={styles.consentIconContainer}>
                <Ionicons name="sparkles" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.consentModalTitle}>AI Features Data Processing</Text>
            </View>
            
            <ScrollView style={styles.consentContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.consentText}>
                MusiStash's AI features analyze data to provide personalized insights and recommendations. By using these features, you agree to the following:
              </Text>
              
              <View style={styles.consentItem}>
                <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
                <Text style={styles.consentItemText}>
                  <Text style={styles.consentItemBold}>Data Processing:</Text> Your queries and inputs may be processed by AI services to generate results.
                </Text>
              </View>
              
              <View style={styles.consentItem}>
                <Ionicons name="analytics" size={20} color="#3B82F6" />
                <Text style={styles.consentItemText}>
                  <Text style={styles.consentItemBold}>Third-Party Services:</Text> We use external AI providers (Spotify, Last.fm, and our AI backend) to power these features.
                </Text>
              </View>
              
              <View style={styles.consentItem}>
                <Ionicons name="lock-closed" size={20} color="#8B5CF6" />
                <Text style={styles.consentItemText}>
                  <Text style={styles.consentItemBold}>Privacy:</Text> We don't share your personal data with third parties for advertising. See our Privacy Policy for details.
                </Text>
              </View>
              
              <View style={styles.consentItem}>
                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                <Text style={styles.consentItemText}>
                  <Text style={styles.consentItemBold}>Results:</Text> AI-generated insights are for informational purposes only and may not be 100% accurate.
                </Text>
              </View>
              
              <Text style={styles.consentFooterText}>
                You can revoke this consent at any time in your profile settings.
              </Text>
            </ScrollView>
            
            <View style={styles.consentActions}>
              <TouchableOpacity 
                style={styles.consentDeclineButton}
                onPress={handleDeclineConsent}
              >
                <Text style={styles.consentDeclineText}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.consentAcceptButton}
                onPress={handleAcceptConsent}
              >
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  style={styles.consentAcceptGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.consentAcceptText}>I Agree</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
  },
  toolSelector: {
    marginTop: 8,
  },
  toolCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toolCardActive: {
    borderColor: 'rgba(59, 130, 246, 0.5)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  toolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  activeToolContainer: {
    marginTop: 8,
  },
  toolBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toolBackText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  toolContent: {
    flex: 1,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  toolHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  toolHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toolHeaderSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  searchForm: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  poweredBy: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  loadingSources: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceTagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  resultsContainer: {
    marginTop: 8,
  },
  commercialBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  commercialBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commercialBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commercialIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commercialTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  commercialValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  commercialBannerRight: {
    alignItems: 'flex-end',
  },
  commercialScore: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  commercialScoreLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  artistCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  artistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 10,
  },
  artistAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistAvatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInfo: {
    flex: 1,
  },
  artistLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  artistStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistStatsText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  genreTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  genreTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreTagText: {
    fontSize: 12,
    color: '#93C5FD',
  },
  scoreBreakdown: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  scoreCards: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scoreCard: {
    alignItems: 'center',
  },
  scoreCardLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 12,
  },
  circularProgress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressBg: {
    position: 'absolute',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  circularProgressInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  venueResults: {
    marginTop: 16,
  },
  venueResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  liveDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDataText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#22C55E',
    marginLeft: 4,
  },
  venueCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  venueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  venueCardMain: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  venueAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  venueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  venueCapacity: {
    fontSize: 12,
    color: '#6B7280',
  },
  venueCardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  templateSection: {
    marginBottom: 24,
  },
  templateScroll: {
    marginLeft: -4,
  },
  templateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 16,
    marginRight: 10,
    width: 140,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  templateCardActive: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  templateNameActive: {
    color: '#8B5CF6',
  },
  templateCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  emailForm: {
    marginBottom: 24,
  },
  generatedEmailSection: {
    marginTop: 8,
  },
  generatedEmailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emailActionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    maxHeight: 300,
  },
  emailPreviewText: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 22,
  },
  sendEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendEmailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Artist Cards Row
  artistCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  artistCardHalf: {
    flex: 1,
    padding: 12,
  },
  artistCardSecondary: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  artistAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  youtubeStats: {
    marginTop: 12,
    alignItems: 'center',
  },
  youtubeNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  youtubeLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  // Venue Favorites
  venueNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  // Venue Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  venueModal: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  venueModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  venueModalName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  venueModalAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  venueModalAddressText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
    flex: 1,
  },
  venueModalRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueModalRatingText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 8,
  },
  mapDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 12,
  },
  mapDirectionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
    marginLeft: 6,
  },
  venueModalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  venueStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  venueStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  venueStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  difficultyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  venueModalSection: {
    marginBottom: 20,
  },
  venueModalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  venueModalDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    width: 'auto',
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  venueModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  generatePitchButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  generatePitchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  generatePitchText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  closeModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  // AI Consent Modal Styles
  consentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  consentModal: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  consentModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  consentIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  consentModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  consentContent: {
    maxHeight: 300,
    marginBottom: 20,
  },
  consentText: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 22,
    marginBottom: 20,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  consentItemText: {
    flex: 1,
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  consentItemBold: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  consentFooterText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  consentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  consentDeclineButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentDeclineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  consentAcceptButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  consentAcceptGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentAcceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
