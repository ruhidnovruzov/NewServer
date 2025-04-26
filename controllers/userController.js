// server/controllers/userController.js
const User = require('../models/User');

// Yeni istifadəçi yaratmaq
exports.createUser = async (req, res) => {
  try {
    const { name, email, deviceToken } = req.body;
    
    // Əgər istifadəçi artıq mövcuddursa, tokeni yeniləyirik
    let user = await User.findOne({ email });
    
    if (user) {
      user.deviceToken = deviceToken;
      await user.save();
      return res.status(200).json({ 
        success: true, 
        message: 'Device token updated', 
        data: user 
      });
    }
    
    // Yeni istifadəçi yaradırıq
    user = new User({
      name,
      email,
      deviceToken
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Device tokenini yeniləmək
exports.updateDeviceToken = async (req, res) => {
  try {
    const { email, deviceToken } = req.body;
    
    const user = await User.findOneAndUpdate(
      { email },
      { deviceToken },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Device token updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in updateDeviceToken:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};