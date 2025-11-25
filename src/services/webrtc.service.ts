/**
 * WebRTC Service
 * Handles Twilio Voice SDK (WebRTC) for browser-based calling
 */

import { Device, Call } from '@twilio/voice-sdk';
import apiService from './api.service';

export type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'error';

export interface WebRTCCallEvent {
  status: CallStatus;
  call?: Call;
  error?: Error;
  duration?: number;
}

class WebRTCService {
  private device: Device | null = null;
  private activeCall: Call | null = null;
  private token: string | null = null;
  private callStatusCallback: ((event: WebRTCCallEvent) => void) | null = null;
  private callDurationInterval: NodeJS.Timeout | null = null;
  private callStartTime: number = 0;

  /**
   * Initialize Twilio Device with access token
   */
  async initialize(identity?: string): Promise<void> {
    try {
      console.log('🎤 Initializing WebRTC Device...');

      // Get access token from backend
      const response = await apiService.getAccessToken(identity);
      this.token = response.data.token;

      console.log('✅ Access token received');

      // Initialize Device
      this.device = new Device(this.token, {
        logLevel: 1, // 0=trace, 1=debug, 2=info, 3=warn, 4=error
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        enableRingingState: true,
      });

      // Register event listeners
      this.setupDeviceListeners();

      // Register device
      await this.device.register();

      console.log('✅ WebRTC Device registered and ready');
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC Device:', error);
      throw error;
    }
  }

  /**
   * Setup Device event listeners
   */
  private setupDeviceListeners(): void {
    if (!this.device) return;

    this.device.on('registered', () => {
      console.log('📱 Device registered');
    });

    this.device.on('unregistered', () => {
      console.log('📱 Device unregistered');
    });

    this.device.on('error', (error) => {
      console.error('📱 Device error:', error);
      this.emitCallStatus({ status: 'error', error });
    });

    this.device.on('incoming', (call) => {
      console.log('📞 Incoming call:', call);
      // Handle incoming calls if needed
    });
  }

  /**
   * Make an outbound call to a phone number
   */
  async makeCall(phoneNumber: string): Promise<Call> {
    if (!this.device) {
      throw new Error('Device not initialized. Call initialize() first.');
    }

    try {
      console.log(`📞 Initiating WebRTC call to: ${phoneNumber}`);

      // Emit connecting status
      this.emitCallStatus({ status: 'connecting' });

      // Connect to Twilio with phone number parameter
      // This will hit the TwiML Application URL with the phoneNumber
      const call = await this.device.connect({
        params: {
          phoneNumber: phoneNumber,
        },
      });

      this.activeCall = call;
      this.setupCallListeners(call);

      console.log('✅ Call initiated:', call.parameters.CallSid);

      return call;
    } catch (error) {
      console.error('❌ Failed to make call:', error);
      this.emitCallStatus({ status: 'error', error: error as Error });
      throw error;
    }
  }

  /**
   * Setup Call event listeners
   */
  private setupCallListeners(call: Call): void {
    call.on('accept', () => {
      console.log('📞 Call accepted (ringing)');
      this.emitCallStatus({ status: 'ringing', call });
    });

    call.on('ringing', () => {
      console.log('📞 Call ringing');
      this.emitCallStatus({ status: 'ringing', call });
    });

    call.on('connect', () => {
      console.log('📞 Call connected');
      this.callStartTime = Date.now();
      this.startCallDurationTimer();
      this.emitCallStatus({ status: 'connected', call });
    });

    call.on('disconnect', () => {
      console.log('📞 Call disconnected');
      this.stopCallDurationTimer();
      const duration = this.callStartTime ? Math.floor((Date.now() - this.callStartTime) / 1000) : 0;
      this.emitCallStatus({ status: 'ended', call, duration });
      this.activeCall = null;
      this.callStartTime = 0;
    });

    call.on('cancel', () => {
      console.log('📞 Call cancelled');
      this.stopCallDurationTimer();
      this.emitCallStatus({ status: 'ended', call });
      this.activeCall = null;
      this.callStartTime = 0;
    });

    call.on('reject', () => {
      console.log('📞 Call rejected');
      this.stopCallDurationTimer();
      this.emitCallStatus({ status: 'ended', call });
      this.activeCall = null;
      this.callStartTime = 0;
    });

    call.on('error', (error) => {
      console.error('📞 Call error:', error);
      this.stopCallDurationTimer();
      this.emitCallStatus({ status: 'error', call, error });
    });

    call.on('warning', (name, data) => {
      console.warn(`📞 Call warning: ${name}`, data);
    });

    call.on('volume', (inputVolume, outputVolume) => {
      // Can be used for audio level indicators
      // console.log('Audio levels:', { inputVolume, outputVolume });
    });
  }

  /**
   * Start call duration timer
   */
  private startCallDurationTimer(): void {
    this.stopCallDurationTimer();
    this.callDurationInterval = setInterval(() => {
      if (this.callStartTime) {
        const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
        this.emitCallStatus({ status: 'connected', call: this.activeCall || undefined, duration });
      }
    }, 1000);
  }

  /**
   * Stop call duration timer
   */
  private stopCallDurationTimer(): void {
    if (this.callDurationInterval) {
      clearInterval(this.callDurationInterval);
      this.callDurationInterval = null;
    }
  }

  /**
   * End the active call
   */
  endCall(): void {
    if (this.activeCall) {
      console.log('📞 Ending call...');
      this.activeCall.disconnect();
    }
  }

  /**
   * Mute/unmute the call
   */
  setMuted(muted: boolean): void {
    if (this.activeCall) {
      this.activeCall.mute(muted);
      console.log(muted ? '🔇 Call muted' : '🔊 Call unmuted');
    }
  }

  /**
   * Check if call is muted
   */
  isMuted(): boolean {
    return this.activeCall ? this.activeCall.isMuted() : false;
  }

  /**
   * Get active call
   */
  getActiveCall(): Call | null {
    return this.activeCall;
  }

  /**
   * Get device status
   */
  isRegistered(): boolean {
    return this.device ? this.device.state === Device.State.Registered : false;
  }

  /**
   * Register callback for call status updates
   */
  onCallStatus(callback: (event: WebRTCCallEvent) => void): void {
    this.callStatusCallback = callback;
  }

  /**
   * Emit call status event
   */
  private emitCallStatus(event: WebRTCCallEvent): void {
    if (this.callStatusCallback) {
      this.callStatusCallback(event);
    }
  }

  /**
   * Destroy device and cleanup
   */
  async destroy(): Promise<void> {
    console.log('🧹 Cleaning up WebRTC Device...');

    this.stopCallDurationTimer();

    if (this.activeCall) {
      this.activeCall.disconnect();
      this.activeCall = null;
    }

    if (this.device) {
      this.device.unregister();
      this.device.destroy();
      this.device = null;
    }

    this.token = null;
    this.callStatusCallback = null;
  }
}

export default new WebRTCService();
