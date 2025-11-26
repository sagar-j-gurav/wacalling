/**

* HubSpot SDK Service - Calling Extensions Integration

*/



import CallingExtensions from '@hubspot/calling-extensions-sdk';



// Type definition fr CallingExtensions instance

type ICallingExtensions = InstanceType<typeof CallingExtensions>;

import {

  HubSpotUserInfo,

  HubSpotEngagement,

  OutgoingCallInfo,

  CallEndStatus,

  IncomingCallData,

} from '../types';



type ReadyHandler = (data: { portalId: number; engagementId?: number; userId?: number }) => void;

type DialNumberHandler = (data: {

  phoneNumber: string;

  objectId?: number;

  objectType?: 'CONTACT' | 'COMPANY';

  calleeInfo?: {

    calleeId: number;

    calleeObjectTypeId: string;

  };

  ownerId?: number;

  portalId?: number;

}) => void;

type EngagementCreatedHandler = (data: { engagementId: number }) => void;

type CallerIdMatchHandler = (data: any) => void;



class HubSpotService {

  private sdk: ICallingExtensions | null = null;

  private isInitialized: boolean = false;

  private portalId: number | null = null;

  private userId: number | null = null;

  private iframeLocation: string | null = null;

  private isWindowFocused: boolean = true;

  // Event handlers

  private readyHandlers: Set<ReadyHandler> = new Set();

  private dialNumberHandlers: Set<DialNumberHandler> = new Set();

  private engagementCreatedHandlers: Set<EngagementCreatedHandler> = new Set();

  private callerIdMatchHandlers: Set<CallerIdMatchHandler> = new Set();





  private setupWindowHandlers() {

    // Handle window focus/blur to detect popup state

    window.addEventListener('blur', () => {

      this.isWindowFocused = false;

      console.log('Window blurred - might be opening a popup');

    });



    window.addEventListener('focus', () => {

      this.isWindowFocused = true;

      console.log('Window focused - popup might have closed');

    });

  }

  /**

   * Initialize HubSpot SDK

   */

  initialize(): void {

    if (this.isInitialized) {

      console.log('HubSpot SDK already initialized');

      return;

    }



    console.log('Initializing HubSpot SDK...');



    const options = {

      debugMode: process.env.NODE_ENV === 'development',

      eventHandlers: {

        onReady: this.handleReady.bind(this),

        onDialNumber: this.handleDialNumber.bind(this),

        onEngagementCreated: this.handleEngagementCreated.bind(this), // Legacy event still sent by HubSpot

        onCreateEngagementSucceeded: this.handleEngagementCreated.bind(this),

        onCreateEngagementFailed: this.handleEngagementFailed.bind(this),

        onCallerIdMatchSucceeded: this.handleCallerIdMatchSucceeded.bind(this),

        onCallerIdMatchFailed: this.handleCallerIdMatchFailed.bind(this),

        onVisibilityChanged: this.handleVisibilityChanged.bind(this),

      },

    };



    this.sdk = new CallingExtensions(options);

    this.isInitialized = true;

    this.setupWindowHandlers();



    console.log('✅ HubSpot SDK initialized');

  }



  /**

   * Event Handlers

   */



  private handleReady(data: { portalId: number; engagementId?: number; userId?: number; iframeLocation?: string }) {

    console.log('📡 HubSpot SDK Ready:', data);

    this.portalId = data.portalId;

    this.userId = data.userId || null;

    this.iframeLocation = data.iframeLocation || null;



    console.log('🖼️ iframeLocation:', this.iframeLocation);



    // Notify SDK that widget is initialized

    this.sdk?.initialized({

      isLoggedIn: false,

      engagementId: data.engagementId || 0,

    });



    this.readyHandlers.forEach((handler) => handler(data));

  }



  private handleDialNumber(data: {

    phoneNumber: string;

    objectId?: number;

    objectType?: 'CONTACT' | 'COMPANY';

    calleeInfo?: {

      calleeId: number;

      calleeObjectTypeId: string;

    };

    ownerId?: number;

    portalId?: number;

  }) {

    console.log('📞 Dial Number Event (Full Context):', data);

    this.dialNumberHandlers.forEach((handler) => handler(data));

  }



