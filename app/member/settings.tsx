// app/member/settings.tsx
import { View, Text } from 'react-native';
import { useAppTheme } from '@/lib/theme';

export default function Settings() {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex:1, padding:16, backgroundColor: theme.bg }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>Settings</Text>
      <Text style={{ color: theme.text, marginTop: 8 }}>Add your app settings here.</Text>
    </View>
  );
}
