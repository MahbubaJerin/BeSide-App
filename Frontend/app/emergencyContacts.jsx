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
  const openSMS = (phone) => {
    if (!phone) return;
    
    // Basic SMS for regular use
    Linking.openURL(`sms:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to open messaging app');
    });
  };

  const sendEmergencySMS = (phone, contactName) => {
    if (!phone) return;

    Alert.alert(
      'Send Emergency Text',
      `Send an emergency alert to ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Quick Alert', 
          onPress: () => {
            const emergencyMessage = `🚨 EMERGENCY ALERT 🚨\n\nI need immediate help! This is an automated emergency message from BeSide app.\n\nPlease call me or emergency services if you cannot reach me.\n\nTime: ${new Date().toLocaleString()}`;
            const encodedMessage = encodeURIComponent(emergencyMessage);
            Linking.openURL(`sms:${phone}?body=${encodedMessage}`).catch(() => {
              Alert.alert('Error', 'Unable to open messaging app');
            });
          }
        },
        { 
          text: 'Open Messaging', 
          onPress: () => openSMS(phone)
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Contact Header */}
      <View style={styles.contactHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item.name)}</Text>
        </View>
        
        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            {item.isPrimary && (
              <View style={styles.primaryBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            )}
          </View>
          {!!item.relation && <Text style={styles.relation}>{item.relation}</Text>}
        </View>

        {/* Edit/Delete Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() =>
              router.push({ pathname: '/emergencyContacts.add', params: { mode: 'edit', id: item._id } })
            }
          >
            <Ionicons name="pencil" size={18} color={palette.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => onDelete(item._id)}
          >
            <Ionicons name="trash-outline" size={18} color={palette.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => openDial(item.phone)}
          style={[styles.quickActionButton, styles.callButton]}
        >
          <Ionicons name="call" size={20} color="#FFF" />
          <Text style={styles.quickActionText}>Call</Text>
        </Pressable>

        <Pressable
          onPress={() => openSMS(item.phone)}
          onLongPress={() => sendEmergencySMS(item.phone, item.name)}
          style={[styles.quickActionButton, styles.textButton]}
        >
          <Ionicons name="chatbubble" size={20} color="#FFF" />
          <Text style={styles.quickActionText}>Text</Text>
        </Pressable>

        {!!item.email && (
          <Pressable
            onPress={() => openMail(item.email)}
            style={[styles.quickActionButton, styles.emailButton]}
          >
            <Ionicons name="mail" size={20} color="#FFF" />
            <Text style={styles.quickActionText}>Email</Text>
          </Pressable>
        )}
      </View>

      {/* Emergency Alert Helper */}
      <View style={styles.emergencyHint}>
        <Ionicons name="information-circle-outline" size={14} color={palette.sub} />
        <Text style={styles.emergencyHintText}>Hold "Text" for emergency alert</Text>
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
    paddingTop: 12,
    paddingBottom: 100,
  },

  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(44,123,229,0.08)',
    ...Platform.select({
      ios: { 
        shadowColor: '#000', 
        shadowOpacity: 0.08, 
        shadowRadius: 12, 
        shadowOffset: { width: 0, height: 6 } 
      },
      android: { elevation: 4 },
    }),
  },

  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: palette.primary,
  },
  avatarText: { 
    fontWeight: '800', 
    color: palette.primary, 
    fontSize: 18 
  },

  contactInfo: {
    flex: 1,
  },

  nameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4,
  },
  name: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: palette.text,
    marginRight: 8,
  },

  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  primaryBadgeText: { 
    color: '#B8860B', 
    fontSize: 11, 
    fontWeight: '600' 
  },

  relation: { 
    color: palette.sub, 
    fontSize: 14,
    fontStyle: 'italic',
  },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(44,123,229,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 6,
    ...Platform.select({
      ios: { 
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowRadius: 4, 
        shadowOffset: { width: 0, height: 2 } 
      },
      android: { elevation: 2 },
    }),
  },

  callButton: {
    backgroundColor: '#22C55E',
  },
  textButton: {
    backgroundColor: '#3B82F6',
  },
  emailButton: {
    backgroundColor: '#8B5CF6',
  },

  quickActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  emergencyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(59,130,246,0.05)',
    borderRadius: 12,
  },

  emergencyHintText: {
    color: palette.sub,
    fontSize: 12,
    fontStyle: 'italic',
  },

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
    bottom: 80,
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