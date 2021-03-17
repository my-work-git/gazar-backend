import mongoose from 'mongoose';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList, GraphQLInt,
} from "graphql";

const Category = mongoose.model('Category');
const Product = mongoose.model('Product');

export const CategoryType = new GraphQLObjectType({
  name: 'CategoryType',
  fields: {
    _id: { type: GraphQLString },
    nameEn: { type: GraphQLString },
    nameRu: { type: GraphQLString },
    nameAm: { type: GraphQLString },
    slug: { type: GraphQLString },
    order: { type: GraphQLInt },
    isActive: { type: GraphQLBoolean },
    productCount: { type: GraphQLInt },
    created_at: { type: GraphQLString },
  }
});

const categories = {
  type: GraphQLList(CategoryType),
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const findQ = {};

    // Getting product items no matter if it's active for Admin user
    if (!admin) {
      findQ.isActive = true;
    }

    const categories = await Category.find({ ...findQ }).lean();
    for (const cat of categories) {
      cat.productCount = await Product.countDocuments({ category: cat._id, isActive: true });
    }

    return categories;
  }
};

const category = {
  type: CategoryType,
  args: {
    category_id: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { category_id } = args;
    try {
      category_id = mongoose.Types.ObjectId(category_id);
    } catch (e) {
      return null;
    }

    const findQ = { _id: category_id };
    if (!admin) {
      findQ.isActive = true;
    }

    return await Category.findOne({ ...findQ });
  }
};

export default {
  categories,
  category,
}
