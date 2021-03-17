import {
  GraphQLBoolean,
  GraphQLObjectType,
} from "graphql";

export const PingType = new GraphQLObjectType({
  name: 'PingType',
  fields: {
    pong: { type: GraphQLBoolean },
  }
});

const ping = {
  type: PingType,
  async resolve(parentValue, args, context) {
    return { pong: true };
  }
};

export default {
  ping,
};
