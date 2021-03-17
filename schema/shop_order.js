import mongoose from 'mongoose';
import moment from 'moment-timezone';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import { DeliveryTimeIsToday } from '../helpers';
import { ProductType } from "./product";

// Getting mongoose models
const ShopOrder = mongoose.model('ShopOrder');

export const ShopOrderType = new GraphQLObjectType({
  name: 'ShopOrderType',
  fields: {
    _id: { type: GraphQLString },
    phoneNumber: { type: GraphQLString },
    address: { type: GraphQLString },
    price: { type: GraphQLFloat },
    deliveryTime: { type: GraphQLString },
    deliveryPartner: { type: GraphQLString },
    status: { type: GraphQLString },
    created_at: { type: GraphQLString },
    deliveryDate: { type: GraphQLString },
    notes: { type: GraphQLString },
    deliveryDay: { type: GraphQLString },
    products: { type: GraphQLList(ProductType) },
    businessClient: { type: GraphQLString },
    paymentMethod: { type: GraphQLString },
  }
});

const shopOrders = {
  type: GraphQLList(ShopOrderType),
  args: {
    from_date: { type: GraphQLString },
    to_date: { type: GraphQLString },
    onlyBusinessClientOrders: { type: GraphQLBoolean },
  },
  async resolve(parentValue, args, context) {
    const { user, admin, deliveryPartner } = context;
    if (!user && !admin && !deliveryPartner) {
      return [];
    }

    if (user) {
      return await ShopOrder.find({ user: user._id }).sort({ created_at: -1 });
    }

    const { from_date, to_date, onlyBusinessClientOrders } = args;
    const findQ = {};

    if (from_date && from_date.length > 0) {
      findQ.deliveryDate = { $gte: from_date };
    }

    if (to_date && to_date.length > 0) {
      findQ.deliveryDate["$lte"] = to_date;
    }

    if (onlyBusinessClientOrders) {
      findQ.businessClient = { $exists: true, $ne: null };
    }

    if (deliveryPartner) {
      return await ShopOrder.find({ deliveryPartner: deliveryPartner._id, ...findQ }).sort({ created_at: -1 });
    }

    return await ShopOrder.find({ ...findQ }).sort({ created_at: -1 }).lean();
  }
};

const shopOrder = {
  type: ShopOrderType,
  admin: true,
  deliveryPartner: true,
  args: {
    order_id: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    return await ShopOrder.findById(args.order_id);
  }
};

export default {
  shopOrders,
  shopOrder,
};
