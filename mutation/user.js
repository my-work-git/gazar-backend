import mongoose from 'mongoose';
import { GraphQLString, GraphQLInt } from 'graphql';
import { response, getMutationObject } from './../helpers.js';

const updateMe = {
  type: getMutationObject('UpdateMe', {}),
  auth: true,
  args: {
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    email: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { user } = context;
    Object.keys(args).map(k => args[k] && (user[k] = args[k]));
    await user.save();
    return response({});
  }
};

const addAddressForMe = {
  type: getMutationObject('AddAddressForMe', {}),
  auth: true,
  args: {
    address: { type: GraphQLString },
    notes: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { user } = context;
    const { address, notes } = args;
    for (let i = 0; i < user.addresses.length; i++) {
      if (user.addresses[i].address === address) {
        return response({});
      }
    }

    if (address.length > 6) {
      user.addresses.push({
        address, notes, orderCount: 0,
      });
    }

    await user.save();
    return response({});
  }
};

const removeAddressForMe = {
  type: getMutationObject('RemoveAddressForMe', {}),
  auth: true,
  args: {
    address: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { user } = context;
    const { address } = args;
    const { addresses } = user;
    for (let i = 0; i < addresses.length; i++) {
      if (addresses[i].address === address) {
        user.addresses.splice(i, 1);
        await user.save();
        return response({});
      }
    }

    return response({});
  }
};

export default {
  updateMe,
  addAddressForMe,
  removeAddressForMe,
}
