import mongoose from 'mongoose';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList, GraphQLInt,
} from "graphql";

const Coupon = mongoose.model('Coupon');

export const CouponType = new GraphQLObjectType({
  name: 'CouponType',
  fields: {
    _id: { type: GraphQLString },
    name: { type: GraphQLString },
    code: { type: GraphQLString },
    discount: { type: GraphQLFloat },
    isActive: { type: GraphQLBoolean },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
  }
});

const coupons = {
  type: GraphQLList(CouponType),
  admin: true,
  args: {
    page: { type: GraphQLInt },
    isActive: { type: GraphQLBoolean },
  },
  async resolve(parentValue, args, context) {
    let { page, isActive } = args;
    if (!page) page = 0;
    const limit = 100;

    const findQ = {};
    if (typeof isActive !== "undefined" && isActive !== null) {
      findQ.isActive = isActive;
    }

    return await Coupon.find(findQ).skip(page * limit).limit(limit);
  }
};

const coupon = {
  type: CouponType,
  admin: true,
  args: {
    code: { type: GraphQLString, required: true },
  },
  async resolve(parentValue, args, context) {
    const { code } = args;
    return await Coupon.findOne({ code });
  }
};

export default {
  coupons,
  coupon,
};
