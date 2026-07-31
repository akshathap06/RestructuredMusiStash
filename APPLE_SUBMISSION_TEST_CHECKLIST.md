# MusiStash App - Apple App Store Submission Test Checklist

## 📱 App Overview

MusiStash is a music industry platform connecting artists, fans, and service providers. Users can create profiles, browse artists for investment, hire service providers, create posts, and manage projects.

---

## 1️⃣ AUTHENTICATION & ONBOARDING

### 1.1 Intro Screen

- [ ] App launches to Intro screen with rotating animated words ("Creation", "Connection", "Investment", "Freedom", "Growth", "Opportunities")
- [ ] Tap "Get Started" button → navigates to Registration
- [ ] Tap "Sign In" button → navigates to Login
- [ ] Tap "Continue with Google" → opens Google OAuth flow
- [ ] Google sign-in completes successfully and navigates to main app
- [ ] Loading spinner shows during authentication

### 1.2 Registration Flow

- [ ] Tap "Get Started" from Intro screen
- [ ] Enter email address in email field
- [ ] Email validation (invalid email shows error)
- [ ] Tap "Continue" button → sends verification code to email
- [ ] Loading state shows while sending code
- [ ] Terms of Service link is tappable → opens Terms of Service screen
- [ ] Privacy Policy link is tappable → opens Privacy Policy screen
- [ ] "Already have an account?" link navigates to Login

### 1.3 Email Verification Screen

- [ ] 4-digit OTP input fields display correctly
- [ ] Enter correct 4-digit code → auto-verifies
- [ ] Invalid code shows error alert
- [ ] "Resend Code" button works (with countdown timer)
- [ ] Countdown timer (60 seconds) prevents rapid resends
- [ ] Back button returns to Registration screen
- [ ] After verification → navigates to Complete Registration

### 1.4 Complete Registration Screen

- [ ] Email field is pre-filled (read-only)
- [ ] Enter full name field
- [ ] Enter phone number field
- [ ] Enter password field (with show/hide toggle)
- [ ] Enter confirm password field (with show/hide toggle)
- [ ] Password validation:
  - [ ] Minimum 8 characters
  - [ ] At least one uppercase letter
  - [ ] At least one lowercase letter
  - [ ] At least one number
- [ ] Password mismatch shows error
- [ ] Tap "Create Account" → creates account
- [ ] Success → navigates to main app
- [ ] Back button returns to previous screen

### 1.5 Login Screen

- [ ] MusiStash logo displays
- [ ] Enter email field
- [ ] Enter password field (with show/hide toggle)
- [ ] Tap "Sign In" button → authenticates
- [ ] Invalid credentials show error alert
- [ ] "Forgot Password?" link works → shows confirmation dialog
- [ ] "Don't have an account?" link → navigates to Registration
- [ ] Loading state shows during authentication
- [ ] Successful login → navigates to main app

### 1.6 Password Reset Flow

- [ ] Tap "Forgot Password?" on Login screen
- [ ] Confirmation dialog appears asking to send reset email
- [ ] Tap "Send" → sends password reset email
- [ ] Navigates to "Check Your Email" screen
- [ ] Reset email contains valid link
- [ ] Deep link opens app to Reset Password screen
- [ ] Enter new password field
- [ ] Enter confirm password field
- [ ] Password validation requirements
- [ ] Tap "Reset Password" → updates password
- [ ] Success → navigates to Login screen

### 1.7 Terms of Service Screen

- [ ] Scrollable terms content displays
- [ ] Back button returns to previous screen

### 1.8 Privacy Policy Screen

- [ ] Scrollable privacy policy content displays
- [ ] Back button returns to previous screen

---

## 2️⃣ MAIN NAVIGATION

### 2.1 Bottom Tab Navigation

- [ ] 4 tabs display: Profile, Investment, Create, Posts
- [ ] Tapping Profile tab → shows Profile screen
- [ ] Tapping Investment tab → shows Browse Artists screen
- [ ] Tapping Create tab → shows Create Hub screen
- [ ] Tapping Posts tab → shows Posts/Feed screen
- [ ] Active tab is highlighted
- [ ] Tab icons change between filled/outline based on active state

### 2.2 Sidebar Menu (Hamburger Menu)

- [ ] Tap hamburger icon (☰) → sidebar slides in from left
- [ ] User avatar and name display in header
- [ ] User email displays below name
- [ ] Close button (X) closes sidebar
- [ ] Tapping backdrop closes sidebar

#### Sidebar Menu Items:

- [ ] "Agentic Manager" → navigates to Agentic Manager screen
- [ ] "Profile" → navigates to Profile tab
- [ ] "Create Post" → navigates to Create tab
- [ ] "My Requests" → navigates to Project Requests screen
- [ ] "My Orders" → navigates to My Orders screen

#### Sidebar "Become" Section:

