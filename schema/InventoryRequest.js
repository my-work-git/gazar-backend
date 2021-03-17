import mongoose from 'mongoose';
import {
  GraphQLBoolean,
  GraphQLObjectType, GraphQLString,
  GraphQLList,
} from "graphql";
import {ProductType} from "./product";

const InventoryRequest = mongoose.model('InventoryRequest');

export const InventoryRequestType = new GraphQLObjectType({
  name: 'InventoryRequestType',
  fields: {
    _id: { type: GraphQLString },
    title:{ type: GraphQLString },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
    products: { type: GraphQLList(ProductType) },
    isCompleted: { type: GraphQLBoolean },
    isPriceHandler: { type: GraphQLBoolean},
  }
});

const inventoryRequests = {
  type: GraphQLList(InventoryRequestType),
  admin: true,
  args: {},
  async resolve() {
    return await InventoryRequest.find({});
  }
};

const inventoryRequest = {
  type: InventoryRequestType,
  args: {
    inventory_id: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    return await InventoryRequest.findById(args.inventory_id);
  }
};

export default {
  inventoryRequests,
  inventoryRequest,
};