  private handleEngagementCreated(data: { engagementId: number }) {

    console.log('📝 Engagement Created:', data);

    this.engagementCreatedHandlers.forEach((handler) => handler(data));

  }



  private handleEngagementFailed(data: any) {

    console.error('❌ Engagement Creation Failed:', data);

    // Could add error handlers here if needed

  }



  private handleCallerIdMatchSucceeded(data: any) {

    console.log('✅ Caller ID Match Succeeded:', data);

    this.callerIdMatchHandlers.forEach((handler) => handler({ success: true, ...data }));

  }



  private handleCallerIdMatchFailed(data: any) {

    console.log('❌ Caller ID Match Failed:', data);

    this.callerIdMatchHandlers.forEach((handler) => handler({ success: false, ...data }));

  }



  private handleVisibilityChanged(data: { isMinimized: boolean; isHidden: boolean }) {

    console.log('👁️ Visibility Changed:', data);

  }



  /**

   * User Actions

   */



  userLoggedIn(userInfo?: HubSpotUserInfo): void {

    if (!this.sdk) return;



    console.log('🔐 User logged in');

    this.sdk.userLoggedIn();

  }



  userLoggedOut(): void {

    if (!this.sdk) return;



    console.log('🚪 User logged out');

    this.sdk.userLoggedOut();

  }



  setUserAvailable(): void {

    if (!this.sdk) return;



    console.log('✅ User available');

    this.sdk.userAvailable();

  }



  setUserUnavailable(): void {

    if (!this.sdk) return;



    console.log('⏸️ User unavailable');

    this.sdk.userUnavailable();

  }



  /**

   * Call Actions

   */



  startOutgoingCall(info: OutgoingCallInfo): void {

    if (!this.sdk) return;



    console.log('📤 Starting outgoing call:', info);



    this.sdk.outgoingCall({

      toNumber: info.toNumber,

      fromNumber: info.fromNumber,

      callStartTime: Date.now(),

      createEngagement: info.createEngagement,

      externalCallId: info.callId,

    });

  }



  // notifyIncomingCall(data: IncomingCallData): void {

  //   if (!this.sdk) return;



  //   console.log('📥 Notifying incoming call:', data);



  //   // CRITICAL FIX #1: Only call sdk.incomingCall() if we're NOT already in a popup

  //   // When iframeLocation is 'remote', we're already in a HubSpot popup

  //   // Calling sdk.incomingCall() again would open ANOTHER popup (duplicate)

  //   if (this.iframeLocation === 'remote') {

  //     console.log('⚠️ Already in HubSpot popup (remote), skipping sdk.incomingCall() to prevent duplicate popup');

  //     return;

  //   }



  //   // CRITICAL FIX #2: Cross-tab coordination - only ONE instance should call sdk.incomingCall()

  //   const notificationKey = `hubspot_incoming_call_${data.callSid}`;

  //   const existing = localStorage.getItem(notificationKey);



  //   if (existing) {

  //     const existingData = JSON.parse(existing);

  //     // If another instance already notified HubSpot within the last 5 seconds, skip

  //     if (Date.now() - existingData.timestamp < 5000) {

  //       console.warn('⚠️ Another instance already notified HubSpot about this call, skipping');

  //       return;

  //     }

  //   }



  //   // Mark that we're notifying HubSpot about this call

  //   localStorage.setItem(notificationKey, JSON.stringify({

  //     callSid: data.callSid,

  //     timestamp: Date.now()

  //   }));



  //   console.log('✅ Calling sdk.incomingCall() to notify HubSpot');

  //   this.sdk.incomingCall({

  //     externalCallId: data.callSid,

  //     fromNumber: data.fromNumber,

  //     toNumber: data.toNumber,

  //     callStartTime: data.callStartTime,

  //     createEngagement: true,

  //   });



  //   // Clean up after 10 seconds

  //   setTimeout(() => {

  //     localStorage.removeItem(notificationKey);

  //   }, 10000);

  // }





