import mongoose from 'mongoose';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList, GraphQLInt,
} from "graphql";

const ChangeLog = mongoose.model('ChangeLog');

export const AdminType = new GraphQLObjectType({
  name: 'AdminType',
  fields: {
    _id: { type: GraphQLString },
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    username: { type: GraphQLString },
    created_at: { type: GraphQLString },
    last_login: { type: GraphQLString }
  }
});

export default {

};
