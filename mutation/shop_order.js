import mongoose from 'mongoose';
import moment from 'moment-timezone';
import {
  GraphQLBoolean,
  GraphQLString
} from 'graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { response, getMutationObject, DeliveryTimeIsToday, ORDER_STATUS } from './../helpers.js';
import {DELIVERY_TIMES, formatNumber, getJWT} from "../helpers";
import {getTotalPrice, MIN_ORDER_LIMIT, PAYMENT_METHODS} from "./../helpers";
import {BonusPercent, SupportUsers} from '../config';

const ShopOrder = mongoose.model('ShopOrder');
const User = mongoose.model('User');
const Product = mongoose.model('Product');
const ChangeLog = mongoose.model('ChangeLog');
const Payment = mongoose.model('Payment');
const PaymentIdram = mongoose.model('PaymentIdram');
const BusinessClient = mongoose.model('BusinessClient');
const DeliveryPartner = mongoose.model('DeliveryPartner');

const SetOrderMutation = getMutationObject('SetOrder', {
  token: { type: GraphQLString },
  orderId: { type: GraphQLString },
  paymentId: { type: GraphQLString },
  formUrl: { type: GraphQLString },
  idramForm:{ type: GraphQLJSONObject }
});

const setOrder = {
  type: SetOrderMutation,
  args: {
    lang: { type: GraphQLString },
    phoneNumber: { type: GraphQLString },
    address: { type: GraphQLString },
    notes: { type: GraphQLString },
    deliveryTime: { type: GraphQLString },
    deliveryDate: { type: GraphQLString },
    products: { type: GraphQLString }, // JSON encoded list { id: <product id>, quantity: <product quantitiy> }
    verifyCode: { type: GraphQLString },
    paymentMethod: { type: GraphQLString },
    fromMobile: { type: GraphQLBoolean },
  },
  async resolve(parentValue, args, context) {
    let { user } = context;
    let { phoneNumber, address, notes, deliveryTime, deliveryDate, products: productsStr, verifyCode, lang, paymentMethod, fromMobile } = args;
    let productIds = [];

    if (DELIVERY_TIMES.indexOf(deliveryTime) === -1) {
      return response({}, 'INVALID_DELIVERY_TIME');
    }

    if (address.length < 6) {
      return response({}, 'INVALID_ADDRESS');
    }

    try {
      productIds = JSON.parse(productsStr);
    } catch (e) {
      return response({}, 'INVALID_PRODUCTS_LIST');
    }

    if (productIds.length === 0) {
      return response({}, 'INVALID_PRODUCTS_LIST');
    }

    const products = [];
    for (const productId of productIds) {
      const product = await Product.findById(productId._id).lean();
      if (product) {
        products.push({...product, quantity: productId.quantity});
      }
    }

    const price = getTotalPrice(products);
    if (price < MIN_ORDER_LIMIT) {
      return response({}, 'MIN_ORDER_PRICE_ERROR');
    }

    try {
      phoneNumber = formatNumber(phoneNumber);
    } catch(e) {
      return response({}, 'WRONG_PHONE_NUMBER');
    }

    let orderUser = user;

    // if we have a support user here, making order with phone number user instead
    if (user && SupportUsers.indexOf(user.phoneNumber) !== -1) {
      orderUser = await User.findOrCreate(phoneNumber, { verified: true, madeFromSupportOrder: true });
    }

    if (!orderUser) {
      orderUser = await User.findOne({ phoneNumber });
    }

    if (!orderUser) {
      return response({}, 'WRONG_PHONE_NUMBER');
    }

    // if we don't have an authenticated user, and orderUser typed invalid verification code
    // just returning an error
    if (!user && orderUser.verifyCode !== verifyCode) {
      return response({}, 'INVALID_CODE_NUMBER');
    }

    const isOnlinePayment = paymentMethod === PAYMENT_METHODS.CREDIT_CARD || paymentMethod === PAYMENT_METHODS.IDRAM;
    let methodPayment = null;
    if(paymentMethod == "idram"){
      methodPayment = PAYMENT_METHODS.IDRAM;
    }else if(paymentMethod == "credit_card"){
      methodPayment = PAYMENT_METHODS.CREDIT_CARD;
    }else{
      methodPayment = PAYMENT_METHODS.CASH;
    }

    const orderBonus = (price * BonusPercent) / 100;
    const deliverToday = DeliveryTimeIsToday(deliveryTime);

    const order = new ShopOrder({
      phoneNumber, address, notes,
      deliveryTime, products, price,
      deliverToday, fromMobile,
      deliveryDate: deliveryDate || moment().tz('Asia/Yerevan').toISOString(),
      user: orderUser._id,
      supportUser: (user && user._id) || undefined,
      bonus: orderBonus,
      orderLanguage: lang,
      paymentMethod: methodPayment,
    });

    // if we have already logged in user, returning his info, otherwise
    // token who made current order
    const retOnject = {
      token: getJWT(user || orderUser),
    };

    if (isOnlinePayment) {
      if(methodPayment === 'credit_card'){
        retOnject.formUrl = await Payment.startTransaction({
          user: orderUser,
          description: `Gazar.am - ${order.phoneNumber} ${order.address}`,
          amount: order.price,
          unpaidOrder: order.toObject()
        });
      }else if (methodPayment === 'idram'){
          retOnject.idramForm = PaymentIdram.startTransaction({
            user: orderUser,
            description: `Gazar.am - ${order.phoneNumber} ${order.address}`,
            amount: parseFloat(order.price).toFixed(2),
            unpaidOrder: order.toObject()
          })
      }
    } else {
      await order.save();
      await order.notify();
    }
    return response(retOnject);
  }
};

