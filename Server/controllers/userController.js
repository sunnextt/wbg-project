const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
exports.getUserProfile = async (req, res) => {
  try {
    console.log(req.user);
    const user = await User.findOne({ uid: req.user.uid });


    if (!user) {
      const newUser = new User({
        uid: req.user.uid,
        email: req.user.email,
      });
      await newUser.save();
      return res.status(200).json(newUser);
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, Fullname } = req.body;

    user.username = username || user.username;
    user.Fullname = Fullname || user.Fullname;

    await user.save();
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get user by UID
// @route   GET /api/users/:uid
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid }, 'uid username Fullname role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get online users
// @route   GET /api/users/online
exports.getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = await User.find({ online: true }, 'uid username Fullname role');
    res.status(200).json(onlineUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};