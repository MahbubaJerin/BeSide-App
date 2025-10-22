/**
 * Test script to verify trip cleanup functionality
 * Tests the new auto-cleanup features for old/inactive trips
 */

// Prevent server from starting
process.env.SKIP_SERVER_INIT = 'true';

const mongoose = require("mongoose");
require("dotenv").config();

// Define schema directly to avoid loading full app
const tripMatchSchema = new mongoose.Schema({
  organizer: {
    userId: String,
    userName: String,
    userImage: String
  },
  companion: {
    userId: String,
    userName: String,
    userImage: String
  },
  destination: String,
  status: {
    type: String,
    enum: ['active', 'in-progress', 'completed', 'cancelled'],
    default: 'active'
  },
  progression: {
    matched: Date,
    started: Date,
    completed: Date,
    cancelled: Date
  },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'tripmatches' });

const TripMatch = mongoose.model('TripMatch', tripMatchSchema);

const testCleanup = async () => {
  try {
    console.log("🧪 [TEST] Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ [TEST] Connected to MongoDB");

    console.log("\n📊 [TEST] Current Trip Matches in Database:");
    console.log("=" .repeat(60));

    // Get all trip matches
    const allMatches = await TripMatch.find({}).sort({ createdAt: -1 });
    console.log(`Total matches found: ${allMatches.length}\n`);

    // Group by status
    const byStatus = {
      active: [],
      'in-progress': [],
      completed: [],
      cancelled: []
    };

    allMatches.forEach(match => {
      if (byStatus[match.status]) {
        byStatus[match.status].push(match);
      }
    });

    // Display counts
    console.log("Status Breakdown:");
    console.log(`  🟢 Active: ${byStatus.active.length}`);
    console.log(`  🔵 In-Progress: ${byStatus['in-progress'].length}`);
    console.log(`  ✅ Completed: ${byStatus.completed.length}`);
    console.log(`  ❌ Cancelled: ${byStatus.cancelled.length}\n`);

    // Check for old matches that should be cleaned
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log("🔍 [TEST] Analyzing matches for cleanup...\n");

    // Old active matches (should be auto-cancelled)
    const oldActiveMatches = byStatus.active.filter(m => 
      m.progression?.matched && new Date(m.progression.matched) < tenMinutesAgo
    );

    if (oldActiveMatches.length > 0) {
      console.log(`⚠️  Found ${oldActiveMatches.length} OLD active matches (>10 min):`);
      oldActiveMatches.forEach(m => {
        const ageMinutes = Math.floor((Date.now() - new Date(m.progression.matched)) / 60000);
        console.log(`   - Match ${m._id}: ${ageMinutes} minutes old (should be cancelled)`);
      });
    } else {
      console.log("✅ No old active matches found (all recent or already cleaned)");
    }

    // Old completed/cancelled matches (should be deleted)
    const oldCompletedMatches = [...byStatus.completed, ...byStatus.cancelled].filter(m => {
      const completedDate = m.progression?.completed || m.progression?.cancelled;
      return completedDate && new Date(completedDate) < oneDayAgo;
    });

    if (oldCompletedMatches.length > 0) {
      console.log(`\n⚠️  Found ${oldCompletedMatches.length} OLD completed/cancelled matches (>24 hours):`);
      oldCompletedMatches.forEach(m => {
        const completedDate = m.progression?.completed || m.progression?.cancelled;
        const ageHours = Math.floor((Date.now() - new Date(completedDate)) / 3600000);
        console.log(`   - Match ${m._id}: ${ageHours} hours old (should be deleted)`);
      });
    } else {
      console.log("\n✅ No old completed/cancelled matches found (all recent or already cleaned)");
    }

    // Test the cleanup function
    console.log("\n🧹 [TEST] Manual cleanup simulation...");
    
    if (oldActiveMatches.length > 0) {
      console.log(`   Updating ${oldActiveMatches.length} old active matches to 'cancelled'...`);
      const result = await TripMatch.updateMany({
        status: 'active',
        'progression.matched': { $lt: tenMinutesAgo },
        'progression.started': { $exists: false }
      }, {
        $set: { 
          status: 'cancelled',
          'progression.cancelled': new Date()
        }
      });
      console.log(`   ✅ Updated ${result.modifiedCount} matches`);
    }

    if (oldCompletedMatches.length > 0) {
      console.log(`\n   Deleting ${oldCompletedMatches.length} old completed/cancelled matches...`);
      const result = await TripMatch.deleteMany({
        status: { $in: ['completed', 'cancelled'] },
        $or: [
          { 'progression.completed': { $lt: oneDayAgo } },
          { 'progression.cancelled': { $lt: oneDayAgo } }
        ]
      });
      console.log(`   ✅ Deleted ${result.deletedCount} matches`);
    }

    if (oldActiveMatches.length === 0 && oldCompletedMatches.length === 0) {
      console.log("   ✅ No cleanup needed - database is clean!");
    }

    // Show sample of recent active matches
    if (byStatus.active.length > 0) {
      console.log("\n📝 [TEST] Sample Recent Active Matches:");
      byStatus.active.slice(0, 3).forEach((m, idx) => {
        const matchedDate = m.progression?.matched ? new Date(m.progression.matched) : null;
        const age = matchedDate ? Math.floor((Date.now() - matchedDate) / 60000) : 'unknown';
        console.log(`   ${idx + 1}. ID: ${m._id}`);
        console.log(`      Organizer: ${m.organizer?.userName || 'Unknown'}`);
        console.log(`      Companion: ${m.companion?.userName || 'Unknown'}`);
        console.log(`      Age: ${age} minutes`);
        console.log(`      Destination: ${m.destination || 'N/A'}`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ [TEST] Cleanup test completed\n");

  } catch (error) {
    console.error("❌ [TEST] Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("👋 [TEST] Disconnected from database");
    process.exit(0);
  }
};

// Run the test
testCleanup();
