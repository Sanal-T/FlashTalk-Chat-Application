const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { auth, optionalAuth } = require('../middleware/auth');

// Get messages for a specific room
router.get('/:room', optionalAuth, async (req, res) => {
  try {
    const { room } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    const messages = await Message.find({ room })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    // Reverse to get chronological order
    messages.reverse();
    
    res.json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

// Get all available rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Message.distinct('room');
    const roomStats = await Promise.all(
      rooms.map(async (room) => {
        const messageCount = await Message.countDocuments({ room });
        const lastMessage = await Message.findOne({ room })
          .sort({ timestamp: -1 })
          .lean();
        
        return {
          name: room,
          messageCount,
          lastMessage: lastMessage ? {
            username: lastMessage.username,
            message: lastMessage.message.substring(0, 50) + '...',
            timestamp: lastMessage.timestamp
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      rooms: roomStats
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms',
      error: error.message
    });
  }
});

// Create a new message (mainly for API testing)
router.post('/', auth, async (req, res) => {
  try {
    const { message, room = 'general' } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message too long (max 1000 characters)'
      });
    }
    
    const newMessage = new Message({
      username: req.user.username,
      message: message.trim(),
      room: room.toLowerCase(),
      messageType: 'user'
    });
    
    await newMessage.save();
    
    res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating message',
      error: error.message
    });
  }
});

// Delete a message (for moderation)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only allow users to delete their own messages (or implement admin check)
    if (message.username !== req.user.username && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    await Message.findByIdAndDelete(messageId);
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
});

// Search messages
router.get('/search/:room', optionalAuth, async (req, res) => {
  try {
    const { room } = req.params;
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const messages = await Message.find({
      room,
      message: { $regex: q, $options: 'i' }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      messages,
      count: messages.length,
      query: q
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching messages',
      error: error.message
    });
  }
});

module.exports = router;