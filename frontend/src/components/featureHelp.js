/**
 * NEXUS 2.0 — Contextual Feature Guidance & "ABOUT THIS FEATURE" Help System
 * Provides rich, interactive popovers and slide-out reference drawers for complex workflows.
 */
import { openModal } from './modal.js';

export const FEATURE_HELP_CATALOG = {
  'academic-years': {
    title: 'Academic Year Cohorts & Curriculum',
    badge: 'Admin Governance',
    accentColor: '#397BFF',
    icon: '🎓',
    whatItDoes: 'Manages institutional academic terms, cohort start and end dates, and designates the active academic year used across student profiles, promotions, and graduation tracking.',
    whyItIsUsed: 'Maintains strict cohort boundary integrity across degrees, ensuring student transcripts, batch allocations, and directory graduation years align with verified institutional schedules.',
    whoCanAccess: 'Institutional Administrators (admin role). Students, alumni, and faculty view their assigned cohort information in read-only mode.',
    howToUse: '1. Click "+ Add Academic Year" to open the creation modal.\n2. Specify standard cohort format (e.g., "2026-2027") with valid start and end dates.\n3. Check "Mark as Current" if this represents the active academic session.\n4. Use "Make Current" or "Edit" to reassign the active university term at any time.',
    whatHappensAfter: 'The designated active academic year becomes the default term for newly registered student scholars, promotional progression, and academic reports.',
    permissions: 'Protected Administrative Action. Deleting an active academic year requires confirming that no ongoing promotional cycles or active enrollments depend on it.'
  },

  'user-management': {
    title: 'User Management & Role Governance',
    badge: 'Security & RBAC',
    accentColor: '#F43F5E',
    icon: '🛡️',
    whatItDoes: 'Provides comprehensive governance over all user accounts across the institution, enabling administrators to search rosters, filter by role or status, reassign roles, and suspend or reactivate accounts.',
    whyItIsUsed: 'Protects the portal against unauthorized access, enforces role boundaries, and ensures only verified faculty, students, and alumni access role-specific functionality.',
    whoCanAccess: 'Institutional Administrators (admin role).',
    howToUse: '1. Use the search field to filter by user name or email address.\n2. Filter by specific role (Student, Alumni, Faculty, Admin) or account status.\n3. Change a user\'s role using the inline dropdown; updates persist immediately.\n4. Click "Suspend" or "Reactivate" to instantly revoke or restore system access.',
    whatHappensAfter: 'Role changes immediately update permission decorators and JWT validation. Suspended users are locked out from logging in or making authenticated API calls.',
    permissions: 'Protected Root Safeguard: The primary system administrator (demo_admin_uid) and the acting administrator\'s own account cannot be demoted or suspended.'
  },

  'support-desk': {
    title: 'Support Desk & Inquiries',
    badge: 'Campus Support',
    accentColor: '#10B981',
    icon: '🎫',
    whatItDoes: 'Centralized ticketing hub for handling student verification requests, alumni credential endorsements, technical bug reports, and general campus inquiries.',
    whyItIsUsed: 'Provides an accountable, auditable bridge between portal members and administrators without losing requests in unmonitored email inboxes.',
    whoCanAccess: 'All authenticated members can submit tickets and view their submitted requests. Only administrators can review the global queue and post official resolutions.',
    howToUse: '1. Members submit requests via "#/contact-admin" specifying category, subject, and description.\n2. Administrators view incoming tickets in "#/admin/tickets".\n3. Click "Respond" to open the resolution editor and enter your official response.\n4. Mark status as "In Progress" or "Resolved".',
    whatHappensAfter: 'The ticket status is updated in the SQLite database and an asynchronous email notification is dispatched to the requester via SMTP.',
    permissions: 'Students and alumni can only view tickets they created. Administrators have full visibility across all institutional inquiries.'
  },

  'audit-trail': {
    title: 'Immutable Security Audit Trail',
    badge: 'Compliance & Auditing',
    accentColor: '#8B5CF6',
    icon: '📜',
    whatItDoes: 'Logs chronological, tamper-resistant audit events for security-sensitive actions including authentication, role elevations, suspensions, and curriculum modifications.',
    whyItIsUsed: 'Ensures compliance with institutional data governance policies and provides non-repudiation and traceability for administrative actions.',
    whoCanAccess: 'Institutional Administrators only.',
    howToUse: 'Inspect the audit trail tab on the Admin Console to review actor UID, email, role, specific action code, target resource, and exact UTC timestamp.',
    whatHappensAfter: 'Audit logs are committed permanently to the audit_logs SQLite table and cannot be altered or removed through portal interfaces.',
    permissions: 'Read-only administrative inspection.'
  },

  'moderation-queue': {
    title: 'Faculty Content Moderation Queue',
    badge: 'Faculty Oversight',
    accentColor: '#F59E0B',
    icon: '🛡️',
    whatItDoes: 'Allows faculty members and administrators to inspect student achievement submissions and alumni job postings before they become visible to the student body.',
    whyItIsUsed: 'Prevents spam, unverified claims, or unauthorized recruitment links from appearing on public portal boards.',
    whoCanAccess: 'Faculty members and Administrators.',
    howToUse: '1. Navigate to "#/faculty/moderation".\n2. Review pending opportunity postings and student achievement stories.\n3. Click "Approve" to publish the item immediately, or "Reject" to decline publication.',
    whatHappensAfter: 'Approved opportunities appear on the public Opportunities board. Approved achievements appear in the campus showcase.',
    permissions: 'Faculty and Admin exclusive.'
  },

  'student-promotion': {
    title: 'Student-to-Alumni Promotion Engine',
    badge: 'Academic Progression',
    accentColor: '#00E5FF',
    icon: '🎓',
    whatItDoes: 'Promotes graduating students from scholar status to verified alumni, establishing their permanent alumni profile and graduation batch record.',
    whyItIsUsed: 'Automates academic transition upon degree completion, granting new alumni access to mentorship offering, job posting, and reunion planning.',
    whoCanAccess: 'Faculty members and Administrators.',
    howToUse: '1. Open "#/faculty/promotion".\n2. Select the eligible student scholar from the dropdown.\n3. Specify their official graduation year, graduating degree course, and optional company/title.\n4. Click "Promote to Alumni" to execute the transition.',
    whatHappensAfter: 'The user\'s role is updated to "alumni", an alumni profile is provisioned in the database, and the member is enrolled in their graduating batch.',
    permissions: 'Requires faculty or admin authorization.'
  },

  'mentorship': {
    title: '1-on-1 Mentorship & Career Guidance',
    badge: 'Career Acceleration',
    accentColor: '#A855F7',
    icon: '🎯',
    whatItDoes: 'Facilitates direct career mentorship between ambitious students and experienced alumni working in software engineering, cloud architecture, and data science.',
    whyItIsUsed: 'Bridges academic coursework with real-world industry requirements through resume reviews, interview preparation, and career trajectory advice.',
    whoCanAccess: 'Students (as mentees) and Alumni (as mentors).',
    howToUse: '1. Students browse mentors in the Alumni Directory or Mentorship page and click "Request Mentorship".\n2. Alumni review inbound requests on their mentorship dashboard.\n3. Mentors accept or decline and toggle their availability status anytime.',
    whatHappensAfter: 'Accepted mentorships unlock private 1-on-1 direct messaging and milestone tracking between the mentor and scholar.',
    permissions: 'Alumni can set a maximum mentee capacity (1 to 10 mentees) to ensure manageable guidance workloads.'
  },

  'opportunities': {
    title: 'Curated Opportunities & Application Tracker',
    badge: 'Career Placement',
    accentColor: '#37C9D5',
    icon: '💼',
    whatItDoes: 'Aggregates verified full-time roles, internships, and research opportunities posted by verified alumni and campus placement directors.',
    whyItIsUsed: 'Provides direct referral links and eliminates spam or broken external application links.',
    whoCanAccess: 'All portal members can browse and bookmark postings. Students can track private application progress.',
    howToUse: '1. Click "Apply Now" to navigate to the official verified application portal.\n2. Click "Track Role" to log your private status (Applied, Interviewing, Offered) and personal interview notes.\n3. Use the bookmark icon to save roles for later review.',
    whatHappensAfter: 'Tracked roles appear in your personal Application Tracker tab with status badges and notes preserved in SQLite.',
    permissions: 'Alumni and Admins can create new opportunity postings.'
  },

  'career-tracker': {
    title: 'Student Career Growth & Readiness Tracker',
    badge: 'Student Exclusive',
    accentColor: '#397BFF',
    icon: '🚀',
    whatItDoes: 'A personal career growth dashboard allowing students to define learning milestones, target companies, skill acquisition goals, and monitor readiness percentages.',
    whyItIsUsed: 'Keeps students focused on measurable career development benchmarks throughout their undergraduate and graduate degree programs.',
    whoCanAccess: 'Student scholars only.',
    howToUse: '1. Open "#/career-tracker".\n2. Add milestones (e.g. "Complete Distributed Systems Course", "Solve 50 LeetCode Mediums").\n3. Mark milestones complete to advance your overall profile strength indicator.',
    whatHappensAfter: 'Milestone progress calculates your readiness percentage displayed on your main scholar dashboard.',
    permissions: 'Private to the individual student scholar.'
  },

  'achievements': {
    title: 'Campus Achievements & Stories',
    badge: 'Recognition',
    accentColor: '#F59E0B',
    icon: '🏆',
    whatItDoes: 'Highlights exceptional accomplishments, hackathon wins, published research papers, and startup milestones achieved by students and alumni.',
    whyItIsUsed: 'Celebrates university community impact and inspires peers through verified success stories.',
    whoCanAccess: 'All members can view achievements. Students and alumni can submit their achievements for faculty verification.',
    howToUse: '1. Click "Submit Achievement" on the Achievements board.\n2. Enter title, category, proof URL, and a descriptive summary.\n3. Submit for faculty review.',
    whatHappensAfter: 'Once reviewed and approved by faculty moderation, the achievement is published campus-wide.',
    permissions: 'Subject to faculty review prior to public listing.'
  },

  'events': {
    title: 'Events, Reunions & Workshops',
    badge: 'Community & Networking',
    accentColor: '#10B981',
    icon: '📅',
    whatItDoes: 'Campus event calendar for alumni reunions, technical webinars, career fairs, and departmental symposiums with real-time RSVP tracking.',
    whyItIsUsed: 'Maintains vibrant institutional connections and manages venue capacities with instant digital registrations.',
    whoCanAccess: 'All authenticated members can register for upcoming events and cancel RSVPs.',
    howToUse: '1. Browse the Events calendar at "#/events".\n2. Click "Register RSVP" on any open event to reserve your seat.\n3. View your confirmed registrations under "My Registered Events".',
    whatHappensAfter: 'Your registration is confirmed in the database, decrementing remaining seat capacity and adding the event to your dashboard.',
    permissions: 'Faculty, Alumni, and Admins can create and schedule new events.'
  },

  'directory': {
    title: 'Verified Alumni Directory',
    badge: 'Global Network',
    accentColor: '#00E5FF',
    icon: '👥',
    whatItDoes: 'Searchable directory of verified alumni across graduating classes, industries, global employers, and technical specializations.',
    whyItIsUsed: 'Empowers students and fellow graduates to build genuine professional networks and discover mentorship opportunities.',
    whoCanAccess: 'All registered portal members.',
    howToUse: '1. Search by alumni name, current employer, position, or technical skill.\n2. Filter by graduation year or active mentorship availability.\n3. Click "+ Connect" or "Request Mentorship" to initiate engagement.',
    whatHappensAfter: 'Connecting sends a notification to the alumnus, enabling direct messaging once connected.',
    permissions: 'Member profile visibility can be updated in personal settings.'
  },

  'direct-messaging': {
    title: 'Real-Time Direct Peer Messaging',
    badge: 'Communication',
    accentColor: '#A855F7',
    icon: '💬',
    whatItDoes: 'Secure, real-time 1-on-1 messaging channel between students, alumni, faculty, and administrators.',
    whyItIsUsed: 'Enables focused career discussions, mentorship check-ins, and institutional collaboration directly inside the portal.',
    whoCanAccess: 'All authenticated members.',
    howToUse: '1. Select an existing conversation on the left panel or click "Message" on any directory profile.\n2. Type your message in the chat input and click "Send".\n3. Messages update dynamically with persistent history stored securely in SQLite.',
    whatHappensAfter: 'Messages are stored in the messages table and notifications are triggered for unread messages.',
    permissions: 'Conversations are strictly private to the two participating members.'
  },

  'resources': {
    title: 'Academic & Career Resource Library',
    badge: 'Knowledge Hub',
    accentColor: '#397BFF',
    icon: '📚',
    whatItDoes: 'Curated repository of syllabus guides, interview prep cheat sheets, past exam papers, and official departmental notices.',
    whyItIsUsed: 'Democratizes access to high-value learning resources provided by faculty and accomplished alumni.',
    whoCanAccess: 'All authenticated portal members.',
    howToUse: '1. Browse materials by category (Computer Science, Career Prep, System Architecture).\n2. Download or view verified documents directly.\n3. Faculty and Alumni can contribute new resources via "+ Share Resource".',
    whatHappensAfter: 'Uploaded materials are verified and made accessible to students immediately.',
    permissions: 'Faculty and alumni contribution rights.'
  },

  'content-reports': {
    title: 'Content Abuse & Misconduct Reporting',
    badge: 'Community Standards',
    accentColor: '#EF4444',
    icon: '🚩',
    whatItDoes: 'Provides a confidential mechanism for portal members to report spam, inappropriate communications, harassment, or policy violations.',
    whyItIsUsed: 'Preserves a safe, professional, and respectful environment for students, alumni, and faculty alike.',
    whoCanAccess: 'All authenticated members can submit reports. Reports are reviewed strictly by Administrators.',
    howToUse: '1. Click "Report" on any offending message, post, or profile.\n2. Select the violation category and provide context.\n3. Submit for administrative moderation.',
    whatHappensAfter: 'The incident is logged in the reports table with pending status for administrative investigation and disciplinary action.',
    permissions: 'Confidential reporting with administrator-only queue visibility.'
  },

  'birthdays': {
    title: 'Alumni Birthday & Celebration Hub',
    badge: 'Campus Celebrations',
    accentColor: '#F59E0B',
    icon: '🎂',
    whatItDoes: 'Connects students and alumni through community birthday celebrations, personalized greetings, and milestone recognition with strict privacy controls.',
    whyItIsUsed: 'Builds lasting interpersonal relationships and institutional warmth across student cohorts and graduating alumni classes.',
    whoCanAccess: 'All authenticated members can view eligible community celebrations and send wishes. Students and alumni manage their own DOB and privacy settings.',
    howToUse: '1. Add your Date of Birth in Settings or via "My Birthday Settings" on this page.\n2. Choose visibility: "Visible to Community" to celebrate or "Hidden from Community" for total privacy.\n3. Browse "Today\'s Birthdays" or "Upcoming" to send warm personalized wishes.\n4. Check "Received Greetings" to view your private birthday inbox.',
    whatHappensAfter: 'Sending a greeting creates an in-app notification and dispatches to the recipient\'s private inbox. Birth years are never disclosed.',
    permissions: 'Consent-based visibility. Birth years are strictly private and never displayed.'
  },

  'student-dashboard': {
    title: 'Student Scholar Dashboard',
    badge: 'Scholar Intelligence',
    accentColor: '#F59E0B',
    icon: '⚡',
    whatItDoes: 'Provides a unified mission control center for undergraduate and graduate students to track connections, active mentorships, verified applications, and career milestones.',
    whyItIsUsed: 'Consolidates career growth telemetry, curated industry job postings, and campus networking into a single interactive cockpit.',
    whoCanAccess: 'Enrolled students and academic scholars.',
    howToUse: '1. Monitor your active connections and 1-on-1 mentorship counts.\n2. Review curated job and internship referrals.\n3. Track career milestone progression and profile readiness.\n4. Access quick shortcuts to directory and resources.',
    whatHappensAfter: 'Milestone completions automatically update your profile strength score and career roadmap.',
    permissions: 'Personalized to the authenticated student scholar.'
  },

  'alumni-dashboard': {
    title: 'Distinguished Alumni Cockpit',
    badge: 'Alumni Engagement',
    accentColor: '#10B981',
    icon: '💼',
    whatItDoes: 'Serves as the central hub for graduated alumni to manage mentorship availability, post hiring opportunities, celebrate milestones, and reconnect with batch cohorts.',
    whyItIsUsed: 'Empowers alumni to give back to current students through mentorship, industry referrals, and verified career guidance.',
    whoCanAccess: 'Graduated alumni members.',
    howToUse: '1. Toggle mentorship availability status and set mentee intake capacity.\n2. Post new employment and internship referral opportunities.\n3. Share professional promotions, research, or honors in Achievements.\n4. Connect with peers from your graduating class batch.',
    whatHappensAfter: 'Posted opportunities are reviewed by faculty and published to the student body.',
    permissions: 'Requires verified alumni account credentials.'
  },

  'faculty-dashboard': {
    title: 'Faculty Leadership & Moderation Console',
    badge: 'Academic Authority',
    accentColor: '#F59E0B',
    icon: '🛡️',
    whatItDoes: 'Provides departmental faculty advisors with tools to review student achievements, moderate job listings, supervise cohorts, and execute graduating class promotions.',
    whyItIsUsed: 'Maintains academic excellence, content integrity, and regulatory governance across institutional publications.',
    whoCanAccess: 'Verified university faculty members.',
    howToUse: '1. Inspect the Moderation Queue to approve or decline submissions.\n2. Promote graduating students to alumni status upon degree conferral.\n3. Upload curriculum guides and past papers to the resource library.\n4. Broadcast official departmental announcements.',
    whatHappensAfter: 'Approved items are published platform-wide and student promotions transition accounts automatically.',
    permissions: 'Protected faculty and advisor clearance.'
  },

  'admin-dashboard': {
    title: 'Chief Administrator Command Center',
    badge: 'Platform Governance',
    accentColor: '#A855F7',
    icon: '🏛️',
    whatItDoes: 'Centralized administrative control center monitoring relational SQLite database health, user role elevation, incoming support inquiries, and security audit trails.',
    whyItIsUsed: 'Provides complete institutional governance, system health oversight, and compliance auditing in real-time.',
    whoCanAccess: 'Designated Platform Administrators (admin role).',
    howToUse: '1. Monitor live SQLite database connection and table synchronization.\n2. Resolve inbound user support tickets with automated email dispatches.\n3. Manage users, suspend violating accounts, and assign roles.\n4. Audit chronological security events.',
    whatHappensAfter: 'Administrative modifications commit to SQLite with immutable audit entries.',
    permissions: 'Chief Administrator clearance.'
  },

  'batches': {
    title: 'BatchVerse 3.0 — Cohort Hub, Events & Memories Gallery',
    badge: 'Cohort Communities',
    accentColor: '#6366F1',
    icon: '🎓',
    whatItDoes: 'BatchVerse unites students and alumni in verified graduation cohorts based on institutional academic records. Features 7 interactive workspace pillars: Cohort Overview, Classmate Members Directory, Categorized Discussions, Reunions & Events with RSVP, Official Cohort Announcements, Interactive Batch Polls, and the all-new Memories Gallery with Event Albums, Chronological Timelines, and Lightbox Photo Viewing.',
    whyItIsUsed: 'Preserves cherished campus memories, strengthens lifelong alumni bonds, and fosters active engagement through organized class reunions, multi-option polling, official faculty notices, and photo sharing.',
    whoCanAccess: 'All four roles with verified permissions: Students & Alumni access their eligible graduating class; Faculty access departmental cohorts; Administrators maintain global access and photo moderation authority.',
    howToUse: '1. In Memories Gallery, browse cohort photos in masonry view, filter by Event Album or Year Timeline, and click any photo for full-screen Lightbox viewing with comments and likes.\n2. Click "Upload Memory" to upload high-res photos (JPG, PNG, WebP) with auto-thumbnailing, captions, and event tagging.\n3. In Reunions & Events, schedule cohort gatherings, RSVP, and inspect attendee lists.\n4. In Announcements & Polls, review pinned notices and vote on class decisions.\n5. In Discussions & Directory, share peer posts and connect with verified classmates.',
    whatHappensAfter: 'Uploaded photos, thumbnails, likes, comments, and reports persist securely in SQLite and static storage. Reported photos queue for administrative review, and reactions deliver in-app notifications.',
    permissions: 'Strict Academic Verification: Photos and interactions are isolated to verified batch members. Content authors and Admins can edit captions or remove photos; Admins moderate flagged reports.'
  }
};

