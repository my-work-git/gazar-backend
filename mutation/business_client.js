import mongoose from 'mongoose';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';
import { response, getMutationObject } from './../helpers.js';
import {WEEKLY_DELIVERY, formatNumber} from "./../helpers";

const BusinessClient = mongoose.model('BusinessClient');
const ChangeLog = mongoose.model('ChangeLog');

const businessClientArgs = {
  name: { type: GraphQLString },
  phoneNumber: { type: GraphQLString },
  address: { type: GraphQLString },
  weeklyDelivery: { type: GraphQLString },
  discount: { type: GraphQLFloat },
  isActive: { type: GraphQLBoolean },
};

const BusinessClientCreateMutation = getMutationObject('BusinessClientCreate', { id: { type: GraphQLString }});

const businessClientCreate = {
  type: BusinessClientCreateMutation,
  admin: true,
  args: {
    ...businessClientArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const clientFields = args;
    let { name, phoneNumber, weeklyDelivery } = clientFields;
    try {
      phoneNumber = formatNumber(phoneNumber);
    } catch(e) {
      return response({}, 'Unable to parse Phone Number, please check number to match AM format');
    }

    const checkName = await BusinessClient.countDocuments({ name });
    if (checkName > 0) {
      return response({}, 'Business client with this name already exists!');
    }

    if (!!weeklyDelivery && !weeklyDelivery.split(",").every(elem => WEEKLY_DELIVERY.indexOf(elem) > -1)) {
      return response({}, 'You have to specify weekly delivery from mentioned tags!');
    }

    const c = await BusinessClient.create({ ...clientFields, phoneNumber });

    try {
      await ChangeLog.add({
        admin,
        targetModel: 'BusinessClient',
        actionType: 'business_client_create',
        description: `BusinessClient "${c.name}" Created!!`,
        current: null,
        next: {...c.toObject()},
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }

    return response({ id: c._id });
  }
};

const businessClientUpdate = {
  type: BusinessClientCreateMutation,
  admin: true,
  args: {
    clientId: { type: GraphQLString },
    ...businessClientArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { clientId, ...clientFields } = args;

    const businessClient = await BusinessClient.findById(clientId);
    if (!businessClient) {
      return response({}, 'Invalid client Id provided!');
    }
    const oldClientObj = {...businessClient.toObject()};
    let updateString = ``;
    Object.keys(clientFields).map(key => {
      let shouldUpdateField = typeof businessClient[key] === 'undefined' || businessClient[key] === null; // if we have undefined model field we should update it
      shouldUpdateField = shouldUpdateField ? true : (clientFields[key].toString() !== businessClient[key].toString());
      if (shouldUpdateField) {
        businessClient[key] = clientFields[key];
        updateString += `
${key} Changed From: \`${oldClientObj[key]}\` To: \`${clientFields[key]}\`
`;
      }
    });

    businessClient.updated_at = Date.now();
    businessClient.updated_by = admin._id;
    await businessClient.save();

    try {
      await ChangeLog.add({
        admin,
        targetModel: 'BusinessClient',
        actionType: 'business_client_update',
        description: `BusinessClient "${businessClient.name}" Updated ${updateString}`,
        current: oldClientObj,
        next: {...businessClient.toObject()},
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }

    return response({});
  }
};

const businessClientDelete = {
  type: BusinessClientCreateMutation,
  admin: true,
  args: {
    clientId: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const c = await BusinessClient.findById(args.clientId);
    if (!c) {
      return response({});
    }

    const oldObject = {...c.toObject()};
    await c.remove();

    try {
      await ChangeLog.add({
        admin,
        targetModel: 'BusinessClient',
        actionType: 'business_client_delete',
        description: `BusinessClient "${oldObject.name}" Deleted from business clients list`,
        current: oldObject,
        next: null,
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }

    return response({});
  }
};

export default {
  businessClientCreate,
  businessClientUpdate,
  businessClientDelete,
};
