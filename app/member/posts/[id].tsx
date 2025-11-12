// app/member/posts/[id].tsx
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, useColorScheme, Platform, KeyboardAvoidingView, TextInputProps
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPostById, updatePost, deletePost } from '@/lib/posts';
//import { useKeyboardOffset } from '@/components/useKeyboardOffset';
import { auth } from '@/lib/firebase';
import type { Post } from '@/types/post';

const light = { bg:'#f9f9f9', card:'#fff', text:'#111', sub:'#555', border:'#ccc', inputBg:'#fff', placeholder:'#888', primary:'#1e90ff', danger:'#dc2626', success:'#238636', border2:'#ddd' };
const dark  = { bg:'#0d1117', card:'#161b22', text:'#e6edf3', sub:'#8b949e', border:'#30363d', inputBg:'#161b22', placeholder:'#8b949e', primary:'#2f81f7', danger:'#ef4444', success:'#238636', border2:'#30363d' };

type FieldProps = {
  label: string; k: string; value: string;
  keyboardType?: TextInputProps['keyboardType'];
  onChange: (k: string, v: string) => void;
  onFocus?: () => void;
  theme: typeof light;
  editable?: boolean;
};
const Field = memo(function Field({ label, k, value, keyboardType='default', onChange, onFocus, theme, editable = true }: FieldProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6, color: theme.text }}>{label}</Text>
      <TextInput
        style={{ borderWidth:1, borderRadius:10, padding:12, backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text }}
        placeholderTextColor={theme.placeholder}
        value={value}
        keyboardType={keyboardType}
        returnKeyType="next"
        blurOnSubmit={false}
        onChangeText={(v)=> editable ? onChange(k, v) : undefined}
        onFocus={editable ? onFocus : undefined}
        editable={editable}   // <-- important
      />
    </View>
  );
});

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cs = useColorScheme();
  const theme = cs === 'dark' ? dark : light;

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  //const { offset, visible } = useKeyboardOffset();

  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState<Record<string, any>>({});


  useEffect(() => {
    (async () => {
      try {
        const data = await getPostById(id!);
        if (!data) {
          Alert.alert('Not found', 'This post no longer exists.');
          router.back();
          return;
        }
        setPost(data);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setDetails((data as any).details ?? {});
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const isOwner = useMemo(
      () => (post?.ownerId ?? '') === (auth.currentUser?.uid ?? ''),
      [post?.ownerId]
    );
  const onChangeField = useCallback((k: string, v: string) => {
    setDetails(prev => (prev[k] === v ? prev : { ...prev, [k]: v }));
  }, []);

  const fieldConfigs = useMemo((): Array<{k:string; label:string; keyboardType?:TextInputProps['keyboardType']}> => {
    switch (post?.category) {
      case 'janazah':
        return [
          { k:'deceasedName',   label:'Deceased name' },
          { k:'funeralDate',    label:'Funeral date (YYYY-MM-DD)' },
          { k:'funeralTime',    label:'Funeral time (HH:mm)' },
          { k:'mosqueName',     label:'Mosque' },
          { k:'address',        label:'Address' },
          { k:'burialLocation', label:'Burial location' },
          { k:'contactPhone',   label:'Contact phone', keyboardType:'phone-pad' },
        ];
      case 'events':
        return [
          { k:'eventDate',   label:'Event date (YYYY-MM-DD)' },
          { k:'eventTime',   label:'Event time (HH:mm)' },
          { k:'venue',       label:'Venue' },
          { k:'address',     label:'Address' },
          { k:'ticketPrice', label:'Ticket price', keyboardType:'numeric' },
        ];
      case 'jobs':
        return [
          { k:'company',        label:'Company' },
          { k:'ratePerHour',    label:'Rate per hour', keyboardType:'numeric' },
          { k:'employmentType', label:'Employment type' },
          { k:'address',        label:'Address' },
          { k:'contactEmail',   label:'Contact email', keyboardType:'email-address' },
          { k:'contactPhone',   label:'Contact phone', keyboardType:'phone-pad' },
        ];
      case 'pub':
        return [
          { k:'placeName',    label:'Place name' },
          { k:'address',      label:'Address' },
          { k:'phone',        label:'Phone', keyboardType:'phone-pad' },
          { k:'openingHours', label:'Opening hours' },
          { k:'website',      label:'Website' },
        ];
      default:
        return [];
    }
  }, [post?.category]);

  const onSave = useCallback(async () => {
    if (!post) return;
    if (!isOwner) return Alert.alert('Not allowed', 'Only the owner can edit this post.');
    if (!title.trim()) return Alert.alert('Title required');
    try {
      await updatePost(post.id!, { title, description, details } as Partial<Post>);
      Alert.alert('Saved', 'Your changes were saved.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    }
  }, [post, isOwner, title, description, details, router]);

  const onDelete = useCallback(async () => {
    if (!post) return;
    if (!isOwner) return Alert.alert('Not allowed', 'Only the owner can delete this post.');
    Alert.alert('Delete post', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id!);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to delete');
          }
        },
      },
    ]);
  }, [post,isOwner, router]);

  if (loading) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!post) return null;

  const bottomPad = 24 + insets.bottom;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex:1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{ padding:16, paddingBottom: bottomPad }}
        >
          <Text style={{ color: theme.sub, marginBottom: 6 }}>
            {post.category} • {post.status}
          </Text>

         <Text style={{ color: theme.text, marginBottom: 6 }}>Title</Text>
         <TextInput
           style={{
             borderWidth:1, borderRadius:10, padding:12,
             backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text,
             marginBottom:12, opacity: isOwner ? 1 : 0.6
           }}
           value={title}
           onChangeText={isOwner ? setTitle : undefined}
           editable={isOwner}
           returnKeyType="next"
           blurOnSubmit={false}
         />


          <Text style={{ color: theme.text, marginBottom: 6 }}>Description</Text>
          <TextInput
            style={{
              borderWidth:1, borderRadius:10, padding:12, minHeight:100,
              backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text,
              marginBottom:12, opacity: isOwner ? 1 : 0.6
            }}
            value={description}
            onChangeText={isOwner ? setDescription : undefined}
            editable={isOwner}
            multiline
          />


          {fieldConfigs.map((cfg, idx) => (
            <Field
              key={cfg.k}
              label={cfg.label}
              k={cfg.k}
              value={String((details as any)[cfg.k] ?? '')}
              keyboardType={cfg.keyboardType}
              onChange={onChangeField}
              theme={theme}
              editable={isOwner}
              onFocus={
                isOwner && idx === fieldConfigs.length - 1
                  ? () => scrollRef.current?.scrollToEnd({ animated: true })
                  : undefined
              }
            />
          ))}


          {isOwner ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.border2,
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 8,
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <TouchableOpacity onPress={onSave} style={{ backgroundColor: theme.success, paddingVertical:12, borderRadius:10, flex:1 }}>
                <Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={{ backgroundColor: theme.danger, paddingVertical:12, borderRadius:10 }}>
                <Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ textAlign:'center', color: theme.sub, marginTop: 12 }}>
              Read-only view — only the owner can edit this post.
            </Text>
          )}


          <View style={{ height: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}






