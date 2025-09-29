import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const join = (base, path) => `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

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
        const res = await fetch(
          join(BASE_URL, '/api/v1/user/emergency-contacts'),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load');
        const contact = (json.data || []).find(c => c._id === id);
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
        isPrimary
      };
      const url = isEdit
        ? join(BASE_URL, `/api/v1/user/emergency-contacts/${id}`)
        : join(BASE_URL, '/api/v1/user/emergency-contacts');

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{isEdit ? 'Edit Contact' : 'Add Contact'}</Text>

        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane Doe" />

        <Text style={styles.label}>Phone *</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+61 4xx xxx xxx" keyboardType="phone-pad" />

        <Text style={styles.label}>Relation</Text>
        <TextInput style={styles.input} value={relation} onChangeText={setRelation} placeholder="Sister, Friend…" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="jane@example.com" keyboardType="email-address" />

        <View style={styles.row}>
          <Text style={styles.label}>Primary contact</Text>
          <Switch value={isPrimary} onValueChange={setIsPrimary} />
        </View>

        <TouchableOpacity style={styles.primary} disabled={saving} onPress={onSave}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{isEdit ? 'Save Changes' : 'Add Contact'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingRight: 6 },
  primary: { marginTop: 20, backgroundColor: '#2c7be5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
});
