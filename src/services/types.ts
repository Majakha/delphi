export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: {
    token: string;
    user: User;
    expiresAt: string;
  };
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string; // Can be username or email
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// ===== TASKS =====

export interface Task {
  id: string;
  title: string;
  time: number | null;
  rating: number | null;
  description: string | null;
  additional_notes: string | null;
  enabled: boolean;
  type: "task" | "break";
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Optional relationship data when fetched with relations
  sensors?: Sensor[];
  domains?: Domain[];
}

export interface TaskWithRelations extends Task {
  sensors: Sensor[];
  domains: Domain[];
}

export interface CreateTaskData {
  title: string;
  time?: number;
  rating?: number;
  description?: string;
  additional_notes?: string;
  type?: "task" | "break";
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  enabled?: boolean;
}

// ===== DOMAINS =====

export interface Domain {
  id: string;
  name: string;
  description: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDomainData {
  name: string;
  description?: string;
}

export interface UpdateDomainData extends Partial<CreateDomainData> {}

// ===== SENSORS =====

export interface Sensor {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSensorData {
  name: string;
  category: string;
  description?: string;
}

export interface UpdateSensorData extends Partial<CreateSensorData> {}

// ===== PROTOCOLS =====

export interface Protocol {
  id: string;
  name: string;
  description: string | null;
  is_template: boolean;
  template_protocol_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProtocolTask {
  protocol_task_id: string;
  task_id: string;
  order_index: number;
  importance_rating: number | null;
  notes: string | null;
  // Original task properties
  title: string;
  time: number | null;
  description: string | null;
  additional_notes: string | null;
  type: "task" | "break";
  rating: number | null;
  // Override indicators
  has_title_override: boolean;
  has_time_override: boolean;
  has_description_override: boolean;
  has_notes_override: boolean;
  // Relationships
  sensors: Sensor[];
  domains: Domain[];
}

export interface FullProtocol extends Protocol {
  tasks: ProtocolTask[];
}

export interface CreateProtocolData {
  name: string;
  description?: string;
  is_template?: boolean;
  template_protocol_id?: string;
}

export interface UpdateProtocolData extends Partial<CreateProtocolData> {}

export interface AddTaskToProtocolData {
  order_index?: number;
  importance_rating?: number;
  notes?: string;
  copy_defaults?: boolean;
}

export interface UpdateProtocolTaskData {
  order_index?: number;
  importance_rating?: number;
  notes?: string;
  override_title?: string;
  override_time?: number;
  override_description?: string;
  override_additional_notes?: string;
}

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  timestamp: string;
  data: T;
}

export interface ApiListResponse<T = any> {
  success: boolean;
  message: string;
  timestamp: string;
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiError {
  error: {
    type: string;
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    details?: any;
  };
}

// ===== STORAGE & CACHE =====

export interface CacheEntry<T = any> {
  data: T;
  timestamp: string;
}

export interface SyncQueueItem {
  type: "protocol" | "task" | "sensor" | "domain";
  action: "create" | "update" | "delete";
  id: string;
  data: any;
  timestamp: string;
  attempts?: number;
}

export interface StoredProtocol extends FullProtocol {
  lastModified: string;
  syncStatus: "pending" | "synced" | "error";
  lastSyncedAt?: string;
}

// ===== UTILITY TYPES =====

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  q?: string;
  type?: string;
  category?: string;
  user_only?: boolean;
  templates_only?: boolean;
}

// ===== PROVIDER STATUS =====

export interface DataProviderStatus {
  online: boolean;
  authenticated: boolean;
  pendingSync: number;
  cacheKeys: string[];
  tokenExpiry?: string;
}

// ===== NOTIFICATIONS =====

export interface Notification {
  id: number;
  type: NotificationType;
  data: any;
  timestamp: Date;
  read: boolean;
}

export type NotificationType =
  | "loading"
  | "loaded"
  | "saving"
  | "saved_locally"
  | "synced"
  | "syncing"
  | "sync_failed"
  | "creating"
  | "created"
  | "updating"
  | "updated"
  | "deleting"
  | "deleted"
  | "logging_in"
  | "logged_in"
  | "logging_out"
  | "logged_out"
  | "registering"
  | "registered"
  | "session_expired"
  | "token_refreshed"
  | "auth_error"
  | "api_error"
  | "storage_error"
  | "validation_error"
  | "authorization_error"
  | "error"
  | "sync_warning"
  | "using_cached"
  | "cache_cleared"
  | "protocol_updated"
  | "task_added"
  | "task_removed"
  | "task_updated"
  | "task_reordered"
  | "tasks_reordered";

export type DataProviderEventCallback = (
  type: NotificationType,
  data: any,
) => void;

// ===== FILTER & QUERY OPTIONS =====

export interface TaskFilters {
  type?: "task" | "break";
  user_only?: boolean;
  with_relations?: boolean;
}

export interface SensorFilters {
  category?: string;
  user_only?: boolean;
}

export interface DomainFilters {
  user_only?: boolean;
}

export interface ProtocolFilters {
  templates_only?: boolean;
  user_only?: boolean;
  full?: boolean;
}

// ===== MODIFICATION TRACKING =====

export interface ModificationRecord {
  id: string;
  user_id: string;
  protocol_task_id: string;
  field_name: string;
  original_value: string | null;
  modified_value: string | null;
  created_at: string;
}

// ===== COMPONENT USAGE =====

export interface ComponentUsage {
  id: string;
  user_id: string;
  component_type: "sensor" | "task" | "domain" | "protocol";
  component_id: string;
  use_count: number;
  last_used: string;
  created_at: string;
  updated_at: string;
}
