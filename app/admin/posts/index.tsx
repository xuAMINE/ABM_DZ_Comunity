// app/admin/posts/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { adminListPosts, setModeration } from '@/lib/posts';


export default function AdminPosts() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { adminListPosts('pending').then(setItems); }, []);
  const approve = async (id:string) => { await setModeration(id, 'approved'); setItems((s)=>s.filter(i=>i.id!==id)); };
  const reject = async (id:string) => { await setModeration(id, 'rejected'); setItems((s)=>s.filter(i=>i.id!==id)); };

  return (
    <FlatList
      contentContainerStyle={{ padding:16 }}
      data={items}
      keyExtractor={i=>i.id}
      renderItem={({item}) => (
        <View style={{ borderWidth:1, borderRadius:10, padding:12, marginBottom:10 }}>
          <Text style={{ fontWeight:'600' }}>{item.title} · {item.category}</Text>
          <Text numberOfLines={2} style={{ marginVertical:6 }}>{item.description}</Text>
          <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity onPress={()=>approve(item.id)} style={{ backgroundColor:'#238636', padding:10, borderRadius:8 }}><Text style={{ color:'#fff' }}>Approve</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>reject(item.id)} style={{ backgroundColor:'#dc2626', padding:10, borderRadius:8 }}><Text style={{ color:'#fff' }}>Reject</Text></TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}
