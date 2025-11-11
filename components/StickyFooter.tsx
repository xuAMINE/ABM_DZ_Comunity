// app/components/StickyFooter.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { usePinnedFooter } from './usePinnedFooter';

type Props = React.PropsWithChildren<{ bg: string; border: string }>;

export default function StickyFooter({ children, bg, border }: Props) {
  const { bottomOffset } = usePinnedFooter();

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
    >
      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: bottomOffset,
          backgroundColor: bg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
          padding: 8,
          // subtle elevation/shadow
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 6 },
          }),
        }}
      >
        {children}
      </View>
    </View>
  );
}
