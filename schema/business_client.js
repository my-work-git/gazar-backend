import mongoose from 'mongoose';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList, GraphQLInt,
} from "graphql";
import {ShopOrderType} from "./shop_order";

const BusinessClient = mongoose.model('BusinessClient');
const ShopOrder = mongoose.model('ShopOrder');

export const BusinessClientType = new GraphQLObjectType({
  name: 'BusinessClientType',
  fields: {
    _id: { type: GraphQLString },
    name: { type: GraphQLString },
    phoneNumber: { type: GraphQLString },
    address: { type: GraphQLString },
    weeklyDelivery: { type: GraphQLString },
    notifiedDay: { type: GraphQLString },
    discount: { type: GraphQLFloat },
    isActive: { type: GraphQLBoolean },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
    orders: {
      type: GraphQLList(ShopOrderType),
      async resolve(businessClient, args, context) {
        return await ShopOrder.find({ businessClient: businessClient._id });
      }
    }
  }
});

const businessClients = {
  type: GraphQLList(BusinessClientType),
  admin: true,
  args: {},
  async resolve(parentValue, args, context) {
    return await BusinessClient.find({});
  }
};

const businessClient = {
  type: BusinessClientType,
  admin: true,
  args: {
    clientId: { type: GraphQLString, required: true },
  },
  async resolve(parentValue, args, context) {
    const { clientId } = args;
    return await BusinessClient.findById(clientId);
  }
};

export default {
  businessClients,
  businessClient,
}
