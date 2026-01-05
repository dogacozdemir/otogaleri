# Storage Setup Guide

## Overview

The application now supports both **local filesystem storage** (development) and **S3-compatible storage** (production) through a unified `StorageService` interface.

## Storage Providers

### 1. Local Storage (Default)
- Stores files in `backend/uploads/` directory
- Used when S3 is not configured
- Suitable for development and single-server deployments

### 2. S3 Storage
- AWS S3 or S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
- Suitable for production and horizontal scaling
- Supports custom endpoints for S3-compatible services

## Configuration

### Local Storage (Default)
No configuration needed. Files are stored in `backend/uploads/` directory.

### S3 Storage

Add the following environment variables to `.env`:

```bash
# Required for S3
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# AWS Credentials (for AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional: S3-Compatible Service (MinIO, DigitalOcean Spaces, etc.)
AWS_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
AWS_S3_FORCE_PATH_STYLE=true

# Optional: Custom Base URL (for CloudFront, CDN, or custom domain)
AWS_S3_BASE_URL=https://cdn.yourdomain.com

# Optional: Force local storage even if S3 is configured
STORAGE_PROVIDER=local
```

## Migration from Local to S3

1. **Configure S3 credentials** in `.env`
2. **Set `AWS_S3_BUCKET`** to your bucket name
3. **Restart the application** - it will automatically use S3
4. **Migrate existing files** (optional script can be created)

## File Structure

Files are stored with the following structure:
- **Vehicles**: `vehicles/{timestamp}-{random}.webp`
- **Documents**: `documents/{timestamp}-{random}.{ext}`

The `image_path` field in the database stores the storage key (e.g., `vehicles/1234567890-123456789.webp`).

## URL Generation

- **Local Storage**: URLs are relative paths like `/uploads/vehicles/filename.webp`
- **S3 Storage**: 
  - If `AWS_S3_BASE_URL` is set: Uses that URL
  - Otherwise: Generates signed URLs (valid for 1 hour) or direct S3 URLs

## Testing

### Test Local Storage
```bash
# No configuration needed
npm run dev
```

### Test S3 Storage
```bash
# Set environment variables
export AWS_S3_BUCKET=test-bucket
export AWS_ACCESS_KEY_ID=test-key
export AWS_SECRET_ACCESS_KEY=test-secret
export AWS_REGION=us-east-1

npm run dev
```

## Troubleshooting

### S3 Connection Issues
- Check AWS credentials
- Verify bucket exists and is accessible
- Check IAM permissions (s3:PutObject, s3:GetObject, s3:DeleteObject)
- For S3-compatible services, ensure `AWS_S3_ENDPOINT` is correct

### File Not Found
- Check if file exists in storage
- Verify `image_path` in database matches storage key
- For S3, check bucket permissions and CORS settings

### URL Generation Issues
- For public files, ensure bucket has public-read ACL or bucket policy
- For signed URLs, check AWS credentials are valid
- If using CloudFront, set `AWS_S3_BASE_URL` to CloudFront domain


