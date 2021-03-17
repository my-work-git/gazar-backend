import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import QLMutation from './mutation';
import QLSchema from './schema';

/**
 * Schema Building for user and repository;
 * @type {GraphQLSchema}
 */

export default new GraphQLSchema ({
  query: new GraphQLObjectType ({
    name: 'Query',
    fields: {...QLSchema}
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {...QLMutation}
  })
});
