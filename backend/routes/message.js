const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// Get messages with pagination
router.get('/',
  auth,
  [
    query('room').optional().trim().escape(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { room = 'general', page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * limit;

      const messages = await Message.find({ room })
        .populate('sender', 'username avatar')
        .populate('replyTo', 'content sender')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalMessages = await Message.countDocuments({ room });
      const totalPages = Math.ceil(totalMessages / limit);

      res.json({
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          currentPage: page,
          totalPages,
          totalMessages,
          hasMore: page < totalPages
        }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Send message
router.post('/',
  auth,
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content must be between 1 and 1000 characters'),
    body('room').optional().trim().escape(),
    body('replyTo').optional().isMongoId().withMessage('Invalid reply message ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { content, room = 'general', replyTo } = req.body;

      const message = new Message({
        sender: req.userId,
        content,
        room,
        replyTo: replyTo || undefined
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      res.status(201).json(message);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete message
router.delete('/:id',
  auth,
  async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Check if user owns the message
      if (message.sender.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this message' });
      }

      await Message.findByIdAndDelete(req.params.id);
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Edit message
router.put('/:id',
  auth,
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content must be between 1 and 1000 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { content } = req.body;
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Check if user owns the message
      if (message.sender.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to edit this message' });
      }

      message.content = content;
      message.edited = true;
      message.editedAt = new Date();

      await message.save();
      await message.populate('sender', 'username avatar');

      res.json(message);
    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;