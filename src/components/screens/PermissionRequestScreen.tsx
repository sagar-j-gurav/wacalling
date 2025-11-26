/**
 * Permission Request Screen
 */

import React from 'react';
import { Screen, Card, Button, Text, Column, Spacer, Alert, colors } from '../StyledComponents';
import { formatPhoneNumber } from '../../utils/formatters';

interface PermissionRequestScreenProps {
  phoneNumber: string;
  onRequestPermission: () => void;
  onCancel: () => void;
  isRequesting: boolean;
  error?: string | null;
}

export const PermissionRequestScreen: React.FC<PermissionRequestScreenProps> = ({
  phoneNumber,
  onRequestPermission,
  onCancel,
  isRequesting,
  error,
}) => {
  // Check if this is due to expired permission
  const isExpired = error?.toLowerCase().includes('expired');

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Card>
        <Column gap={20}>
          <Column gap={8}>
            <Text size={18} weight={600}>
              {isExpired ? 'Permission Expired' : 'Permission Required'}
            </Text>
            <Text size={14} color="#7C98B6">
              {isExpired
                ? 'The previous permission has expired. Request permission again to make calls.'
                : "This contact hasn't granted call permission yet"}
            </Text>
          </Column>

          <Card style={{ backgroundColor: colors.background, padding: '16px' }}>
            <Column gap={8}>
              <Text size={14} weight={500}>
                Calling:
              </Text>
              <Text size={16} weight={600} color={colors.primary}>
                {formatPhoneNumber(phoneNumber)}
              </Text>
            </Column>
          </Card>

          {error && <Alert variant="danger">{error}</Alert>}

          <Column gap={12}>
            <Text size={13} weight={500}>
              What happens next:
            </Text>
            <Text size={12} color="#33475B">
              1. We'll send a permission request via WhatsApp
            </Text>
            <Text size={12} color="#33475B">
              2. Contact receives message with Accept/Reject buttons
            </Text>
            <Text size={12} color="#33475B">
              3. Once accepted, you can call within 72 hours
            </Text>
            <Text size={12} color="#33475B">
              4. Permission auto-renews after successful calls
            </Text>
          </Column>

          <Spacer size={8} />

          <Alert variant="warning">
            <Text size={12}>
              Rate Limit: Maximum 2 requests per 7 days. One request per 24 hours.
            </Text>
          </Alert>

          <Column gap={12}>
            <Button
              variant="primary"
              fullWidth
              onClick={onRequestPermission}
              disabled={isRequesting}
            >
              {isRequesting ? 'Sending Request...' : 'Send Permission Request'}
            </Button>
            <Button variant="ghost" fullWidth onClick={onCancel} disabled={isRequesting}>
              Cancel
            </Button>
          </Column>
        </Column>
      </Card>
    </Screen>
  );
};
