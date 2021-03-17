import mongoose from 'mongoose';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean, GraphQLInt,
} from 'graphql';
import { response, getMutationObject } from './../helpers.js';

const Category = mongoose.model('Category');
const Product = mongoose.model('Product');
const ActivityLog = mongoose.model('ActivityLog');

const categoryArgs = {
  nameEn: { type: GraphQLString },
  nameRu: { type: GraphQLString },
  nameAm: { type: GraphQLString },
  slug: { type: GraphQLString },
  order: { type: GraphQLInt },
  isActive: { type: GraphQLBoolean },
};

const CategoryCreateMutation = getMutationObject('CategoryCreate', { id: { type: GraphQLString } });
const categoryCreate = {
  type: CategoryCreateMutation,
  admin: true,
  args: {
    ...categoryArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const categoryFields = { ...args };
    if (!Category.checkSlug(categoryFields.slug)) {
      return response({}, 'Invalid Slug provided! should be [a-zA-Z0-9_]');
    }

    const p = await Category.create({ ...categoryFields });

    try {
      await ActivityLog.add({ admin, type: 'category_create', description: `Category "${p.nameAm}" created!` });
    } catch (e) {
      console.log('ActivityLog: error adding activity log -> ', e);
    }

    return response({ id: p._id });
  }
};


const CategoryUpdateMutation = getMutationObject('CategoryUpdate', {});
const categoryUpdate = {
  type: CategoryUpdateMutation,
  admin: true,
  args: {
    category_id: { type: GraphQLString },
    ...categoryArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { category_id } = args;
    const categoryFields = { ...args };

    delete categoryFields.category_id;

    if (!Category.checkSlug(categoryFields.slug)) {
      return response({}, 'Invalid Slug provided! should be [a-zA-Z0-9_]');
    }

    try {
      category_id = mongoose.Types.ObjectId(category_id);
    } catch (e) {
      return response({} ,'Invalid category id provided!');
    }

    await Category.update({ _id: category_id }, { $set: { ...categoryFields } });

    try {
      await ActivityLog.add({ admin, type: 'category_update', description: `Category "${categoryFields.nameAm}" updated!` });
    } catch (e) {
      console.log('ActivityLog: error adding activity log -> ', e);
    }
    return response({});
  }
};

const categoryDelete = {
  type: CategoryUpdateMutation,
  admin: true,
  args: {
    category_id: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { category_id } = args;
    await Product.update({ category: category_id }, { $set: { category: null }});
    await Category.remove({ _id: category_id });

    try {
      await ActivityLog.add({ admin, type: 'category_update', description: `Category "${category_id}" Removed` });
    } catch (e) {
      console.log('ActivityLog: error adding activity log -> ', e);
    }
    return response({});
  }
};

export default {
  categoryCreate,
  categoryUpdate,
  categoryDelete,
};
