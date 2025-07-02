# Cloudflare R2 Migration Guide

This document explains the migration from Supabase Storage to Cloudflare R2 for file storage.

## Overview

The application has been migrated from Supabase Storage to Cloudflare R2 using the AWS SDK v3. This provides better performance, lower costs, and more control over file storage.

## Changes Made

### 1. New Dependencies

- Added `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` for R2 compatibility

### 2. New R2 Client Configuration

- Created `src/utils/r2Client.ts` with R2 client setup and helper functions
- Configured with proper R2 endpoint and credentials
- Added compatibility settings for R2 API

### 3. Updated API Endpoints

- **Profile Picture Upload** (`src/pages/api/settings/upload-profile-pic.ts`)
  - Replaced Supabase storage operations with R2 operations
  - Updated file upload, deletion, and URL generation
- **File Upload** (`src/pages/api/file/upload-file.ts`)
  - Updated video thumbnail upload logic
  - Replaced storage URL generation with R2

### 4. Updated Client-Side Code

- **File Upload Mutation** (`src/async/mutationHooks/files/useFileUploadOptimisticMutation.ts`)
  - Updated to use R2 signed URLs for secure client-side uploads
  - Replaced Supabase storage operations with R2

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_ACCESS_KEY_ID=your_cloudflare_access_key_id
CLOUDFLARE_SECRET_ACCESS_KEY=your_cloudflare_secret_access_key

# R2 Bucket Names (optional - defaults will be used if not set)
R2_BOOKMARKS_BUCKET=bookmarks
R2_FILES_BUCKET=files
R2_USER_PROFILE_BUCKET=user-profile
```

## Setup Instructions

### 1. Create Cloudflare R2 Buckets

1. Go to your Cloudflare dashboard
2. Navigate to R2 Object Storage
3. Create three buckets:
   - `bookmarks` (or your preferred name)
   - `files` (or your preferred name)
   - `user-profile` (or your preferred name)

### 2. Configure Bucket Permissions

- Set buckets to public if you want direct URL access
- Or configure custom domains for better URLs

### 3. Create API Tokens

1. Go to Cloudflare dashboard → My Profile → API Tokens
2. Create a new token with R2 permissions
3. Note down the Account ID, Access Key ID, and Secret Access Key

### 4. Update Environment Variables

Add the R2 configuration to your environment variables as shown above.

## R2 Helper Functions

The `r2Helpers` object provides these functions:

- `listObjects(bucket, prefix)` - List objects in a bucket
- `uploadObject(bucket, key, body, contentType)` - Upload a file
- `deleteObject(bucket, key)` - Delete a single file
- `deleteObjects(bucket, keys)` - Delete multiple files
- `createSignedUploadUrl(bucket, key, expiresIn)` - Generate signed upload URL
- `createSignedDownloadUrl(bucket, key, expiresIn)` - Generate signed download URL
- `getPublicUrl(bucket, key)` - Get public URL for a file

## Migration Notes

### File Paths

- File paths remain the same: `public/{userId}/{filename}`
- Existing file references in the database will continue to work

### Database

- No database changes required
- File URLs in the database will be updated to point to R2

### Performance

- R2 provides better global performance
- Lower latency for file operations
- Better cost efficiency for storage

## Testing

After setup, test the following functionality:

1. Profile picture upload
2. File upload (images, videos, documents)
3. File deletion
4. Public URL access

## Troubleshooting

### Common Issues

1. **Missing environment variables** - Ensure all R2 environment variables are set
2. **Bucket permissions** - Check that buckets are accessible with your API keys
3. **CORS issues** - Configure CORS on R2 buckets if needed for client-side uploads

### Error Messages

- "Missing Cloudflare R2 environment variables" - Check your `.env.local` file
- "Access denied" - Verify your API keys and bucket permissions
- "Bucket not found" - Ensure bucket names match your environment variables

## Support

For issues with the R2 migration, check:

1. Cloudflare R2 documentation: https://developers.cloudflare.com/r2/
2. AWS SDK v3 documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/
3. R2 API compatibility: https://developers.cloudflare.com/r2/api/s3/
