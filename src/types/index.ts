/**
 * WhatsApp Calling Widget Types
 */

// ========== Permission Types ==========

export type PermissionStatus = 'pending' | 'granted' | 'denied' | 'revoked' | 'expired';

export interface CallPermission {
  id?: string;
  phone_number: string;
  hubspot_contact_id: string;
  permission_status: PermissionStatus;
  permission_requested_at?: string;
  permission_granted_at?: string;
  permission_expires_at?: string;
  missed_call_count: number;
  last_call_attempt?: string;
  last_successful_call?: string;
  whatsapp_sender: string;
  template_sid?: string;
  original_message_sid?: string;
  total_incoming_calls: number;
  total_outgoing_calls: number;
  last_incoming_call?: string;
  incoming_call_status: 'allowed' | 'blocked';
  notes?: string;
  permission_request_count?: number;
  last_permission_request_at?: string;
  first_permission_request_at?: string;
}

export interface PermissionCheckResult {
  canCall: boolean;
  reason?: string;
  permission?: CallPermission;
}

export interface PermissionStatusResponse {
  status: string; // "requested", "already_granted", "rate_limit_24h", etc.
  messageSid?: string;
  permission: CallPermission;
  error?: string;
}

// ========== Call Types ==========

export type CallDirection = 'OUTBOUND' | 'INBOUND';
export type CallEndStatus = 'COMPLETED' | 'FAILED' | 'CANCELED' | 'NO_ANSWER' | 'BUSY';

export interface CallData {
  callId: string;
  toNumber: string;
  fromNumber: string;
  direction: CallDirection;
  startTime?: number;
  endTime?: number;
  duration?: number;
  status?: CallEndStatus;
  notes?: string;
  isRecorded?: boolean;
  recordingUrl?: string;
}

export interface IncomingCallData {
  callSid: string;
  fromNumber: string;
  toNumber: string;
  contactId?: string;
  contactName?: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  callStartTime: number;
  engagementId?: number;
}

// ========== Screen Types ==========

export type ScreenType =
  | 'LOADING'
  | 'LOGIN'
  | 'KEYPAD'
  | 'PERMISSION_REQUEST'
  | 'PERMISSION_PENDING'
  | 'PERMISSION_DENIED'
  | 'DIALING'
  | 'INCOMING'
  | 'CALLING'
  | 'CALL_ENDED';

export interface ScreenProps {
  onNext: () => void;
  onBack?: () => void;
  [key: string]: any;
}

// ========== HubSpot SDK Types ==========

export interface HubSpotEngagement {
  engagementId: number;
  portalId: number;
  objectId?: number;
  objectType?: 'CONTACT' | 'COMPANY';
}

export interface HubSpotUserInfo {
  userId: number;
  portalId: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface OutgoingCallInfo {
  toNumber: string;
  fromNumber: string;
  callId: string;
  createEngagement: boolean;
  hubspotContactId?: string;
}

// ========== API Response Types ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PermissionRequestResponse {
  status: string;
  messageSid?: string;
  permission?: CallPermission;
  error?: string;
}

// ========== App State Types ==========

export interface AppState {
  screen: ScreenType;
  isLoggedIn: boolean;
  userInfo?: HubSpotUserInfo;
  isAvailable: boolean;
  currentCall?: CallData;
  engagement?: HubSpotEngagement;
  dialNumber: string;
  fromNumber: string;
  permission?: CallPermission;
  error?: string;
}

// ========== Configuration ==========

export interface WidgetConfig {
  backendUrl: string;
  websocketUrl: string;
  twilioNumber: string;
}