  notifyIncomingCall(data: IncomingCallData): void {

    if (!this.sdk) {

      console.warn('HubSpot SDK not initialized');

      return;

    }



    console.log('📥 Notifying incoming call:', data);

    console.log('Current iframe location:', this.iframeLocation);



    // Skip if we're already in a HubSpot popup

    if (this.iframeLocation === 'remote') {

      console.log('⚠️ Already in HubSpot popup, skipping sdk.incomingCall()');

      return;

    }



    // Check if we're in an iframe (embedded mode)

    if (window.self !== window.top) {

      console.log('ℹ️ Running inside an iframe, allowing HubSpot to handle the popup');

    } else {

      console.log('ℹ️ Running in top window, using cross-tab coordination');

    }



    // Cross-tab coordination to prevent multiple notifications

    const notificationKey = `hubspot_incoming_call_${data.callSid}`;

    const existing = localStorage.getItem(notificationKey);



    if (existing) {

      const existingData = JSON.parse(existing);

      // If another instance already notified HubSpot within the last 10 seconds, skip

      if (Date.now() - existingData.timestamp < 10000) {

        console.warn('⚠️ Another instance already notified HubSpot about this call, skipping');

        return;

      }

    }



    // Mark that we're notifying HubSpot about this call

    localStorage.setItem(notificationKey, JSON.stringify({

      callSid: data.callSid,

      timestamp: Date.now()

    }));



    // Add a small delay to ensure UI is ready

    setTimeout(() => {

      console.log('✅ Calling sdk.incomingCall() to notify HubSpot');

      this.sdk?.incomingCall({

        externalCallId: data.callSid,

        fromNumber: data.fromNumber,

        toNumber: data.toNumber,

        callStartTime: data.callStartTime,

        createEngagement: true,

      });



      // Clean up after 30 seconds (increased from 10s)

      setTimeout(() => {

        localStorage.removeItem(notificationKey);

      }, 30000);

    }, 500); // Small delay to ensure UI is ready

  }

  callAnswered(externalCallId: string): void {

    if (!this.sdk) return;



    console.log('✅ Call answered:', externalCallId);

    this.sdk.callAnswered({

      externalCallId,

    });

  }



  callEnded(data: {

    externalCallId: string;

    engagementId: number;

    callEndStatus: CallEndStatus;

  }): void {

    if (!this.sdk) return;



    console.log('📴 Call ended:', data);

    this.sdk.callEnded({

      externalCallId: data.externalCallId,

      engagementId: data.engagementId,

      callEndStatus: data.callEndStatus,

    });

  }



  callCompleted(data: {

    engagementId: number;

    hideWidget?: boolean;

    engagementProperties?: {

      hs_call_body?: string;

      hs_call_duration?: number;

      hs_call_status?: string;

      hs_call_recording_url?: string;

      [key: string]: any;

    };

  }): void {

    if (!this.sdk) return;



    console.log('✔️ Call completed:', data);

    this.sdk.callCompleted(data);

  }



  /**

   * Event Listeners

   */



  onReady(handler: ReadyHandler): () => void {

    this.readyHandlers.add(handler);

    return () => this.readyHandlers.delete(handler);

  }



  onDialNumber(handler: DialNumberHandler): () => void {

    this.dialNumberHandlers.add(handler);

    return () => this.dialNumberHandlers.delete(handler);

  }



  onEngagementCreated(handler: EngagementCreatedHandler): () => void {

    this.engagementCreatedHandlers.add(handler);

    return () => this.engagementCreatedHandlers.delete(handler);

  }



  onCallerIdMatch(handler: CallerIdMatchHandler): () => void {

    this.callerIdMatchHandlers.add(handler);

    return () => this.callerIdMatchHandlers.delete(handler);

  }



  /**

   * Getters

   */



  getPortalId(): number | null {

    return this.portalId;

  }



  getUserId(): number | null {

    return this.userId;

  }



  getIframeLocation(): string | null {

    return this.iframeLocation;

  }



  isReady(): boolean {

    return this.isInitialized && this.sdk !== null;

  }

}



export default new HubSpotService();

