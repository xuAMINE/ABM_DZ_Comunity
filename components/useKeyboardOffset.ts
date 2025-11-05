// app/components/useKeyboardOffset.ts
import { useEffect, useState } from 'react';
import { Keyboard, Platform, KeyboardEvent, KeyboardEventName } from 'react-native';

export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      setVisible(true);
      // height is safe on both iOS (will/did) and Android (did)
      setOffset(e.endCoordinates?.height ?? 0);
    };
    const onHide = () => {
      setVisible(false);
      setOffset(0);
    };

    const showEvt = Platform.select({ ios: 'keyboardWillShow', android: 'keyboardDidShow' })! as KeyboardEventName;
    const hideEvt = Platform.select({ ios: 'keyboardWillHide', android: 'keyboardDidHide' })! as KeyboardEventName;

    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => { s.remove(); h.remove(); };
  }, []);

  return { offset, visible };
}
