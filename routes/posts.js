const express = require('express');
const Post = require('../models/Post');
const router = express.Router();

// ─── GET all posts (public) ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { limit = 20, page = 1, category, tag } = req.query;
    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;

    const query = { status: 'published' };
    if (category) query.category = category;
    if (tag) query.tags = tag;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: posts.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitNum),
      posts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Server error fetching posts' });
  }
});

// ─── GET a single post by slug ───────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Increment views asynchronously
    Post.updateOne({ _id: post._id }, { $inc: { views: 1 } }).exec();

    res.json({ success: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, error: 'Server error fetching post' });
  }
});

// ─── GET related posts (by category) ─────────────────────────
router.get('/related/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const related = await Post.find({
      category: post.category,
      slug: { $ne: post.slug },
      status: 'published'
    })
      .limit(4)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, related });
  } catch (error) {
    console.error('Error fetching related posts:', error);
    res.status(500).json({ success: false, error: 'Server error fetching related posts' });
  }
});

module.exports = router;