import mongoose from 'mongoose';
import {GraphQLBoolean, GraphQLString} from 'graphql';
import jwt from 'jsonwebtoken';
import { response, getMutationObject, ErrorResp, getJWT } from './../helpers.js';

const Admin = mongoose.model('Admin');

const AdminLoginMutationType = getMutationObject('AdminLogin', {
  token: { type: GraphQLString }, firstLogin: { type: GraphQLBoolean },
});

const adminLogin = {
  type: AdminLoginMutationType,
  args: {
    username: { type: GraphQLString },
    password: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const { username, password } = args;

    const adminUser = await Admin.findOne({ username });
    if (!adminUser) {
      return response({}, 'Wrong username or password provided!');
    }

    if (! await adminUser.checkPassword(password)) {
      return response({}, 'Wrong username or password provided!');
    }

    let firstLogin = true;
    if (adminUser.last_login) {
      adminUser.last_login = Date.now();
      await adminUser.save();
      firstLogin = false;
    }

    adminUser.last_login = Date.now();
    await adminUser.save();

    return response({ token: getJWT(adminUser, 'admin'), firstLogin });
  }
};

const AdminSetPasswordMutation = getMutationObject('AdminSetPasswordMutation', {});
const adminSetPassword = {
  admin: true,
  type: AdminSetPasswordMutation,
  args: {
    password: { type: GraphQLString },
  },
  async resolve(parentValue, args, context) {
    const { admin } = context;
    await admin.setPassword(args.password);
    admin.last_login = Date.now();
    await admin.save();
    return response({});
  }
};


const AdminUserCreateMutationType = getMutationObject('AdminUserCreate', {
  first_name: { type: GraphQLString }, last_name: { type: GraphQLBoolean },
});

const adminUserCreate = {
  type: AdminUserCreateMutationType,
  superAdmin: true,
  args: {
    username: { type: GraphQLString },
    password: { type: GraphQLString },
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    console.log(5544)
    const { username, password, first_name, last_name } = args;
    const admCount = await Admin.countDocuments({ username });
    if (admCount !== 0) {
      return response({}, 'Admin with this username already exists!!');
    }

    const admin = new Admin({
      username, first_name, last_name,
      last_login: null,
    });
    await admin.setPassword(password);
    await admin.save();

    return response({});
  }
};

export default {
  adminLogin,
  adminUserCreate,
  adminSetPassword,
};
