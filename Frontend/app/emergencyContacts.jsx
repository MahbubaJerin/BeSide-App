// Frontend/app/emergencyContacts.jsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StatusBar,
  Dimensions,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BASE_URL } from '../config';

const join = (base, path) => `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

const palette = {
  bg: '#FFFFFF',
  card: '#F7F9FF',
  text: '#0D1B2A',
  sub: '#5A6B7B',
  primary: '#2C7BE5',
  dark: '#2E3A59',
  danger: '#D7263D',
  divider: '#E8EEF7',
};

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(join(BASE_URL, '/api/v1/user/emergency-contacts'), {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const onDelete = (id) => {
    Alert.alert('Delete', 'Are you sure you want to delete this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(join(BASE_URL, `/api/v1/user/emergency-contacts/${id}`), {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              throw new Error(j.message || 'Delete failed');
            }
            setContacts((prev) => prev.filter((c) => c._id !== id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const initials = (name = '') =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('');

  const openDial = (phone) => phone && Linking.openURL(`tel:${phone}`).catch(() => {});
  const openMail = (email) => email && Linking.openURL(`mailto:${email}`).catch(() => {});

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.name)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.isPrimary ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Primary</Text>
            </View>
          ) : null}
        </View>

        {!!item.relation && <Text style={styles.meta}>{item.relation}</Text>}

        <Pressable
          onPress={() => openDial(item.phone)}
          android_ripple={{ color: '#dfe8f8', radius: 130 }}
          style={styles.infoRow}
        >
          <Ionicons name="call-outline" size={18} color={palette.primary} />
          <Text numberOfLines={1} style={styles.phoneText}>{item.phone || '—'}</Text>
        </Pressable>

        {!!item.email && (
          <Pressable
            onPress={() => openMail(item.email)}
            android_ripple={{ color: '#dfe8f8', radius: 130 }}
            style={styles.infoRow}
          >
            <Ionicons name="mail-outline" size={18} color={palette.sub} />
            <Text numberOfLines={1} style={styles.metaLink}>{item.email}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.chip, styles.chipDark]}
          onPress={() =>
            router.push({ pathname: '/emergencyContacts.add', params: { mode: 'edit', id: item._id } })
          }
        >
          <MaterialIcons name="edit" size={16} color="#FFF" />
          <Text style={styles.chipText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.chip, styles.chipDanger]}
          onPress={() => onDelete(item._id)}
        >
          <MaterialIcons name="delete-outline" size={16} color="#FFF" />
          <Text style={styles.chipText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header count={0} />
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading contacts…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header count={contacts.length} />
      {contacts.length === 0 ? (
        <View style={[styles.center, styles.wrapperPadding]}>
          <Text style={styles.emptyTitle}>No emergency contacts yet</Text>
          <Text style={styles.emptySub}>Add at least one trusted person for quick SOS.</Text>
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
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={<View style={{ height: 8 }} />}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/emergencyContacts.add')}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

function Header({ count }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Emergency Contacts</Text>
      <Text style={styles.headerSub}>{count} saved</Text>
    </View>
  );
}

const { width } = Dimensions.get('window');
const CARD_PADDING = 16;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 12) + 6 : 12,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16, // slightly lower now
    paddingBottom: 14,
    borderBottomColor: palette.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: palette.bg,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: palette.text, letterSpacing: 0.2 },
  headerSub: { marginTop: 2, color: palette.sub },

  wrapperPadding: { paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, color: palette.sub },

  listContent: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: 12,
    paddingBottom: 120,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(44,123,229,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
    width: width - CARD_PADDING * 2,
    minHeight: 96,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#E3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: palette.primary },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '800', color: palette.text },
  badge: {
    backgroundColor: '#EEF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { color: palette.primary, fontSize: 12, fontWeight: '700' },

  meta: { marginTop: 4, color: palette.sub, fontSize: 14 },

  infoRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  phoneText: { color: palette.primary, fontWeight: '700', fontSize: 15 },
  metaLink: { color: palette.sub, fontSize: 14, flexShrink: 1 },

  actions: {
    marginLeft: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 92,
    justifyContent: 'center',
  },
  chipDark: { backgroundColor: palette.dark },
  chipDanger: { backgroundColor: palette.danger },
  chipText: { color: '#fff', fontWeight: '800' },

  primary: {
    marginTop: 14,
    backgroundColor: palette.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  emptyTitle: { fontSize: 18, fontWeight: '800', color: palette.text, marginBottom: 6, textAlign: 'center' },
  emptySub: { color: palette.sub, textAlign: 'center', marginBottom: 8 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: palette.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
});
