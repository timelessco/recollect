# Project Overview

## Purpose

Recollect is an open-source bookmark, images, and documents manager designed to help users organize their digital content. It provides a centralized platform where users can:

- Save and manage bookmarks, images, and documents
- Organize content into collections (public or private)
- Add tags for better organization
- Search across all content
- Use drag-and-drop functionality
- Generate automatic image descriptions using AI

## Tech Stack

- **Language**: TypeScript (strict mode enabled)
- **Framework**: Next.js (React framework)
- **UI Libraries**:
  - React
  - TailwindCSS for styling
  - Ariakit for accessible components
  - Headless UI for unstyled components
- **State Management**:
  - Zustand for global state
  - React Query (TanStack Query) for server state
- **Backend & Database**:
  - Supabase (PostgreSQL + Auth + Storage)
  - Supabase SSR for server-side auth
- **AI/ML Integration**:
  - Google Generative AI
  - LangChain for AI workflows
  - Transformers.js for local ML models
- **Build Tools**:
  - pnpm (package manager)
  - Turbo for monorepo task running
  - PostCSS & Autoprefixer
- **Testing**: Cypress for E2E testing
- **Monitoring**: Sentry for error tracking
- **Email Services**: SendGrid and Resend
- **Media Handling**:
  - Sharp for image processing
  - Puppeteer for web scraping
  - PDF.js for PDF handling

## Architecture

- **Pages Directory**: Using Next.js pages router (src/pages)
- **Component Organization**:
  - Reusable components in `src/components`
  - Page-specific components in `src/pageComponents`
  - Icons in `src/icons`
- **State Management**:
  - Zustand stores in `src/store`
  - React Query for server state synchronization
- **Type Safety**: Full TypeScript with strict mode
- **Environment Configuration**: Zod-validated environment variables
- **API Routes**: Next.js API routes for server-side operations

## Key Features

1. **Content Management**: Add, edit, delete bookmarks, images, and documents
2. **Collections**: Organize content into shareable collections
3. **Tagging System**: Tag-based organization and filtering
4. **Search Functionality**: Full-text search across all content
5. **Drag & Drop**: Interactive UI with drag-and-drop support
6. **AI Features**: Automatic image description generation
7. **Responsive Design**: Mobile-friendly interface
8. **Authentication**: Google OAuth and email authentication via Supabase
9. **File Storage**: Secure file storage using Supabase Storage/AWS S3
10. **Self-Hosting Support**: Can be deployed independently
