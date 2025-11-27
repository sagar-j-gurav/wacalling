/**
 * HubSpot SDK Service - Calling Extensions Integration
 *
 * Uses singleton pattern following official HubSpot demo:
 * https://github.com/HubSpot/calling-extensions-sdk/blob/master/demos/demo-react-ts/src/hooks/useCti.ts
 */

import CallingExtensions from '@hubspot/calling-extensions-sdk';

// Type definition for CallingExtensions instance
type ICallingExtensions = InstanceType<typeof CallingExtensions>;
import {
  HubSpotUserInfo,
  HubSpotEngagement,
  OutgoingCallInfo,
  CallEndStatus,
  IncomingCallData,
} from '../types';

type ReadyHandler = (data: {
  portalId: number;
  engagementId?: number;
  userId?: number;
  iframeLocation?: 'widget' | 'window' | 'remote';  // 'widget' = embedded, 'window' = popup, 'remote' = cross-tab
  usesCallingWindow?: boolean;
}) => void;
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

// Module-level singleton instance - ensures only ONE CallingExtensions is ever created
let sdkInstance: ICallingExtensions | null = null;
let isSDKInitialized = false;

class HubSpotService {
  private sdk: ICallingExtensions | null = null;
  private portalId: number | null = null;
  private userId: number | null = null;
  private iframeLocation: 'widget' | 'window' | 'remote' | null = null;  // Track location: widget=embedded, window=popup, remote=cross-tab

  // Event handlers
  private readyHandlers: Set<ReadyHandler> = new Set();
  private dialNumberHandlers: Set<DialNumberHandler> = new Set();
  private engagementCreatedHandlers: Set<EngagementCreatedHandler> = new Set();
  private callerIdMatchHandlers: Set<CallerIdMatchHandler> = new Set();

  /**
   * Initialize HubSpot SDK - uses module-level singleton to ensure only one instance
   * This prevents double initialization even with React StrictMode
   */
  initialize(): void {
    // Use module-level guard to ensure SDK is created only once
    if (isSDKInitialized && sdkInstance) {
      console.log('HubSpot SDK already initialized (singleton)');
      this.sdk = sdkInstance;
      return;
    }

    console.log('Initializing HubSpot SDK (first time)...');

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

    // Create SDK only once at module level
    // Cast to any to handle partial event handlers (SDK accepts partial handlers)
    sdkInstance = new CallingExtensions(options as any);
    isSDKInitialized = true;
    this.sdk = sdkInstance;

    console.log('✅ HubSpot SDK initialized (singleton created)');
  }

  /**
   * Event Handlers
   */

  private handleReady(data: {
    portalId: number;
    engagementId?: number;
    userId?: number;
    iframeLocation?: 'widget' | 'window' | 'remote';
    usesCallingWindow?: boolean;
  }) {
    console.log('📡 HubSpot SDK Ready:', data);
    console.log('📍 iframeLocation:', data.iframeLocation);  // 'widget' = embedded, 'window' = popup

    this.portalId = data.portalId;
    this.userId = data.userId || null;
    this.iframeLocation = data.iframeLocation || null;

    // Notify SDK that widget is initialized
    this.sdk?.initialized({
      isLoggedIn: false,
      engagementId: data.engagementId || 0,
    } as any);

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

  notifyIncomingCall(data: IncomingCallData): void {
    if (!this.sdk) return;

    console.log('📥 Notifying incoming call:', data);

    this.sdk.incomingCall({
      externalCallId: data.callSid,
      fromNumber: data.fromNumber,
      callStartTime: data.callStartTime,
      createEngagement: true,
    });
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
   * Resize the widget to bring it to the foreground
   * Use this for incoming calls to make the widget prominent
   */
  resizeWidget(width: number, height: number): void {
    if (!this.sdk) return;

    console.log('📐 Resizing widget to:', { width, height });
    this.sdk.resizeWidget({ width, height });
  }

  /**
   * Expand widget to full size (for incoming calls)
   */
  expandWidget(): void {
    // Standard HubSpot widget expanded size
    this.resizeWidget(400, 600);
  }

  /**
   * Collapse widget to minimized size
   */
  collapseWidget(): void {
    // Standard HubSpot widget collapsed size
    this.resizeWidget(400, 100);
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

  /**
   * Get iframe location - 'widget' for embedded, 'window' for popup, 'remote' for cross-tab
   * Use this to determine if incoming calls should be handled here
   */
  getIframeLocation(): 'widget' | 'window' | 'remote' | null {
    return this.iframeLocation;
  }

  /**
   * Check if this instance is running in the popup window (for incoming calls)
   */
  isInPopupWindow(): boolean {
    return this.iframeLocation === 'window';
  }

  /**
   * Check if this instance is running in the embedded widget (for outbound calls)
   */
  isInEmbeddedWidget(): boolean {
    return this.iframeLocation === 'widget';
  }

  isReady(): boolean {
    return isSDKInitialized && this.sdk !== null;
  }
}

export default new HubSpotService();
