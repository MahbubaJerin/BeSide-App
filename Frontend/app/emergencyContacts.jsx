import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const join = (base, path) => `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        join(BASE_URL, '/api/v1/user/emergency-contacts'),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load contacts');
      setContacts(json.data || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchContacts(); }, [fetchContacts]));

  const onDelete = async (id) => {
    Alert.alert('Delete', 'Are you sure you want to delete this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(
              join(BASE_URL, `/api/v1/user/emergency-contacts/${id}`),
              { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              throw new Error(j.message || 'Delete failed');
            }
            setContacts(prev => prev.filter(c => c._id !== id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>
          {item.name} {item.isPrimary ? '⭐' : ''}
        </Text>
        <Text style={styles.meta}>{item.relation || '—'}</Text>
        <Text style={styles.meta}>📞 {item.phone}</Text>
        {item.email ? <Text style={styles.meta}>✉️ {item.email}</Text> : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() =>
            router.push({ pathname: '/emergencyContacts.add', params: { mode: 'edit', id: item._id } })
          }
        >
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => onDelete(item._id)}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading contacts…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {contacts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.title}>No emergency contacts yet</Text>
          <TouchableOpacity style={styles.primary} onPress={() => router.push('/emergencyContacts.add')}>
            <Text style={styles.primaryText}>Add Contact</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={contacts}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
          />
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/emergencyContacts.add')}>
            <Text style={styles.fabText}>＋</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  card: { flexDirection: 'row', padding: 14, backgroundColor: '#f6f7f9', borderRadius: 12, marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#555', marginTop: 3 },
  actions: { justifyContent: 'space-between', marginLeft: 10 },
  btn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#444', borderRadius: 8, marginTop: 4 },
  btnDanger: { backgroundColor: '#c0392b' },
  btnText: { color: '#fff', fontWeight: '600' },
  primary: { marginTop: 10, backgroundColor: '#2c7be5', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  primaryText: { color: '#fff', fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 24, backgroundColor: '#2c7be5', width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28, fontWeight: '800' }
});