const shopOrderStatus = {
  type: getMutationObject('ShopOrderStatus', { }),
  admin: true,
  deliveryPartner: true,
  args: {
    orderId: { type: GraphQLString },
    status: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { status, orderId } = args;
    const { admin, deliveryPartner } = context;
    const order = await ShopOrder.findById(orderId);
    if (!order) {
      return response({}, 'Unable to find shop order with given ID');
    }

    const currentOrder = {...order.toObject()};

    const filteredStatus = ORDER_STATUS[status.toUpperCase()];
    if (!filteredStatus) {
      return response({}, 'Unable to find provided status');
    }

    const prevStatus = order.status;
    order.status = status;
    order.updated_at = new Date();
    order.updated_by_admin = admin && admin._id;
    await order.save();

    const nextOrder = order.toObject();

    try {
      await ChangeLog.add({
        admin: admin && admin,
        deliveryPartner: deliveryPartner && deliveryPartner,
        actionType: 'set_order_status',
        targetModel: 'ShopOrder',
        description: `Order - ${order.phoneNumber}[${order.address}] status changed from "${prevStatus}" to "${status}"`,
        current: currentOrder,
        next: nextOrder,
      });
    } catch (e) {
      console.log('ActivityLog: error adding activity log -> ', e);
    }

    return response({});
  },
};

const shopOrderUpdate = {
  type: getMutationObject('ShopOrderUpdate', {}),
  admin: true,
  args: {
    orderId: { type: GraphQLString },
    products: { type: GraphQLString }, // JSON encoded list { id: <product id>, quantity: <product quantitiy> }
    deliveryDate: { type: GraphQLString },
    deliveryTime: { type: GraphQLString },
    address: { type: GraphQLString },
    phoneNumber: { type: GraphQLString },
    notes: { type: GraphQLString },
    status: { type: GraphQLString },
    businessClient: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { orderId, products: productsStr, deliveryTime, deliveryDate, address, phoneNumber: rawPhoneNumber, notes, status, businessClient } = args;
    const order = await ShopOrder.findById(orderId);
    if (!order) {
      return response({}, 'Unable to find shop order with given ID');
    }

    const currentOrder = {...order.toObject()};

    if (deliveryTime && DELIVERY_TIMES.indexOf(deliveryTime) >= 0) {
      order.deliverToday = DeliveryTimeIsToday(deliveryTime);
      order.deliveryTime = deliveryTime;
    }

    if (status && Object.values(ORDER_STATUS).find(s => s === status)) {
      order.status = status;
    }

    if (address && order.address !== address) {
      order.address = address;
    }

    if (deliveryDate && order.deliveryDate !== deliveryDate) {
      order.deliveryDate = deliveryDate;
    }

    if (notes && order.notes !== notes) {
      order.notes = notes;
    }

    if (businessClient && order.businessClient !== businessClient) {
      order.businessClient = businessClient;
    }

    if (rawPhoneNumber) {
      const phoneNumber = formatNumber(rawPhoneNumber);
      if (order.phoneNumber !== phoneNumber) {
        order.phoneNumber = phoneNumber;
        order.user = await User.findOrCreate(phoneNumber, { verified: true, madeFromSupportOrder: true });
        await order.user.addOrderForAddress(order.address, order.notes);
      }
    }

    if (productsStr) {
      let products = [];
      try {
        products = JSON.parse(productsStr);
      } catch (e) {
        return response({}, 'Invalid products list provided!');
      }

      order.products = products;
      order.price = getTotalPrice(products);
    }

    await order.save();

    const nextOrder = order.toObject();
    let changeString = '';
    Object.keys(nextOrder).map(key => {
      if (nextOrder[key] && nextOrder[key].toString() !== currentOrder[key].toString()) {
        changeString += `
${key} Changed From: \\\`${currentOrder[key]}\\\` To: \\\`${nextOrder[key]}\\\`
`;
      }
    });

    try {
      await ChangeLog.add({
        admin,
        actionType: 'order_update',
        targetModel: 'ShopOrder',
        description: `Order - ${order.phoneNumber}[${order.address}] Updated! ${changeString}`,
        current: currentOrder,
        next: nextOrder,
      });
    } catch (e) {
      console.log('ActivityLog: error adding activity log -> ', e);
    }
    return response({});
  }
};

