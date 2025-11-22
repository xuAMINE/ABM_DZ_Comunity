// app/member/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { Link, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { useAppTheme } from '@/lib/theme';
import { logout } from '@/lib/auth';

function DrawerContent() {
  const router = useRouter();
  const { theme, mode, setMode, isDark } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 48 }}>
      {/* header */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: theme.border2 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>DZ Community</Text>
        <Text style={{ color: theme.placeholder, marginTop: 4 }}>Welcome!</Text>
      </View>

      {/* links */}
      <View style={{ padding: 16, rowGap: 12 }}>
        <Link href="/member/posts/homepage" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Feed</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/member/profile" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Profile</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/member/account" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Account</Text>
          </TouchableOpacity>
        </Link>


        <Link href="/member/posts/activity/activity" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Activity</Text>
          </TouchableOpacity>
        </Link>
     </View>

      {/* theme toggle */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Dark mode</Text>
          <Switch value={isDark} onValueChange={(v) => setMode(v ? 'dark' : 'light')} />
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => setMode('system')}>
            <Text style={{ color: mode === 'system' ? theme.primary : theme.text }}>Use system</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('light')}>
            <Text style={{ color: mode === 'light' ? theme.primary : theme.text }}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('dark')}>
            <Text style={{ color: mode === 'dark' ? theme.primary : theme.text }}>Dark</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* logout */}
      <View style={{ padding: 16, marginTop: 'auto' }}>
        <TouchableOpacity
          onPress={async () => { await logout(); router.replace('/login'); }}
          style={{ paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 10, backgroundColor: theme.card }}
        >
          <Text style={{ color: theme.text, fontWeight: '600' }}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MemberLayout() {
  const { theme } = useAppTheme();
  return (
    <Drawer
      screenOptions={{
        headerShown: false,              // 👈 HIDE THE AUTOMATIC HEADER
        drawerStyle: { backgroundColor: theme.bg },
        sceneStyle: { backgroundColor: theme.bg },
      }}
      drawerContent={() => <DrawerContent />}
    />
  );
}
