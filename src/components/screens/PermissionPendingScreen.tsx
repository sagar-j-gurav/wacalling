/**
 * Permission Pending Screen - Waiting for User Response
 */

import React from 'react';
import { Screen, Card, Button, Text, Column, Spacer, Badge, Alert, colors } from '../StyledComponents';
import { formatPhoneNumber } from '../../utils/formatters';

interface PermissionPendingScreenProps {
  phoneNumber: string;
  onCheckStatus: () => void;
  onCancel: () => void;
  isChecking: boolean;
}

export const PermissionPendingScreen: React.FC<PermissionPendingScreenProps> = ({
  phoneNumber,
  onCheckStatus,
  onCancel,
  isChecking,
}) => {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Card style={{ position: 'relative' }}>
        {/* Refresh button in corner */}
        <button
          onClick={onCheckStatus}
          disabled={isChecking}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: isChecking ? '#E8E8E8' : '#F5F8FA',
            border: '1px solid #CBD6E2',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: isChecking ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: isChecking ? '#7C98B6' : '#33475B',
          }}
        >
          <span style={{ fontSize: '14px' }}>🔄</span>
          {isChecking ? 'Checking...' : 'Refresh'}
        </button>

        <Column gap={20}>
          <Column gap={12} style={{ alignItems: 'center', marginTop: '24px' }}>
            <Badge color="warning">Pending Response</Badge>
            <Text size={18} weight={600}>
              Permission Request Sent
            </Text>
            <Text size={14} color="#7C98B6" style={{ textAlign: 'center' }}>
              Waiting for contact to respond
            </Text>
          </Column>

          <Card style={{ backgroundColor: colors.background, padding: '16px' }}>
            <Column gap={8}>
              <Text size={14} weight={500}>
                Contact:
              </Text>
              <Text size={16} weight={600} color={colors.primary}>
                {formatPhoneNumber(phoneNumber)}
              </Text>
            </Column>
          </Card>

          <Column gap={12}>
            <Text size={13} weight={500}>
              What's happening:
            </Text>
            <Text size={12} color="#33475B">
              ✓ WhatsApp message delivered to contact
            </Text>
            <Text size={12} color="#33475B">
              ⏳ Contact needs to click Accept or Reject
            </Text>
            <Text size={12} color="#33475B">
              🔔 Response will appear immediately when they reply
            </Text>
          </Column>

          <Spacer size={8} />

          <Alert variant="info">
            <Text size={12}>
              💡 Tip: Click the Refresh button above to check if the contact has responded yet.
            </Text>
          </Alert>

          <Column gap={12}>
            <Button
              variant="primary"
              fullWidth
              onClick={onCheckStatus}
              disabled={isChecking}
            >
              {isChecking ? 'Checking Status...' : 'Check Status Now'}
            </Button>
            <Button variant="ghost" fullWidth onClick={onCancel}>
              Back to Keypad
            </Button>
          </Column>

          <Text size={11} color="#7C98B6" style={{ textAlign: 'center' }}>
            The contact has up to 72 hours to respond. You can check back anytime.
          </Text>
        </Column>
      </Card>
    </Screen>
  );
};
