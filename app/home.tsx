import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { auth } from '../lib/firebase';
import { logout, getMyProfile } from '../lib/auth';

export default function HomeScreen() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) getMyProfile(uid).then((p) => setName((p as any)?.fullName ?? null));
  }, []);

  return (
    <View style={s.container}>
      <Text style={s.title}>Welcome {name ?? auth.currentUser?.email}</Text>
      <TouchableOpacity style={s.btn} onPress={logout}>
        <Text style={s.btnTxt}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center', padding:20 },
  title:{ fontSize:22, fontWeight:'600', marginBottom:20 },
  btn:{ backgroundColor:'#ef4444', padding:14, borderRadius:8 },
  btnTxt:{ color:'#fff', fontWeight:'600' },
});
