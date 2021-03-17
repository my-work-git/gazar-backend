import jwt from 'jsonwebtoken';
import {JWTConfig, SuperAdminToken} from './config';
import mongoose from 'mongoose';
const User = mongoose.model('User');
const Admin = mongoose.model('Admin');
const DeliveryPartner = mongoose.model('DeliveryPartner');

const getUser = async (token) => {
  const authData = {
    admin: null,
    user: null,
    deliveryPartner: null,
  };

  try {
    if(jwt.verify(token, JWTConfig.secret)) {
      const jwtData = jwt.decode(token, {json: true});
      switch (jwtData.userType) {
        case 'user':
          authData.user = await User.findById(jwtData.id);break;
        case 'admin':
          authData.admin = await Admin.findById(jwtData.id);break;
        case 'deliveryPartner':
          authData.deliveryPartner = await DeliveryPartner.findById(jwtData.id);break;
      }
    }
  } catch(e) {}

  return authData;
};

export const expressAuth = async (req, res, next) => {
    const token = req.get('Authorization');
    if (token === SuperAdminToken) {
      req.superAdmin = true;
      req.user = null;
      req.admin = null;
      req.deliveryPartner = null;
    } else {
      const jwtUser = await getUser(token);
      Object.keys(jwtUser).map(k => req[k] = jwtUser[k]);
    }
    next();
};

export const wsAuth = async (connectionParams, webSocket) => {
    return await getUser(connectionParams.token);
};
