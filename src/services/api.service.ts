/**
 * API Service - Backend Communication
 */

import axios, { AxiosInstance } from 'axios';
import {
  ApiResponse,
  CallPermission,
  PermissionCheckResult,
  PermissionRequestResponse,
  PermissionStatusResponse,
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private backendUrl: string;
  private fromNumber: string;

  constructor() {
    this.backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    this.fromNumber = process.env.REACT_APP_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    this.client = axios.create({
      baseURL: this.backendUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420', // Bypass ngrok browser warning
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        throw error;
      }
    );
  }

  /**
   * Request call permission for a contact
   */
  async requestPermission(
    phoneNumber: string,
    hubspotContactId: string
  ): Promise<PermissionRequestResponse> {
    try {
      const response = await this.client.post<ApiResponse<PermissionRequestResponse>>(
        '/wacall/api/permissions/request',
        { phoneNumber, hubspotContactId }
      );

      if (response.data.data) {
        return response.data.data;
      }

      // Fallback for non-standard response format
      return {
        status: 'unknown',
        error: 'Invalid response format',
      };
    } catch (error: any) {
      if (error.response?.status === 429) {
        // Rate limit error
        return {
          status: error.response.data.data?.status || 'rate_limited',
          error: error.response.data.error || 'Rate limit exceeded',
          permission: error.response.data.data?.permission,
        };
      }
      throw error;
    }
  }

  /**
   * Check permission status for a phone number
   */
  async checkPermissionStatus(phoneNumber: string): Promise<PermissionStatusResponse> {
    try {
      const encodedNumber = encodeURIComponent(phoneNumber);
      const response = await this.client.get<ApiResponse<PermissionStatusResponse>>(
        `/wacall/api/permissions/status/${encodedNumber}`
      );

      return response.data.data || {
        status: 'error',
        permission: {} as CallPermission,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          status: 'not_found',
          permission: {} as CallPermission,
        };
      }
      throw error;
    }
  }

  /**
   * Validate permission before making a call
   */
  async validatePermission(phoneNumber: string): Promise<PermissionCheckResult> {
    try {
      const response = await this.client.post<ApiResponse<PermissionCheckResult>>(
        '/wacall/api/permissions/validate',
        { phoneNumber }
      );

      return response.data.data || { canCall: false, reason: 'Unknown error' };
    } catch (error) {
      return {
        canCall: false,
        reason: 'Failed to validate permission. Please try again.',
      };
    }
  }

  /**
   * Grant permission manually (for testing)
   */
  async grantPermission(phoneNumber: string): Promise<void> {
    await this.client.post('/wacall/api/permissions/grant', { phoneNumber });
  }

  /**
   * Revoke permission
   */
  async revokePermission(phoneNumber: string): Promise<void> {
    await this.client.post('/wacall/api/permissions/revoke', { phoneNumber });
  }

  /**
   * Initiate outbound call
   */
  async initiateCall(data: {
    phoneNumber: string;
    contactId: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await this.client.post<ApiResponse>(
        '/wacall/api/calls/initiate',
        {
          phoneNumber: data.phoneNumber,
          hubspotContactId: data.contactId,
        }
      );

      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('Failed to initiate call:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to initiate call',
      };
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<{
    status: string;
    duration?: number;
    recordingUrl?: string;
  }> {
    try {
      const response = await this.client.get<ApiResponse>(
        `/api/calls/status/${callSid}`
      );

      return response.data.data || { status: 'unknown' };
    } catch (error) {
      console.error('Failed to get call status:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * End active call
   */
  async endCall(callSid: string, status?: string): Promise<void> {
    try {
      await this.client.post('/wacall/api/calls/end', { callSid, status });
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get backend URL
   */
  getBackendUrl(): string {
    return this.backendUrl;
  }

  /**
   * Get the "from" number for WhatsApp calls
   * In production, this would come from environment or backend config
   */
  getFromNumber(): string {
    // This should match your Twilio WhatsApp sender number
    // Stored during initialization so it works in browser runtime
    return this.fromNumber;
  }
}

export default new ApiService();
