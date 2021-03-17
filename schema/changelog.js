import mongoose from 'mongoose';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList, GraphQLInt,
} from "graphql";
import {AdminType} from "./admin";

const ChangeLog = mongoose.model('ChangeLog');

export const ChangeLogType = new GraphQLObjectType({
  name: 'ChangeLogType',
  fields: {
    _id: { type: GraphQLString },
    admin: { type: AdminType },
    targetModel: { type: GraphQLString },
    targetId: { type: GraphQLString },
    actionType: { type: GraphQLString },
    description: { type: GraphQLString },
    current: {
      type: GraphQLString,
      resolve(changelog, args, context) {
        if (!changelog.current) return null;
        return JSON.stringify(changelog.current);
      }
    },
    next: {
      type: GraphQLString,
      resolve(changelog, args, context) {
        if (!changelog.next) return null;
        return JSON.stringify(changelog.next);
      }
    },
    created_at: { type: GraphQLString },
  }
});

const changeLogEntity = {
  admin: true,
  type: GraphQLList(ChangeLogType),
  args: {
    entity: { type: GraphQLString },
    targetId: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    let { entity: targetModel, targetId } = args;
    switch (targetModel.toLowerCase()) {
      case 'product':
        targetModel = 'Product'; break;
      case 'shoporder':
        targetModel = 'ShopOrder'; break;
    }
    try {
      targetId = mongoose.Types.ObjectId(targetId);
    } catch (e) {}
    return await ChangeLog.find({ targetModel, targetId });
  }
};

export default {
  changeLogEntity,
};
