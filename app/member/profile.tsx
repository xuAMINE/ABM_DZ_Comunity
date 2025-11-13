// app/member/profile.tsx
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, Image } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { useAppTheme } from '@/lib/theme';

type MemberProfile = {
  displayName?: string;
  bio?: string;
  location?: string; // city
  photoURL?: string;
};

type Post = {
  id: string;
  content?: string;
  category?: string;
  status?: string;
  createdAt?: any;
};

type ActivityItem = {
  id: string;
  type: 'like' | 'comment';
  postTitle?: string;
  createdAt?: any;
};

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<MemberProfile>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1) Load member profile document
        const memberRef = doc(db, 'members', user.uid);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          setProfile(memberSnap.data() as MemberProfile);
        } else {
          setProfile({
            displayName: user.displayName || user.email || 'Member',
          });
        }

        // 2) Load posts created by this user
        const postsQ = query(
          collection(db, 'posts'),
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const postsSnap = await getDocs(postsQ);
        const userPosts: Post[] = postsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setPosts(userPosts);

        // 3) Load activity (likes + comments)
        const likesQ = query(
          collection(db, 'likes'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const likesSnap = await getDocs(likesQ);
        const likeItems: ActivityItem[] = likesSnap.docs.map((d) => ({
          id: d.id,
          type: 'like',
          ...(d.data() as any),
        }));

        const commentsQ = query(
          collection(db, 'comments'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const commentsSnap = await getDocs(commentsQ);
        const commentItems: ActivityItem[] = commentsSnap.docs.map((d) => ({
          id: d.id,
          type: 'comment',
          ...(d.data() as any),
        }));

        setActivities([...likeItems, ...commentItems]);
      } catch (err) {
        console.error('Error loading profile page', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* PROFILE CARD */}
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          maxWidth: 420, // phone-like width
          width: '100%',
          alignSelf: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        {/* Avatar + name */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {profile.photoURL ? (
            <Image
              source={{ uri: profile.photoURL }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                marginRight: 12,
              }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 24,
                  fontWeight: '700',
                }}
              >
                {(profile.displayName || 'M')[0].toUpperCase()}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            {/* Name */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: theme.text,
              }}
            >
              {profile.displayName || 'Your name'}
            </Text>

            {/* Email (smaller) */}
            {!!auth.currentUser?.email && (
              <Text
                style={{
                  color: theme.muted,
                  marginTop: 2,
                  fontSize: 14,
                }}
              >
                {auth.currentUser.email}
              </Text>
            )}

            {/* City (inline small) */}
            {profile.location && (
              <Text style={{ color: theme.muted, marginTop: 2 }}>
                📍 {profile.location}
              </Text>
            )}
          </View>
        </View>

        {/* BIO & CITY */}
        <View style={{ marginTop: 12 }}>
          <Text
            style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}
          >
            About
          </Text>
          <Text style={{ color: theme.muted }}>
            {profile.bio || 'No bio added yet.'}
          </Text>

          <Text
            style={{
              color: theme.text,
              fontWeight: '600',
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            City
          </Text>
          <Text style={{ color: theme.muted }}>
            {profile.location || 'No city added yet.'}
          </Text>
        </View>

        {/* Badges row */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: '#E5F0FF',
              marginRight: 8,
              marginBottom: 4,
            }}
          >
            <Text style={{ color: theme.primary, fontSize: 12 }}>
              DZ Community
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: '#F3F4F6',
              marginBottom: 4,
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Joined 2025
            </Text>
          </View>
        </View>
      </View>

      {/* STATS ROW */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          maxWidth: 420,
          alignSelf: 'center',
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Posts', value: posts.length },
          {
            label: 'Likes',
            value: activities.filter((a) => a.type === 'like').length,
          },
          {
            label: 'Comments',
            value: activities.filter((a) => a.type === 'comment').length,
          },
        ].map((stat) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              marginHorizontal: 4,
              backgroundColor: theme.card,
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text
              style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}
            >
              {stat.value}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* POSTS SECTION */}
      <View style={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 8,
          }}
        >
          My Posts
        </Text>
        {posts.length === 0 ? (
          <Text style={{ color: theme.muted, marginBottom: 16 }}>
            You haven’t created any posts yet.
          </Text>
        ) : (
          posts.map((post) => (
            <View
              key={post.id}
              style={{
                backgroundColor: theme.card,
                padding: 12,
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                {post.category || 'Post'}
              </Text>
              <Text style={{ color: theme.muted, marginTop: 2 }}>
                {post.status && `Status: ${post.status}`}
              </Text>
              <Text style={{ color: theme.text, marginTop: 6 }}>
                {post.content}
              </Text>
            </View>
          ))
        )}

        {/* ACTIVITY SECTION */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.text,
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          My Activity
        </Text>
        {activities.length === 0 ? (
          <Text style={{ color: theme.muted }}>
            No likes or comments yet.
          </Text>
        ) : (
          activities.map((a) => (
            <View
              key={a.id}
              style={{
                backgroundColor: theme.card,
                padding: 12,
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                {a.type === 'like' ? 'Liked a post' : 'Commented on a post'}
              </Text>
              {a.postTitle && (
                <Text style={{ color: theme.text, marginTop: 4 }}>
                  {a.postTitle}
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

