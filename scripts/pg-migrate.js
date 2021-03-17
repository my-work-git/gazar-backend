import mongoose from 'mongoose';
import { Client } from 'pg';
import request  from 'request';
import fs  from 'fs';

import '../models';
import {formatNumber} from "../helpers";

const Product = mongoose.model('Product');
const Category = mongoose.model('Category');
const client = new Client({
  connectionString: 'postgresql://postgres:gazar@localhost:12345/gazar',
});

const DeliveryTimeFixes = {
  "delivery-Zone-9": '10-11am',
  "zone-7": '10-11am',
  "zone-10": '10-11am',
  "delivery-Zone-14": '15-16pm',
  "zone-15": '15-16pm',
  "zone-11": '10-11am',
  "delivery-Zone-19": '19-20pm',
  "zone-20": '19-20pm',
  "delivery-Now": '15-16pm',
};

const UnitFixes = {
  'հատ': 'item',
  'կգ': 'kg',
  'կապ': 'item',
  '1 հատ': 'item',
};

const productById = (products, id) => {
  for (const product of products) {
    if (product.id === id) return product;
  }

  return null;
};

async function InsertCategories() {
  const categoriesQuery = await client.query('SELECT * FROM "public"."ProductApp_category"');
  for (const category of categoriesQuery.rows) {
    const cat = await Category.findOne({ slug: category.name });
    if (cat) {
      continue;
    }

    await Category.create({
      slug: category.name,
      nameAm: category.title,
      isActive: category.active,
      created_at: new Date(category.created_at),
    });
  }
}

async function InsertProducts() {
  const productsQuery = await client.query('SELECT * FROM "public"."ProductApp_product"');
  for (const product of productsQuery.rows) {
    let p = await Product.findOne({ nameAm: product.title });
    if (!p) {
      const categoryQuery = await client.query(`SELECT * FROM "public"."ProductApp_category" WHERE id = ${product.category_id}`);
      const category_slug = categoryQuery.rows[0].name || null;
      if (!category_slug) continue;
      const cat = await Category.findOne({ slug: category_slug });

      console.log("Inserting Product -> ", product.title);
      p = await Product.create({
        nameAm: product.title,
        nameEn: '',
        nameRu: '',
        price: product.price,
        discount: 0,
        unit: UnitFixes[product.quantity_unit.toLowerCase()] || 'kg',
        category: cat._id,
        isActive: product.active,
        created_at: new Date(product.created_at),
      });
    }

    const imgBase64 = await downloadImageToBase64(`https://gazar.am/static/${product.image}`);
    await p.setPhoto(imgBase64);
    console.log("DONE!! Product -> ", product.title);
  }
}

async function Run() {
  await client.connect();
  await InsertCategories();
  await InsertProducts();

  // const orderQuery = await client.query('SELECT * FROM "public"."ShopApp_order" ORDER BY created_at');
  // const orders = orderQuery.rows;
  //
  // for (const order of orders) {
  //   const orderModel = {
  //     phoneNumber: order.phone,
  //     address: order.address,
  //     notes: '',
  //     price: order.total_price,
  //     deliveryTime: DeliveryTimeFixes[order.delivery_type] || '10-11am',
  //     status: 'delivered',
  //     created_at: new Date(order.created_at),
  //   };
  //
  //   if (order.total_price < MIN_ORDER_LIMIT) {
  //     console.log(`SKIP: order price is lower than ${MIN_ORDER_LIMIT} -> `, order.total_price, " Address: ", order.address);
  //     continue;
  //   }
  //
  //   try {
  //     orderModel.phoneNumber = formatNumber(order.phone);
  //   } catch (e) {
  //     console.log("SKIP: Unable to parse Phone Number -> ", order.phone, " Address: ", order.address);
  //     continue;
  //   }
  //
  //   const productsQuery = await client.query(`SELECT * FROM "public"."ShopApp_productorder" WHERE order_id = ${order.id}`);
  //   const order_products = productsQuery.rows;
  //   console.log(order_products.length);
  //   console.log(orderModel);
  //   return;
  // }
}

async function downloadImageToBase64(url) {
  return new Promise((resolve, reject) => {
    request(url, {encoding: 'binary'}, (error, response, body) => {
      if (error) return reject(error);
      resolve(`data:${response.headers["content-type"]};base64,${new Buffer(body, 'binary').toString('base64')}`);
    });
  });
}

Run();
