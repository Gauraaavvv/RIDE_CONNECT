const express = require('express');
const User = require('../models/User');
const router = express.Router();
const auth = require('../middleware/auth');

const DEFAULT_ACHIEVEMENTS = [
  { id: 'first_ride', title: 'First Ride', description: 'Complete your first ride', icon: '🚗', maxProgress: 1 },
  { id: 'distance_master', title: 'Distance Master', description: 'Travel 1000+ km', icon: '🌍', maxProgress: 1000 },
  { id: 'community', title: 'Community Builder', description: 'Complete 50 rides', icon: '👥', maxProgress: 50 },
  { id: 'premium', title: 'Premium Member', description: 'Upgrade to premium', icon: '👑', maxProgress: 1 }
];

// @route   GET /api/achievements
// @desc    Get user achievements
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('achievements totalRides totalDistance isPremium');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    const merged = DEFAULT_ACHIEVEMENTS.map((def) => {
      const saved = user.achievements?.find((a) => a.id === def.id);
      let progress = saved?.progress ?? 0;
      if (def.id === 'first_ride') {
        progress = (user.totalRides || 0) >= 1 ? 1 : 0;
      } else if (def.id === 'distance_master') {
        progress = user.totalDistance || 0;
      } else if (def.id === 'community') {
        progress = user.totalRides || 0;
      } else if (def.id === 'premium') {
        progress = user.isPremium ? 1 : 0;
      }
      const unlocked = saved?.unlocked ?? progress >= def.maxProgress;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlocked,
        progress,
        maxProgress: def.maxProgress
      };
    });

    res.json({
      status: 'success',
      data: {
        achievements: merged
      }
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get achievements'
    });
  }
});

// @route   GET /api/achievements/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    // For now, return empty array - implement actual leaderboard logic later
    res.json({
      status: 'success',
      data: {
        leaderboard: []
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get leaderboard'
    });
  }
});

module.exports = router; 