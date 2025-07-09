const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, getUserById, getOnlineUsers } = require('../controllers/userController');
const protect = require('../middleware/auth');

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/online', protect, getOnlineUsers);
router.get('/:uid', protect, getUserById);


module.exports = router;