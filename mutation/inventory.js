import mongoose from 'mongoose';
import {
  GraphQLString,
  GraphQLFloat,
} from 'graphql';
import {
  response,
  getMutationObject,
} from './../helpers.js';

const Inventory = mongoose.model('Inventory');
const Product = mongoose.model('Product');

const InventoryAddMutation = getMutationObject('InventoryAddMutation', {});

const inventoryAdd = {
  type: InventoryAddMutation,
  admin: true,
  args: {
    productId: { type: GraphQLString },
    price: { type: GraphQLFloat },
    quantity: { type: GraphQLFloat },
    expectedQuantity: { type: GraphQLFloat },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { productId, price, quantity, expectedQuantity } = args;
    const product = await Product.findById(productId);
    if (!product) {
      return response({}, 'Unable to find product');
    }

    const inventory = await Inventory.find({ product: productId });

    if ( inventory.length && expectedQuantity) {
      /**
       * This part when adding necessary inventory
       */
      const foundInventory = inventory[0];
      const prevQuantity = foundInventory.expectedQuantity;
      foundInventory.expectedQuantity = prevQuantity + expectedQuantity;
      foundInventory.updated_at = new Date();
      foundInventory.updated_by_admin = admin && admin._id;
      await foundInventory.save();
    } else if ( inventory.length && !expectedQuantity && quantity) {
      /**
       * This part works, when buying inventory
       */
      const foundInventory = inventory[0];
      const prevQuantity = foundInventory.quantity;
      foundInventory.quantity = prevQuantity + quantity;
      foundInventory.price = price;
      foundInventory.updated_at = new Date();
      foundInventory.updated_by_admin = admin && admin._id;
      await foundInventory.save();
    }

    /**
     * This part works when we add the inventory first time
     */
    if ( !inventory.length ) {
      await Inventory.create({
        product: product._id,
        price,
        quantity,
        expectedQuantity,
        updated_by_admin: admin._id,
      });
    }

    return response({});
  },
};

export default {
  inventoryAdd,
};
