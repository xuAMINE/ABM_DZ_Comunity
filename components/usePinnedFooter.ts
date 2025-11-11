// app/components/usePinnedFooter.ts
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from './useKeyboardOffset';

export function usePinnedFooter(extra = 12) {
  const { bottom } = useSafeAreaInsets();
  const { offset, visible } = useKeyboardOffset();

  // Footer Y offset so it sits just above the keyboard (iOS),
  // and above nav bar on Android.
  const bottomOffset =
    (Platform.OS === 'ios' ? (visible ? offset : 0) : 0) + bottom + extra;

  return { bottomOffset, keyboardVisible: visible };
}
