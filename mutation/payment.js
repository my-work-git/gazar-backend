import mongoose from 'mongoose';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';
import { response, getMutationObject } from './../helpers.js';
import {InternalAPIToken} from "../config";

const Payment = mongoose.model('Payment');
const ShopOrder = mongoose.model('ShopOrder');

const PaymentSetInfoMutation = getMutationObject('PaymentStart', {});

const setPaymentTransaction = {
  type: PaymentSetInfoMutation,
  args: {
    // Internal token to check if request is coming from firebase backend
    internalToken: { type: GraphQLString },
    paymentId: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const { internalToken, paymentId } = args;
    if (internalToken !== InternalAPIToken) {
      return response({}, 'Unable to verify request!');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return response({}, 'Unable to find requested payment!');
    }

    await payment.setTransactionInformation();
    if (payment.state === 'payment_deposited') {
      const { unpaidOrder } = payment;
      delete unpaidOrder._id;
      const order = await ShopOrder.create({ ...unpaidOrder });
      await order.notify();
      payment.unpaidOrder = null;
      payment.shopOrder = order;
      await payment.save();
    }

    return response({});
  }
};

const paymentRefund = {
  type: PaymentSetInfoMutation,
  args: {
    // Internal token to check if request is coming from firebase backend
    internalToken: { type: GraphQLString },
    paymentId: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const {internalToken, paymentId} = args;
    if (internalToken !== InternalAPIToken) {
      return response({}, 'Unable to verify request!');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return response({}, 'Unable to find requested payment!');
    }

    await payment.refund();
    return response({});
  },
};

export default {
  setPaymentTransaction,
  paymentRefund,
};