- [ ] "Become an Artist" → navigates to Create Artist screen
- [ ] "Become Service Provider" → navigates to Create Service Provider screen

#### Sidebar "Browse" Section:

- [ ] "Browse Artists" → navigates to Browse Artists screen

#### Sidebar Bottom Section:

- [ ] "Notifications" → navigates to Notifications screen
- [ ] Notification badge shows unread count
- [ ] "Settings" → navigates to Profile/Settings
- [ ] "Log Out" → logs out user and returns to Intro screen

### 2.3 Universal Header

- [ ] "MusiStash" title displays centered
- [ ] Hamburger menu icon on left
- [ ] Header appears on all main tabs

---

## 3️⃣ PROFILE SCREEN

### 3.1 Profile Display

- [ ] Profile picture displays (or placeholder icon)
- [ ] User name displays
- [ ] User email displays
- [ ] Followers count displays
- [ ] Following count displays
- [ ] Posts count displays
- [ ] Pull-to-refresh works

### 3.2 Profile Type Switching

- [ ] If user has multiple profile types, switcher is visible
- [ ] "User" profile type option
- [ ] "Artist" profile type option (if approved)
- [ ] "Service Provider" profile type option (if created)
- [ ] Switching changes displayed profile data

### 3.3 Quick Actions (User Profile)

- [ ] "Notifications" button → shows notification count badge
- [ ] Tap Notifications → navigates to Notifications screen
- [ ] "Orders" button → navigates to My Orders screen

### 3.4 Quick Actions (Artist Profile)

- [ ] "Notifications" button with badge
- [ ] "Activity" button → navigates to recent activity

### 3.5 Quick Actions (Service Provider Profile)

- [ ] "Manage Services" button → navigates to Manage Services
- [ ] "View Portfolio" button → navigates to Manage Portfolio
- [ ] "Stripe Setup" / "Earnings" button
  - [ ] If not verified → shows Stripe onboarding prompt
  - [ ] If verified → navigates to Earnings screen

### 3.6 Notifications Section (Preview)

- [ ] Shows recent notifications preview
- [ ] "See all" link → navigates to full Notifications screen
- [ ] Individual notification items are tappable

### 3.7 Recent Activity Section

- [ ] Shows recent user activity
- [ ] "See all" link expands activity list

### 3.8 User Posts Grid

- [ ] Grid of user's posts displays
- [ ] Tapping a post → navigates to Post Detail screen
- [ ] Empty state shows if no posts

### 3.9 Edit Profile Picture

- [ ] Tap on profile picture → opens image picker
- [ ] Select image from camera roll
- [ ] Image uploads and updates profile

---

## 4️⃣ INVESTMENT TAB (BROWSE ARTISTS)

### 4.1 Browse Artists Screen

- [ ] Search bar displays at top
- [ ] Enter search query → filters artists by name/bio
- [ ] Search results update in real-time (debounced)
- [ ] Clear search button (X) clears search

### 4.2 Artist Cards Grid

- [ ] Artists display in 2-column grid
- [ ] Each card shows:
  - [ ] Artist profile photo (or colored initials placeholder)
  - [ ] Artist name
  - [ ] Genre tags (up to 2)
  - [ ] Verified badge (blue checkmark) if verified
- [ ] Cards are tappable

### 4.3 Infinite Scroll/Pagination

- [ ] Initial load shows first 20 artists
- [ ] Scroll to bottom → loads more artists
- [ ] Loading indicator shows while fetching more
- [ ] "No more artists" message when all loaded

### 4.4 Pull to Refresh

- [ ] Pull down → refreshes artist list
- [ ] Loading indicator shows during refresh

### 4.5 Artist Profile View (Tap on Card)

- [ ] Navigates to Artist Profile View screen
- [ ] Back button returns to browse screen

---

## 5️⃣ ARTIST PROFILE VIEW SCREEN

### 5.1 Artist Header

- [ ] Banner image displays (or gradient placeholder)
- [ ] Profile photo displays (large)
- [ ] Artist name displays
- [ ] Verified badge if verified
- [ ] Location displays (if set)
- [ ] Genre tags display

### 5.2 Artist Stats

- [ ] Monthly Listeners count
- [ ] Total Streams count
- [ ] Followers count
- [ ] Following count
- [ ] Posts count

### 5.3 Bio Section

- [ ] Artist bio text displays
- [ ] "Read more" expands long bios

### 5.4 Social Links

- [ ] Spotify link (if set) → opens Spotify
- [ ] Instagram link (if set) → opens Instagram
- [ ] Twitter link (if set) → opens Twitter
- [ ] YouTube link (if set) → opens YouTube
- [ ] Website link (if set) → opens browser

### 5.5 Investment Interest Button

- [ ] "I'm Interested in Investing" button displays
- [ ] Tap → shows confirmation
- [ ] Success message shows after registering interest
- [ ] Button changes to "Interest Registered" after tap
- [ ] Cannot register interest twice

