// Test coordinate clustering and distances
const mongoose = require('mongoose');
const UserLocation = require('./models/userLocationModel');
const User = require('./models/userModel');

// Connect to database
mongoose.connect(process.env.DATABASE || 'mongodb://zihansarowar:Zihansarowar@ac-gwbctwy-shard-00-00.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-01.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-02.fgfof3x.mongodb.net:27017/?replicaSet=atlas-6hex66-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    analyzeUserClusters();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

// Haversine distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

async function analyzeUserClusters() {
  try {
    console.log('\n🌍 ANALYZING USER LOCATION CLUSTERS');
    console.log('===================================');
    
    // Get all active user locations
    const locations = await UserLocation.find({
      shareLocation: true,
      visibleToOthers: true
    });
    
    console.log(`📍 Found ${locations.length} active/visible user locations`);
    console.log('');
    
    // Group by similar coordinates
    const clusters = {};
    locations.forEach((location, index) => {
      const [lon, lat] = location.location.coordinates;
      const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
      
      if (!clusters[key]) {
        clusters[key] = [];
      }
      clusters[key].push({ ...location._doc, index });
      
      console.log(`${index + 1}. User ${location.userId}`);
      console.log(`   📍 [${lon}, ${lat}]`);
      console.log(`   🗂️  Cluster: ${key}`);
      console.log('');
    });
    
    // Analyze clusters
    console.log('🔍 CLUSTER ANALYSIS:');
    console.log('===================');
    Object.entries(clusters).forEach(([key, locations]) => {
      console.log(`Cluster ${key}: ${locations.length} users`);
      if (locations.length > 1) {
        console.log('  👥 Multiple users in this area!');
        
        // Calculate distances between users in this cluster
        for (let i = 0; i < locations.length; i++) {
          for (let j = i + 1; j < locations.length; j++) {
            const loc1 = locations[i].location.coordinates;
            const loc2 = locations[j].location.coordinates;
            const distance = calculateDistance(loc1[1], loc1[0], loc2[1], loc2[0]);
            
            console.log(`    📏 Distance between User ${locations[i].userId} and ${locations[j].userId}: ${Math.round(distance)}m`);
          }
        }
      }
      console.log('');
    });
    
    // Test all possible matches within 500m
    console.log('🎯 ALL POSSIBLE MATCHES WITHIN 500M:');
    console.log('===================================');
    
    let totalMatches = 0;
    for (let i = 0; i < locations.length; i++) {
      const user1 = locations[i];
      const matches = [];
      
      for (let j = 0; j < locations.length; j++) {
        if (i === j) continue;
        
        const user2 = locations[j];
        const distance = calculateDistance(
          user1.location.coordinates[1], user1.location.coordinates[0],
          user2.location.coordinates[1], user2.location.coordinates[0]
        );
        
        if (distance <= 500) {
          matches.push({ userId: user2.userId, distance: Math.round(distance) });
        }
      }
      
      console.log(`User ${user1.userId}:`);
      if (matches.length > 0) {
        console.log(`  ✅ ${matches.length} potential companions within 500m:`);
        matches.forEach(match => {
          console.log(`    - User ${match.userId} (${match.distance}m away)`);
        });
        totalMatches += matches.length;
      } else {
        console.log(`  ❌ No companions within 500m`);
      }
      console.log('');
    }
    
    console.log(`📊 SUMMARY: ${totalMatches} total potential matches found across all users`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}