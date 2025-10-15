import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config';

const join = (base, path) => `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

const palette = {
  bg: '#FFFFFF',
  text: '#0D1B2A',
  sub: '#5A6B7B',
  primary: '#2C7BE5',
  border: '#E3E7ED',
  card: '#F8FAFF',
};

export default function AddOrEditEmergencyContact() {
  const { mode, id } = useLocalSearchParams();
  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(join(BASE_URL, '/api/v1/user/emergency-contacts'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load');
        const contact = (json.data || []).find((c) => c._id === id);
        if (!contact) throw new Error('Contact not found');
        setName(contact.name || '');
        setPhone(contact.phone || '');
        setRelation(contact.relation || '');
        setEmail(contact.email || '');
        setIsPrimary(!!contact.isPrimary);
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const onSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation', 'Name and phone are required.');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim(),
        email: email.trim(),
        isPrimary,
      };
      const url = isEdit
        ? join(BASE_URL, `/api/v1/user/emergency-contacts/${id}`)
        : join(BASE_URL, '/api/v1/user/emergency-contacts');

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Save failed');
      Alert.alert('Success', `Contact ${isEdit ? 'updated' : 'added'}.`);
      router.back();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text style={{ color: palette.sub, marginTop: 8 }}>Loading contact…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.header}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={palette.text}
              onPress={() => router.back()}
            />
            <Text style={styles.title}>{isEdit ? 'Edit Contact' : 'Add Contact'}</Text>
          </View>

          <View style={styles.container}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor="#9AA2B1"
            />

            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+61 4xx xxx xxx"
              placeholderTextColor="#9AA2B1"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Relation</Text>
            <TextInput
              style={styles.input}
              value={relation}
              onChangeText={setRelation}
              placeholder="Sister, Friend…"
              placeholderTextColor="#9AA2B1"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor="#9AA2B1"
              keyboardType="email-address"
            />

            <View style={styles.row}>
              <Text style={styles.label}>Primary contact</Text>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                trackColor={{ false: '#ccc', true: '#A8D0FF' }}
                thumbColor={isPrimary ? palette.primary : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity
              style={styles.primary}
              disabled={saving}
              onPress={onSave}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>
                  {isEdit ? 'Save Changes' : 'Add Contact'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 10) + 4 : 10,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.text,
    marginLeft: 8,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.sub,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: palette.text,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  primary: {
    marginTop: 26,
    backgroundColor: palette.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
