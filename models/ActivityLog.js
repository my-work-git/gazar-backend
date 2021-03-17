import mongoose, { Schema } from 'mongoose';
import { sendActivityLogTelegram } from "../helpers";

const schema = Schema({
  admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
  type: { type: String, index: true }, // Activity Name
  description: String,
  created_at: { type: Date, default: Date.now },
});

schema.statics.add = async function ({ admin, type, description }) {
  const activity = await this.create({ admin: admin._id, type, description });
  await this.populate(activity, 'admin');
  try {
    await sendActivityLogTelegram(activity);
  } catch (e) {
    console.log('ACTIVITY: sendActivityLogTelegram: Unable to send telegram message to activity group -> ', e);
  }
};

// Registering schema here
mongoose.model('ActivityLog', schema);