### 5.6 Follow/Unfollow

- [ ] "Follow" button shows if not following
- [ ] Tap "Follow" → follows artist
- [ ] Button changes to "Following" after follow
- [ ] Tap "Following" → unfollows artist

### 5.7 Artist Posts

- [ ] Grid of artist's posts displays
- [ ] Tap post → navigates to Post Detail

### 5.8 Message Artist

- [ ] "Message" button → opens new message/chat

---

## 6️⃣ CREATE HUB SCREEN

### 6.1 Create Options

- [ ] "Create a Post" card displays
- [ ] "Create Service Listing" card displays
- [ ] "Create Artist Profile" card displays (if no artist profile)
- [ ] "Create Service Provider" card displays (if no provider profile)

### 6.2 Create Post Flow

- [ ] Tap "Create a Post" → navigates to Create Post screen
- [ ] Back button returns to Create Hub

### 6.3 Create Service Listing

- [ ] Tap "Create Service Listing"
- [ ] If no service provider profile → shows prompt to create one first
- [ ] If has provider profile → navigates to Create Post in service listing mode

### 6.4 Create Artist Profile

- [ ] Tap "Create Artist Profile" → navigates to Create Artist screen
- [ ] If already has artist profile → shows existing profile or edit option

### 6.5 Create Service Provider

- [ ] Tap "Create Service Provider" → navigates to Create Service Provider screen
- [ ] If already has provider profile → shows existing profile or edit option

---

## 7️⃣ CREATE POST SCREEN

### 7.1 Post Type Selection

- [ ] Regular post mode (default)
- [ ] Service listing mode (if navigated with param)
- [ ] Portfolio mode (for video portfolio posts)

### 7.2 Regular Post Creation

- [ ] Content text input field
- [ ] Character count/limit display
- [ ] "Add Media" button

### 7.3 Media Selection

- [ ] Tap "Add Media" → shows media picker options
- [ ] Select image(s) from gallery
- [ ] Select video from gallery
- [ ] Select audio file
- [ ] Selected media previews display
- [ ] Remove media button (X) on each item
- [ ] Multiple media items supported

### 7.4 Audio Media

- [ ] Audio file displays with file name
- [ ] Audio duration shows if available
- [ ] Audio icon indicator

### 7.5 Video Media

- [ ] Video thumbnail preview displays
- [ ] Video duration indicator
- [ ] Play icon overlay

### 7.6 Image Media

- [ ] Image thumbnail preview displays
- [ ] Multiple images show in grid

### 7.7 Hashtags

- [ ] Hashtag input field
- [ ] Add hashtag button
- [ ] Hashtags display as chips/tags
- [ ] Remove hashtag button on each tag

### 7.8 Music Metadata (Optional)

- [ ] Music title field
- [ ] Artist name field
- [ ] Album name field

### 7.9 Service Listing Mode

- [ ] Service title field
- [ ] Service description field
- [ ] Pricing type selector:
  - [ ] Flat rate
  - [ ] Hourly rate
  - [ ] Price range
  - [ ] Custom
- [ ] Price value input(s) based on type
- [ ] Delivery days input

### 7.10 Post Submission

- [ ] "Post" button enabled when content valid
- [ ] Loading state during upload
- [ ] Upload progress indicator for media
- [ ] Success → navigates back
- [ ] Error → shows error alert

### 7.11 Edit Mode

- [ ] Existing post data pre-fills fields
- [ ] "Update" button instead of "Post"
- [ ] Update successful → navigates back

---

## 8️⃣ POSTS/FEED SCREEN

### 8.1 Feed Tabs

- [ ] "Posts" tab shows user posts
- [ ] "Services" tab shows service provider posts
- [ ] Tab switching works correctly

### 8.2 Posts Feed

- [ ] Posts display in scrollable list
- [ ] Each post shows:
  - [ ] User profile picture
  - [ ] User name
  - [ ] Post timestamp
  - [ ] Post content/description
  - [ ] Media content (images/video/audio)
  - [ ] Like count
  - [ ] Comment count
  - [ ] Share button

### 8.3 Post Interactions

- [ ] Tap heart icon → likes/unlikes post
- [ ] Like count updates immediately
- [ ] Tap comment icon → opens comment modal
- [ ] Tap share icon → opens share sheet

### 8.4 Image Posts

- [ ] Images display correctly
- [ ] Multiple images → swipeable carousel
- [ ] Tap image → fullscreen view

### 8.5 Video Posts

- [ ] Video player displays
- [ ] Play/pause controls
- [ ] Autoplay when visible
- [ ] Pause when scrolled away
- [ ] Full screen button

### 8.6 Audio Posts

