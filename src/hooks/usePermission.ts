/**
 * Permission Management Hook
 */

import { useState, useCallback } from 'react';
import apiService from '../services/api.service';
import { PermissionStatus } from '../types';

interface PermissionState {
  status: PermissionStatus | null;
  isChecking: boolean;
  isRequesting: boolean;
  error: string | null;
  canCall: boolean;
  reason?: string;
}

export const usePermission = () => {
  const [state, setState] = useState<PermissionState>({
    status: null,
    isChecking: false,
    isRequesting: false,
    error: null,
    canCall: false,
  });

  /**
   * Check if user haspermission to call
   */
  const checkPermission = useCallback(async (phoneNumber: string) => {
    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const result = await apiService.checkPermissionStatus(phoneNumber);

      // Validate the response
      if (!result || result.status === 'error' || !result.permission || !result.permission.permission_status) {
        const errorMessage = result?.error || 'Invalid response from server';
        setState((prev) => ({
          ...prev,
          isChecking: false,
          error: errorMessage,
          canCall: false,
        }));
        throw new Error(errorMessage);
      }

      setState({
        status: result.permission.permission_status,
        isChecking: false,
        isRequesting: false,
        error: null,
        canCall: result.permission.permission_status === 'granted',
      });

      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to check permission';
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: errorMessage,
        canCall: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Request permission to call
   */
  const requestPermission = useCallback(
    async (phoneNumber: string, contactId: string) => {
      setState((prev) => ({ ...prev, isRequesting: true, error: null }));

      try {
        const result = await apiService.requestPermission(phoneNumber, contactId);

        // Check for error status
        if (!result || result.status === 'error') {
          const errorMessage = result?.error || 'Invalid response from server';
          setState((prev) => ({
            ...prev,
            isRequesting: false,
            error: errorMessage,
          }));
          throw new Error(errorMessage);
        }

        // Handle rate limiting
        if (result.status === 'rate_limit_24h' || result.status === 'rate_limit_7d') {
          setState({
            status: result.permission?.permission_status || null,
            isChecking: false,
            isRequesting: false,
            error: result.error || 'Rate limit exceeded',
            canCall: false,
            reason: result.error,
          });
          return result;
        }

        // Validate permission object
        if (!result.permission || !result.permission.permission_status) {
          const errorMessage = 'Invalid permission response';
          setState((prev) => ({
            ...prev,
            isRequesting: false,
            error: errorMessage,
          }));
          throw new Error(errorMessage);
        }

        setState({
          status: result.permission.permission_status,
          isChecking: false,
          isRequesting: false,
          error: null,
          canCall: false, // Will be granted after user responds
        });

        return result;
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to request permission';
        setState((prev) => ({
          ...prev,
          isRequesting: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Validate permission before making a call
   */
  const validatePermission = useCallback(async (phoneNumber: string) => {
    try {
      const result = await apiService.validatePermission(phoneNumber);

      setState((prev) => ({
        ...prev,
        canCall: result.canCall,
        reason: result.reason,
      }));

      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Permission validation failed';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        canCall: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Reset permission state
   */
  const resetPermission = useCallback(() => {
    setState({
      status: null,
      isChecking: false,
      isRequesting: false,
      error: null,
      canCall: false,
    });
  }, []);

  return {
    ...state,
    checkPermission,
    requestPermission,
    validatePermission,
    resetPermission,
  };
};
