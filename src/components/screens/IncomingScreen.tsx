/**
 * Incoming Call Screen
 */

import React from 'react';
import { Screen, Card, Button, Text, Column, Row, Spacer, Badge, colors } from '../StyledComponents';
import { formatPhoneNumber } from '../../utils/formatters';

interface IncomingScreenProps {
  fromNumber: string;
  contactName?: string;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingScreen: React.FC<IncomingScreenProps> = ({
  fromNumber,
  contactName,
  onAccept,
  onReject,
}) => {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Card style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
        color: 'white',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
      }}>
        <Column gap={24}>
          <Column gap={12} style={{ alignItems: 'center' }}>
            <Badge color="success" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: colors.primary }}>
              Incoming Call
            </Badge>
            <Text size={14} color="white">
              WhatsApp Call
            </Text>
          </Column>

          <Column gap={8} style={{ alignItems: 'center' }}>
            {contactName && (
              <Text size={20} weight={600} color="white">
                {contactName}
              </Text>
            )}
            <Text size={18} weight={500} color="white">
              {formatPhoneNumber(fromNumber)}
            </Text>
          </Column>

          <Spacer size={20} />

          <Row gap={16}>
            <Button
              variant="danger"
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
              onClick={onReject}
            >
              Decline
            </Button>
            <Button
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                backgroundColor: colors.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#00A88F';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.success;
              }}
              onClick={onAccept}
            >
              Accept
            </Button>
          </Row>
        </Column>
      </Card>
    </Screen>
  );
};
