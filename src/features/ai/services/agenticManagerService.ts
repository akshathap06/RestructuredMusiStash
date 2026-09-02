import { supabase } from '../../../lib/supabase';

// API Configuration - Use the same backend as the web app
const BACKEND_URL = 'https://musistash-platform-production-3168.up.railway.app';

// Audio Analysis Types
export interface PyAudioAnalysisFeatures {
  pyaudio_rhythm_clarity?: number;
  pyaudio_bpm?: number;
  pyaudio_beats_confidence?: number;
  pyaudio_dissonance?: number;
  pyaudio_key?: string;
  pyaudio_scale?: string;
  pyaudio_spectral_centroid?: number;
  pyaudio_spectral_rolloff?: number;
  pyaudio_spectral_flux?: number;
  pyaudio_spectral_contrast?: number;
  pyaudio_key_confidence?: number;
  pyaudio_mfcc_features?: number[];
  pyaudio_chroma_vector?: number[];
  duration?: number;
  energy?: number;
  loudness?: number;
  valence?: number;
  arousal?: number;
  commercial_score?: number;
  emotional_category?: string;
  predicted_genre?: string;
  target_audience?: {
    primary: string;
    secondary: string;
  };
  production_quality?: {
    overall_quality: string;
    dynamic_range_score: number;
    loudness_optimization: number;
    mastering_quality: string;
  };
  market_readiness?: string;
}

// Venue Types
export interface Venue {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  total_ratings: number;
  types: string[];
  location: string;
  estimated_capacity: string;
  booking_difficulty: 'easy' | 'medium' | 'hard';
  genre_suitability?: number;
  booking_approach?: string;
  description?: string;
  booking_requirements?: string[];
  amenities?: string[];
}

// Financial Types
export interface BudgetItem {
  id: number;
  name: string;
  amount: number;
  type: 'production' | 'promotion' | 'touring' | 'misc';
}

export interface RevenueEstimates {
  projectedStreams: number;
  merchProfitMargin: number;
  ticketPrice: number;
  venueCapacity: number;
  investmentPayoutPercent: number;
}

export interface RoiData {
  totalCost: number;
  expectedRevenue: number;
  equityPercent: number;
}

export interface FinancialGoal {
  id: number;
  description: string;
  targetAmount: number;
  deadline: string;
  progress: number;
  createdAt: string;
}

export interface FinancialHealth {
  projectFundingProgress: number;
  remainingBudget: number;
  lastMonthEarnings: number;
  upcomingPayouts: number;
}

// Email Types
export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface EmailData {
  recipientName: string;
  recipientEmail: string;
  venueName: string;
  venueLocation: string;
  proposedDate: string;
  customMessage: string;
}

class AgenticManagerService {
  // Venue Discovery
  async discoverVenues(params: {
    location: string;
    venueTypes?: string;
    artistGenre?: string;
    capacityRange?: string;
  }): Promise<Venue[]> {
    try {
      const formData = new FormData();
      formData.append('location', params.location);
      if (params.venueTypes) formData.append('venue_types', params.venueTypes);
      if (params.artistGenre) formData.append('artist_genre', params.artistGenre);
      if (params.capacityRange) formData.append('capacity_range', params.capacityRange);

      const response = await fetch(`${BACKEND_URL}/api/agent/discover-venues`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.venues || [];
    } catch (error) {
      console.error('Error discovering venues:', error);
      return [];
    }
  }

  // Favorite Venues
  async getFavoriteVenues(userId: string): Promise<Venue[]> {
    try {
      const { data, error } = await supabase
        .from('favorite_venues')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(venue => ({
        id: venue.venue_id,
        name: venue.venue_name,
        address: venue.venue_address || '',
        phone: venue.venue_phone || '',
        website: venue.venue_website || '',
        rating: venue.venue_rating || 0,
        total_ratings: venue.venue_total_ratings || 0,
        types: venue.venue_types || [],
        location: venue.venue_location || '',
        estimated_capacity: venue.venue_estimated_capacity || '',
        booking_difficulty: venue.venue_booking_difficulty || 'medium',
        genre_suitability: venue.venue_genre_suitability,
        booking_approach: venue.venue_booking_approach,
        description: venue.venue_description,
        booking_requirements: venue.venue_booking_requirements,
        amenities: venue.venue_amenities,
      })) || [];
    } catch (error) {
      console.error('Error fetching favorite venues:', error);
      return [];
    }
  }

  async toggleFavoriteVenue(userId: string, venue: Venue): Promise<boolean> {
    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from('favorite_venues')
        .select('id')
        .eq('user_id', userId)
        .eq('venue_id', venue.id)
        .single();

      if (existing) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorite_venues')
          .delete()
          .eq('user_id', userId)
          .eq('venue_id', venue.id);
        
        if (error) throw error;
        return false;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorite_venues')
          .insert({
            user_id: userId,
            venue_id: venue.id,
            venue_name: venue.name,
            venue_address: venue.address,
            venue_phone: venue.phone,
            venue_website: venue.website,
            venue_rating: venue.rating,
            venue_total_ratings: venue.total_ratings,
            venue_types: venue.types,
            venue_location: venue.location,
            venue_estimated_capacity: venue.estimated_capacity,
            venue_booking_difficulty: venue.booking_difficulty,
            venue_genre_suitability: venue.genre_suitability,
            venue_booking_approach: venue.booking_approach,
            venue_description: venue.description,
            venue_booking_requirements: venue.booking_requirements,
            venue_amenities: venue.amenities,
          });
        
        if (error) throw error;
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite venue:', error);
      return false;
    }
  }

