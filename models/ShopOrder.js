import mongoose, {Schema} from 'mongoose';
import moment from 'moment-timezone';
import {
  UNIT_TYPES,
  DELIVERY_TIMES,
  ORDER_STATUS,
  PAYMENT_METHODS,
  sendSMS,
  response,
  sendOrderToMembers
} from "../helpers";
import Translate from "../translate";

const schema = Schema({
  // User who made this order
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  businessClient: { type: Schema.Types.ObjectId, ref: 'BusinessClient' },

  // if this field exists then shop order made by support user with this reference
  supportUser: { type: Schema.Types.ObjectId, ref: 'User' },
  deliveryPartner: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },

  // Payment method for particular order
  paymentMethod: { type: String, enum: Object.values(PAYMENT_METHODS), default: PAYMENT_METHODS.CASH },

  phoneNumber: String,
  address: String,
  notes: String,
  price: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  deliveryTime: { type: String },
  deliveryDate: String,
  deliveryDay: String,
  deliverToday: { type: Boolean, default: false },
  fromMobile: { type: Boolean, default: false },

  // Snapshot of products with current state during ordering time
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

  status: { type: String, default: ORDER_STATUS.PENDING, enum: Object.values(ORDER_STATUS) },
  updated_by_admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
  updated_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  orderLanguage: { type: String },
});

schema.methods.notify = async function () {
  const User = mongoose.model('User');
  if (!this.user) return;
  if (!this.user.created_at) {
    this.user = await User.findById(this.user);
  }

  const {
    deliveryTime,
    deliveryDate,
    orderLanguage: lang,
    phoneNumber,
    user: orderUser,
    address,
    notes,
    bonus,
    price,
  } = this;

  const dateStr = moment(deliveryDate).tz('Asia/Yerevan').format('DD/MM/YYYY');

  const smsText = `${Translate('YOU_MADE_ORDER', lang)} 🎉
${Translate('PRICE', lang)} - ${price} ${Translate('AMD', lang)}
${Translate('DELIVERY_TIME', lang)} - ${dateStr} ${Translate(deliveryTime, lang)}
${Translate('THANKS_FOR_ORDER', lang)}
`;

  if (!orderUser.addresses) {
    orderUser.addresses = [];
  }

  await orderUser.addOrderForAddress(address, notes);
  if (isNaN(Number(orderUser.bonus))) {
    orderUser.bonus = bonus;
  } else {
    orderUser.bonus += bonus;
  }
  await orderUser.save();
  await this.save();

  try {
    await sendSMS(phoneNumber, smsText);
  } catch (e) {
    console.log('DANGER!!!!!! Unable to send SMS!!', e);
  }

  try {
    await sendOrderToMembers(this);
  } catch (e) {
    console.log('DANGER!!!!!! Unable to notify MEMBERS!!', e);
  }
};

// Registering schema here
mongoose.model('ShopOrder', schema);
