import mongoose from 'mongoose';
import {
  GraphQLString
} from 'graphql';
import { response, getMutationObject } from './../helpers.js';

const InventoryRequest = mongoose.model('InventoryRequest');
const Product = mongoose.model('Product');

const inventoryRequestArgs = {
  title: { type: GraphQLString },
  products: { type: GraphQLString }, // JSON encoded list { id: <product id>, quantity: <product quantitiy> }
};

const InventoryRequestCreateMutation = getMutationObject('inventoryRequestCreate', { id: { type: GraphQLString } });

const inventoryRequestCreate = {
  type: InventoryRequestCreateMutation,
  admin: true,
  args: {
    ...inventoryRequestArgs
  },
  async resolve(parentValue, args) {
    const inventoryRequestFields = { ...args };
    let { title, products: productsStr } = inventoryRequestFields;
    let productIds = [];

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

    const inventory = await InventoryRequest.create({ title, products });
    return response({ id: inventory._id });
  }
};

const inventoryRequestUpdate = {
  type: InventoryRequestCreateMutation,
  admin: true,
  args: {
    inventory_id: { type: GraphQLString },
    ...inventoryRequestArgs,
  },
  async resolve(parentValue, args) {
    let { inventory_id, products: productsStr, title } = args;

    try {
      inventory_id = mongoose.Types.ObjectId(inventory_id);
    } catch (e) {
      return response({}, 'Invalid inventory request Id provided!');
    }

    const inventoryRequest = await InventoryRequest.findById(inventory_id);
    if (!inventoryRequest) {
      return response({}, 'Unable to find inventory request with given ID');
    }

    if (title && inventoryRequest.title !== title) {
      inventoryRequest.title = title;
    }

    if (productsStr) {
      let products = [];
      try {
        products = JSON.parse(productsStr);
      } catch (e) {
        return response({}, 'Invalid products list provided!');
      }
      inventoryRequest.products = products;
    }

    inventoryRequest.updated_at = new Date();
    await inventoryRequest.save();

    return response({});
  }
};

const inventoryRequestDelete = {
  type: InventoryRequestCreateMutation,
  admin: true,
  args: {
    inventory_id: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const c = await InventoryRequest.findById(args.inventory_id);
    if (c) {
      await c.remove();
    }

    return response({});
  }
};

export default {
  inventoryRequestCreate,
  inventoryRequestUpdate,
  inventoryRequestDelete,
};
