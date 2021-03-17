import mongoose, { Schema } from 'mongoose';
import {sendActivityLogTelegram} from "../helpers";

const schema = Schema({
  admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
  deliveryPartner: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
  targetModel: { type: String, index: true },
  targetId: { type: Schema.Types.ObjectId, index: true },
  actionType: { type: String, index: true },
  description: String,
  current: Object,
  next: Object,
  created_at: { type: Date, default: Date.now },
});

schema.statics.add = async function ({ deliveryPartner, admin, targetModel, actionType, description, current, next }) {
  await this.create({
    admin: admin && admin._id, targetModel, description,
    deliveryPartner: deliveryPartner && deliveryPartner._id,
    current, next, actionType,
    targetId: !!current ? current._id : next._id,
  });
  try {
    await sendActivityLogTelegram({
      type: 'Product Change Log',
      admin: admin || deliveryPartner,
      description,
    });
  } catch (e) {
    console.log('ACTIVITY: sendActivityLogTelegram: Unable to send telegram message to activity group -> ', e);
  }
};

// Registering schema here
mongoose.model('ChangeLog', schema);