- [ ] Audio player with animated visualizer
- [ ] Play/pause button
- [ ] Progress bar
- [ ] Seek functionality (drag to position)
- [ ] Current time / duration display

### 8.7 Services Feed

- [ ] Service listings display as cards
- [ ] Service provider name
- [ ] Service title
- [ ] Price display
- [ ] Rating/reviews if available
- [ ] Tap → navigates to Service Provider Detail

### 8.8 Pull to Refresh

- [ ] Pull down → refreshes feed
- [ ] Loading indicator shows

### 8.9 Navigate to Post Detail

- [ ] Tap on post → navigates to Post Detail screen

---

## 9️⃣ POST DETAIL SCREEN

### 9.1 Post Content

- [ ] Full post content displays
- [ ] Media displays (image/video/audio)
- [ ] User info (name, avatar)
- [ ] Timestamp
- [ ] Hashtags display

### 9.2 Interactions

- [ ] Like button works
- [ ] Like count displays
- [ ] Comment button → scrolls to comments or opens modal
- [ ] Share button → share sheet

### 9.3 Comments Section

- [ ] Comments list displays
- [ ] Each comment shows:
  - [ ] Commenter avatar
  - [ ] Commenter name
  - [ ] Comment text
  - [ ] Comment timestamp
- [ ] Add comment input field
- [ ] Send button posts comment
- [ ] New comment appears in list

### 9.4 Back Navigation

- [ ] Back button returns to previous screen

---

## 🔟 COMMENT MODAL

### 10.1 Modal Display

- [ ] Modal slides up from bottom
- [ ] Background dims
- [ ] Swipe down or tap backdrop closes modal

### 10.2 Comments List

- [ ] Existing comments display
- [ ] Empty state if no comments
- [ ] Scrollable if many comments

### 10.3 Add Comment

- [ ] Comment input field at bottom
- [ ] Send button
- [ ] Keyboard avoidance works correctly
- [ ] Comment posts successfully
- [ ] Comment count updates

---

## 1️⃣1️⃣ CREATE ARTIST PROFILE SCREEN

### 11.1 Check Existing Profile

- [ ] If artist profile exists → shows existing profile with edit option
- [ ] If no profile → shows creation form

### 11.2 Basic Information

- [ ] Artist/Stage name field (required)
- [ ] Bio field (text area)
- [ ] Biography field (longer text area)
- [ ] Location field

### 11.3 Genre Selection

- [ ] Genre selector opens modal
- [ ] Searchable genre list (100+ genres)
- [ ] Multi-select supported
- [ ] Selected genres display as chips
- [ ] Remove genre by tapping X

### 11.4 Profile Images

- [ ] Add profile image button
- [ ] Image picker opens
- [ ] Selected image preview displays
- [ ] Add banner image button
- [ ] Banner image preview displays

### 11.5 Band Information (Optional)

- [ ] "This is a band" toggle
- [ ] Band members list (if band)
- [ ] Band type selector modal
- [ ] Primary artist name field

### 11.6 Social Links

- [ ] Spotify profile URL field
- [ ] Instagram handle field
- [ ] Twitter handle field
- [ ] YouTube channel field
- [ ] Website URL field

### 11.7 Stats (Manual Entry)

- [ ] Monthly listeners field
- [ ] Total streams field

### 11.8 Color Scheme (Optional)

- [ ] Gradient start color
- [ ] Gradient middle color
- [ ] Gradient end color
- [ ] Accent color
- [ ] Text color

### 11.9 Form Submission

- [ ] Validation errors display for required fields
- [ ] "Create Profile" / "Save" button
- [ ] Loading state during submission
- [ ] Success → navigates back or to profile
- [ ] Error → shows error alert
- [ ] Profile status: "pending" (awaiting approval)

---

## 1️⃣2️⃣ CREATE SERVICE PROVIDER SCREEN

### 12.1 Check Existing Profile

- [ ] If provider profile exists → shows view mode
- [ ] "Edit Profile" button switches to edit mode
- [ ] If no profile → shows multi-step creation form

### 12.2 Step Indicator

- [ ] Progress bar shows current step
- [ ] Step number displays (e.g., "Step 1 of 6")

### 12.3 Step 1: Basic Information

- [ ] Business name field (required)
- [ ] Provider type dropdown/selector
- [ ] Tagline field
- [ ] Bio field (text area)
- [ ] "Next" button to proceed

### 12.4 Step 2: Contact & Location

- [ ] Contact email field
- [ ] Phone number field
- [ ] Website URL field
- [ ] Location field
- [ ] "Accepts Remote Work" toggle
- [ ] "Available for Hire" toggle

### 12.5 Step 3: Skills & Expertise

- [ ] Years of experience field
- [ ] Specializations multi-select modal
- [ ] Genres multi-select modal
- [ ] Skills multi-select modal (DAWs, plugins, etc.)

### 12.6 Step 4: Pricing