/**
 * Opens a modal drawer displaying comprehensive feature help.
 */
export function openAboutFeature(featureKey) {
  const info = FEATURE_HELP_CATALOG[featureKey];
  if (!info) {
    console.warn(`Feature help key "${featureKey}" not found in catalog.`);
    return;
  }

  const contentHtml = `
    <div class="feature-help-modal" style="display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Feature Header Pill & Summary -->
      <div style="background: rgba(var(--section-accent-rgb, 57, 123, 255), 0.08); border: 1px solid rgba(var(--section-accent-rgb, 57, 123, 255), 0.25); border-radius: var(--radius-md); padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 32px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border-radius: var(--radius-md); border: var(--glass-border);">
            ${info.icon}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: ${info.accentColor}; margin-bottom: 2px;">
              ${info.badge}
            </div>
            <div style="font-size: 17px; font-weight: 750; color: var(--text-heading);">
              ${info.title}
            </div>
          </div>
        </div>
        <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-muted); font-size: 11px;">NEXUS Guide</span>
      </div>

      <!-- 6-Part Structured Help Guide -->
      <div style="display: flex; flex-direction: column; gap: 14px;">
        
        <!-- 1. What It Does -->
        <div class="help-section-card" style="border: var(--glass-border); background: var(--bg-card); border-radius: var(--radius-md); padding: 14px 18px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
            <span>✦</span> 1. What This Feature Does
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0;">
            ${info.whatItDoes}
          </p>
        </div>

        <!-- 2. Why It Is Used -->
        <div class="help-section-card" style="border: var(--glass-border); background: var(--bg-card); border-radius: var(--radius-md); padding: 14px 18px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
            <span>🎯</span> 2. Why It Is Used
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0;">
            ${info.whyItIsUsed}
          </p>
        </div>

        <!-- 3. Who Can Access It -->
        <div class="help-section-card" style="border: var(--glass-border); background: var(--bg-card); border-radius: var(--radius-md); padding: 14px 18px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
            <span>👥</span> 3. Who Can Access It
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0;">
            ${info.whoCanAccess}
          </p>
        </div>

        <!-- 4. How To Use It -->
        <div class="help-section-card" style="border: var(--glass-border); background: var(--bg-card); border-radius: var(--radius-md); padding: 14px 18px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
            <span>🧭</span> 4. Step-by-Step Instructions
          </div>
          <div style="font-size: 13px; color: var(--text-muted); line-height: 1.6; white-space: pre-line;">
            ${info.howToUse}
          </div>
        </div>

        <!-- 5. What Happens After -->
        <div class="help-section-card" style="border: var(--glass-border); background: var(--bg-card); border-radius: var(--radius-md); padding: 14px 18px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
            <span>⚡</span> 5. What Happens After Using It
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0;">
            ${info.whatHappensAfter}
          </p>
        </div>

        <!-- 6. Permissions & Safeguards -->
        <div class="help-section-card" style="border-left: 3px solid ${info.accentColor}; background: var(--bg-card); border-radius: var(--radius-md); padding: 14px 18px; border-top: var(--glass-border); border-right: var(--glass-border); border-bottom: var(--glass-border);">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: ${info.accentColor}; margin-bottom: 6px;">
            <span>🛡️</span> 6. Permissions & Operational Restrictions
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0;">
            ${info.permissions}
          </p>
        </div>

      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-primary" id="btn-close-feature-help" style="border-radius: var(--radius-full); padding: 8px 24px;">
      Got It, Continue
    </button>
  `;

  const { close } = openModal({
    title: `About: ${info.title}`,
    contentHtml,
    footerHtml
  });

  const closeBtn = document.getElementById('btn-close-feature-help');
  if (closeBtn) closeBtn.addEventListener('click', close);
}

/**
 * Returns HTML string for an inline "About This Feature" help button.
 */
export function renderAboutButton(featureKey, customLabel = 'About This Feature') {
  return `
    <button type="button" 
      class="btn-about-feature" 
      data-feature="${featureKey}" 
      title="Open detailed guide for this module" 
      aria-label="About ${customLabel}">
      <span class="about-icon">ℹ️</span>
      <span class="about-label">${customLabel}</span>
    </button>
  `;
}

/**
 * Global initialization for click delegation on all "About This Feature" triggers.
 */
let isInitialized = false;
export function initFeatureHelp() {
  if (isInitialized) return;
  isInitialized = true;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.btn-about-feature');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const featureKey = trigger.getAttribute('data-feature');
      if (featureKey) {
        openAboutFeature(featureKey);
      }
    }
  });
}
