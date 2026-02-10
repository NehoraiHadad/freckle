#!/bin/bash
# Freckle Admin API - Example curl commands
# Replace BASE_URL and API_KEY with actual values

BASE_URL="http://localhost:3000/api/admin/v1"
API_KEY="your-admin-api-key-here"
AUTH="Authorization: Bearer $API_KEY"

# ============================================
# Health & Meta (required endpoints)
# ============================================

# Health check (may be unauthenticated)
curl -s "$BASE_URL/health" | jq

# Product meta info
curl -s -H "$AUTH" "$BASE_URL/meta" | jq

# ============================================
# Stats
# ============================================

# Dashboard stats
curl -s -H "$AUTH" "$BASE_URL/stats" | jq

# Trends (7-day)
curl -s -H "$AUTH" "$BASE_URL/stats/trends?period=7d" | jq

# ============================================
# Users
# ============================================

# List users (paginated)
curl -s -H "$AUTH" "$BASE_URL/users?page=1&pageSize=10" | jq

# Search users
curl -s -H "$AUTH" "$BASE_URL/users?search=john&status=active" | jq

# Get user detail
curl -s -H "$AUTH" "$BASE_URL/users/user-123" | jq

# Update user
curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"role": "premium", "metadata": {"note": "Upgraded manually"}}' \
  "$BASE_URL/users/user-123" | jq

# User action (add credits)
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"action": "add_credits", "params": {"amount": 100, "reason": "Compensation"}}' \
  "$BASE_URL/users/user-123/actions" | jq

# Delete/deactivate user
curl -s -X DELETE -H "$AUTH" "$BASE_URL/users/user-123"

# ============================================
# Content
# ============================================

# List content
curl -s -H "$AUTH" "$BASE_URL/content?page=1&pageSize=10&status=published" | jq

# Get content detail
curl -s -H "$AUTH" "$BASE_URL/content/content-456" | jq

# Update content
curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status": "unpublished"}' \
  "$BASE_URL/content/content-456" | jq

# Content action
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"action": "feature", "params": {}}' \
  "$BASE_URL/content/content-456/actions" | jq

# ============================================
# Analytics
# ============================================

# Usage analytics
curl -s -H "$AUTH" "$BASE_URL/analytics/usage?period=30d" | jq

# Activity feed
curl -s -H "$AUTH" "$BASE_URL/analytics/activity?page=1&pageSize=50" | jq

# ============================================
# Config
# ============================================

# Get config
curl -s -H "$AUTH" "$BASE_URL/config" | jq

# Update config
curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"settings": {"maxUploadSize": 10485760}}' \
  "$BASE_URL/config" | jq

# ============================================
# Operations
# ============================================

# Run operation (dry run)
curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"action": "cleanup_orphaned_files", "params": {"dryRun": true}}' \
  "$BASE_URL/operations" | jq

# ============================================
# Error examples
# ============================================

# No auth (should return 401)
curl -s "$BASE_URL/users" | jq

# Bad auth (should return 401)
curl -s -H "Authorization: Bearer wrong-key" "$BASE_URL/users" | jq

# Not found (should return 404)
curl -s -H "$AUTH" "$BASE_URL/users/nonexistent-id" | jq

# Invalid input (should return 400)
curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"email": "cant-change-this"}' \
  "$BASE_URL/users/user-123" | jq
