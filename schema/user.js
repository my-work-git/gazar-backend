import mongoose from 'mongoose';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLFloat,
} from 'graphql';

// Getting mongoose models
const User = mongoose.model('User');

export const AddressType = new GraphQLObjectType({
  name: 'AddressType',
  fields: {
    address: { type: GraphQLString },
    notes: { type: GraphQLString },
    orderCount: { type: GraphQLInt },
  }
});

/**
 * UserType description
 * @type {GraphQLObjectType}
 */
export const UserType = new GraphQLObjectType({
  name: 'UserType',
  fields: {
    _id: {
      type: GraphQLString
    },
    first_name: {
      type: GraphQLString
    },
    last_name: {
      type: GraphQLString
    },
    username: {
      type: GraphQLString
    },
    photo: {
      type: GraphQLString
    },
    bonus: {
      type: GraphQLFloat
    },
    email: {
      type: GraphQLString,
      resolve(user, args, context) {
        // if requested user is current authenticated user, we can resolve an email
        if (context.user && context.user._id.toString() === user._id.toString()) {
          return user.email;
        }

        return '';
      }
    },
    phoneNumber: {
      type: GraphQLString,
      resolve(user, args, context) {
        // if requested user is current authenticated user, we can resolve an email
        if (context.user && context.user._id.toString() === user._id.toString()) {
          return user.phoneNumber;
        }

        return '';
      }
    },
    addresses: {
      type: GraphQLList(AddressType),
    },
    created_at: {
      type: GraphQLString,
    },
  }
});

/**
 *  me - getting current authenticated user information
 * @type {Object}
 */
const me = {
  auth: true,
  type: UserType,
  resolve(parentValue, args, context) {
    return context.user;
  }
};

export default {
  me,
};
