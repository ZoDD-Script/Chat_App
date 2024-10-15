const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
  creator_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  name: {
    type: String,
    ref: "User",
  },
  image: {
    type: String,
    require: true
  },
  limit: {
    type: Number,
    require: true
  },
},
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);