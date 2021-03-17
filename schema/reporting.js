import mongoose from 'mongoose';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
} from 'graphql';
import {ORDER_STATUS} from "../helpers";

const ShopOrder = mongoose.model('ShopOrder');
const User = mongoose.model('User');

export const ShopOrdersChartDataType = new GraphQLObjectType({
  name: 'ShopOrdersChartDataType',
  fields: {
    date: { type: GraphQLString },
    orderCount: { type: GraphQLFloat },
    deliveredCount: { type: GraphQLFloat },
    canceledCount: { type: GraphQLFloat },
    totalAmount: { type: GraphQLFloat },
    totalCanceledAmount: { type: GraphQLFloat },
    totalDeliveredAmount: { type: GraphQLFloat },
  }
});

export const ShopOrdersUsersDataType = new GraphQLObjectType({
  name: 'ShopOrdersUsersDataType',
  fields: {
    date: { type: GraphQLString },
    userCount: { type: GraphQLFloat },
    customerCount: { type: GraphQLFloat },
  }
});

export const ShopOrdersAvgCheckSizeDataType = new GraphQLObjectType({
  name: 'ShopOrdersAvgCheckSizeDataType',
  fields: {
    date: { type: GraphQLString },
    checkSize: { type: GraphQLFloat },
    deliveredCheckSize: { type: GraphQLFloat },
  }
});

export const ShopOrderReportingType = new GraphQLObjectType({
  name: 'ShopOrderReportingType',
  fields: {
    ordersData: { type: GraphQLList(ShopOrdersChartDataType) },
    usersData: { type: GraphQLList(ShopOrdersUsersDataType) },
    avgCheckSizeData: { type: GraphQLList(ShopOrdersAvgCheckSizeDataType) },
  }
});

