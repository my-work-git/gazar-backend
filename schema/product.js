import mongoose from 'mongoose';
import moment from 'moment-timezone';
import {
  GraphQLBoolean, GraphQLFloat,
  GraphQLObjectType, GraphQLString,
  GraphQLList,
} from "graphql";
import { CategoryType } from "./category";

const Product = mongoose.model('Product');
const Category = mongoose.model('Category');
const ShopOrder = mongoose.model('ShopOrder');
const ChangeLog = mongoose.model('ChangeLog');

export const ProductType = new GraphQLObjectType({
  name: 'ProductType',
  fields: {
    _id: { type: GraphQLString },
    nameEn: { type: GraphQLString },
    nameRu: { type: GraphQLString },
    nameAm: { type: GraphQLString },
    unit: { type: GraphQLString },
    price: { type: GraphQLFloat },
    discount: { type: GraphQLFloat },
    maxOrder: { type: GraphQLFloat },
    minOrder: { type: GraphQLFloat },
    category: { type: CategoryType },
    photo: { type: GraphQLString },
    isActive: { type: GraphQLBoolean },
    featured: { type: GraphQLBoolean },
    created_at: { type: GraphQLString },
    quantity: { type: GraphQLFloat },
    keywords: { type: GraphQLString },
    descriptionAm: { type: GraphQLString },
    descriptionRu: { type: GraphQLString },
    descriptionEn: { type: GraphQLString },
  }
});

const products = {
  type: GraphQLList(ProductType),
  args: {
    category: { type: GraphQLString },
    query: { type: GraphQLString },
    ids: { type: GraphQLList(GraphQLString) },
    featured: { type: GraphQLBoolean },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { category, query, ids, featured } = args;
    const findQ = {};
    // Getting product items no matter if it's active for Admin user
    if (!admin) {
      findQ.isActive = true;
    }

    if (featured) {
      findQ.featured = true;
    }

    if (category === 'top-products') {
      const daysAgo = moment().tz('Asia/Yerevan').subtract(7, 'days').startOf('day').toDate();
      return await Product.aggregate([
        {
          $match: { ...findQ },
        },
        {
          $lookup: {
            from: "shoporders",
            let: { productId: "$_id" },
            as: "productOrders",
            pipeline: [
              {
                $match: {
                  created_at: { $gte: daysAgo },
                  "products._id": "$productId",
                }
              }
            ],
          },
        },
        {
          $addFields: {
            ordersCount: { $size: "$productOrders" }
          }
        },
        {
          $project: {
            productOrders: 0,
          }
        },
        {
          $sort: { ordersCount: -1 },
        },
        {
          $project: {
            ordersCount: 0,
          }
        },
        { $limit: 12 },
      ]);
    }

    if (category && category.length > 0) {
      const categories = await Category.find({ slug: { $in: category.split(',')}});
      findQ.category = { $in: categories.map(c => c._id)};
    }

    if (query && query.length >= 2) {
      findQ['$or'] = [
        { nameEn: {$regex : `.*${query}.*`, $options: 'i'} },
        { nameAm: {$regex : `.*${query}.*`, $options: 'i'} },
        { nameRu: {$regex : `.*${query}.*`, $options: 'i'} },
      ];
    }

    if (ids && ids.length > 0) {
      try {
        findQ._id = { $in: ids.map(id => mongoose.Types.ObjectId(id)) };
      } catch (e) {
        console.log('Product ID convert error -> ', e);
      }
    }

    return await Product.find({ ...findQ }).populate('category');
  }
};

const product = {
  type: ProductType,
  args: {
    product_id: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { product_id } = args;
    try {
      product_id = mongoose.Types.ObjectId(product_id);
    } catch (e) {
      return null;
    }

    const findQ = { _id: product_id };
    if (!admin) {
      findQ.isActive = true;
    }

    return await Product.findOne({ ...findQ });
  }
};

const productsOrderedWith = {
  type: GraphQLList(ProductType),
  args: {
    product_id: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { product_id } = args;
    try {
      product_id = mongoose.Types.ObjectId(product_id);
    } catch (e) {
      return null;
    }

    const findQ = { _id: product_id };
    if (!admin) {
      findQ.isActive = true;
    }

    const product = await Product.findOne({ ...findQ });
    if (!product) return [];

    const orders = await ShopOrder.find({ 'products._id': product._id });
    let productsIdCount = {};
    orders.map(order => order.products.map(p => {
      const pid = p._id.toString();
      if (pid === product._id.toString()) return;

      if (!productsIdCount[pid]) {
        productsIdCount[pid] = 1;
        return;
      }

      productsIdCount[pid] += 1;
    }));

    const products = await Product.find({ _id: { $in: Object.keys(productsIdCount) }, isActive: findQ.isActive }).select({ _id: 1 });
    const sortedIds = Object.keys(productsIdCount)
      .filter(pid => !!products.find(p => p._id.toString() === pid))
      .sort((pid1, pid2) => productsIdCount[pid2] - productsIdCount[pid1])
      .slice(0, 10);

    const relatedProducts = await Product.find({ _id: { $in: sortedIds } }).populate('category');
    return relatedProducts.sort((p1, p2) => productsIdCount[p2._id.toString()] - productsIdCount[p1._id.toString()]);
  }
};

const basketProducts = {
  type: GraphQLList(ProductType),
  args: {
    // Shop order ID
    basket_id: {type: GraphQLString},
  },
  async resolve(parentValue, args, context) {
    const { basket_id } = args;
    const shopOrder = await ShopOrder.findById(basket_id);
    if (!shopOrder) return [];
    const productIds = shopOrder.products.map(p => p._id);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    return products.map(p => ({
      ...p,
      quantity: shopOrder.products.find(pp => p._id.toString() === pp._id.toString()).quantity
    }));
  }
};

export default {
  products,
  product,
  basketProducts,
  productsOrderedWith,
}
