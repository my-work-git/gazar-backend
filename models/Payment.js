import mongoose, { Schema } from 'mongoose';
import moment from 'moment-timezone';
import { EvocaBankCredentials } from '../config';
import { retryCall } from '../helpers';
import request from 'request';

const schema = Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  shopOrder: { type: Schema.Types.ObjectId, ref: 'ShopOrder' },
  unpaidOrder: Object, // Keeping unpaid order here for later transferring it to ShopOrder when paid
  created_at: { type: Date, default: Date.now },
  paymentId: String,
  formUrl: String,
  // First to set before completing transaction
  orderId: { type: Number, unique: true, index: true },
  description: String,
  amount: Number,

  // when payment info came back
  state: String,
  cardNumber: String,
  clientName: String,
  expDate: String,
  authCode: String,
  cardholderID: String,
  actionCode: Number,
  actionCodeDescription: String,
  cardAuthInfo: {
    expiration: String,
    cardholderName: String,
    approvalCode: String,
    secureAuthInfo: Object,
    pan: String,
  },
});

const registerOrder = async (orderId, amount, description) =>
  new Promise((resolve, reject) => {
    try {
      const IPAY_HOST = 'https://ipay.arca.am/payment/rest/';
      const REGISTER_SUFFIX = 'register.do?';
      const queryParams = [
        'userName=',
        EvocaBankCredentials.Username,
        '&',
        'password=',
        EvocaBankCredentials.Password,
        '&',
        'orderNumber=',
        orderId,
        '&',
        'amount=',
        amount * 100,
        '&',
        'currency=',
        '051', // ISO code for AMD
        '&',
        'description=',
        description,
        '&',
        'returnUrl=',
        EvocaBankCredentials.callbackUrl,
      ];
      const url = `${IPAY_HOST}${REGISTER_SUFFIX}${queryParams.join('')}`;
      console.info('registerOrder -> url', url);
      const options = {
        method: 'GET',
        url,
      };
      request(options, (error, response) => {
        if (error) {
          console.error('registerOrder -> error', error, typeof error);
          throw new Error(JSON.stringify(error).errorMessage);
        }
        const parsedResponse = JSON.parse(response.body);
        console.info('registerOrder -> parsedResponse', parsedResponse);
        resolve(parsedResponse);
      });
    } catch (_ex) {
      console.error('registerOrder -> _ex', _ex);
      reject(_ex);
    }
  });

const getOrderStatus = async (orderId) =>
  new Promise((resolve, reject) => {
    try {
      const IPAY_HOST = 'https://ipay.arca.am/payment/rest/';
      const REGISTER_SUFFIX = 'getOrderStatusExtended.do?';
      const queryParams = [
        'userName=',
        EvocaBankCredentials.Username,
        '&',
        'password=',
        EvocaBankCredentials.Password,
        '&',
        'orderNumber=',
        orderId,
      ];
      const url = `${IPAY_HOST}${REGISTER_SUFFIX}${queryParams.join('')}`;
      console.info('getOrderStatus -> url', url);
      const options = {
        method: 'GET',
        url,
      };
      request(options, (error, response) => {
        if (error) {
          console.error('getOrderStatus -> error', error, typeof error);
          throw new Error(JSON.parse(error).errorMessage);
        }
        const parsedResponse = JSON.parse(response.body);
        console.info('getOrderStatus -> parsedResponse', parsedResponse);
        resolve(parsedResponse);
      });
    } catch (_ex) {
      console.error('registerOrder -> _ex', _ex);
      reject(_ex);
    }
  });

const refundPayment = async (orderId, amount) =>
  new Promise((resolve, reject) => {
    try {
      const IPAY_HOST = 'https://ipay.arca.am/payment/rest/';
      const REGISTER_SUFFIX = 'refund.do?';
      const queryParams = [
        'amount=',
        amount * 100,
        '&',
        'currency=',
        '051', // ISO code for AMD
        'userName=',
        EvocaBankCredentials.Username,
        '&',
        'password=',
        EvocaBankCredentials.Password,
        '&',
        'orderNumber=',
        orderId,
      ];
      const url = `${IPAY_HOST}${REGISTER_SUFFIX}${queryParams.join('')}`;
      const options = {
        method: 'GET',
        url,
      };
      request(options, (error, response) => {
        if (error) {
          console.error('refundPayment -> error', error, typeof error);
          throw new Error(JSON.parse(error).errorMessage);
        }
        const parsedResponse = JSON.parse(response.body);
        console.info('refundPayment -> parsedResponse', parsedResponse);
        resolve(parsedResponse);
      });
    } catch (_ex) {
      console.error('refundPayment -> _ex', _ex);
      reject(_ex);
    }
  });

schema.statics.startTransaction = async function ({
  user,
  description,
  amount,
  unpaidOrder,
}) {
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
      });
    } catch (e) {
      console.log('Payment OrderID already exists! -> ', orderId);
      orderId += 1;
    }
  }

  if (!payment) {
    throw new Error('Unable to insert unique OrderID');
  }

  const { formUrl, orderId: paymentId } = await registerOrder(orderId, amount, description);
  payment.formUrl = formUrl;
  payment.paymentId = paymentId;
  await payment.save();
  return formUrl;
};

schema.methods.setTransactionInformation = async function () {
  const orderState = await getOrderStatus(this.orderId);
  this.state = orderState.paymentAmountInfo
    ? orderState.paymentAmountInfo.paymentState
    : orderState.actionCodeDescription;
  this.cardAuthInfo = orderState.cardAuthInfo;
  this.bankInfo = orderState.bankInfo;
  this.actionCode = orderState.actionCode;
  this.actionCodeDescription = orderState.actionCodeDescription;
  await this.save();
};

schema.methods.refund = async function () {
  await retryCall(
    'Refund Payment',
    async () => {
      await refundPayment(this.orderId, this.amount);
    },
    1,
    (e) =>
      console.log(
        `----- Failed to call refundPayment, trying again.... ---- `,
        e
      )
  );
};

// Registering schema here
mongoose.model('Payment', schema);
