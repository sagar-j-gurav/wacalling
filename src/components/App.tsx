/**
 * Main Application Component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Header, Title } from './StyledComponents';
import { useHubSpot } from '../hooks/useHubSpot';
import { usePermission } from '../hooks/usePermission';
import { useCallTimer } from '../hooks/useCallTimer';
import websocketService from '../services/websocket.service';
import webrtcService from '../services/webrtc.service';
import apiService from '../services/api.service';
import { generateCallId, cleanPhoneNumber, formatDuration } from '../utils/formatters';
import { storage } from '../utils/storage';
import { notificationService } from '../utils/notifications';
import {
  ScreenType,
  IncomingCallData,
  CallEndStatus,
} from '../types';

// Import screen components
import { LoadingScreen } from './screens/LoadingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { KeypadScreen } from './screens/KeypadScreen';
import { PermissionRequestScreen } from './screens/PermissionRequestScreen';
import { PermissionPendingScreen } from './screens/PermissionPendingScreen';
import { PermissionDeniedScreen } from './screens/PermissionDeniedScreen';
import { DialingScreen } from './screens/DialingScreen';
import { IncomingScreen } from './screens/IncomingScreen';
import { CallingScreen } from './screens/CallingScreen';
import { CallEndedScreen } from './screens/CallEndedScreen';

// Local state interface for App component
interface LocalAppState {
  currentScreen: ScreenType;
  phoneNumber: string | undefined;
  callSid: string | undefined;
  engagementId: number | undefined;
  callDirection: 'inbound' | 'outbound' | undefined;
  callStartTime: number | undefined;
  callEndStatus: CallEndStatus | undefined;
  contactId: string | undefined;
  contactName: string | undefined;
  isCallActive: boolean;
  isCallConnected: boolean; // true = connected and can talk, false = ringing
  error: string | undefined;
  hasSeenGetStarted: boolean;
  callDuration: number; // Duration in seconds
}

export const App: React.FC = () => {
  // HubSpot SDK integration
  const hubspot = useHubSpot();

  // Permission management
  const permission = usePermission();

  // Call timer
  const timer = useCallTimer(false);

  // Application state
  const [state, setState] = useState<LocalAppState>({
    currentScreen: 'LOADING',
    phoneNumber: undefined,
    callSid: undefined,
    engagementId: undefined,
    callDirection: undefined,
    callStartTime: undefined,
    callEndStatus: undefined,
    contactId: undefined,
    contactName: undefined,
    isCallActive: false,
    isCallConnected: false,
    error: undefined,
    hasSeenGetStarted: false,
    callDuration: 0,
  });

  // Keypad permission status state (separate from permission hook for display)
  const [keypadPermissionStatus, setKeypadPermissionStatus] = useState<
    'granted' | 'pending' | 'denied' | 'not_requested' | 'checking' | null
  >(null);

  // Refs for duration timer (shared between WebSocket and WebRTC useEffects)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callAnsweredTimeRef = useRef<number>(0);

  /**
   * Start duration timer (shared function for both incoming and outbound calls)
   */
  const startDurationTimer = useCallback((callSid: string) => {
    console.log('⏱️ Starting duration timer for call:', callSid);
    callAnsweredTimeRef.current = Date.now();

    // Clear any existing interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Start interval to update duration every second
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callAnsweredTimeRef.current) / 1000);
      console.log('⏱️ Updating duration:', elapsed);
      setState((p) => ({ ...p, callDuration: elapsed }));
    }, 1000);

    console.log('⏱️ Duration timer started');
  }, []);

  /**
   * Stop duration timer
   */
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    callAnsweredTimeRef.current = 0;
  }, []);

  /**
   * Initialize application
   */
  useEffect(() => {
    // Development mode: Skip HubSpot requirement when REACT_APP_DEV_MODE=true
    const devModeEnabled = process.env.REACT_APP_DEV_MODE === 'true';
    const isStandalone = window.self === window.top; // Not in iframe

    if (devModeEnabled && isStandalone) {
      // Bypass HubSpot SDK for local testing
      console.log('🔧 Development Mode: Running standalone (not in HubSpot iframe)');
      console.log('⚠️ Skipping HubSpot SDK requirement for local testing');

      setTimeout(() => {
        // Check if user has seen welcome screen before
        const hasSeenWelcome = storage.hasSeenWelcome();

        if (hasSeenWelcome) {
          console.log('✅ User has seen welcome - going directly to KEYPAD');
          setState((prev) => ({ ...prev, currentScreen: 'KEYPAD' }));
        } else {
          console.log('👋 First time user - showing LOGIN screen');
          setState((prev) => ({ ...prev, currentScreen: 'LOGIN' }));
        }
      }, 1000);
      return;
    }

    // Production mode: Wait for HubSpot SDK to be ready
    if (hubspot.isReady && !hubspot.isLoggedIn) {
      // Check if user has seen welcome screen before
      const hasSeenWelcome = storage.hasSeenWelcome();

      if (hasSeenWelcome) {
        console.log('✅ User has seen welcome - auto-logging in and going directly to KEYPAD');
        // Auto-login for returning users so dialedNumber events work
        hubspot.login();
        hubspot.setAvailable();
        setState((prev) => ({ ...prev, currentScreen: 'KEYPAD' }));
      } else {
        console.log('👋 First time user - showing LOGIN screen');
        setState((prev) => ({ ...prev, currentScreen: 'LOGIN' }));
      }
    }
  }, [hubspot.isReady, hubspot.isLoggedIn, hubspot]);

  /**
   * Handle click-to-call from HubSpot (dialedNumber event)
   */
  useEffect(() => {
    console.log('🔔 dialedNumber useEffect fired');
    console.log('🔔 hubspot.dialedNumber:', hubspot.dialedNumber);
    console.log('🔔 hubspot.isLoggedIn:', hubspot.isLoggedIn);

    if (hubspot.dialedNumber && hubspot.isLoggedIn) {
      console.log('✅ Click-to-call triggered:', hubspot.dialedNumber);
      console.log('✅ Setting state.phoneNumber to:', hubspot.dialedNumber);

      setState((prev) => ({
        ...prev,
        phoneNumber: hubspot.dialedNumber || undefined,
        currentScreen: 'KEYPAD',
        error: undefined,
      }));

      console.log('✅ State updated, clearing dialedNumber');
      hubspot.clearDialedNumber();

      // Auto-check permission will be handled by KeypadScreen's onCheckPermission
    }
  }, [hubspot.dialedNumber, hubspot.isLoggedIn, hubspot.clearDialedNumber]);

  /**
   * Setup WebSocket for incoming calls and call status updates
   */
  useEffect(() => {
    if (!hubspot.isLoggedIn || !hubspot.userId) return;

    console.log('🔌 Connecting to WebSocket for incoming calls...');
    websocketService.connect(hubspot.userId.toString());

    const unsubscribeIncoming = websocketService.onIncomingCall((data: IncomingCallData) => {
      console.log('📥 Incoming call received:', data);
      console.log('📍 Current iframeLocation:', hubspot.iframeLocation);

      // Notify HubSpot SDK (this will open the popup window if in embedded widget)
      hubspot.notifyIncomingCall(data);

      // IMPORTANT: Only show incoming call UI if we're in the popup window
      // HubSpot iframeLocation values:
      //   'window' - Popup window (show incoming call UI HERE)
      //   'widget' - Embedded iframe in CRM (don't show UI)
      //   'remote' - Cross-tab communication mode (don't show UI - popup handles it)
      //   null     - Dev mode / standalone (show UI for testing)
      if (hubspot.iframeLocation === 'widget' || hubspot.iframeLocation === 'remote') {
        console.log(`📍 ${hubspot.iframeLocation} mode - letting popup window handle incoming call UI`);
        return;  // Let the popup window handle the incoming call UI
      }

      console.log('📍 Showing incoming call UI (popup window or dev mode)');

      // Show browser notification (works even when tab is in background)
      notificationService.showIncomingCallNotification(
        data.fromNumber,
        data.contactName,
        () => {
          // On notification click, focus window
          window.focus();
        }
      );

      // Show incoming call screen
      setState((prev) => ({
        ...prev,
        currentScreen: 'INCOMING',
        phoneNumber: data.fromNumber,
        callSid: data.callSid,
        callDirection: 'inbound',
        callStartTime: data.callStartTime,
        contactId: data.contactId,
        contactName: data.contactName,
        engagementId: data.engagementId,
        isCallConnected: false, // Not connected yet
        callDuration: 0, // Reset duration for new incoming call
      }));
    });

    // Listen for call status updates from Twilio
    const unsubscribeStatus = websocketService.onCallStatusUpdate((data: any) => {
      console.log('📞 Call status update:', data);

      // Call completed - handled in endCall function
    });

    // Listen for when WhatsApp user picks up the call (OUTBOUND calls only)
    const unsubscribeAnswered = websocketService.onCallAnswered((data: any) => {
      console.log('✅ WhatsApp user answered the call:', data);

      // Check callSid match first
      setState((prev) => {
        console.log('🔍 Comparing callSids:', {
          eventCallSid: data.callSid,
          stateCallSid: prev.callSid,
          match: data.callSid === prev.callSid
        });

        // Only process if this is our current call
        if (data.callSid !== prev.callSid) {
          console.warn('⚠️ Call answered event for different call, ignoring');
          return prev;
        }

        // Start the timer NOW (when WhatsApp user actually picks up)
        timer.start();

        // Notify HubSpot that call was answered
        if (prev.callSid) {
          hubspot.callAnswered(prev.callSid);
        }

        // Start duration timer (for outbound calls)
        startDurationTimer(prev.callSid!);

        return {
          ...prev,
          isCallConnected: true, // NOW show "Connected"!
          callDuration: 0, // Start from 0
        };
      });
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeStatus();
      unsubscribeAnswered();
      websocketService.disconnect();

      // Clean up duration timer
      stopDurationTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubspot.isLoggedIn, hubspot.userId, startDurationTimer, stopDurationTimer]);

  /**
   * Initialize WebRTC Device
   */
  useEffect(() => {
    if (!hubspot.isLoggedIn || !hubspot.userId) return;

    let isActive = true;

    const initWebRTC = async () => {
      if (!isActive) return;

      try {
        console.log('🎤 Initializing WebRTC Device...');
        const identity = `hubspot_${hubspot.userId}`;
        await webrtcService.initialize(identity);

        if (!isActive) return;

        // Setup call status callback
        webrtcService.onCallStatus((event) => {
          console.log('📞 WebRTC Call Status:', event.status);

          switch (event.status) {
            case 'connecting':
              // Already handled by initiateCall
              break;

            case 'ringing':
              // Ringing event can be for:
              // 1. Outbound call - We called someone, their phone is ringing
              // 2. Incoming call - WebRTC call arrived (but we haven't accepted yet)
              setState((prev) => {
                const twilioCallSid = event.call?.parameters?.CallSid;
                if (twilioCallSid && twilioCallSid !== prev.callSid) {
                  console.log('🔄 Updating callSid on ringing:', {
                    from: prev.callSid,
                    to: twilioCallSid,
                    direction: prev.callDirection,
                  });
                }

                // For INCOMING calls, stay on INCOMING screen (don't auto-switch to CALLING)
                // User needs to manually accept first
                if (prev.callDirection === 'inbound') {
                  console.log('📞 Incoming call - staying on INCOMING screen');
                  return {
                    ...prev,
                    callSid: twilioCallSid || prev.callSid,
                  };
                }

                // For OUTBOUND calls, show CALLING screen
                return {
                  ...prev,
                  currentScreen: 'CALLING',
                  isCallConnected: false, // Ringing, not connected yet
                  callSid: twilioCallSid || prev.callSid,
                };
              });
              break;

            case 'connected':
              // WebRTC connected (browser ↔ Twilio audio stream established)
              console.log('🔊 WebRTC audio stream connected to Twilio');

              setState((prev) => {
                // For INCOMING calls: WhatsApp user is already on the line, so show Connected immediately
                // For OUTBOUND calls: WhatsApp user hasn't picked up yet, wait for call_answered event
                if (prev.callDirection === 'inbound') {
                  console.log('✅ Incoming call connected - WhatsApp user is on the line');

                  // Start duration timer for incoming calls
                  timer.start();
                  if (prev.callSid) {
                    startDurationTimer(prev.callSid);
                    // Notify HubSpot that call was answered
                    hubspot.callAnswered(prev.callSid);
                  }

                  return {
                    ...prev,
                    isCallConnected: true,
                    callDuration: 0,
                  };
                }

                // Outbound call - keep showing "Ringing..." until WhatsApp user picks up
                return {
                  ...prev,
                  callDuration: event.duration || 0,
                };
              });
              break;

            case 'ended':
              // Call ended - get callSid and engagementId from state
              timer.stop();
              stopDurationTimer();
              setState((prev) => {
                // Call hubspot.callEnded with proper data
                if (prev.callSid && prev.engagementId) {
                  setTimeout(() => {
                    hubspot.callEnded({
                      externalCallId: prev.callSid!,
                      engagementId: prev.engagementId!,
                      callEndStatus: 'COMPLETED',
                    });
                  }, 100);
                }

                return {
                  ...prev,
                  currentScreen: 'CALL_ENDED',
                  callEndStatus: 'COMPLETED',
                  isCallActive: false,
                  callDuration: prev.callDuration, // Keep the duration from our custom timer
                };
              });
              break;

            case 'error':
              // Call error
              console.error('WebRTC Call Error:', event.error);
              timer.stop();
              stopDurationTimer();
              setState((prev) => {
                // Call hubspot.callEnded with proper data
                if (prev.callSid && prev.engagementId) {
                  setTimeout(() => {
                    hubspot.callEnded({
                      externalCallId: prev.callSid!,
                      engagementId: prev.engagementId!,
                      callEndStatus: 'FAILED',
                    });
                  }, 100);
                }

                return {
                  ...prev,
                  currentScreen: 'CALL_ENDED',
                  callEndStatus: 'FAILED',
                  error: event.error?.message || 'Call failed',
                  isCallActive: false,
                  callDuration: prev.callDuration, // Preserve duration on error
                };
              });
              break;
          }
        });

        console.log('✅ WebRTC Device initialized');
      } catch (error) {
        console.error('❌ Failed to initialize WebRTC:', error);
      }
    };

    initWebRTC();

    return () => {
      console.log('🧹 Cleaning up WebRTC');
      isActive = false;
      stopDurationTimer();
      webrtcService.destroy().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubspot.isLoggedIn, hubspot.userId, startDurationTimer, stopDurationTimer]);

  /**
   * Handle user login
   */
  const handleLogin = useCallback(() => {
    console.log('👤 User logged in - marking welcome as seen');

    // Mark that user has seen the welcome screen
    storage.markWelcomeSeen();

    // Request notification permission for incoming calls
    notificationService.requestPermission();

    hubspot.login();
    hubspot.setAvailable();
    setState((prev) => ({ ...prev, currentScreen: 'KEYPAD' }));
  }, [hubspot]);

  /**
   * Check permission status for display on Keypad screen
   */
  const handleCheckPermissionStatus = useCallback(
    async (phoneNumber: string) => {
      const cleanNumber = cleanPhoneNumber(phoneNumber);
      console.log('🔍 Auto-checking permission status for:', cleanNumber);
      console.log('📞 Phone number passed to check:', phoneNumber);

      setKeypadPermissionStatus('checking');

      try {
        const result = await permission.checkPermission(cleanNumber);
        console.log('📋 Full permission result:', result);

        // Check if the API call was successful
        if (!result || !result.permission || !result.permission.permission_status) {
          console.error('❌ Invalid permission response:', result);
          setKeypadPermissionStatus(null);
          setState((prev) => ({
            ...prev,
            error: 'Failed to check permission status. Please check your connection.',
          }));
          return;
        }

        console.log('📋 Permission status:', result.permission.permission_status);

        // Set status for Keypad display
        setKeypadPermissionStatus(result.permission.permission_status as any);

        // Clear any previous errors
        setState((prev) => ({
          ...prev,
          error: undefined,
        }));

        // If contactId not set yet and we got it from backend, update it
        if (result.permission.hubspot_contact_id) {
          console.log('💾 Setting contactId from permission check:', result.permission.hubspot_contact_id);
          setState((prev) => ({
            ...prev,
            contactId: result.permission.hubspot_contact_id,
          }));
        }
      } catch (error) {
        console.error('❌ Error checking permission:', error);
        setKeypadPermissionStatus(null);
        setState((prev) => ({
          ...prev,
          error: 'Failed to connect to server. Please check your connection.',
        }));
      }
    },
    [permission]
  );

  /**
   * Handle permission request from Keypad screen
   */
  const handleRequestPermissionFromKeypad = useCallback(
    async (phoneNumber: string) => {
      const cleanNumber = cleanPhoneNumber(phoneNumber);
      console.log('📨 Requesting permission from Keypad for:', cleanNumber);

      setState((prev) => ({
        ...prev,
        phoneNumber: cleanNumber,
      }));

      // ContactId should already be set from permission check
      // If not, we need to check permission first to get it
      const contactId = state.contactId;

      if (!contactId) {
        setState((prev) => ({
          ...prev,
          error: 'Contact ID not found. Contact must exist in HubSpot.',
        }));
        setKeypadPermissionStatus('denied');
        return;
      }

      try {
        await permission.requestPermission(cleanNumber, contactId);

        if (permission.error) {
          setState((prev) => ({ ...prev, error: permission.error || undefined }));
          setKeypadPermissionStatus('denied');
        } else {
          // Update status to pending
          setKeypadPermissionStatus('pending');
        }
      } catch (error: any) {
        console.error('Error requesting permission:', error);
        setState((prev) => ({
          ...prev,
          error: error.message || 'Failed to request permission',
        }));
        setKeypadPermissionStatus('denied');
      }
    },
    [permission, state.contactId]
  );

  /**
   * Handle call initiation from keypad
   */
  const handleCallClick = useCallback(
    async (phoneNumber: string) => {
      const cleanNumber = cleanPhoneNumber(phoneNumber);
      console.log('📞 Call button clicked for:', cleanNumber);

      setState((prev) => ({
        ...prev,
        phoneNumber: cleanNumber,
        error: undefined,
      }));

      try {
        // Check permission status
        permission.resetPermission();
        console.log('🔍 Checking permission status...');
        const permissionResult = await permission.checkPermission(cleanNumber);
        console.log('✅ Permission check result:', permissionResult);

        if (permissionResult.permission.permission_status === 'granted') {
          console.log('✅ Permission granted - validating...');
          // Validate permission (check expiry, missed calls, etc.)
          const validation = await permission.validatePermission(cleanNumber);

          if (validation.canCall) {
            // Permission granted and valid - proceed with call
            console.log('✅ Validation passed - initiating call');
            await initiateCall(cleanNumber, permissionResult.permission.hubspot_contact_id);
          } else {
            // Permission exists but not valid (expired, too many missed calls, etc.)
            console.log('❌ Validation failed:', validation.reason);

            // Check if permission can be re-requested (expired permissions can be renewed)
            const isExpired = validation.reason?.toLowerCase().includes('expired');

            setState((prev) => ({
              ...prev,
              currentScreen: isExpired ? 'PERMISSION_REQUEST' : 'PERMISSION_DENIED',
              error: validation.reason || 'Permission validation failed',
              contactId: permissionResult.permission.hubspot_contact_id,
            }));
          }
        } else if (permissionResult.permission.permission_status === 'pending') {
          // Permission request already sent, waiting for response
          console.log('⏳ Permission is pending');
          setState((prev) => ({ ...prev, currentScreen: 'PERMISSION_PENDING' }));
        } else {
          // No permission or denied - show request screen
          console.log('🔓 No permission - showing request screen', {
            contactId: permissionResult.permission.hubspot_contact_id,
            permissionStatus: permissionResult.permission.permission_status,
          });
          setState((prev) => ({
            ...prev,
            currentScreen: 'PERMISSION_REQUEST',
            contactId: permissionResult.permission.hubspot_contact_id,
          }));
        }
      } catch (error: any) {
        console.error('❌ Error checking permission:', error);
        setState((prev) => ({
          ...prev,
          error: error.response?.data?.error || 'Failed to check permission',
        }));
      }
    },
    [permission]
  );

  /**
   * Request permission
   */
  const handleRequestPermission = useCallback(async () => {
    console.log('🔔 Request Permission clicked', {
      phoneNumber: state.phoneNumber,
      contactId: state.contactId,
    });

    if (!state.phoneNumber) {
      console.error('❌ Phone number is missing');
      setState((prev) => ({ ...prev, error: 'Phone number is required' }));
      return;
    }

    if (!state.contactId) {
      console.error('❌ Contact ID is missing');
      setState((prev) => ({ ...prev, error: 'Contact ID is required' }));
      return;
    }

    try {
      console.log('📤 Sending permission request to backend...');
      const result = await permission.requestPermission(state.phoneNumber, state.contactId);
      console.log('✅ Permission request response:', result);

      if (result.status === 'requested') {
        console.log('✅ Permission requested successfully - showing pending screen');
        setState((prev) => ({ ...prev, currentScreen: 'PERMISSION_PENDING' }));
      } else if (result.status === 'rate_limit_24h' || result.status === 'rate_limit_7d') {
        console.log('⚠️ Rate limit exceeded:', result.error);
        setState((prev) => ({
          ...prev,
          currentScreen: 'PERMISSION_DENIED',
          error: result.error || 'Rate limit exceeded',
        }));
      } else {
        console.log('ℹ️ Unexpected status:', result.status);
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to request permission',
      }));
    }
  }, [state.phoneNumber, state.contactId, permission]);

  /**
   * Check permission status (from pending screen)
   */
  const handleCheckPermissionFromPending = useCallback(async () => {
    if (!state.phoneNumber) return;

    try {
      const result = await permission.checkPermission(state.phoneNumber);

      if (result.permission.permission_status === 'granted') {
        // Permission granted! Proceed with call
        await initiateCall(state.phoneNumber, result.permission.hubspot_contact_id);
      } else if (result.permission.permission_status === 'denied') {
        setState((prev) => ({
          ...prev,
          currentScreen: 'PERMISSION_DENIED',
          error: 'Contact rejected the permission request',
        }));
      }
      // If still pending, stay on pending screen
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
  }, [state.phoneNumber, permission]);

  /**
   * Initiate outbound call
   */
  const initiateCall = useCallback(
    async (phoneNumber: string, contactId: string) => {
      const callId = generateCallId();

      setState((prev) => ({
        ...prev,
        currentScreen: 'DIALING',
        callSid: callId,
        callDirection: 'outbound',
        callStartTime: Date.now(),
        contactId,
        contactName: state.contactName,
        phoneNumber,
        isCallActive: true,
        isCallConnected: false, // Not connected yet
        callDuration: 0, // Reset duration for new call
      }));

      try {
        // Notify HubSpot SDK
        hubspot.startOutgoingCall({
          toNumber: phoneNumber,
          fromNumber: apiService.getFromNumber(),
          callId,
          createEngagement: true,
        });

        // Initiate WebRTC call
        console.log('📞 Starting WebRTC call to:', phoneNumber);
        const call = await webrtcService.makeCall(phoneNumber);

        console.log('🔍 Call object received:', {
          hasCallSid: !!call.parameters.CallSid,
          callSid: call.parameters.CallSid,
          localCallId: callId,
          willUse: call.parameters.CallSid || callId,
        });

        // Update with actual call SID
        setState((prev) => {
          const newCallSid = call.parameters.CallSid || callId;
          console.log('🔄 Updating callSid from', prev.callSid, 'to', newCallSid);
          return {
            ...prev,
            callSid: newCallSid,
          };
        });

        console.log('✅ WebRTC call initiated:', call.parameters.CallSid);
        // Note: Call status updates are handled by WebRTC event listener
      } catch (error: any) {
        console.error('❌ Error initiating WebRTC call:', error);
        setState((prev) => {
          // Notify HubSpot of failed call if we have engagement data
          if (prev.callSid && prev.engagementId) {
            setTimeout(() => {
              hubspot.callEnded({
                externalCallId: prev.callSid!,
                engagementId: prev.engagementId!,
                callEndStatus: 'FAILED',
              });
            }, 100);
          }

          return {
            ...prev,
            currentScreen: 'CALL_ENDED',
            callEndStatus: 'FAILED',
            error: error.message || 'Failed to initiate call',
            isCallActive: false,
          };
        });
        timer.stop();
      }
    },
    [hubspot, timer, state.contactName]
  );

  /**
   * Handle incoming call accept
   */
  const handleAcceptIncomingCall = useCallback(() => {
    if (!state.callSid || !state.engagementId) return;

    console.log('👍 Owner accepting incoming call...');

    // Clear notification and reset title
    notificationService.closeIncomingCallNotification();

    // Accept the WebRTC call
    webrtcService.acceptIncomingCall();

    setState((prev) => ({
      ...prev,
      currentScreen: 'CALLING',
      isCallActive: true,
      isCallConnected: false, // Not yet connected - ringing WhatsApp user
    }));

    // Note: Don't call hubspot.callAnswered() here - wait for WhatsApp user to pick up
    // The call_answered WebSocket event will trigger when that happens
  }, [state.callSid, state.engagementId]);

  /**
   * Handle incoming call reject
   */
  const handleRejectIncomingCall = useCallback(async () => {
    if (!state.callSid || !state.engagementId) return;

    console.log('👎 Owner rejecting incoming call...');

    // Clear notification and reset title
    notificationService.closeIncomingCallNotification();

    // Reject the WebRTC call
    webrtcService.rejectIncomingCall();

    try {
      await apiService.endCall(state.callSid, 'rejected');

      hubspot.callEnded({
        externalCallId: state.callSid,
        engagementId: state.engagementId,
        callEndStatus: 'CANCELED',
      });

      setState((prev) => ({
        ...prev,
        currentScreen: 'CALL_ENDED',
        callEndStatus: 'CANCELED',
        isCallActive: false,
      }));
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, [state.callSid, state.engagementId, hubspot]);

  /**
   * End active call
   */
  const handleEndCall = useCallback(async () => {
    try {
      console.log('📞 Ending call...');

      // End WebRTC call
      webrtcService.endCall();

      // Note: Call end status update is handled by WebRTC event listener
      // which will update the UI and notify HubSpot
    } catch (error) {
      console.error('Error ending call:', error);
      timer.stop();
      setState((prev) => ({
        ...prev,
        currentScreen: 'CALL_ENDED',
        callEndStatus: 'FAILED',
        isCallActive: false,
      }));
    }
  }, [timer]);

  /**
   * Save call notes and close
   */
  const handleSaveCallNotes = useCallback(
    async (notes: string) => {
      // Save to HubSpot engagement
      const engagementProperties = {
        hs_call_body: notes,
        hs_call_duration: state.callDuration * 1000, // Convert seconds to milliseconds
        hs_call_status: state.callEndStatus || 'COMPLETED',
      };

      hubspot.callCompleted(engagementProperties);

      // Reset state and return to keypad
      setState((prev) => ({
        ...prev,
        currentScreen: 'KEYPAD',
        phoneNumber: undefined,
        callSid: undefined,
        callDirection: undefined,
        callStartTime: undefined,
        callEndStatus: undefined,
        contactId: undefined,
        contactName: undefined,
        isCallActive: false,
        error: undefined,
      }));

      timer.reset();
      permission.resetPermission();
    },
    [hubspot, timer, state.callEndStatus, permission]
  );

  /**
   * Skip notes and close
   */
  const handleSkipNotes = useCallback(() => {
    hubspot.callCompleted({});

    setState((prev) => ({
      ...prev,
      currentScreen: 'KEYPAD',
      phoneNumber: undefined,
      callSid: undefined,
      callDirection: undefined,
      callStartTime: undefined,
      callEndStatus: undefined,
      contactId: undefined,
      contactName: undefined,
      isCallActive: false,
      error: undefined,
    }));

    timer.reset();
    permission.resetPermission();
  }, [hubspot, timer, permission]);

  /**
   * Back to keypad
   */
  const handleBackToKeypad = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentScreen: 'KEYPAD',
      phoneNumber: undefined,
      error: undefined,
    }));
    permission.resetPermission();
  }, [permission]);

  /**
   * Render current screen
   */
  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'LOADING':
        return <LoadingScreen />;

      case 'LOGIN':
        return <LoginScreen onLogin={handleLogin} />;

      case 'KEYPAD':
        return (
          <KeypadScreen
            initialNumber={state.phoneNumber || ''}
            onCallClick={handleCallClick}
            onRequestPermission={handleRequestPermissionFromKeypad}
            onCheckPermission={handleCheckPermissionStatus}
            isLoading={permission.isChecking}
            error={state.error || permission.error || undefined}
            permissionStatus={keypadPermissionStatus}
          />
        );

      case 'PERMISSION_REQUEST':
        return (
          <PermissionRequestScreen
            phoneNumber={state.phoneNumber || ''}
            onRequestPermission={handleRequestPermission}
            onCancel={handleBackToKeypad}
            isRequesting={permission.isRequesting}
            error={permission.error}
          />
        );

      case 'PERMISSION_PENDING':
        return (
          <PermissionPendingScreen
            phoneNumber={state.phoneNumber || ''}
            onCheckStatus={handleCheckPermissionFromPending}
            onCancel={handleBackToKeypad}
            isChecking={permission.isChecking}
          />
        );

      case 'PERMISSION_DENIED':
        return (
          <PermissionDeniedScreen
            phoneNumber={state.phoneNumber || ''}
            reason={state.error || permission.reason || 'Permission denied'}
            onRetry={
              permission.status === 'denied' ? handleRequestPermission : undefined
            }
            onCancel={handleBackToKeypad}
            canRetry={permission.status === 'denied'}
          />
        );

      case 'DIALING':
        return (
          <DialingScreen
            phoneNumber={state.phoneNumber || ''}
            onCancel={handleEndCall}
          />
        );

      case 'INCOMING':
        return (
          <IncomingScreen
            fromNumber={state.phoneNumber || ''}
            contactName={state.contactName || undefined}
            onAccept={handleAcceptIncomingCall}
            onReject={handleRejectIncomingCall}
          />
        );

      case 'CALLING':
        return (
          <CallingScreen
            phoneNumber={state.phoneNumber || ''}
            contactName={state.contactName || undefined}
            duration={formatDuration(state.callDuration * 1000)}
            onEndCall={handleEndCall}
            isConnected={state.isCallConnected}
          />
        );

      case 'CALL_ENDED':
        return (
          <CallEndedScreen
            phoneNumber={state.phoneNumber || ''}
            contactName={state.contactName || undefined}
            duration={formatDuration(state.callDuration * 1000)}
            callStatus={(state.callEndStatus || 'COMPLETED').toLowerCase() as 'completed' | 'missed' | 'rejected' | 'failed'}
            onSave={handleSaveCallNotes}
            onSkip={handleSkipNotes}
            isSaving={false}
          />
        );

      default:
        return <LoadingScreen />;
    }
  };

  return (
    <Container>
      <Header>
        <Title>WhatsApp Calling</Title>
        {hubspot.isLoggedIn && (
          <div style={{ fontSize: '12px', color: '#7C98B6' }}>
            Portal: {hubspot.portalId}
          </div>
        )}
      </Header>
      {renderScreen()}
    </Container>
  );
};

export default App;
