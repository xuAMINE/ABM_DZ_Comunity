// app/member/posts/new.tsx
import { useCallback, useMemo, useRef, useState, memo, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TextInputProps
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useRouter } from 'expo-router';
import { createPost } from '@/lib/posts';
import StickyFooter from '@/components/StickyFooter';
import { FOOTER_HEIGHT, EXTRA_SPACER } from '@/constants/layout';
import { useAppTheme } from '@/lib/theme';
import type { Theme } from '@/constants/theme';

const CATS = ['janazah','events','jobs','pub'] as const;
type Cat = typeof CATS[number];

const Field = memo(({ label, k, value, keyboardType, onChange, theme, onFocus }: {
  label: string;
  k: string;
  value: string;
  keyboardType?: TextInputProps['keyboardType'];
  onChange: (key: string, value: string) => void;
  theme: Theme;
  onFocus?: () => void;
}) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ marginBottom: 6, color: theme.text }}>{label}</Text>
    <TextInput
      style={{ borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }}
      placeholder={label}
      placeholderTextColor={theme.placeholder}
      value={value}
      onChangeText={(v) => onChange(k, v)}
      keyboardType={keyboardType}
      onFocus={onFocus}
    />
  </View>
));

Field.displayName = 'Field';

export default function NewPost() {
  const { theme } = useAppTheme();

  const params = useLocalSearchParams<{ category?: string }>();
  const initialCat = (CATS as readonly string[]).includes(String(params.category))
    ? (params.category as Cat)
    : 'janazah';

  const [category, setCategory] = useState<Cat>(initialCat);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState<Record<string, any>>({});

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // for focus-driven scroll
  const scrollRef = useRef<ScrollView>(null);

  const onChangeField = useCallback((key: string, v: string) => {
    setDetails(prev => (prev[key] === v ? prev : { ...prev, [key]: v }));
  }, []);

  const onSave = useCallback(async () => {
    if (!title) return Alert.alert('Title required');
    try {
      await createPost({
        category, title, description, groupId: 'default', details, status: 'pending',
      } as any);
      Alert.alert('Submitted', 'Your post is awaiting approval.');
      router.replace('/member/posts/page');
    } catch (e:any) {
      Alert.alert('Error', e.message);
    }
  }, [category, title, description, details, router]);

  const fieldConfigs = useMemo((): Array<{k:string; label:string; keyboardType?:TextInputProps['keyboardType']}> => {
    switch (category) {
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
  }, [category]);

  // Enough space so the last field clears the pinned footer
  const bottomPad = FOOTER_HEIGHT + EXTRA_SPACER + insets.bottom;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
            contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.text }}>
              Create Post
            </Text>

            <Text style={{ marginBottom: 6, color: theme.text }}>Category</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              {CATS.map(c => {
                const active = c === category;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={()=>setCategory(c)}
                    style={{
                      paddingHorizontal:12, paddingVertical:8, borderRadius:999, borderWidth:1,
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primary : theme.chipBg,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : theme.text }}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ marginBottom: 6, color: theme.text }}>Title</Text>
            <TextInput
              style={{ borderWidth:1, borderRadius:10, padding:12, backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text, marginBottom:12 }}
              placeholder="Enter a clear title…"
              placeholderTextColor={theme.placeholder}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <Text style={{ marginBottom: 6, color: theme.text }}>Description</Text>
            <TextInput
              style={{ borderWidth:1, borderRadius:10, padding:12, minHeight:100, backgroundColor:theme.inputBg, borderColor:theme.border, color:theme.text, marginBottom:12 }}
              placeholder="Describe the post…"
              placeholderTextColor={theme.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {fieldConfigs.map((cfg, idx) => (
              <Field
                key={cfg.k}
                label={cfg.label}
                k={cfg.k}
                value={String(details[cfg.k] ?? '')}
                keyboardType={cfg.keyboardType}
                onChange={onChangeField}
                theme={theme}
                onFocus={idx === fieldConfigs.length - 1 ? () => scrollRef.current?.scrollToEnd({ animated: true }) : undefined}
              />
            ))}
          </ScrollView>

          {/* Sticky footer above keyboard */}
          <StickyFooter bg={theme.card} border={theme.border2}>
            <TouchableOpacity
              onPress={onSave}
              style={{ backgroundColor: theme.success, paddingVertical: 14, borderRadius: 10 }}
            >
              <Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Submit</Text>
            </TouchableOpacity>
          </StickyFooter>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
