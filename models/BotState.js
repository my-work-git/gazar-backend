import mongoose, {Schema} from 'mongoose';
import { BOT_STATES, UNIT_TYPES } from '../helpers';

const schema = Schema({
  pipelineState: { type: String, enum: Object.values(BOT_STATES) },
  fbUserId: { type: String, index: true },

  // if user made an order or gave a phone number
  // we should have this field initialized
  user: { type: Schema.Types.ObjectId, ref: 'User' },

  products: [{
    // product ID
    _id: { type: Schema.Types.ObjectId, index: true },
    nameAm: String,
    nameEn: String,
    nameRu: String,
    price: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    unit: { type: String, enum: UNIT_TYPES },
    maxOrder: { type: Number, default: 20 },
    minOrder: { type: Number, default: 0.5 },
    photo: String,
    quantity: { type: Number, default: 0 },
  }],

  // last used Phone number for the order
  phoneNumber: String,
  // last used address for the order
  address: String,
  // last used notes for the order
  notes: String,

  // information about users last message
  last_user_message: String,
  last_user_message_time: { type: Date, default: Date.now },

  // information about last bot message by tracking user "seen" action
  last_bot_message: String,
  last_bot_message_seen: { type: Boolean, default: false },
  last_bot_message_seen_time: Date,

  created_at: { type: Date, default: Date.now },
});

// Registering schema here
mongoose.model('BotState', schema);
