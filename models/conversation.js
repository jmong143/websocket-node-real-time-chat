var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var convoSchema = new Schema({
  //username: { type: String, required: true, unique: true },
  username: {type: String, required: true},
  room: { type: String, required: true},
  message: { type: String },
  sticker: {type: String },
  createdAt : {type: Date, default: Date.now},
  updatedAt : {type: Date, default: Date.now}
});


convoSchema.statics.userKill = function(){
  return "USER KILL!!!";
};


// the schema is useless so far
// we need to create a model using it
var Conversation = mongoose.model('conversations', convoSchema);
// make this available to our users in our Node applications
module.exports = Conversation;
