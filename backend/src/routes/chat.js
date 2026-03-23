const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const auth = require('../middleware/auth');

const router = express.Router();

const getIo = (req) => req.app.get('io');
const getEmit = (req) => req.app.get('emitChatMessage');

// List messages for a room (ride id or "support" for customer help — AI can be layered later)
router.get('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name avatar');

    res.json({
      status: 'success',
      data: {
        messages: messages.reverse()
      }
    });
  } catch (error) {
    console.error('Chat list error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load messages' });
  }
});

router.post('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ status: 'error', message: 'text is required' });
    }

    const doc = await ChatMessage.create({
      roomId,
      sender: req.user.id,
      text: text.trim(),
      meta: { type: 'user' }
    });

    await doc.populate('sender', 'name avatar');

    const payload = {
      id: doc._id.toString(),
      roomId: doc.roomId,
      text: doc.text,
      createdAt: doc.createdAt,
      sender: {
        id: doc.sender._id.toString(),
        name: doc.sender.name,
        avatar: doc.sender.avatar
      }
    };

    const emit = getEmit(req);
    const io = getIo(req);
    if (emit && io) {
      emit(io, roomId, payload);
    }

    res.status(201).json({
      status: 'success',
      data: { message: payload }
    });
  } catch (error) {
    console.error('Chat send error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send message' });
  }
});

// Placeholder for future AI agent — returns structured hint without calling external APIs
router.post('/ai/suggest', auth, async (req, res) => {
  const { context } = req.body || {};
  res.json({
    status: 'success',
    data: {
      reply: 'AI agent integration: set OPENAI_API_KEY and wire an agent here. For now, use live chat in ride rooms.',
      contextReceived: Boolean(context)
    }
  });
});

module.exports = router;