const shopOrderChartData = {
  type: ShopOrderReportingType,
  admin: true,
  args: {
    fromDate: { type: GraphQLString },
    toDate: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { fromDate, toDate } = args;
    const matchIt = { created_at: { $gte: new Date(fromDate), $lte: new Date(toDate) } };

    const ordersData = await ShopOrder.aggregate([
      { $match: matchIt },
      {
        $project: {
          dayField: { $dateToString: {format: '%Y-%m-%d', date: '$created_at'}},
          price: "$price",
          products: "$products",
        },
      },
      {
        $group: {
          _id: {dayField: "$dayField"},
          orderCount : { $sum: 1 },
          totalAmount: { $sum: '$price' },
        }
      },
      {
        $project: {
          date: { $dateFromString: { dateString: '$_id.dayField' } },
          orderCount: '$orderCount',
          totalAmount: '$totalAmount',
        }
      },
      { $sort : { date: 1 }},
    ]);

    const deliveryData = await ShopOrder.aggregate([
      { $match: {...matchIt, status: ORDER_STATUS.DELIVERED} },
      {
        $project: {
          dayField: { $dateToString: {format: '%Y-%m-%d', date: '$updated_at'}},
          price: "$price",
          products: "$products",
        },
      },
      {
        $group: {
          _id: {dayField: "$dayField"},
          deliveredCount : { $sum: 1 },
          totalDeliveredAmount: { $sum: '$price' },
        }
      },
      {
        $project: {
          date: { $dateFromString: { dateString: '$_id.dayField' } },
          deliveredCount: '$deliveredCount',
          totalDeliveredAmount: '$totalDeliveredAmount',
        }
      },
    ]);

    const cancelDeliveryData = await ShopOrder.aggregate([
      { $match: {...matchIt, status: ORDER_STATUS.CANCELED} },
      {
        $project: {
          dayField: { $dateToString: {format: '%Y-%m-%d', date: '$updated_at'}},
          price: "$price",
          products: "$products",
        },
      },
      {
        $group: {
          _id: {dayField: "$dayField"},
          deliveredCount : { $sum: 1 },
          totalCanceledAmount: { $sum: '$price' },
        }
      },
      {
        $project: {
          date: { $dateFromString: { dateString: '$_id.dayField' } },
          deliveredCount: '$deliveredCount',
          totalCanceledAmount: '$totalCanceledAmount',
        }
      },
    ]);

    ordersData.map(od => {
      const dc = deliveryData.find(d => d.date.toISOString() === od.date.toISOString());
      if (dc) {
        od.deliveredCount = dc.deliveredCount;
        od.totalDeliveredAmount = dc.totalDeliveredAmount;
      }

      const cc = cancelDeliveryData.find(d => d.date.toISOString() === od.date.toISOString());
      if (cc) {
        od.canceledCount = cc.deliveredCount;
        od.totalCanceledAmount = cc.totalCanceledAmount;
      }
    });

    const usersData = await User.aggregate([
      { $match: matchIt },
      {
        $project: {
          dayField: { $dateToString: {format: '%Y-%m-%d', date: '$created_at'}},
        },
      },
      {
        $group: {
          _id: {dayField: "$dayField"},
          userCount : { $sum: 1 },
        }
      },
      {
        $project: {
          date: { $dateFromString: { dateString: '$_id.dayField' } },
          userCount: '$userCount',
        }
      },
      { $sort : { date: 1 }},
    ]);

    const firstOrderData = await ShopOrder.aggregate([
      { $match: matchIt },
      {
        $project: {
          dayField: { $dateToString: {format: '%Y-%m-%d', date: '$created_at'}},
          user: "$user",
        },
      },
      { $sort: { created_at: 1 }},
      {
        $group: {
          _id: { user: "$user" },
          dayField: { $first: "$dayField" },
        },
      },
      {
        $group: {
          _id: { dayField: "$dayField" },
          orderCount : { $sum: 1 },
        }
      },
      {
        $project: {
          date: { $dateFromString: { dateString: '$_id.dayField' } },
          orderCount: '$orderCount',
        }
      },
      { $sort : { date: 1 }},
    ]);

    usersData.map(ud => {
      const cd = firstOrderData.find(c => c.date.toISOString() === ud.date.toISOString());
      if (cd) {
        ud.customerCount = cd.orderCount;
      }
    });

    const avgCheckSizeData = await ShopOrder.aggregate([
      { $match: matchIt },
      { $sort: { created_at: 1 }},
      {
        $project: {
          dayField: { $dateToString: {format: '%Y-%m-%d', date: '$created_at'}},
          price: "$price",
        },
      },
      {
        $group: {
          _id: { dayField: "$dayField" },
          avgCheck: { $avg: "$price" },
        },
      },
      {
        $project: {
          date: { $dateFromString: { dateString: '$_id.dayField' } },
          checkSize: { $trunc: '$avgCheck' },
        }
      },
      { $sort : { date: 1 }},
    ]);


    const acheckSizeDelivered = await ShopOrder.aggregate([
      { $match: {...matchIt, status: ORDER_STATUS.DELIVERED} },
      { $sort: { updated_at: 1 }},
      {
        $project: {
          dayField: { $dateToString: {format: '%Y-%m-%d', date: '$updated_at'}},
          price: "$price",
        },
      },
      {
        $group: {
          _id: { dayField: "$dayField" },
          avgCheck: { $avg: "$price" },
        },
      },
      {
        $project: {
          date: { $dateFromString: { dateString: '$_id.dayField' } },
          deliveredCheckSize: { $trunc: '$avgCheck' },
        }
      },
      { $sort : { date: 1 }},
    ]);

    avgCheckSizeData.map(checkSize => {
      const cd = acheckSizeDelivered.find(c => c.date.toISOString() === checkSize.date.toISOString());
      if (cd) {
        checkSize.deliveredCheckSize = cd.deliveredCheckSize;
      }
    });

    return {
      ordersData,
      usersData,
      avgCheckSizeData,
    };
  }
};

export default {
  shopOrderChartData,
}
