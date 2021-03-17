import mongoose from 'mongoose';
import {
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import { response, getMutationObject, formatNumber } from './../helpers.js';
import {getJWT} from "./../helpers";

const DeliveryPartner = mongoose.model('DeliveryPartner');
const ChangeLog = mongoose.model('ChangeLog');

const baseArgs = {
  first_name: { type: GraphQLString },
  last_name: { type: GraphQLString },
  phoneNumber: { type: GraphQLString },
  password: { type: GraphQLString },
};

const DeliveryPartnerCreateMutation = getMutationObject('DeliveryPartnerCreateMutation', {});

const deliveryPartnerCreate = {
  admin: true,
  type: DeliveryPartnerCreateMutation,
  args: {
    ...baseArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { first_name, last_name, phoneNumber, password } = args;
    if (password.length < 6) {
      return response({}, 'Password should be at least 6 symbols!');
    }

    try {
      phoneNumber = formatNumber(phoneNumber);
    } catch (e) {
      return response({}, 'Invalid Phone number provided!');
    }

    const dp = new DeliveryPartner({
      first_name, last_name, phoneNumber,
      created_by: admin._id,
      last_login: null,
    });

    await dp.setPassword(password);
    await dp.save();

    try {
      await ChangeLog.add({
        admin,
        targetModel: 'DeliveryPartner',
        actionType: 'delivery_partner_create',
        description: `DeliveryPartner "${dp.first_name} ${dp.last_name} " Created!`,
        current: null,
        next: {...dp.toObject()},
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }


    return response({});
  }
};

const DeliveryPartnerUpdateMutation = getMutationObject('DeliveryPartnerUpdateMutation', {});

const deliveryPartnerUpdate = {
  admin: true,
  type: DeliveryPartnerUpdateMutation,
  args: {
    _id: { type: GraphQLString },
    ...baseArgs,
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    let { first_name, last_name, phoneNumber, password, _id } = args;
    const dp = await DeliveryPartner.findById(_id);
    const currentDp = {...dp.toObject()};
    if (!dp) {
      return response({}, 'Unable to find requested entity');
    }

    if (first_name && dp.first_name !== first_name) {
      dp.first_name = first_name;
    }

    if (last_name && dp.last_name !== last_name) {
      dp.last_name = last_name;
    }

    if (phoneNumber) {
      try {
        phoneNumber = formatNumber(phoneNumber);
      } catch (e) {
        return response({}, 'Invalid Phone number provided!');
      }

      dp.phoneNumber = phoneNumber;
    }

    if (password) {
      if (password.length < 6) {
        return response({}, 'Password should be at least 6 symbols!');
      }

      await dp.setPassword(password);
      dp.last_login = null;
    }

    await dp.save();

    try {
      await ChangeLog.add({
        admin,
        targetModel: 'DeliveryPartner',
        actionType: 'delivery_partner_update',
        description: `DeliveryPartner "${dp.first_name} ${dp.last_name} " Updated!`,
        current: currentDp,
        next: {...dp.toObject()},
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }

    return response({});
  }
};

const DeliveryPartnerLoginMutation = getMutationObject('DeliveryPartnerLoginMutation', {
  token: { type: GraphQLString }, firstLogin: { type: GraphQLBoolean }
});

const deliveryPartnerLogin = {
  type: DeliveryPartnerLoginMutation,
  args: {
    phoneNumber: { type: GraphQLString },
    password: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    let { phoneNumber, password } = args;

    try {
      phoneNumber = formatNumber(phoneNumber);
    } catch (e) {}

    const dp = await DeliveryPartner.findOne({ phoneNumber });
    if (!dp) {
      return response({}, 'Wrong phoneNumber or password provided!');
    }

    if (! await dp.checkPassword(password)) {
      return response({}, 'Wrong phoneNumber or password provided!');
    }

    let firstLogin = true;

    if (dp.last_login) {
      dp.last_login = Date.now();
      await dp.save();
      firstLogin = false;
    }

    return response({ token: getJWT(dp, 'deliveryPartner'), firstLogin });
  }
};


const DeliveryPartnerSetPasswordMutation = getMutationObject('DeliveryPartnerSetPasswordMutation', {});
const deliveryPartnerSetPassword = {
  deliveryPartner: true,
  type: DeliveryPartnerSetPasswordMutation,
  args: {
    password: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { deliveryPartner } = context;
    await deliveryPartner.setPassword(args.password);
    deliveryPartner.last_login = Date.now();
    await deliveryPartner.save();
    return response({});
  }
};


const deliveryPartnerDelete = {
  admin: true,
  type: getMutationObject('DeliveryPartnerDeleteMutation', {}),
  args: {
    deliveryPartnerId: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    const { deliveryPartnerId } = args;
    const dp = await DeliveryPartner.findById(deliveryPartnerId);
    if (!dp) {
      return response({}, 'Unable to find Delivery partner!!');
    }

    const currentDp = {...dp.toObject()};
    await dp.remove();

    try {
      await ChangeLog.add({
        admin,
        targetModel: 'DeliveryPartner',
        actionType: 'delivery_partner_delete',
        description: `DeliveryPartner "${dp.first_name} ${dp.last_name} " Deleted!!!`,
        current: currentDp,
        next: null,
      });
    } catch (e) {
      console.log('ChangeLog: error adding activity log -> ', e);
    }
  }
};

export default {
  deliveryPartnerCreate,
  deliveryPartnerUpdate,
  deliveryPartnerLogin,
  deliveryPartnerSetPassword,
  deliveryPartnerDelete,
};
