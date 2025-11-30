# WordPress Content Publisher Platform

## Overview

This is a full-stack web application that enables content creators to write and publish articles to multiple WordPress sites from a centralized platform. The system manages user authentication, WordPress site connections, article creation with rich text editing, and automated publishing with SEO metadata support. It features a modern React frontend with shadcn/ui components and an Express backend with PostgreSQL database storage.

## User Preferences

Preferred communication style: Simple, everyday language.

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

**Database Layer**: Drizzle ORM with PostgreSQL (Neon serverless). Connection pooling optimized for serverless with single connection per function instance and 20-second idle timeout.

**Key Design Patterns**:
- Shared database client (`shared/db-client.ts`) prevents connection pool exhaustion
- Database schema with Drizzle Zod integration for validation
- Auto-migration of missing columns on startup
- Session-based authentication with localStorage fallback

**API Structure**:
- `/api/auth` - User authentication (login, WordPress credential storage)
- `/api/sites` - WordPress site management and user site connections
- `/api/content` - Article CRUD operations
- `/api/sync-articles` - **Improved Sync Logic:** Fetches all published posts directly from WordPress using admin API credentials, compares against articles in system, and deletes any articles whose post IDs no longer exist on WordPress. Uses pagination to handle sites with many posts.
- `/api/health` - Database connectivity check
- `/api/sites/[siteId]/tags` - **Fixed:** Corrected import path for Vercel deployment (../../db-utils.js)

### Database Schema

**Core Tables**:
- `wordpress_sites` - WordPress installations managed by admins (URL, API credentials, SEO plugin type)
- `app_users` - Content creators and admins with role-based access
- `articles` - Article content with title, body, featured image, SEO metadata
- `article_publishing` - Publishing records linking articles to WordPress sites with post IDs
- `user_site_credentials` - Per-user WordPress credentials for each site
- `approved_wp_users` - Admin-approved WordPress usernames per site
- `publishing_profiles` - User display names and profile pictures for WordPress author attribution

**Relationships**:
- Many-to-many between users and sites through credentials table
- Articles belong to users, publishing records link articles to sites
- Cascading deletes maintain referential integrity

**Data Retention & Recovery Policy**:
- Site Deletion: When a WordPress site is deleted from the platform, it becomes invisible to users but all associated articles remain in the database for recovery purposes
- Database Loss: If the database is lost, articles published to WordPress remain on the WordPress servers independently. Articles are only deleted from WordPress if explicitly deleted through the system's sync/deletion operations
- Sync Architecture: The bi-directional sync detects WordPress deletions and removes them from the local database, but independent WordPress deletions are not automatically synced

### External Dependencies

**WordPress REST API Integration**: Authenticates using Basic Auth with WordPress Application Passwords. Supports creating posts, categories, tags, and uploading media. Handles different SEO plugins (Rank Math, AIO SEO PRO, Yoast).

**Database**: Neon Postgres serverless database accessed via `@neondatabase/serverless` driver. Auto-switches from direct connection (port 5432) to session pooler (port 6543) when deployed on Vercel.

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