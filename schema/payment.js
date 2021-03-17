import mongoose from 'mongoose';
import { GraphQLFloat, GraphQLObjectType, GraphQLString, GraphQLBoolean } from 'graphql';
import { ShopOrderType } from './shop_order';
import { response } from '../helpers';

const Payment = mongoose.model('Payment');
const ShopOrder = mongoose.model('ShopOrder');

const adminHandler = (field) => (obj, args, context) => {
  const { admin } = context;
  if (!admin) return '';
  return obj[field];
};

export const PaymentType = new GraphQLObjectType({
  name: 'PaymentType',
  fields: {
    _id: { type: GraphQLString },
    shopOrder: { type: ShopOrderType },
    state: { type: GraphQLString },
    created_at: { type: GraphQLString },
    amount: { type: GraphQLFloat },

    paymentId: { type: GraphQLString },
    error: { type: GraphQLBoolean },
    message: { type: GraphQLString },
    orderId: { type: GraphQLString, resolve: adminHandler },
    description: { type: GraphQLString, resolve: adminHandler },
    cardNumber: { type: GraphQLString, resolve: adminHandler },
    clientName: { type: GraphQLString, resolve: adminHandler },
    expDate: { type: GraphQLString, resolve: adminHandler },
    authCode: { type: GraphQLString, resolve: adminHandler },
    cardholderID: { type: GraphQLString, resolve: adminHandler },
  },
});

const paymentInfo = {
  type: PaymentType,
  auth: true,
  args: {
    paymentId: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { user } = context;
    const payment = await Payment.findOne({
      paymentId: args.paymentId,
    })
      .populate('user')
      .populate('shopOrder');
    if (!payment) {
      return response({}, 'Unable to find requested payment!');
    }

    await payment.setTransactionInformation();
    if (payment.actionCode === 0) {
      const { unpaidOrder } = payment;
      delete unpaidOrder._id;
      const order = await ShopOrder.create({ ...unpaidOrder });
      await order.notify();
      payment.unpaidOrder = null;
      payment.shopOrder = order;
      await payment.save();
    } else {
      console.warn('WARNING', payment.actionCodeDescription);
      return response({}, payment.actionCodeDescription);
    }

    if (
      payment &&
      payment.user &&
      payment.user._id.toString() === user._id.toString()
    ) {
      return payment;
    }
    return response({}, 'Technical issue please try after some time');
  },
};

export default {
  paymentInfo,
};
