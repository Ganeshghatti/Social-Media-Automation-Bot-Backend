const mongoose = require("mongoose");

const oauthStateSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'WorkSpace'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    required: true
  },
  credentials: {
    type: Object,
    required: true
  },
  createdAt: {
    type: String,
    required: true
  }
});

// Add TTL index to automatically delete records after 1 hour
oauthStateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const OAuthState = mongoose.model("OAuthState", oauthStateSchema);

module.exports = OAuthState; 