export interface User {
  id: string;
  email?: string;
  name: string;
  role?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
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

export interface Protocol {
  id: string;
  name: string;
  type: "in-lab" | "real-world";
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  id: string;
  title: string;
  time: number;
  rating: number;
  description: string;
  additionalNotes: string;
  sensors: string[];
  subsections: SubsectionItem[];
  type: "section";
  enabled: boolean;
}

export interface Subsection {
  id: string;
  title: string;
  time: number;
  rating?: number;
  description: string;
  additionalNotes: string;
  enabled: boolean;
  type: "subsection" | "break";
}

export type SubsectionItem = Subsection;

export interface Sensor {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  tags: string[];
  isShared: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SharedSection {
  id: string;
  title: string;
  description: string;
  template: boolean;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SharedSubsection {
  id: string;
  title: string;
  time: number;
  rating?: number;
  description: string;
  additional_notes: string;
  enabled: boolean;
  type: "subsection" | "break";
  created_by: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Template data for creating new subsections
  templateData?: Omit<Subsection, "id">;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: string;
}

export interface SyncQueueItem {
  type: "protocol" | "sensor" | "section";
  id: string;
  data: any;
  timestamp: string;
  attempts?: number;
}

export interface DataProviderStatus {
  online: boolean;
  authenticated: boolean;
  pendingSync: number;
  cacheKeys: string[];
  tokenExpiry?: string;
}

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
  | "deleting"
  | "deleted"
  | "logging_in"
  | "logged_in"
  | "logged_out"
  | "session_expired"
  | "token_refreshed"
  | "auth_error"
  | "api_error"
  | "storage_error"
  | "error"
  | "sync_warning"
  | "using_cached"
  | "cache_cleared"
  | "protocol_updated";

export type DataProviderEventCallback = (
  type: NotificationType,
  data: any,
) => void;

export interface StoredProtocol extends Protocol {
  lastModified: string;
  syncStatus: "pending" | "synced" | "error";
  lastSyncedAt?: string;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProtocolData {
  name: string;
  type: "in-lab" | "real-world";
  sections?: Section[];
}

export interface UpdateProtocolData extends Partial<CreateProtocolData> {
  sections?: Section[];
}

export interface CreateSensorData {
  name: string;
  description: string;
  type: string;
  category: string;
  tags?: string[];
  isShared?: boolean;
}

export interface CreateSectionData {
  title: string;
  description: string;
  template?: boolean;
  isShared?: boolean;
}

export interface CreateSubsectionData {
  title: string;
  time: number;
  rating?: number;
  description: string;
  additionalNotes?: string;
  type?: "subsection" | "break";
  isPublic?: boolean;
}
