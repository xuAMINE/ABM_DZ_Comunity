
// app/components/usekeyboardAwareScroll.ts

import { useRef, useCallback } from 'react';
import { Platform, ScrollView, TextInput, findNodeHandle, UIManager } from 'react-native';

export function useKeyboardAwareScroll<T extends ScrollView>() {
  const scrollRef = useRef<T>(null);

  const scrollToInput = useCallback((input: TextInput | null, extra = 16) => {
    if (!input || !scrollRef.current) return;

    const handle = findNodeHandle(input);
    if (!handle) return;

    UIManager.measureInWindow(handle, (_x, y, _w, h) => {
      // Aim to put the input roughly 100px below the top after scroll
      const targetY = Math.max(0, y - 100);
      scrollRef.current?.scrollTo({ y: Platform.select({ ios: targetY, android: targetY })!, animated: true });
    });
  }, []);

  return { scrollRef, scrollToInput };
}
