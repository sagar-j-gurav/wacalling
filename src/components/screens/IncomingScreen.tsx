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
        backgroundColor: colors.white,
        border: `3px solid ${colors.primary}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        borderRadius: '12px'
      }}>
        <Column gap={24}>
          <Column gap={12} style={{ alignItems: 'center' }}>
            <Badge color="success" style={{
              backgroundColor: colors.primary,
              color: colors.white,
              padding: '6px 16px',
              fontSize: '13px'
            }}>
              Incoming Call
            </Badge>
            <Text size={13} color={colors.textLight}>
              WhatsApp Voice Call
            </Text>
          </Column>

          <Column gap={8} style={{ alignItems: 'center' }}>
            {contactName && (
              <Text size={22} weight={600} color={colors.text}>
                {contactName}
              </Text>
            )}
            <Text size={18} weight={500} color={colors.primary}>
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
