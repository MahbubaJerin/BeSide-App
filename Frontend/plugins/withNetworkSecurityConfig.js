const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNetworkSecurityConfig(config) {
  return withAndroidManifest(config, (config) => {
    // Add network security config to AndroidManifest.xml
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    // Add network security config attribute
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    
    // Add internet and network state permissions if not already present
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }
    
    const permissions = androidManifest.manifest['uses-permission'];
    const requiredPermissions = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE'
    ];
    
    requiredPermissions.forEach(permission => {
      if (!permissions.find(p => p.$['android:name'] === permission)) {
        permissions.push({
          $: { 'android:name': permission }
        });
      }
    });
    
    return config;
  });
};