- [ ] Base price field
- [ ] Price per hour field
- [ ] Minimum project budget field
- [ ] Maximum project budget field
- [ ] Turnaround time field

### 12.7 Step 5: Portfolio

- [ ] Profile image picker
- [ ] Banner image picker
- [ ] Portfolio description field
- [ ] Add portfolio media button
- [ ] Media items display as list
- [ ] Remove media button

### 12.8 Step 6: Social Links

- [ ] Instagram handle field
- [ ] Twitter handle field
- [ ] YouTube channel field
- [ ] SoundCloud profile field
- [ ] Spotify profile field

### 12.9 Services List

- [ ] Add service button
- [ ] Service name field
- [ ] Service description field
- [ ] Service price field
- [ ] Price type (fixed/hourly/per project)
- [ ] Duration field
- [ ] Remove service button

### 12.10 Form Submission

- [ ] "Create Profile" / "Save Changes" button
- [ ] Loading state during submission
- [ ] Image upload progress
- [ ] Success → navigates back or to profile
- [ ] Error → shows error alert

### 12.11 Stripe Connect (After Creation)

- [ ] Stripe setup prompt displays
- [ ] "Set Up Payments" button → opens Stripe Connect
- [ ] External Stripe onboarding flow
- [ ] Return to app after Stripe setup
- [ ] Verification status updates

---

## 1️⃣3️⃣ SERVICE PROVIDERS BROWSING

### 13.1 Service Provider Cards

- [ ] Provider cards display in list/grid
- [ ] Each card shows:
  - [ ] Profile photo
  - [ ] Business name
  - [ ] Tagline
  - [ ] Specializations
  - [ ] Price range
  - [ ] Rating/reviews count
  - [ ] Location

### 13.2 Service Provider Detail Screen

- [ ] Banner image displays
- [ ] Profile photo displays
- [ ] Business name
- [ ] Tagline
- [ ] Bio/About section
- [ ] Location
- [ ] Social links

### 13.3 Detail Screen Tabs

- [ ] "Services" tab shows available services
- [ ] "Info" tab shows business information
- [ ] "Reviews" tab shows reviews

### 13.4 Services Tab

- [ ] List of services displays
- [ ] Each service shows:
  - [ ] Service name
  - [ ] Description
  - [ ] Price
  - [ ] Delivery time
- [ ] "Request Service" / "Contact" button on each

### 13.5 Request Service Flow

- [ ] Tap "Request Service" → navigates to Contact Service Provider screen
- [ ] Service info pre-fills in request form

### 13.6 Reviews Tab

- [ ] Reviews list displays
- [ ] Each review shows:
  - [ ] Reviewer name/avatar
  - [ ] Star rating
  - [ ] Review text
  - [ ] Review date
- [ ] "Write Review" button (if eligible)

### 13.7 Write Review Modal

- [ ] Star rating selector (1-5)
- [ ] Review text input
- [ ] Submit button
- [ ] Success → review appears in list

### 13.8 Portfolio Tab/Section

- [ ] Portfolio items display
- [ ] Audio items with player
- [ ] Video items with player
- [ ] Image items in gallery

---

## 1️⃣4️⃣ CONTACT SERVICE PROVIDER SCREEN

### 14.1 Service Info Display

- [ ] Selected service name displays
- [ ] Service description displays
- [ ] Provider business name displays
- [ ] Listed price displays

### 14.2 Price Options

- [ ] "Accept Listed Price" radio option
- [ ] "Make an Offer" radio option
- [ ] Custom price input field (if offer selected)

### 14.3 Request Details

- [ ] Additional requirements text area
- [ ] "Urgent Delivery" toggle
- [ ] Revision rounds input

### 14.4 Submit Request

- [ ] "Send Request" button
- [ ] Loading state during submission
- [ ] Success → shows confirmation
- [ ] Navigates to Project Requests screen
- [ ] Error → shows error alert

---

## 1️⃣5️⃣ PROJECT REQUESTS SCREEN

### 15.1 Requests List

- [ ] All project requests display
- [ ] Each request shows:
  - [ ] Service type
  - [ ] Provider/Client name
  - [ ] Status badge (pending, responded, accepted, etc.)
  - [ ] Date
  - [ ] Budget/Price

### 15.2 Request Status Colors

- [ ] Pending - yellow/orange
- [ ] Responded - blue
- [ ] Accepted - green
- [ ] Rejected - red
- [ ] Completed - gray/green

### 15.3 Navigate to Details

- [ ] Tap request → navigates to Project Request Details screen

### 15.4 Pull to Refresh

- [ ] Pull down → refreshes requests list

---

## 1️⃣6️⃣ PROJECT REQUEST DETAILS SCREEN

### 16.1 Request Header

- [ ] Service type displays
- [ ] Status badge displays
- [ ] Provider/Client info displays

### 16.2 Request Details

