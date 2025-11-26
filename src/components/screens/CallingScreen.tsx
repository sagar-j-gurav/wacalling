/**
 * Calling Screen - Active Call
 */

import React, { useState } from 'react';
import {
  Screen,
  Card,
  Button,
  IconButton,
  Text,
  Column,
  Row,
  Spacer,
  Badge,
  colors,
} from '../StyledComponents';
import { formatPhoneNumber } from '../../utils/formatters';

interface CallingScreenProps {
  phoneNumber: string;
  contactName?: string;
  duration: string;
  onEndCall: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
  isMuted?: boolean;
  isConnected?: boolean; // true = connected, false = ringing
}

export const CallingScreen: React.FC<CallingScreenProps> = ({
  phoneNumber,
  contactName,
  duration,
  onEndCall,
  onMute,
  onUnmute,
  isMuted = false,
  isConnected = false,
}) => {
  const [muted, setMuted] = useState(isMuted);

  const handleMuteToggle = () => {
    if (muted) {
      onUnmute?.();
    } else {
      onMute?.();
    }
    setMuted(!muted);
  };

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Card>
        <Column gap={24}>
          <Column gap={12} style={{ alignItems: 'center' }}>
            <Badge color={isConnected ? "success" : "warning"}>
              {isConnected ? "Connected" : "Ringing..."}
            </Badge>
            <Text size={14} color="#7C98B6">
              WhatsApp Call
            </Text>
          </Column>

          <Column gap={8} style={{ alignItems: 'center' }}>
            {contactName && (
              <Text size={20} weight={600}>
                {contactName}
              </Text>
            )}
            <Text size={18} weight={500} color={colors.primary}>
              {formatPhoneNumber(phoneNumber)}
            </Text>
          </Column>

          <Column gap={4} style={{ alignItems: 'center' }}>
            <Text size={32} weight={600} color="#33475B">
              {duration}
            </Text>
            <Text size={12} color="#7C98B6">
              Call Duration
            </Text>
          </Column>

          <Spacer size={20} />

          <Row gap={16} style={{ justifyContent: 'center' }}>
            <Column gap={8} style={{ alignItems: 'center' }}>
              <IconButton
                onClick={handleMuteToggle}
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: muted ? '#E8384F' : 'white',
                  color: muted ? 'white' : '#33475B',
                }}
              >
                <Text size={24}>{muted ? '🔇' : '🔊'}</Text>
              </IconButton>
              <Text size={12} color="#7C98B6">
                {muted ? 'Unmute' : 'Mute'}
              </Text>
            </Column>
          </Row>

          <Spacer size={12} />

          <Button
            variant="danger"
            fullWidth
            onClick={onEndCall}
            style={{ padding: '16px', fontSize: '16px' }}
          >
            🔴 End Call
          </Button>

          <Text size={11} color="#7C98B6" style={{ textAlign: 'center' }}>
            Call is connected via WhatsApp Business
          </Text>
        </Column>
      </Card>
    </Screen>
  );
};
