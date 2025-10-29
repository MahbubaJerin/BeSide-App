import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Animated,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { Ionicons } from "@expo/vector-icons";

export default function ConsentModal({ visible, onClose, consent, setConsent, onSubmit }) {
  const isComplete = consent.noTouch && consent.respectful && consent.safety;
  const [expandedItem, setExpandedItem] = useState(null);
  
  const completedCount = Object.values(consent).filter(Boolean).length;
  const totalRequired = 3;
  
  const consentItems = [
    {
      key: 'noTouch',
      icon: 'hand-left-outline',
      color: '#FF6B9D',
      title: 'No Physical Contact',
      description: 'I agree to maintain appropriate physical boundaries throughout the entire journey',
      details: 'This means no handshakes, hugs, or any form of physical contact. Personal space and boundaries are crucial for safe travel companionship.'
    },
    {
      key: 'respectful',
      icon: 'heart-outline',
      color: '#C77DFF',
      title: 'Respectful Behavior',
      description: 'I will be respectful and maintain professional conduct',
      details: 'Treat your companion with respect, avoid inappropriate topics, and maintain courteous communication throughout your shared journey.'
    },
    {
      key: 'safety',
      icon: 'shield-checkmark-outline',
      color: '#7209B7',
      title: 'Safety Guidelines',
      description: 'I understand and agree to follow all safety rules',
      details: 'BeSide is for safe travel companionship only. Report any concerning behavior and prioritize your safety at all times.'
    }
  ];
  
  const handleToggle = (key) => {
    setConsent({ ...consent, [key]: !consent[key] });
  };
  
  const toggleExpand = (key) => {
    setExpandedItem(expandedItem === key ? null : key);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
        
        {/* Purple Gradient Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Ionicons name="shield-checkmark" size={32} color="white" />
              <Text style={styles.headerTitle}>Safety First</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Review and accept our community guidelines
            </Text>
          </View>
          
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>{completedCount} of {totalRequired}</Text>
              <Text style={styles.progressLabel}>Agreements</Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: `${(completedCount / totalRequired) * 100}%` }
                ]}
              />
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Intro Text */}
          <View style={styles.introCard}>
            <Ionicons name="information-circle" size={20} color="#8B5CF6" />
            <Text style={styles.introText}>
              Please read and accept each guideline to ensure a safe experience
            </Text>
          </View>

          {/* Consent Cards */}
          {consentItems.map((item, index) => (
            <View key={item.key} style={styles.consentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon} size={28} color={item.color} />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  </View>
                </View>
              </View>

              {/* Toggle and Info Row */}
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.moreInfoButton}
                  onPress={() => toggleExpand(item.key)}
                >
                  <Ionicons 
                    name={expandedItem === item.key ? "chevron-up" : "information-circle-outline"} 
                    size={20} 
                    color="#8B5CF6" 
                  />
                  <Text style={styles.moreInfoText}>
                    {expandedItem === item.key ? "Less Info" : "More Info"}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.switchContainer}>
                  {consent[item.key] && (
                    <View style={styles.acceptedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.acceptedText}>Accepted</Text>
                    </View>
                  )}
                  <Switch
                    value={consent[item.key]}
                    onValueChange={() => handleToggle(item.key)}
                    trackColor={{ false: '#E5E5E5', true: `${item.color}50` }}
                    thumbColor={consent[item.key] ? item.color : '#F4F3F4'}
                    style={styles.switch}
                  />
                </View>
              </View>

              {/* Expandable Details */}
              {expandedItem === item.key && (
                <View style={styles.expandedDetails}>
                  <Text style={styles.detailsText}>{item.details}</Text>
                </View>
              )}

              {/* Divider */}
              {index < consentItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}

          {/* Important Notice */}
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Ionicons name="alert-circle" size={22} color="#F59E0B" />
              <Text style={styles.noticeTitle}>Important Notice</Text>
            </View>
            <Text style={styles.noticeText}>
              BeSide is designed for safe travel companionship only. Any violation of these guidelines may result in account suspension.
            </Text>
          </View>
        </ScrollView>

        {/* Footer with Action Buttons */}
        <View style={styles.footer}>
          <ThemedButton
            title={isComplete ? "✓ I Accept All Terms" : `Accept ${totalRequired - completedCount} More`}
            onPress={() => {
              if (isComplete) {
                onSubmit();
                onClose();
              }
            }}
            disabled={!isComplete}
            style={[
              styles.submitButton,
              !isComplete && styles.submitButtonDisabled
            ]}
          />

          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Purple Gradient Header
  header: {
    backgroundColor: '#8B5CF6',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Progress Indicator
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },
  
  // Intro Card
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: '#6B21A8',
    lineHeight: 20,
  },
  
  // Consent Cards
  consentCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  
  // Card Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  moreInfoText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  acceptedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  
  // Expanded Details
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailsText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 20,
  },
  
  // Notice Card
  noticeCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  noticeText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  cancelText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
});
