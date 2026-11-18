/**
 * ADMIN API CLIENT DOCUMENTATION
 *
 * Complete reference for all admin API functions and their usage
 */

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * ✅ GET /api/admin/teachers
 * Retrieve all teachers with optional filtering and pagination
 *
 * @param params - Query parameters
 *   - skip: number (default: 0) - Number of records to skip
 *   - limit: number (default: 100) - Maximum records to return
 *   - status_filter: string (optional) - Filter by status
 *
 * @returns Array of teacher objects
 *
 * Example:
 * ```
 * const teachers = await getAdminTeachers({
 *   skip: 0,
 *   limit: 20,
 *   status_filter: 'pending_approval'
 * });
 * ```
 *
 * Valid status filters:
 * - 'incomplete' - Teachers with incomplete profiles
 * - 'pending_approval' - Teachers awaiting admin approval
 * - 'approved' - Approved teachers
 * - 'rejected' - Rejected teachers
 * - 'suspended' - Suspended teachers
 */
export const getAdminTeachers = async (params?: GetAdminTeachersQueryParams) => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================

/**
 * ✅ GET /api/admin/teachers/pending
 * Get all teachers pending approval (shortcut for filtering)
 *
 * @param params - Pagination parameters
 *   - skip: number (default: 0)
 *   - limit: number (default: 100)
 *
 * @returns Array of pending teacher objects
 *
 * Example:
 * ```
 * const pendingTeachers = await getPendingTeachers({
 *   skip: 0,
 *   limit: 50
 * });
 * ```
 */
export const getPendingTeachers = async (params?: GetPendingTeachersQueryParams) => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================

/**
 * ✅ GET /api/admin/teachers/{teacher_id}
 * Get detailed information about a specific teacher
 *
 * @param teacherId - The teacher ID to fetch
 *
 * @returns Full teacher object with all details including:
 * - Basic info (name, phone, DOB, etc.)
 * - Professional info (qualification, experience, etc.)
 * - Subjects with fees
 * - Availability schedule
 * - Verification documents
 * - Approval history
 * - Ratings and reviews
 *
 * Example:
 * ```
 * const teacher = await getAdminTeacherById(123);
 * ```
 *
 * Response structure:
 * ```json
 * {
 *   "teacher_id": 1,
 *   "user_id": 5,
 *   "full_name": "Ahmad Khan",
 *   "phone": "03001234567",
 *   "profile_status": "pending_approval",
 *   "is_profile_complete": true,
 *   "subjects": [...],
 *   "availability": [...],
 *   // ... more fields
 * }
 * ```
 */
export const getAdminTeacherById = async (teacherId: number) => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================

/**
 * ✅ POST /api/admin/teachers/{teacher_id}/approve
 * Approve, reject, or change the status of a teacher profile
 *
 * @param teacherId - The teacher ID to act upon
 * @param data - Action data
 *   - status: 'approved' | 'rejected' | 'suspended' (required)
 *   - rejection_reason: string (required for rejection/suspension)
 *
 * @returns Approval response object
 *
 * Examples:
 * ```
 * // Approve a teacher
 * await approveRejectTeacher(123, {
 *   status: 'approved'
 * });
 *
 * // Reject a teacher
 * await approveRejectTeacher(123, {
 *   status: 'rejected',
 *   rejection_reason: 'Incomplete documents'
 * });
 *
 * // Suspend a teacher
 * await approveRejectTeacher(123, {
 *   status: 'suspended',
 *   rejection_reason: 'Policy violation'
 * });
 * ```
 *
 * Response:
 * ```json
 * {
 *   "teacher_id": 123,
 *   "profile_status": "approved",
 *   "approved_by": 1,
 *   "approval_date": "2026-02-08T15:30:00.000Z",
 *   "rejection_reason": null,
 *   "message": "Teacher profile approved successfully."
 * }
 * ```
 */
export const approveRejectTeacher = async (
  teacherId: number,
  data: ApproveRejectRequest
) => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================

/**
 * ✅ POST /api/admin/teachers/{teacher_id}/approve (convenience wrapper)
 * Approve a teacher profile
 *
 * @param teacherId - The teacher ID to approve
 *
 * @returns Approval response
 *
 * Example:
 * ```
 * await approveTeacher(123);
 * ```
 *
 * Conditions:
 * - Teacher must have complete profile (is_profile_complete: true)
 * - Must be in pending_approval status
 * - All required documents must be uploaded
 */
export const approveTeacher = async (teacherId: number) => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================

