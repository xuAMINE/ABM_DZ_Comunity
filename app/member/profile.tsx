//app/member/profile.tsx
import { View, Text } from 'react-native';
import { useAppTheme } from '@/lib/theme';

export default function Profile() {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex:1, padding:16, backgroundColor: theme.bg }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>My Profile</Text>
      <Text style={{ color: theme.text, marginTop: 8 }}>Coming soon…</Text>
    </View>
  );
}

