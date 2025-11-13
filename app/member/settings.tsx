// app/member/settings.tsx
import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  Alert,
} from 'react-native';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { useAppTheme } from '@/lib/theme';

export default function SettingsScreen() {
  const { theme } = useAppTheme();
  const user = auth.currentUser;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState(''); // city
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const ref = doc(db, 'members', user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as any;
        setDisplayName(data.displayName || user.displayName || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
      } else {
        setDisplayName(user.displayName || user.email || '');
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setSavingProfile(true);
    try {
      // Update Firebase Auth profile (name only)
      await updateProfile(user, {
        displayName,
      });

      // Update Firestore member document
      const ref = doc(db, 'members', user.uid);
      await setDoc(
        ref,
        {
          displayName,
          bio,
          location, // city
          isActive: true,
        },
        { merge: true }
      );

      Alert.alert('Success', 'Profile updated.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }

    setChangingPassword(true);
    try {
      if (!user.email) {
        throw new Error('No email on user.');
      }
      const cred = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;
    Alert.alert(
      'Deactivate account?',
      'Your account will be marked as inactive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const ref = doc(db, 'members', user.uid);
              await updateDoc(ref, { isActive: false });
              Alert.alert('Done', 'Account deactivated.');
              // Optionally sign out:
              // await auth.signOut();
            } catch (err: any) {
              console.error(err);
              Alert.alert(
                'Error',
                err.message || 'Could not deactivate account.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: theme.text,
          marginBottom: 16,
        }}
      >
        Account Settings
      </Text>

      {/* PROFILE INFO */}
      <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 8 }}>
        Profile
      </Text>

      {/* Name */}
      <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>
        Name
      </Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        style={{
          backgroundColor: theme.card,
          color: theme.text,
          padding: 10,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />

      {/* Bio */}
      <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>
        Bio
      </Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Write something about yourself..."
        multiline
        numberOfLines={3}
        style={{
          backgroundColor: theme.card,
          color: theme.text,
          padding: 10,
          borderRadius: 10,
          marginBottom: 12,
          minHeight: 60,
        }}
      />

      {/* City */}
      <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>
        City
      </Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Where do you live?"
        style={{
          backgroundColor: theme.card,
          color: theme.text,
          padding: 10,
          borderRadius: 10,
          marginBottom: 16,
        }}
      />

      <Button
        title={savingProfile ? 'Saving...' : 'Save profile'}
        onPress={handleSaveProfile}
        disabled={savingProfile}
      />

      {/* PASSWORD SECTION */}
      <Text
        style={{
          color: theme.text,
          fontWeight: '600',
          marginTop: 24,
          marginBottom: 8,
        }}
      >
        Change password
      </Text>

      <Text style={{ color: theme.text, marginBottom: 4 }}>
        Current password
      </Text>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Current password"
        secureTextEntry
        style={{
          backgroundColor: theme.card,
          color: theme.text,
          padding: 10,
          borderRadius: 10,
          marginBottom: 8,
        }}
      />

      <Text style={{ color: theme.text, marginBottom: 4 }}>
        New password
      </Text>
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="New password"
        secureTextEntry
        style={{
          backgroundColor: theme.card,
          color: theme.text,
          padding: 10,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />

      <Button
        title={changingPassword ? 'Updating...' : 'Update password'}
        onPress={handleChangePassword}
        disabled={changingPassword}
      />

      {/* DEACTIVATE */}
      <Text
        style={{
          color: theme.text,
          fontWeight: '600',
          marginTop: 24,
          marginBottom: 8,
        }}
      >
        Danger zone
      </Text>
      <Button title="Deactivate account" onPress={handleDeactivateAccount} />
    </ScrollView>
  );
}