/**
 * ✅ POST /api/admin/teachers/{teacher_id}/approve (convenience wrapper)
 * Reject a teacher profile
 *
 * @param teacherId - The teacher ID to reject
 * @param reason - Rejection reason (required, min 10 chars, max 1000 chars)
 *
 * @returns Approval response
 *
 * Example:
 * ```
 * await rejectTeacher(123, 'Incomplete research qualifications and missing degree certificate');
 * ```
 *
 * Conditions:
 * - Reason is required and will be sent to teacher
 * - Teacher can reapply after rejection
 * - Profile will be marked as 'rejected'
 */
export const rejectTeacher = async (teacherId: number, reason: string) => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================

/**
 * ✅ POST /api/admin/teachers/{teacher_id}/suspend
 * Suspend an approved teacher profile
 *
 * @param teacherId - The teacher ID to suspend
 * @param reason - Optional suspension reason (query parameter)
 *
 * @returns Suspension response
 *
 * Examples:
 * ```
 * // Suspend without reason
 * await suspendTeacher(123);
 *
 * // Suspend with reason
 * await suspendTeacher(123, 'Multiple student complaints');
 * ```
 *
 * Response:
 * ```json
 * {
 *   "teacher_id": 123,
 *   "profile_status": "suspended",
 *   "rejection_reason": "Multiple student complaints",
 *   "approval_date": "2026-02-08T16:00:00.000Z",
 *   "message": "Teacher profile suspended."
 * }
 * ```
 *
 * Conditions:
 * - Teacher must be in 'approved' status
 * - They will no longer be visible to students
 * - Existing bookings may be cancelled (backend handles)
 */
export const suspendTeacher = async (teacherId: number, reason?: string) => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================

/**
 * ✅ GET /api/admin/stats/teachers
 * Get aggregated statistics about all teachers
 *
 * @returns Teacher statistics object
 *
 * Example:
 * ```
 * const stats = await getTeacherStatistics();
 * console.log(`Total: ${stats.total_teachers}`);
 * console.log(`Pending: ${stats.pending_approval}`);
 * ```
 *
 * Response:
 * ```json
 * {
 *   "total_teachers": 150,
 *   "incomplete_profiles": 25,
 *   "pending_approval": 12,
 *   "approved": 100,
 *   "rejected": 8,
 *   "suspended": 5
 * }
 * ```
 *
 * Use cases:
 * - Dashboard overview
 * - Quick metrics display
 * - Performance monitoring
 * - Alert triggers (e.g., many pending approvals)
 */
export const getTeacherStatistics = async () => {
  // Implementation in api/admin/adminApi.ts
};

// ============================================================================
// Teacher OBJECT STRUCTURE
// ============================================================================

/**
 * Full Teacher Detail Response
 *
 * All admin APIs return teacher objects with this structure:
 */
interface TeacherDetailResponse {
  // Identity
  teacher_id: number;
  user_id: number;
  full_name: string;

  // Personal Information
  profile_picture: string | null;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;

  // Professional Information
  highest_qualification: string | null;
  institute: string | null;
  experience_years: number | null;

  // Teaching Information
  teaching_mode: string; // 'online', 'physical', 'both'
  session_type: string | null; // 'one_to_one', 'group', 'both'
  bio: string | null;

  // Location
  city_id: number | null;
  city: {
    id: number;
    name: string;
    province: string | null;
    country: string;
  } | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  physical_teaching_radius: number | null; // in kilometers

  // Profile Status
  profile_status: 'incomplete' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  is_profile_complete: boolean;

  // Ratings & Reviews
  rating: number | null; // 0-5
  total_reviews: number;
  total_students: number;

  // Subjects
  subjects: Array<{
    id: number;
    subject_id: number;
    level_id: number | null;
    fee_per_month: number | null;
    is_active: boolean;
    subject: {
      id: number;
      name: string;
      description: string | null;
      category: string | null;
    } | null;
    level: {
      id: number;
      name: string;
      description: string | null;
      order_rank: number;
    } | null;
  }>;

  // Availability
  availability: Array<{
    id: number;
    day_of_week: number; // 0 = Monday, 6 = Sunday
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
    is_active: boolean;
  }>;

  // Verification Documents
  cnic: string | null;
  degree_certificate: string | null; // URL to Supabase storage

  // Approval History
  approved_by: number | null; // Admin user ID who approved
  approval_date: string | null; // ISO datetime
  rejection_reason: string | null;

  // Legacy Fields (may be deprecated)
  qualification: string | null;
  hourly_rate: number | null;

