// Frontend/components/NavigationIntegration.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';
import { Colors } from '@/constants/Colors';

export default function NavigationIntegration({
  tripMatch,
  isVisible,
  onClose,
  onNavigationStart,
  onTripComplete
}) {
  const [navigationApp, setNavigationApp] = useState(null);

  const navigationOptions = [
    {
      id: 'google',
      name: 'Google Maps',
      icon: 'map',
      package: 'com.google.android.apps.maps',
      urlScheme: 'https://maps.google.com/',
    },
    {
      id: 'waze',
      name: 'Waze',
      icon: 'car-sport',
      package: 'com.waze',
      urlScheme: 'https://waze.com/',
    },
    {
      id: 'apple',
      name: 'Apple Maps',
      icon: 'map-outline',
      package: 'com.apple.Maps',
      urlScheme: 'http://maps.apple.com/',
    }
  ];

  const openNavigationApp = async (app, destination) => {
    try {
      console.log('🗺️ [NAVIGATION] Opening', app.name, 'for destination:', destination);

      let url;
      const { latitude, longitude, address } = destination;

      switch (app.id) {
        case 'google':
          if (Platform.OS === 'ios') {
            url = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=walking`;
            // Fallback to web version
            const fallbackUrl = `https://maps.google.com/?daddr=${latitude},${longitude}&dirflg=w`;
            
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
            } else {
              await Linking.openURL(fallbackUrl);
            }
          } else {
            url = `google.navigation:q=${latitude},${longitude}&mode=w`;
            const fallbackUrl = `https://maps.google.com/?daddr=${latitude},${longitude}&dirflg=w`;
            
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
            } else {
              await Linking.openURL(fallbackUrl);
            }
          }
          break;

        case 'waze':
          url = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes&zoom=17`;
          await Linking.openURL(url);
          break;

        case 'apple':
          if (Platform.OS === 'ios') {
            url = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w`;
            await Linking.openURL(url);
          } else {
            // Apple Maps not available on Android, fallback to Google
            url = `https://maps.google.com/?daddr=${latitude},${longitude}&dirflg=w`;
            await Linking.openURL(url);
          }
          break;

        default:
          throw new Error('Unknown navigation app');
      }

      // Notify parent component that navigation started
      onNavigationStart?.();
      
      Alert.alert(
        "Navigation Started! 🧭",
        `Opening ${app.name} for turn-by-turn directions to your destination.`,
        [
          {
            text: "Mark as Completed",
            onPress: () => onTripComplete?.()
          },
          {
            text: "Continue",
            style: "cancel"
          }
        ]
      );

    } catch (error) {
      console.error('❌ [NAVIGATION] Error opening navigation app:', error);
      
      Alert.alert(
        "Navigation Error",
        `Could not open ${app.name}. Please make sure it's installed on your device.`,
        [
          {
            text: "Try Another App",
            style: "default"
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  };

  const handleNavigationSelect = (app) => {
    if (!tripMatch?.destinationLocation) {
      Alert.alert("Error", "No destination available for navigation");
      return;
    }

    Alert.alert(
      `Open ${app.name}?`,
      `This will open ${app.name} with turn-by-turn directions to: ${tripMatch.destinationLocation.address}`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Open",
          onPress: () => openNavigationApp(app, tripMatch.destinationLocation)
        }
      ]
    );
  };

  const renderNavigationOption = (app) => (
    <TouchableOpacity
      key={app.id}
      style={styles.navigationOption}
      onPress={() => handleNavigationSelect(app)}
      activeOpacity={0.7}
    >
      <View style={styles.navigationIconContainer}>
        <Ionicons
          name={app.icon}
          size={24}
          color={Colors.light.tint}
        />
      </View>
      
      <View style={styles.navigationInfo}>
        <ThemedText type="defaultSemiBold" style={styles.navigationName}>
          {app.name}
        </ThemedText>
        <ThemedText type="caption" style={styles.navigationDescription}>
          Turn-by-turn navigation
        </ThemedText>
      </View>
      
      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.light.tabIconDefault}
      />
    </TouchableOpacity>
  );

  if (!isVisible || !tripMatch) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="navigation"
              size={28}
              color={Colors.light.tint}
            />
          </View>
          
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.headerTitle}>
              Start Navigation
            </ThemedText>
            <ThemedText type="caption" style={styles.headerSubtitle}>
              Choose your preferred navigation app
            </ThemedText>
          </View>
        </View>

        {/* Destination Info */}
        {tripMatch.destinationLocation && (
          <View style={styles.destinationCard}>
            <View style={styles.destinationHeader}>
              <Ionicons
                name="location"
                size={20}
                color={Colors.light.tint}
              />
              <ThemedText type="defaultSemiBold" style={styles.destinationTitle}>
                Destination
              </ThemedText>
            </View>
            
            <ThemedText style={styles.destinationAddress}>
              {tripMatch.destinationLocation.address}
            </ThemedText>
            
            {tripMatch.distance && (
              <ThemedText type="caption" style={styles.destinationDistance}>
                📍 {tripMatch.distance.toFixed(1)} km away
              </ThemedText>
            )}
          </View>
        )}

        {/* Navigation Options */}
        <View style={styles.navigationSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Choose Navigation App
          </ThemedText>
          
          {navigationOptions.map(renderNavigationOption)}
        </View>

        {/* Manual Instructions */}
        <View style={styles.manualSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Manual Navigation
          </ThemedText>
          
          <View style={styles.instructionCard}>
            <ThemedText type="caption" style={styles.instructionText}>
              If you prefer to navigate manually, use these coordinates:
            </ThemedText>
            
            {tripMatch.destinationLocation && (
              <View style={styles.coordinatesContainer}>
                <ThemedText type="defaultSemiBold" style={styles.coordinates}>
                  {tripMatch.destinationLocation.latitude.toFixed(6)}, {tripMatch.destinationLocation.longitude.toFixed(6)}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.closeButton]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.closeButtonText}>Close</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.footerButton, styles.completeButton]}
          onPress={() => {
            Alert.alert(
              "Complete Trip?",
              "Mark this trip as completed?",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Complete", 
                  onPress: () => onTripComplete?.()
                }
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.completeButtonText}>Mark Complete</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.tabIconDefault + '30',
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.tint + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.light.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: Colors.light.tabIconDefault,
  },
  destinationCard: {
    backgroundColor: Colors.light.tint + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  destinationTitle: {
    marginLeft: 8,
    color: Colors.light.text,
  },
  destinationAddress: {
    color: Colors.light.text,
    fontSize: 16,
    marginBottom: 4,
  },
  destinationDistance: {
    color: Colors.light.tabIconDefault,
  },
  navigationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.light.text,
    marginBottom: 12,
  },
  navigationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navigationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navigationInfo: {
    flex: 1,
  },
  navigationName: {
    color: Colors.light.text,
    marginBottom: 2,
  },
  navigationDescription: {
    color: Colors.light.tabIconDefault,
  },
  manualSection: {
    marginBottom: 20,
  },
  instructionCard: {
    backgroundColor: Colors.light.tabIconDefault + '10',
    borderRadius: 12,
    padding: 16,
  },
  instructionText: {
    color: Colors.light.tabIconDefault,
    marginBottom: 8,
  },
  coordinatesContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 12,
  },
  coordinates: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: Colors.light.text,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.tabIconDefault + '30',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  closeButton: {
    backgroundColor: Colors.light.tabIconDefault + '20',
  },
  closeButtonText: {
    color: Colors.light.tabIconDefault,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: Colors.light.tint,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});