  // Email Templates
  getEmailTemplates(): EmailTemplate[] {
    return [
      {
        id: 'venue-booking',
        name: 'Venue Booking Request',
        category: 'Venues',
        subject: 'Booking Inquiry for [Venue Name]',
        body: `Dear [Recipient Name],

I hope this email finds you well. My name is [Artist Name], and I'm reaching out regarding a potential booking opportunity at [Venue Name].

I'm a [Genre] artist based in [Location], and I believe my music would be a great fit for your venue. I have experience performing at similar venues and have built a strong local following.

I'm interested in booking a show on [Proposed Date] and would love to discuss the possibility of performing at [Venue Name]. I'm flexible with dates and can work around your schedule.

Here's a bit about my music:
- Genre: [Genre]
- Performance style: [Performance Style]
- Typical audience size: [Audience Size]
- Previous venues: [Previous Venues]

I've attached my press kit and links to my music for your review. You can also check out my social media presence at [Social Media Links].

[Custom Message]

I would appreciate the opportunity to discuss this further. Please let me know if you need any additional information or if you'd like to schedule a call.

Thank you for your time and consideration.

Best regards,
[Artist Name]
[Contact Information]`,
        variables: ['Recipient Name', 'Venue Name', 'Proposed Date', 'Custom Message']
      },
      {
        id: 'promoter-outreach',
        name: 'Promoter Outreach',
        category: 'Promoters',
        subject: 'Collaboration Opportunity - [Artist Name]',
        body: `Hi [Recipient Name],

I hope you're doing well! I'm [Artist Name], a [Genre] artist, and I'm reaching out because I believe there's potential for a great collaboration.

I've been following your work in the [City/Region] music scene and really admire what you've been building. Your events and the artists you work with align perfectly with my musical direction.

Here's what I bring to the table:
- Unique [Genre] sound that stands out in the current scene
- Strong social media presence with [Follower Count] engaged followers
- Experience performing at venues like [Previous Venues]
- Professional press kit and promotional materials
- Flexible availability for shows and events

[Custom Message]

I'd love to discuss potential opportunities to work together. Whether it's a one-off show, festival appearance, or ongoing partnership, I'm open to exploring all possibilities.

You can check out my music at [Music Links] and my social media at [Social Media Links].

Would you be interested in scheduling a call to discuss this further?

Best regards,
[Artist Name]
[Contact Information]`,
        variables: ['Recipient Name', 'Custom Message']
      },
      {
        id: 'festival-application',
        name: 'Festival Application',
        category: 'Festivals',
        subject: 'Festival Application - [Artist Name]',
        body: `Dear [Recipient Name],

I hope this email finds you well. I'm [Artist Name], a [Genre] artist, and I'm excited to submit my application for [Festival Name].

I believe my music would be a perfect addition to your festival lineup. My unique blend of [Genre Description] has been resonating with audiences across [Regions], and I've been building momentum with each performance.

Here's what makes my performance special:
- Distinctive sound that combines [Musical Elements]
- High-energy live shows that engage audiences
- Professional stage presence and technical requirements
- Strong social media following and fan engagement
- Experience performing at festivals and large venues

[Custom Message]

I've attached my press kit, which includes:
- High-quality photos and bio
- Links to recent performances
- Technical rider
- Social media metrics
- Press coverage and reviews

You can also check out my latest music at [Music Links] and my live performance videos at [Video Links].

I'm available for the festival dates and can be flexible with scheduling. I'm also open to performing at multiple stages or events throughout the festival.

Thank you for considering my application. I look forward to the possibility of being part of [Festival Name].

Best regards,
[Artist Name]
[Contact Information]`,
        variables: ['Recipient Name', 'Festival Name', 'Custom Message']
      },
      {
        id: 'press-outreach',
        name: 'Press & Media Outreach',
        category: 'Media',
        subject: 'Press Release: [Artist Name] - [New Release/Event]',
        body: `Dear [Recipient Name],

I hope this email finds you well. I'm reaching out to share some exciting news about my latest [Release/Event] that I believe would be of interest to your readers.

I'm [Artist Name], a [Genre] artist who has been making waves in the [Scene/Region] music community. My latest [Album/Single/Event] "[Title]" represents a significant evolution in my sound and has been receiving strong early feedback.

Key highlights:
- [Release/Event] Title: "[Title]"
- Release Date: [Date]
- Genre: [Genre]
- Notable collaborations: [Collaborations]
- Unique selling points: [Unique Points]

[Custom Message]

The [Release/Event] has already garnered attention from [Previous Press Coverage] and is available for streaming on [Platforms].

I would love to arrange an interview, provide exclusive content, or discuss potential coverage opportunities. I'm available for phone interviews, in-person meetings, or can provide additional materials as needed.

You can preview the [Release/Event] at [Preview Link] and find my full press kit at [Press Kit Link].

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
[Artist Name]
[Contact Information]`,
        variables: ['Recipient Name', 'Custom Message']
      }
    ];
  }

