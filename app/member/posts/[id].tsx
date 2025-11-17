//app/member/posts/[id].tsx
import { auth } from "@/lib/firebase";
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

import DateTimePicker from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';

const light = { bg:'#f9f9f9', card:'#fff', text:'#111', sub:'#555', border:'#ccc', inputBg:'#fff', placeholder:'#888', primary:'#1e90ff', danger:'#dc2626', success:'#238636', border2:'#ddd' };
const dark  = { bg:'#0d1117', card:'#161b22', text:'#e6edf3', sub:'#8b949e', border:'#30363d', inputBg:'#161b22', placeholder:'#8b949e', primary:'#2f81f7', danger:'#ef4444', success:'#238636', border2:'#30363d' };

// ---------------------------------------------------
// FIELD COMPONENT
// ---------------------------------------------------

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
        style={{
          borderWidth:1,
          borderRadius:10,
          padding:12,
          backgroundColor:theme.inputBg,
          borderColor:theme.border,
          color:theme.text
        }}
        placeholderTextColor={theme.placeholder}
        value={value}
        keyboardType={keyboardType}
        onChangeText={(v)=>onChange(k, v)}
        onFocus={onFocus}
      />
    </View>
  );
});

// ---------------------------------------------------
// MAIN SCREEN
// ---------------------------------------------------

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

  // 📌 For date/time picker
  const [picker, setPicker] = useState<null | { key: string; mode: 'date' | 'time' }>(null);

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
  }, [id]);

  const onChangeField = useCallback((k: string, v: string) => {
    setDetails(prev => ({ ...prev, [k]: v }));
  }, []);

  // ---------------------------------------------------
  // CATEGORY-BASED FIELDS
  // ---------------------------------------------------
  const fieldConfigs = useMemo(() => {
    const configs: Array<{ k: string; label: string; keyboardType?: TextInputProps['keyboardType'] }> = [];
    switch (post?.category) {
      case 'janazah':
        return [
          { k:'deceasedName',   label:'Deceased name' },
          { k:'funeralDate',    label:'Funeral date' },
          { k:'funeralTime',    label:'Funeral time' },
          { k:'mosqueName',     label:'Mosque' },
          { k:'address',        label:'Address' },
          { k:'burialLocation', label:'Burial location' },
          { k:'contactPhone',   label:'Contact phone', keyboardType:'phone-pad' as const },
        ];
      case 'events':
        return [
          { k:'eventDate',   label:'Event date' },
          { k:'eventTime',   label:'Event time' },
          { k:'venue',       label:'Venue' },
          { k:'address',     label:'Address' },
          { k:'ticketPrice', label:'Ticket price', keyboardType:'numeric' as const },
        ];
      case 'jobs':
        return [
          { k:'company',        label:'Company' },
          { k:'ratePerHour',    label:'Rate per hour', keyboardType:'numeric' as const },
          { k:'employmentType', label:'Employment type' },
          { k:'address',        label:'Address' },
          { k:'contactEmail',   label:'Contact email', keyboardType:'email-address' as const },
          { k:'contactPhone',   label:'Contact phone', keyboardType:'phone-pad' as const },
        ];
      case 'pub':
        return [
          { k:'placeName',    label:'Place name' },
          { k:'address',      label:'Address' },
          { k:'phone',        label:'Phone', keyboardType:'phone-pad' as const },
          { k:'openingHours', label:'Opening hours' },
          { k:'website',      label:'Website' },
        ];
      default:
        return configs;
    }
  }, [post?.category]);

  // ---------------------------------------------------
  // SAVE
  // ---------------------------------------------------
  const onSave = useCallback(async () => {
    if (!post) return;
    if (!title.trim()) return Alert.alert('Title required');

    try {
      await updatePost(post.id!, { title, description, details });
      Alert.alert('Saved', 'Your changes were saved.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    }
  }, [post, title, description, details]);

  // ---------------------------------------------------
  // DELETE
  // ---------------------------------------------------
  const onDelete = useCallback(() => {
    if (!post) return;

    Alert.alert("Delete post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePost(post.id!);
          router.back();
        }
      }
    ]);
  }, [post]);

  // ---------------------------------------------------
  // LOADING
  // ---------------------------------------------------
  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:theme.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!post) return null;
  const isOwner = post.ownerId === auth.currentUser?.uid;

  const bottomPad = FOOTER_HEIGHT + EXTRA_SPACER + insets.bottom;

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------

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
            contentContainerStyle={{ padding:16, paddingBottom: bottomPad }}
          >
            <Text style={{ color: theme.sub, marginBottom: 6 }}>
              {post.category} • {post.status}
            </Text>

            {/* TITLE */}
            <Text style={{ color: theme.text, marginBottom: 6 }}>Title</Text>
            <TextInput
              style={{
                borderWidth:1, borderRadius:10, padding:12,
                backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text,
                marginBottom:12
              }}
              value={title}
              onChangeText={setTitle}
            />

            {/* DESCRIPTION */}
            <Text style={{ color: theme.text, marginBottom: 6 }}>Description</Text>
            <TextInput
              style={{
                borderWidth:1, borderRadius:10, padding:12, minHeight:100,
                backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text,
                marginBottom:12
              }}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* CATEGORY FIELDS */}
            {fieldConfigs.map((cfg, idx) => {
              const isDateOrTime =
                cfg.k.toLowerCase().includes("date") ||
                cfg.k.toLowerCase().includes("time");

              const showPicker = () =>
                setPicker({
                  key: cfg.k,
                  mode: cfg.k.toLowerCase().includes("time") ? "time" : "date",
                });

              const displayValue =
                details[cfg.k] ?? "";

              return isDateOrTime ? (
                <View key={cfg.k} style={{ marginBottom: 12 }}>
                  <Text style={{ marginBottom: 6, color: theme.text }}>{cfg.label}</Text>
                  <TouchableOpacity onPress={showPicker} activeOpacity={0.8}>
                    <View
                      style={{
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 12,
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                      }}
                    >
                      <Text style={{ color: displayValue ? theme.text : theme.placeholder }}>
                        {displayValue || `Select ${cfg.label.toLowerCase()}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <Field
                  key={cfg.k}
                  label={cfg.label}
                  k={cfg.k}
                  value={String(details[cfg.k] ?? "")}
                  keyboardType={cfg.keyboardType}
                  onChange={onChangeField}
                  theme={theme}
                  onFocus={
                    idx === fieldConfigs.length - 1
                      ? () => scrollRef.current?.scrollToEnd({ animated: true })
                      : undefined
                  }
                />
              );
            })}
          </ScrollView>

          {/* Date / Time Picker */}
          {picker && (
            <DateTimePicker
              value={details[picker.key] ? new Date(details[picker.key]) : new Date()}
              mode={picker.mode}
              display="default"
              onChange={(event, selected) => {
                if (event.type === "dismissed") {
                  setPicker(null);
                  return;
                }
                if (selected) {
                  setDetails((prev) => ({
                    ...prev,
                    [picker.key]: selected.toISOString(),
                  }));
                }
                setPicker(null);
              }}
            />
          )}

          {/* FOOTER */}
          {isOwner && (
            <StickyFooter bg={theme.card} border={theme.border2}>
              <View style={{ flexDirection:"row", gap:10 }}>
                <TouchableOpacity
                  onPress={onSave}
                  style={{ backgroundColor:theme.success, paddingVertical:12, borderRadius:10, flex:1 }}
                >
                  <Text style={{ color:"#fff", textAlign:"center", fontWeight:"600" }}>
                    Save
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onDelete}
                  style={{ backgroundColor:theme.danger, paddingVertical:12, borderRadius:10 }}
                >
                  <Text style={{ color:"#fff", textAlign:"center", fontWeight:"600" }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </StickyFooter>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
