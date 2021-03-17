import mongoose from 'mongoose';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';
import { response, getMutationObject } from './../helpers.js';

const Coupon = mongoose.model('Coupon');

const couponArgs = {
  name: { type: GraphQLString },
  code: { type: GraphQLString },
  discount: { type: GraphQLFloat },
  isActive: { type: GraphQLBoolean },
};

const CouponCreateMutation = getMutationObject('CouponCreate', { id: { type: GraphQLString } });
const couponCreate = {
  type: CouponCreateMutation,
  admin: true,
  args: {
    ...couponArgs,
  },
  async resolve(parentValue, args) {
    const couponFields = { ...args };
    const { code } = couponFields;
    const checkCoupon = await Coupon.countDocuments({ code });
    if (checkCoupon > 0) {
      return response({}, 'Coupon with this code already exists!');
    }

    const c = await Coupon.create({ ...couponFields });
    return response({ id: c._id });
  }
};

const couponUpdate = {
  type: CouponCreateMutation,
  admin: true,
  args: {
    coupon_id: { type: GraphQLString },
    ...couponArgs,
  },
  async resolve(parentValue, args) {
    let { coupon_id } = args;
    const couponFields = { ...args };
    delete couponFields.coupon_id;

    try {
      coupon_id = mongoose.Types.ObjectId(coupon_id);
    } catch (e) {
      return response({}, 'Invalid coupon Id provided!');
    }

    await Coupon.update({  _id: coupon_id}, { $set: { ...couponFields } });
    return response({});
  }
};

const couponDelete = {
  type: CouponCreateMutation,
  admin: true,
  args: {
    coupon_id: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const c = await Coupon.findById(args.coupon_id);
    if (c) {
      await c.remove();
    }

    return response({});
  }
};

export default {
  couponCreate,
  couponUpdate,
  couponDelete,
};