- [ ] Project description displays
- [ ] Budget/Price displays
- [ ] Timeline displays
- [ ] Additional requirements display

### 16.3 Other Party Profile

- [ ] Profile picture of other party
- [ ] Name of other party
- [ ] Business name (if provider)

### 16.4 Negotiations Section

- [ ] Quote/Counter-offer form (if applicable)
- [ ] Price input field
- [ ] Timeline input field
- [ ] Notes text area
- [ ] Submit quote button
- [ ] Negotiation history displays

### 16.5 Status Actions (Client Side)

- [ ] If "responded" → Accept or Counter options
- [ ] Accept button → accepts quote
- [ ] Counter button → shows counter form
- [ ] If "accepted" → Pay button appears

### 16.6 Status Actions (Provider Side)

- [ ] If "pending" → Respond with quote
- [ ] Quote amount input
- [ ] Quote notes input
- [ ] Submit quote button
- [ ] If "accepted" → Submit Work button appears

### 16.7 Payment Flow (Client)

- [ ] "Pay Now" button → navigates to Payment screen

### 16.8 Work Submission (Provider)

- [ ] "Submit Work" button → navigates to Submit Work screen
- [ ] Previous submissions display
- [ ] Submission status visible

### 16.9 Work Submissions List

- [ ] Submitted work items display
- [ ] File name
- [ ] Submission date
- [ ] Download button

### 16.10 Message Button

- [ ] "Message" button → opens chat with other party

---

## 1️⃣7️⃣ PAYMENT SCREEN

### 17.1 Payment Summary

- [ ] Service amount displays
- [ ] Platform fee displays (4%)
- [ ] Total amount displays
- [ ] Provider info displays

### 17.2 Terms Checkbox

- [ ] "I agree to terms" checkbox
- [ ] Must be checked to proceed

### 17.3 Payment Button

- [ ] "Pay $XX.XX" button
- [ ] Button disabled until terms accepted
- [ ] Loading state during payment processing

### 17.4 Stripe Integration

- [ ] Stripe payment sheet opens
- [ ] Card input fields
- [ ] Payment processes successfully
- [ ] Success → shows confirmation
- [ ] Navigates to receipt or back to details
- [ ] Failed payment → shows error

---

## 1️⃣8️⃣ SUBMIT WORK SCREEN

### 18.1 Project Info Display

- [ ] Project title displays
- [ ] Client name displays
- [ ] Service type displays
- [ ] Agreed price displays

### 18.2 File Selection

- [ ] "Add Files" button
- [ ] File picker opens
- [ ] Supports: audio, video, image, PDF, ZIP
- [ ] Selected files display as list
- [ ] Each file shows:
  - [ ] File icon (based on type)
  - [ ] File name
  - [ ] File size
- [ ] Remove file button (X)

### 18.3 Description

- [ ] Description text area
- [ ] Notes for client

### 18.4 Submit Button

- [ ] "Submit Work" button
- [ ] Loading state during upload
- [ ] Upload progress indicator
- [ ] Success → confirmation message
- [ ] Navigates back to request details
- [ ] Error → shows error alert

---

## 1️⃣9️⃣ MY ORDERS SCREEN

### 19.1 Orders List

- [ ] All orders (as client) display
- [ ] Each order shows:
  - [ ] Service type
  - [ ] Provider name
  - [ ] Status
  - [ ] Date
  - [ ] Price

### 19.2 Order Status

- [ ] Status badge with color coding
- [ ] Payment status indicator
- [ ] Delivery status indicator

### 19.3 Navigate to Details

- [ ] Tap order → navigates to Project Request Details

### 19.4 Work Submissions

- [ ] If work submitted → displays latest submission
- [ ] "View Work" button → navigates to work view

### 19.5 Pull to Refresh

- [ ] Pull down → refreshes orders list

---

## 2️⃣0️⃣ NOTIFICATIONS SCREEN

### 20.1 Notifications List

- [ ] All notifications display
- [ ] Each notification shows:
  - [ ] Icon (based on type)
  - [ ] Title
  - [ ] Message
  - [ ] Time ago
  - [ ] Unread indicator (blue dot)

### 20.2 Notification Types

- [ ] Request accepted notification
- [ ] Price proposed notification
- [ ] Agreement created notification
- [ ] Payment received notification
- [ ] Work submitted notification
- [ ] Like notification
- [ ] Comment notification
- [ ] Follow notification

### 20.3 Notification Actions

- [ ] Tap notification → navigates to relevant screen
- [ ] Marks as read on tap
- [ ] Delete button (X) on each notification

### 20.4 Mark All as Read

- [ ] "Mark all as read" button
- [ ] All unread dots disappear

### 20.5 Empty State

- [ ] "No notifications yet" message when empty

### 20.6 Pull to Refresh

- [ ] Pull down → refreshes notifications

