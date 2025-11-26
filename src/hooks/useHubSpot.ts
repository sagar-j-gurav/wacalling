/**
 * HubSpot SDK Integration Hook
 *
 * Follows official HubSpot demo pattern to ensure only one widget is initialized:
 * https://github.com/HubSpot/calling-extensions-sdk/blob/master/demos/demo-react-ts/src/hooks/useCti.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import hubspotService from '../services/hubspot.service';
import { HubSpotUserInfo, OutgoingCallInfo, IncomingCallData } from '../types';

interface HubSpotState {
  isReady: boolean;
  portalId: number | null;
  userId: number | null;
  engagementId: number | null;
  isLoggedIn: boolean;
  dialedNumber: string | null;
  contactId: string | null;
  contactType: 'CONTACT' | 'COMPANY' | null;
  iframeLocation: 'widget' | 'window' | null;  // 'widget' = embedded, 'window' = popup
}

export const useHubSpot = () => {
  const [state, setState] = useState<HubSpotState>({
    isReady: false,
    portalId: null,
    userId: null,
    engagementId: null,
    isLoggedIn: false,
    dialedNumber: null,
    contactId: null,
    contactType: null,
    iframeLocation: null,
  });

  // Track if this hook instance has initialized to prevent double initialization in StrictMode
  const isInitializedRef = useRef(false);

  /**
   * Initialize HubSpot SDK - only once even with React StrictMode
   */
  useEffect(() => {
    // Prevent double initialization from React StrictMode
    if (isInitializedRef.current) {
      console.log('🔄 HubSpot hook already initialized (StrictMode re-mount)');
      return;
    }
    isInitializedRef.current = true;

    console.log('🚀 Initializing HubSpot SDK...');
    hubspotService.initialize();

    // Listen for ready event
    hubspotService.onReady((data) => {
      console.log('✅ HubSpot SDK Ready:', data);
      console.log('📍 iframeLocation:', data.iframeLocation);  // 'widget' = embedded, 'window' = popup
      setState((prev) => ({
        ...prev,
        isReady: true,
        portalId: data.portalId,
        userId: data.userId || null,
        engagementId: data.engagementId || null,
        iframeLocation: data.iframeLocation || null,
      }));
    });

    // Listen for dial number events (click-to-call from contact records)
    hubspotService.onDialNumber((data) => {
      console.log('📞 Dial Number Event with Full Context:', data);
      setState((prev) => ({
        ...prev,
        dialedNumber: data.phoneNumber,
        contactId: data.objectId ? String(data.objectId) : null,
        contactType: data.objectType || null,
      }));
    });

    // Listen for engagement created events
    hubspotService.onEngagementCreated((data) => {
      console.log('📝 Engagement Created:', data);
      setState((prev) => ({
        ...prev,
        engagementId: data.engagementId,
      }));
    });

    // Note: We don't unsubscribe because:
    // 1. The service is a singleton that persists across re-mounts
    // 2. The handlers Set in the service prevents duplicate listeners
    // 3. The isInitializedRef guard prevents re-adding listeners on StrictMode re-mount
  }, []);

  /**
   * User login
   */
  const login = useCallback((userInfo?: HubSpotUserInfo) => {
    hubspotService.userLoggedIn(userInfo);
    setState((prev) => ({ ...prev, isLoggedIn: true }));
  }, []);

  /**
   * User logout
   */
  const logout = useCallback(() => {
    hubspotService.userLoggedOut();
    setState((prev) => ({ ...prev, isLoggedIn: false }));
  }, []);

  /**
   * Set user availability
   */
  const setAvailable = useCallback(() => {
    hubspotService.setUserAvailable();
  }, []);

  const setUnavailable = useCallback(() => {
    hubspotService.setUserUnavailable();
  }, []);

  /**
   * Start outgoing call
   */
  const startOutgoingCall = useCallback((info: OutgoingCallInfo) => {
    hubspotService.startOutgoingCall(info);
  }, []);

  /**
   * Notify incoming call
   */
  const notifyIncomingCall = useCallback((data: IncomingCallData) => {
    hubspotService.notifyIncomingCall(data);
  }, []);

  /**
   * Call answered
   */
  const callAnswered = useCallback((externalCallId: string) => {
    hubspotService.callAnswered(externalCallId);
  }, []);

  /**
   * Call ended
   */
  const callEnded = useCallback((data: {
    externalCallId: string;
    engagementId: number;
    callEndStatus: string;
  }) => {
    hubspotService.callEnded({
      externalCallId: data.externalCallId,
      engagementId: data.engagementId,
      callEndStatus: data.callEndStatus as any,
    });
  }, []);

  /**
   * Call completed
   */
  const callCompleted = useCallback(
    (engagementProperties?: any) => {
      if (!state.engagementId) {
        console.warn('No engagement ID available');
        return;
      }

      hubspotService.callCompleted({
        engagementId: state.engagementId,
        hideWidget: false,
        engagementProperties,
      });
    },
    [state.engagementId]
  );

  /**
   * Clear dialed number and contact context (after handling click-to-call)
   */
  const clearDialedNumber = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dialedNumber: null,
      contactId: null,
      contactType: null,
    }));
  }, []);

  /**
   * Check if running in popup window (for incoming calls)
   */
  const isInPopupWindow = useCallback(() => {
    return state.iframeLocation === 'window';
  }, [state.iframeLocation]);

  /**
   * Check if running in embedded widget (for outbound calls)
   */
  const isInEmbeddedWidget = useCallback(() => {
    return state.iframeLocation === 'widget';
  }, [state.iframeLocation]);

  return {
    ...state,
    login,
    logout,
    setAvailable,
    setUnavailable,
    startOutgoingCall,
    notifyIncomingCall,
    callAnswered,
    callEnded,
    callCompleted,
    clearDialedNumber,
    isInPopupWindow,
    isInEmbeddedWidget,
  };
};
