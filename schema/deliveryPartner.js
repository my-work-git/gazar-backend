import mongoose from 'mongoose';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList, GraphQLInt,
} from "graphql";

const DeliveryPartner = mongoose.model('DeliveryPartner');

export const DeliveryPartnerType = new GraphQLObjectType({
  name: 'DeliveryPartnerType',
  fields: {
    _id: { type: GraphQLString },
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    phoneNumber: { type: GraphQLString },
    created_at: { type: GraphQLString },
    created_by: { type: GraphQLString },
    last_login: { type: GraphQLString },
  }
});

const deliveryPartners = {
  admin: true,
  type: GraphQLList(DeliveryPartnerType),
  args: {},
  async resolve(parentValue, args, context) {
    return await DeliveryPartner.find({}).populate('created_by');
  },
};

export default {
  deliveryPartners,
};