### 20.7 Back Navigation

- [ ] Back button returns to previous screen

---

## 2️⃣1️⃣ MESSAGES SCREEN

### 21.1 Conversations List

- [ ] All conversations display
- [ ] Each conversation shows:
  - [ ] Other user's avatar
  - [ ] Other user's name
  - [ ] Last message preview
  - [ ] Timestamp
  - [ ] Unread count badge

### 21.2 Online Status

- [ ] Green dot for online users

### 21.3 Search Conversations

- [ ] Search input field
- [ ] Filters conversations by name

### 21.4 New Message

- [ ] "New Message" button (+ icon)
- [ ] Navigates to New Message screen

### 21.5 Navigate to Chat

- [ ] Tap conversation → navigates to Chat screen

### 21.6 Pull to Refresh

- [ ] Pull down → refreshes conversations

---

## 2️⃣2️⃣ CHAT SCREEN

### 22.1 Chat Header

- [ ] Back button
- [ ] Other user's name
- [ ] Other user's avatar
- [ ] Online status indicator

### 22.2 Messages List

- [ ] Messages display in chronological order
- [ ] Own messages on right (blue/accent color)
- [ ] Other's messages on left (gray)
- [ ] Timestamp on each message
- [ ] Message status indicators (sent, delivered, read)

### 22.3 Message Input

- [ ] Text input field at bottom
- [ ] Send button
- [ ] Keyboard avoidance works
- [ ] Placeholder text

### 22.4 Send Message

- [ ] Type message → tap Send
- [ ] Message appears in list immediately
- [ ] Loading indicator until delivered
- [ ] Error → shows retry option

### 22.5 Real-time Updates

- [ ] New messages appear automatically
- [ ] Polling or websocket for updates

### 22.6 Scroll Behavior

- [ ] Auto-scrolls to newest message
- [ ] Scroll up to view older messages

---

## 2️⃣3️⃣ NEW MESSAGE SCREEN

### 23.1 User Search

- [ ] Search input field
- [ ] Search results display
- [ ] Users matching search appear

### 23.2 Select User

- [ ] Tap user → selects recipient
- [ ] Selected user displays

### 23.3 Start Conversation

- [ ] Message input field
- [ ] Send button
- [ ] Creates new conversation
- [ ] Navigates to Chat screen

---

## 2️⃣4️⃣ AGENTIC MANAGER SCREEN

### 24.1 Features Grid

- [ ] Audio Analysis card
- [ ] Venue Finder card
- [ ] Email Assistant card
- [ ] Financial Tracker card
- [ ] Fan Analytics card
- [ ] Campaign Manager card

### 24.2 Audio Analysis

- [ ] Tap "Audio Analysis" → expands/opens feature
- [ ] "Upload Track" button
- [ ] File picker opens
- [ ] Select audio file
- [ ] Analysis begins (loading indicator)
- [ ] Analysis results display:
  - [ ] BPM
  - [ ] Key
  - [ ] Energy level
  - [ ] Danceability
  - [ ] Other audio features
- [ ] Timer shows analysis duration

### 24.3 Venue Finder

- [ ] Tap "Venue Finder" → opens feature
- [ ] Location input field
- [ ] Venue types input
- [ ] Artist genre input
- [ ] Capacity range input
- [ ] "Search Venues" button
- [ ] Results list displays
- [ ] Each venue shows name, location, capacity
- [ ] "Favorite" button on each venue
- [ ] Favorites list section

### 24.4 Email Assistant

- [ ] Tap "Email Assistant" → opens feature
- [ ] Template selector dropdown
- [ ] Recipient name field
- [ ] Recipient email field
- [ ] Venue name field (if applicable)
- [ ] Proposed date field
- [ ] Custom message field
- [ ] "Generate Email" button
- [ ] Generated email displays
- [ ] "Copy" button
- [ ] "Send" button (opens mail app)

### 24.5 Financial Tracker

- [ ] Tap "Financial Tracker" → opens feature
- [ ] Budget items list
- [ ] Add budget item button
- [ ] Item name, category, amount fields
- [ ] Revenue estimates section
- [ ] ROI calculations
- [ ] Financial goals
- [ ] Financial health indicator

### 24.6 Back Navigation

- [ ] Back button returns to main screen
- [ ] Or close button on modal

---

## 2️⃣5️⃣ MANAGE SERVICES SCREEN

### 25.1 Services List

- [ ] All services display
- [ ] Each service shows name, price, status

### 25.2 Add Service

- [ ] "Add Service" button
- [ ] Service form modal opens
- [ ] Fill in details
- [ ] Save service

### 25.3 Edit Service

- [ ] Tap service → edit mode
- [ ] Update fields
- [ ] Save changes

### 25.4 Delete Service

- [ ] Delete button on each service
- [ ] Confirmation dialog
- [ ] Service removed from list

---