  // Timestamps
  created_at: string; // ISO datetime
  updated_at: string | null; // ISO datetime
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * 401 Unauthorized
 * Returned when JWT token is missing, invalid, or expired
 *
 * Response:
 * ```json
 * {
 *   "detail": "Not authenticated"
 * }
 * ```
 */

/**
 * 403 Forbidden
 * Returned when user is authenticated but doesn't have admin role
 *
 * Response:
 * ```json
 * {
 *   "detail": "Admin access required"
 * }
 * ```
 */

/**
 * 404 Not Found
 * Returned when teacher ID doesn't exist
 *
 * Response:
 * ```json
 * {
 *   "detail": "Teacher not found"
 * }
 * ```
 */

/**
 * 400 Bad Request
 * Returned for various validation errors
 *
 * Examples:
 * ```json
 * {
 *   "detail": "Cannot approve teacher with incomplete profile"
 * }
 * ```
 *
 * ```json
 * {
 *   "detail": "Rejection reason is required when rejecting a teacher"
 * }
 * ```
 *
 * ```json
 * {
 *   "detail": "Invalid status filter. Valid options: ['incomplete', 'pending_approval', 'approved', 'rejected', 'suspended']"
 * }
 * ```
 */

/**
 * 500 Internal Server Error
 * Returned for server-side errors
 *
 * Response:
 * ```json
 * {
 *   "detail": "Internal server error"
 * }
 * ```
 */

// ============================================================================
// PAGINATION GUIDELINES
// ============================================================================

/**
 * All list endpoints support pagination:
 *
 * - skip: number (default 0) - Number of records to skip
 * - limit: number (default 100, max 100) - Records per page
 *
 * Example pagination flow:
 * ```
 * // First page
 * let skip = 0;
 * const limit = 20;
 *
 * while (true) {
 *   const teachers = await getAdminTeachers({ skip, limit });
 *
 *   if (teachers.length === 0) break;
 *
 *   // Process teachers
 *   processTeachers(teachers);
 *
 *   // Next page
 *   skip += limit;
 * }
 * ```
 */

// ============================================================================
// FILTERING BEST PRACTICES
// ============================================================================

/**
 * Status Filtering:
 *
 * - 'incomplete': Teachers who haven't completed all required fields
 *   Use for: Sending reminders to complete profiles
 *
 * - 'pending_approval': Teachers awaiting admin review
 *   Use for: Admin workflow, priority reviews
 *
 * - 'approved': Active teachers visible to students
 *   Use for: Student searches, platform statistics
 *
 * - 'rejected': Teachers who were rejected
 *   Use for: Re-engagement campaigns, follow-ups
 *
 * - 'suspended': Approved but suspended teachers
 *   Use for: Monitoring violations, review/reinstate processes
 */

/**
 * Example: Get count of teachers by status
 * ```
 * const statuses = ['incomplete', 'pending_approval', 'approved', 'rejected', 'suspended'];
 * const counts = {};
 *
 * for (const status of statuses) {
 *   const teachers = await getAdminTeachers({
 *     status_filter: status,
 *     limit: 1
 *   });
 *   counts[status] = teachers.length; // Not accurate - use getTeacherStatistics instead
 * }
 *
 * // Better approach:
 * const stats = await getTeacherStatistics();
 * ```
 */

// ============================================================================
// PERFORMANCE NOTES
// ============================================================================

/**
 * API Performance Tips:
 *
 * 1. Use getTeacherStatistics() for dashboard metrics (faster than filtering)
 * 2. Use pagination with reasonable limit (20-50 items per page)
 * 3. Cache statistics and refresh every 5-10 minutes
 * 4. Use status filter to reduce response size
 * 5. Implement search on client-side when possible
 * 6. Load teacher details only when needed (not in list view)
 * 7. Consider batch operations for multiple approvals
 */

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * All admin endpoints require:
 *
 * 1. Valid JWT token in request header:
 *    Authorization: Bearer <access_token>
 *
 * 2. User must have role: "admin"
 *
 * Token is automatically added via API interceptor in api/admin/adminApi.ts
 *
 * If token expires:
 * - API returns 401 Unauthorized
 * - App should redirect to login screen
 * - User must log in again to get new token
 */

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Current API does not have documented rate limits.
 * Recommended practice:
 *
 * - Don't refresh statistics more than every 30 seconds
 * - Batch approval actions when possible
 * - Use pull-to-refresh instead of constant polling
 * - Implement exponential backoff for retries
 */
