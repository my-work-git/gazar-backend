import mongoose, {Schema} from 'mongoose';

const schema = Schema({
  botState: { type: Schema.Types.ObjectId, ref: 'BotState' },
  fbUserIdFrom: { type: String, index: true },
  fbUserIdTo: { type: String, index: true },
  message: String,

  // some special details, or messenger events
  // Example: Button click etc...
  details: String,

  timestamp: { type: Date, default: Date.now },
});


// Registering schema here
mongoose.model('BotLog', schema);