## 2️⃣6️⃣ MANAGE PORTFOLIO SCREEN

### 26.1 Portfolio Items

- [ ] All portfolio items display
- [ ] Media type indicator (audio/video/image)
- [ ] Title
- [ ] Description preview

### 26.2 Add Portfolio Item

- [ ] "Add Item" button
- [ ] Media picker opens
- [ ] Select media file
- [ ] Add title and description
- [ ] Upload and save

### 26.3 View Portfolio Item

- [ ] Tap item → fullscreen/detail view
- [ ] Play audio/video
- [ ] View image

### 26.4 Delete Portfolio Item

- [ ] Delete button
- [ ] Confirmation dialog
- [ ] Item removed

---

## 2️⃣7️⃣ EARNINGS SCREEN

### 27.1 Earnings Overview

- [ ] Total earnings display
- [ ] Available balance
- [ ] Pending balance
- [ ] This month's earnings

### 27.2 Transaction History

- [ ] List of transactions
- [ ] Each transaction shows:
  - [ ] Amount
  - [ ] Client name
  - [ ] Service type
  - [ ] Date
  - [ ] Status

### 27.3 Payout

- [ ] "Withdraw" button (if Stripe connected)
- [ ] Payout to bank account

---

## 2️⃣8️⃣ ERROR STATES & EDGE CASES

### 28.1 Network Errors

- [ ] No internet connection → shows offline message
- [ ] Request timeout → shows retry option
- [ ] Server error → shows error alert

### 28.2 Empty States

- [ ] No posts → "No posts yet" message
- [ ] No messages → "No conversations" message
- [ ] No notifications → "No notifications" message
- [ ] No orders → "No orders yet" message
- [ ] No artists found → "No artists found" message

### 28.3 Loading States

- [ ] Loading indicators on all async operations
- [ ] Skeleton loaders where appropriate
- [ ] Pull-to-refresh indicators

### 28.4 Form Validation

- [ ] Required field validation
- [ ] Email format validation
- [ ] Password requirements validation
- [ ] Phone number format
- [ ] Price format validation

### 28.5 Permission Requests

- [ ] Camera permission (first time)
- [ ] Photo library permission
- [ ] Microphone permission (for audio)
- [ ] Notification permission prompt

---

## 2️⃣9️⃣ UI/UX STANDARDS

### 29.1 Accessibility

- [ ] VoiceOver support
- [ ] Dynamic text size support
- [ ] Sufficient color contrast
- [ ] Touch targets are 44pt minimum

### 29.2 Dark Mode

- [ ] App uses dark theme consistently
- [ ] Black (#000000) background
- [ ] White text on dark backgrounds
- [ ] Proper contrast ratios

### 29.3 Safe Area

- [ ] Content respects safe area insets
- [ ] Notch/Dynamic Island areas clear
- [ ] Home indicator area clear

### 29.4 Keyboard Handling

- [ ] Keyboard avoidance on all input screens
- [ ] Dismiss keyboard on tap outside
- [ ] "Done" button dismisses keyboard
- [ ] Proper scroll to focused input

### 29.5 Navigation

- [ ] Back buttons work correctly
- [ ] Swipe-to-go-back gesture works
- [ ] Tab switching maintains state
- [ ] Deep links work correctly

---

## 3️⃣0️⃣ PERFORMANCE

### 30.1 App Launch

- [ ] App opens within 3 seconds
- [ ] Splash screen displays during load
- [ ] No white flash on launch

### 30.2 Scrolling

- [ ] Smooth 60fps scrolling
- [ ] No jank on long lists
- [ ] Images lazy load properly

### 30.3 Media

- [ ] Images load quickly
- [ ] Video plays without buffering
- [ ] Audio plays without delays

### 30.4 Memory

- [ ] App doesn't crash on long sessions
- [ ] Memory usage is reasonable
- [ ] No memory leaks on navigation

---

## ✅ FINAL CHECKS

- [ ] All screens tested on iPhone (various sizes)
- [ ] All screens tested on iPad (if applicable)
- [ ] Tested in airplane mode
- [ ] Tested with slow network
- [ ] All forms validated
- [ ] All navigation paths work
- [ ] No crashes encountered
- [ ] No console errors in production build
- [ ] App icon displays correctly
- [ ] App name displays correctly
- [ ] Version number is correct

---

## 📝 NOTES FOR TESTERS

1. **Test Accounts**: Create test accounts with each user type (regular user, artist, service provider)
2. **Payment Testing**: Use Stripe test cards for payment flows
3. **Email Testing**: Verify emails actually arrive for verification/password reset
4. **Deep Links**: Test password reset links from real emails
5. **Media Upload**: Test with various file sizes and formats
6. **Edge Cases**: Test with very long text, special characters, emojis

---

_Last Updated: December 11, 2024_
_App Version: 1.0.0_







