require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const postsData = require('../data/posts.json'); // adjust path if needed

const importPosts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Post.deleteMany(); // optional: clear existing
    await Post.insertMany(postsData);
    console.log(`✅ Imported ${postsData.length} posts`);
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
};

importPosts();