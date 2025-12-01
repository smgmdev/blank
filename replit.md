# WordPress Content Publisher Platform

## Overview

This is a full-stack web application that enables content creators to write and publish articles to multiple WordPress sites from a centralized platform. The system manages user authentication with unified sessions across Replit and Vercel, WordPress site connections, article creation with rich text editing, and automated publishing with SEO metadata support. It features a modern React frontend with shadcn/ui components and an Express backend with PostgreSQL database storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## Database

**Single Database: Supabase (PostgreSQL)**
- Environment variable: `DATABASE_URL`
- Uses Supabase connection pooler (port 6543) for serverless compatibility
- Both Replit and Vercel use the SAME Supabase database
- All Neon (PGHOST, PGPORT, etc.) environment variables have been removed
- All application data is stored exclusively in Supabase

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, built using Vite for fast development and optimized production builds.

**UI Framework**: shadcn/ui component library with Radix UI primitives, styled using Tailwind CSS with a custom Apple iOS-inspired theme featuring clean black/white/gray palette.

**State Management**: Zustand for client-side state management, storing user sessions, article data, and site connections. TanStack Query (React Query) handles server state synchronization and caching.

**Routing**: Wouter for lightweight client-side routing with protected routes requiring authentication.

**Key Design Patterns**:
- Component composition with shared UI primitives (Button, Card, Dialog, etc.)
- Custom hooks for reusable logic (useToast, useIsMobile)
- Path aliases (@/, @shared/, @assets/) for clean imports
- Responsive design with mobile-first approach

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**Deployment Strategy**: Dual deployment support - traditional Express server for development and Vercel serverless functions for production. The `/api` directory contains serverless endpoint handlers that share database utilities.

**Database Layer**: Drizzle ORM with Supabase PostgreSQL. Connection pooling optimized for serverless with single connection per function instance and 20-second idle timeout. Both Replit and Vercel connect to the same Supabase instance via DATABASE_URL environment variable.

**Session Management (NEW - Dec 1, 2025)**:
- Server-side sessions stored in `user_sessions` table (7-day expiry)
- Sessions created on login on both Replit (`/api/login`) and Vercel (`/api/auth?action=login`)
- Session ID returned to frontend and stored in localStorage
- Unified login/logout across both deployments
- Table auto-created on server startup via `ensureSchemaColumns()` in `server/db.ts`
- Vercel API also initializes schema via async `initializeSchema()` in `api/db-utils.ts`

**Key Design Patterns**:
- Shared database client (`shared/db-client.ts`) prevents connection pool exhaustion
- Database schema with Drizzle Zod integration for validation
- Auto-migration of missing columns and tables on startup
- Session-based authentication with localStorage fallback for sessionId

**API Structure**:
- `/api/auth` - User authentication (login with session creation, WordPress credential storage)
- `/api/sites` - WordPress site management and user site connections
- `/api/content` - Article CRUD operations and publishing to WordPress
- `/api/users/[userId]` - User profile fetch and update (works on both Replit and Vercel)
- `/api/sync-articles` - **Sync with Grace Period:** Fetches published posts directly from WordPress using admin credentials, compares against system articles, and only deletes articles missing from WordPress for >5 minutes (prevents race conditions on newly published articles)
- `/api/health` - Database connectivity check
- `/api/sites/[siteId]/tags` - Fetch available tags from WordPress site
- `/api/test-user` - Testing endpoint for user data retrieval

**Recent Implementation (Dec 1, 2025)**:
- **Session System**: Implemented unified server-side session management with 7-day expiry
- **Session Table Creation**: Auto-creates `user_sessions` table on startup if missing
- **Login Endpoints Updated**: Both Replit and Vercel login now create sessions and return sessionId
- **Vercel Schema Initialization**: Added async schema initialization to Vercel API to ensure user_sessions table exists

### Database Schema

**Core Tables**:
- `wordpress_sites` - WordPress installations managed by admins (URL, API credentials, SEO plugin type)
- `app_users` - Content creators and admins with role-based access
- `user_sessions` - Server-side sessions with userId and expiry timestamp (7-day expiry)
- `articles` - Article content with title, body, featured image, SEO metadata
- `article_publishing` - Publishing records linking articles to WordPress sites with post IDs
- `user_site_credentials` - Per-user WordPress credentials for each site
- `approved_wp_users` - Admin-approved WordPress usernames per site
- `publishing_profiles` - User display names and profile pictures for WordPress author attribution

**Relationships**:
- Many-to-many between users and sites through credentials table
- Articles belong to users, publishing records link articles to sites
- Sessions belong to users with cascading deletes
- Cascading deletes maintain referential integrity

**Data Retention & Recovery Policy**:
- Site Deletion: When a WordPress site is deleted from the platform, it becomes invisible to users but all associated articles remain in the database for recovery purposes
- Database Loss: If the database is lost, articles published to WordPress remain on the WordPress servers independently. Articles are only deleted from WordPress if explicitly deleted through the system's sync/deletion operations
- Sync Architecture: The bi-directional sync detects WordPress deletions and removes them from the local database, but independent WordPress deletions are not automatically synced

### External Dependencies

**WordPress REST API Integration**: Authenticates using Basic Auth with WordPress Application Passwords. Supports creating posts, categories, tags, and uploading media. Handles different SEO plugins (Rank Math, AIO SEO PRO, Yoast).

**Database**: Supabase PostgreSQL accessed via `postgres` npm package. Uses connection pooler on both Replit and Vercel for consistency (port 6543).

**File Upload**: Client-side image handling with base64 encoding for featured images. Uploads to WordPress media library via REST API.

**Third-party Services**:
- Vercel for serverless deployment and edge functions
- Google Fonts (Inter, Space Grotesk) for typography
- Lucide React for iconography
- Dicebear API for avatar placeholders

**Key Libraries**:
- `drizzle-orm` + `drizzle-kit` for database operations and migrations
- `express-session` with `connect-pg-simple` for session storage (dev mode)
- `react-hook-form` + `zod` for form validation
- `date-fns` for date formatting
- `cmdk` for command palette functionality

## Testing & Debugging

**Testing Session System**:
1. Login on Replit with admin@system.com / password
2. Check localStorage has sessionId after login
3. Navigate to Settings - user data should load from `/api/users/${userId}`
4. For Vercel testing: Use actual Vercel deployment URL (not Replit preview)

**Known Issues**:
- User data on Vercel Settings page requires testing via actual Vercel deployment URL, not through Replit preview
- Vercel API routes are separate from Replit and need to be tested with the full Vercel domain