  generateEmail(templateId: string, emailData: EmailData, artistProfile?: any): string {
    const template = this.getEmailTemplates().find(t => t.id === templateId);
    if (!template) return '';

    let emailBody = template.body;
    
    // Replace variables with actual data
    emailBody = emailBody.replace(/\[Recipient Name\]/g, emailData.recipientName || '[Recipient Name]');
    emailBody = emailBody.replace(/\[Venue Name\]/g, emailData.venueName || '[Venue Name]');
    emailBody = emailBody.replace(/\[Proposed Date\]/g, emailData.proposedDate || '[Proposed Date]');
    emailBody = emailBody.replace(/\[Custom Message\]/g, emailData.customMessage || '');
    
    // Add artist profile data if available
    if (artistProfile) {
      emailBody = emailBody.replace(/\[Artist Name\]/g, artistProfile.name || '[Artist Name]');
      emailBody = emailBody.replace(/\[Location\]/g, artistProfile.location || '[Location]');
      emailBody = emailBody.replace(/\[Genre\]/g, artistProfile.genre || '[Genre]');
    }

    return emailBody;
  }

  // Financial Management
  async getFinancialProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('financial_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching financial profile:', error);
      return null;
    }
  }

  async saveFinancialProfile(userId: string, data: any): Promise<boolean> {
    try {
      const existingProfile = await this.getFinancialProfile(userId);
      
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('financial_profiles')
          .update({
            budget_items: data.budgetItems,
            revenue_estimates: data.revenueEstimates,
            roi_data: data.roiData,
            financial_goals: data.financialGoals,
            financial_health: data.financialHealth,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        if (error) throw error;
        return true;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('financial_profiles')
          .insert({
            user_id: userId,
            budget_items: data.budgetItems,
            revenue_estimates: data.revenueEstimates,
            roi_data: data.roiData,
            financial_goals: data.financialGoals,
            financial_health: data.financialHealth
          });
        
        if (error) throw error;
        return true;
      }
    } catch (error) {
      console.error('Error saving financial profile:', error);
      return false;
    }
  }

  // Audio Analysis
  async uploadTrackForAnalysis(file: any, userId: string): Promise<PyAudioAnalysisFeatures | null> {
    try {
      console.log('Starting audio analysis for file:', file.name);
      
      const formData = new FormData();
      formData.append('audio', {
        uri: file.uri,
        type: 'audio/mpeg',
        name: file.name || 'track.mp3',
      } as any);
      formData.append('user_id', userId);

      console.log('Uploading to backend for analysis...');
      
      const response = await fetch(`${BACKEND_URL}/api/analyze-audio`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Audio analysis completed:', result);
      
      return result.features || result;
    } catch (error) {
      console.error('Error in audio analysis:', error);
      return null;
    }
  }

  // Fan Analytics (Mock data for now)
  async getFanAnalytics(userId: string): Promise<any> {
    // This would typically fetch from analytics APIs
    return {
      totalFollowers: 1250,
      monthlyGrowth: 15.2,
      topCountries: ['United States', 'Canada', 'United Kingdom'],
      ageGroups: {
        '18-24': 35,
        '25-34': 40,
        '35-44': 20,
        '45+': 5
      },
      engagementRate: 4.8,
      topSongs: [
        { name: 'Track 1', plays: 12500 },
        { name: 'Track 2', plays: 8900 },
        { name: 'Track 3', plays: 6700 }
      ]
    };
  }

  // Campaign Manager (Mock data for now)
  async getCampaignData(userId: string): Promise<any> {
    return {
      activeCampaigns: 2,
      totalRaised: 15000,
      goalAmount: 25000,
      backers: 45,
      daysLeft: 23,
      campaigns: [
        {
          id: 1,
          name: 'Album Production',
          goal: 15000,
          raised: 12000,
          backers: 28,
          daysLeft: 15
        },
        {
          id: 2,
          name: 'Tour Funding',
          goal: 10000,
          raised: 3000,
          backers: 17,
          daysLeft: 23
        }
      ]
    };
  }
}

export const agenticManagerService = new AgenticManagerService();
