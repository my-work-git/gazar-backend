import mongoose from 'mongoose';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';
import { response, getMutationObject } from './../helpers.js';

const Product = mongoose.model('Product');
const ChangeLog = mongoose.model('ChangeLog');

const productArgs = {
  nameEn: { type: GraphQLString },
  nameRu: { type: GraphQLString },
  nameAm: { type: GraphQLString },
  unit: { type: GraphQLString },
  price: { type: GraphQLFloat },
  discount: { type: GraphQLFloat },
  maxOrder: { type: GraphQLFloat },
  minOrder: { type: GraphQLFloat },
  category: { type: GraphQLString },
  photo: { type: GraphQLString },
  keywords: { type: GraphQLString },
  isActive: { type: GraphQLBoolean },
  featured: { type: GraphQLBoolean },
  descriptionAm: { type: GraphQLString },
  descriptionRu: { type: GraphQLString },
  descriptionEn: { type: GraphQLString },
};

const ProductCreateMutation = getMutationObject('ProductCreate', { id: { type: GraphQLString } });
const productCreate = {
  type: ProductCreateMutation,
  admin: true,
  args: {
    ...productArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const productFields = { ...args };
    if (productFields.category.length === 0) {
      return response({}, 'You have to have category attached to product!')
    }

    const { photo: photoBase64 } = productFields;
    delete productFields.photo;

    const p = await Product.create({ ...productFields });
    await p.setPhoto(photoBase64);

    try {
      await ChangeLog.add({
        admin,
        actionType: 'product_create',
        targetModel: 'Product',
        description: `Product "${p.nameAm}" created!`,
        current: null,
        next: p.toObject(),
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }

    return response({ id: p._id });
  }
};

const productUpdate = {
  type: ProductCreateMutation,
  admin: true,
  args: {
    product_id: { type: GraphQLString },
    photo_data: { type: GraphQLString },
    ...productArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { product_id, photo_data } = args;
    const productFields = { ...args };

    if (productFields.category.length === 0) {
      return response({}, 'You have to have category attached to product!');
    }

    const product = await Product.findById(product_id);
    if (!product) {
      return response({}, 'Product not found!');
    }

    const currentProduct = {...product.toObject()};

    const { photo: photoBase64 } = productFields;

    delete productFields.product_id;
    delete productFields.photo;

    if (photo_data && photo_data.length > 0 && photoBase64.indexOf('storage.googleapis.com') === -1) {
      await product.setPhoto(photoBase64);
    }

    Object.keys(productFields).map(k => product[k] = productFields[k]);
    await product.save();

    const nextProduct = product.toObject();

    let updateString = '';
    Object.keys(nextProduct).map(key => {
      if (nextProduct[key] && nextProduct[key].toString() !== currentProduct[key].toString()) {
        updateString += `
${key} Changed From: \`${currentProduct[key]}\` To: \`${nextProduct[key]}\`
`;
      }
    });

    try {
      await ChangeLog.add({
        admin,
        actionType: 'product_update',
        targetModel: 'Product',
        description: `Product "${product.nameAm}" Updated ${updateString}`,
        current: currentProduct,
        next: nextProduct,
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }

    return response({});
  }
};

const productDelete = {
  type: ProductCreateMutation,
  admin: true,
  args: {
    product_id: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { product_id } = args;
    const product = await Product.findById(product_id);
    const productObject = product.toObject();
    await product.removePhoto();
    await product.remove();

    try {
      await ChangeLog.add({
        admin,
        targetModel: 'Product',
        actionType: 'product_delete',
        description: `Product "${product.nameAm}" Deleted from products list`,
        current: productObject,
        next: null,
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }

    return response({});
  }
};

export default {
  productCreate,
  productUpdate,
  productDelete,
};
