import mongoose from 'mongoose';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList,
} from "graphql";
import { ProductType } from "./product";

const Product = mongoose.model('Product');
const Inventory = mongoose.model('Inventory');

export const InventoryType = new GraphQLObjectType({
  name: 'InventoryType',
  fields: {
    _id: { type: GraphQLString },
    product: { type: ProductType },
    price: { type: GraphQLFloat },
    quantity: { type: GraphQLFloat },
    expectedQuantity: { type: GraphQLFloat },
  }
});

const inventories = {
  type: GraphQLList(InventoryType),
  admin: true,
  args: {
    from: { type: GraphQLString },
    to: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { from, to } = args;
    const findQ = {};
    if (from && from.length > 0) {
      if (!('created_at' in findQ)) {
        findQ.created_at = {};
      }

      findQ.created_at.$gte = from;
    }

    if (to && to.length > 0) {
      if (!('created_at' in findQ)) {
        findQ.created_at = {};
      }

      findQ.created_at.$lte = to;
    }

    return await Inventory.find(findQ).populate('product').lean();
  },
};

export default {
  inventories,
};
