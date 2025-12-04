const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifySignature } = require('../utils/verifySignature');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/auth/nonce
 * @desc    Get nonce for wallet address (creates user if doesn't exist)
 * @access  Public
 */
router.post('/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    console.log('Nonce request received for:', walletAddress);

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }

    // Find or create user
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      // Create new user with temporary role (will be set during profile completion)
      console.log('Creating new user...');
      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        role: 'teacher', // Temporary default, will be updated in complete-profile
        nonce: require('crypto').randomBytes(16).toString('hex'),
        updatedAt: Date.now()
      });
      console.log('User created successfully');
    } else {
      // Generate new nonce for existing user
      console.log('Generating new nonce for existing user...');
      user.generateNonce();
      await user.save();
      console.log('Nonce updated successfully');
    }

    res.status(200).json({
      success: true,
      data: {
        nonce: user.nonce,
        message: user.getSignMessage(),
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/verify
 * @desc    Verify signed message and return JWT
 * @access  Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address and signature are required'
      });
    }

    // Find user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please request a nonce first.'
      });
    }

    // Verify signature
    const message = user.getSignMessage();
    const isValid = verifySignature(walletAddress, message, signature);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Generate new nonce for next login
    user.generateNonce();
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Set cookie
    const cookieOptions = {
      expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 30) * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('token', token, cookieOptions);

    res.status(200).json({
      success: true,
      token,
      data: {
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          name: user.name,
          role: user.role,
          isProfileComplete: user.isProfileComplete
        }
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/auth/complete-profile
 * @desc    Complete user profile (first-time users)
 * @access  Private
 */
router.post('/complete-profile', protect, async (req, res) => {
  try {
    const { name, role } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name and role are required'
      });
    }

    // Validate role
    const validRoles = ['teacher', 'authority', 'examCenter'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be teacher, authority, or examCenter'
      });
    }

    // Update user
    req.user.name = name;
    req.user.role = role;
    req.user.isProfileComplete = true;
    await req.user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          walletAddress: req.user.walletAddress,
          name: req.user.name,
          role: req.user.role,
          isProfileComplete: req.user.isProfileComplete
        }
      }
    });
  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        walletAddress: req.user.walletAddress,
        name: req.user.name,
        role: req.user.role,
        isProfileComplete: req.user.isProfileComplete
      }
    }
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user / clear cookie
 * @access  Private
 */
router.post('/logout', protect, (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
