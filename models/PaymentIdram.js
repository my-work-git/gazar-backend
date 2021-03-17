import mongoose, { Schema } from 'mongoose';
import moment from 'moment-timezone';
import { IdramCredentials } from '../config';

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  shopOrder: { type: Schema.Types.ObjectId, ref: 'ShopOrder' },
  unpaidOrder: Object, // Keeping unpaid order here for later transferring it to ShopOrder when paid
  created_at: { type: Date, default: Date.now },
  // First to set before completing transaction
  orderId: { type: Number, unique: true, index: true },
  description: String,
  amount: Number,
  state: String,
  EDP_LANGUAGE: { type: String, default: null },
  EDP_BILL_NO: { type: Number, unique: true, index: true },
  EDP_REC_ACCOUNT:{ type: String, default: null },
  EDP_DESCRIPTION: { type: String, default: null },
  EDP_EMAIL: { type: String, default: null },
  EDP_PAYER_ACCOUNT: { type: String, default: null },
  EDP_AMOUNT: { type: String, default: null },
  EDP_TRANS_ID: { type: String, default: null },
  EDP_TRANS_DATE: {type:Date, default: null},
  EDP_CHECKSUM: {type:String, default: null}
})

schema.statics.startTransaction = async function({ user, description, amount, unpaidOrder}) {
  const count = await this.countDocuments();
  const initialIDOffset = count + 1;
  let orderId = initialIDOffset;
  let payment = null;
  // trying out 10 times to insert unique next OrderID
  while (payment === null && orderId < initialIDOffset + 20) {
    try {
      payment = await this.create({
        unpaidOrder,
        orderId,
        description,
        amount,
        user: user._id,
        EDP_LANGUAGE : "EN",
        EDP_REC_ACCOUNT: IdramCredentials.EDP_REC_ACCOUNT,
        EDP_DESCRIPTION: description,
        EDP_AMOUNT: amount,
        EDP_BILL_NO: orderId
      });
    } catch (e) {
      console.log('Payment OrderID already exists! -> ', orderId);
      orderId += 1;
    }
  }
  if (!payment) {
    throw new Error('Unable to insert unique OrderID');
  }
  await payment.save();
  return {
    action: "https://money.idram.am/payment.aspx",
    method: "POST",
    form_inputs : {
      EDP_LANGUAGE: payment.EDP_LANGUAGE,
      EDP_REC_ACCOUNT:payment.EDP_REC_ACCOUNT,
      EDP_DESCRIPTION:payment.EDP_DESCRIPTION,
      EDP_AMOUNT:payment.EDP_AMOUNT,
      EDP_BILL_NO:payment.EDP_BILL_NO
    }
  }
}

mongoose.model('PaymentIdram', schema);