const setBusinessClientOrder = {
  admin: true,
  type: getMutationObject('BusinessOrderMutation', { orderId: { type: GraphQLString } }),
  args: {
    clientId: { type: GraphQLString },
    deliveryTime: { type: GraphQLString },
    products: { type: GraphQLString }, // JSON encoded list { id: <product id>, quantity: <product quantitiy> }
    notes: { type: GraphQLString },
    deliveryDate: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { clientId, deliveryTime, notes, products: productsStr, deliveryDate } = args;
    const businessClient = await BusinessClient.findById(clientId);
    if (!businessClient) {
      return response({}, 'Unable to find requested business client!');
    }

    if (DELIVERY_TIMES.indexOf(deliveryTime) === -1) {
      return response({}, 'Invalid delivery time provided!');
    }

    let productIds = [];
    try {
      productIds = JSON.parse(productsStr);
    } catch (e) {
      return response({}, 'Unable to parse products, please try again later...');
    }

    if (productIds.length === 0) {
      return response({}, 'Products list is empty or unable to parse it...');
    }

    const products = [];
    for (const productId of productIds) {
      const product = await Product.findById(productId._id).lean();
      if (product) {
        products.push({...product, quantity: productId.quantity, discount: businessClient.discount});
      }
    }

    const price = getTotalPrice(products);
    const deliverToday = DeliveryTimeIsToday(deliveryTime);

    const order = await ShopOrder.create({
      businessClient,
      phoneNumber: businessClient.phoneNumber,
      address: businessClient.address,
      notes,
      deliveryTime, products, price,
      deliveryDate: deliveryDate || moment().tz('Asia/Yerevan').toISOString(),
      deliverToday,
      supportUser: admin,
      bonus: 0,
      updated_by_admin: admin,
    });

    return response({ orderId: order._id })
  }
};

const setShopOrderDeliveryPartner = {
  admin: true,
  type: getMutationObject('SetShopOrderDeliveryPartnerMutation', {}),
  args: {
    deliveryPartnerId: { type: GraphQLString },
    shopOrderId: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { deliveryPartnerId, shopOrderId } = args;
    const shopOrder = await ShopOrder.findById(shopOrderId);
    const currentOrder = {...shopOrder.toObject()};
    if (!shopOrder) {
      return response({}, 'Unable to find requested shop order!');
    }

    const dp = await DeliveryPartner.findById(deliveryPartnerId);
    if (!dp) {
      return response({}, 'Unable to find requested Delivery partner!');
    }

    shopOrder.deliveryPartner = dp._id;
    await shopOrder.save();

    try {
      await ChangeLog.add({
        admin,
        actionType: 'order_set_delivery_partner',
        targetModel: 'ShopOrder',
        description: `Order - ${shopOrder.phoneNumber}[${shopOrder.address}] Delivery partner ${dp.first_name} ${dp.last_name}`,
        current: currentOrder,
        next: {...shopOrder.toObject()},
      });
    } catch (e) {
      console.log('ActivityLog: error adding activity log -> ', e);
    }

    return response({});
  },
};

export default {
  setOrder,
  shopOrderStatus,
  shopOrderUpdate,
  setBusinessClientOrder,
  setShopOrderDeliveryPartner,
};
