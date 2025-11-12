//app/member/posts/[id].tsx
import { auth, db } from "@/lib/firebase";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, useColorScheme, Platform, KeyboardAvoidingView, TextInputProps
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPostById, updatePost, deletePost } from '@/lib/posts';
import type { Post } from '@/types/post';
import StickyFooter from '@/components/StickyFooter';
import { FOOTER_HEIGHT, EXTRA_SPACER } from '@/constants/layout';

const light = { bg:'#f9f9f9', card:'#fff', text:'#111', sub:'#555', border:'#ccc', inputBg:'#fff', placeholder:'#888', primary:'#1e90ff', danger:'#dc2626', success:'#238636', border2:'#ddd' };
const dark  = { bg:'#0d1117', card:'#161b22', text:'#e6edf3', sub:'#8b949e', border:'#30363d', inputBg:'#161b22', placeholder:'#8b949e', primary:'#2f81f7', danger:'#ef4444', success:'#238636', border2:'#30363d' };

type FieldProps = {
  label: string; k: string; value: string;
  keyboardType?: TextInputProps['keyboardType'];
  onChange: (k: string, v: string) => void;
  onFocus?: () => void;
  theme: typeof light;
};

const Field = memo(function Field({ label, k, value, keyboardType='default', onChange, onFocus, theme }: FieldProps) {
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
        onChangeText={(v)=>onChange(k, v)}
        onFocus={onFocus}
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
    if (!title.trim()) return Alert.alert('Title required');
    try {
      await updatePost(post.id!, { title, description, details } as Partial<Post>);
      Alert.alert('Saved', 'Your changes were saved.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    }
  }, [post, title, description, details, router]);

  const onDelete = useCallback(async () => {
    if (!post) return;
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
  }, [post, router]);

  if (loading) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:theme.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!post) return null;
  const isOwner = post.ownerId === auth.currentUser?.uid;


  // Enough space so the last field clears the pinned footer
  const bottomPad = FOOTER_HEIGHT + EXTRA_SPACER + insets.bottom;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex:1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <View style={{ flex:1 }}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
            contentContainerStyle={{ padding:16, paddingBottom: bottomPad }}
          >
            <Text style={{ color: theme.sub, marginBottom: 6 }}>
              {post.category} • {post.status}
            </Text>

            <Text style={{ color: theme.text, marginBottom: 6 }}>Title</Text>
            <TextInput
              style={{ borderWidth:1, borderRadius:10, padding:12, backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text, marginBottom:12 }}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <Text style={{ color: theme.text, marginBottom: 6 }}>Description</Text>
            <TextInput
              style={{ borderWidth:1, borderRadius:10, padding:12, minHeight:100, backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text, marginBottom:12 }}
              value={description}
              onChangeText={setDescription}
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
                onFocus={idx === fieldConfigs.length - 1 ? () => scrollRef.current?.scrollToEnd({ animated: true }) : undefined}
              />
            ))}
          </ScrollView>

          {/* Sticky footer above keyboard */}
{/* ✅ Show update/delete only if current user owns this post */}
{isOwner && (
            <StickyFooter bg={theme.card} border={theme.border2}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={onSave}
                  style={{ backgroundColor: theme.success, paddingVertical:12, borderRadius:10, flex:1 }}
                >
                  <Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onDelete}
                  style={{ backgroundColor: theme.danger, paddingVertical:12, borderRadius:10 }}
                >
                  <Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </StickyFooter>
          )}

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
