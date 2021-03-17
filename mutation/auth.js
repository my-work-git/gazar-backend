import mongoose from 'mongoose';
import { GraphQLString, GraphQLInt } from 'graphql';
import { response, getMutationObject, sendSMS, formatNumber, getJWT } from './../helpers.js';
import Translate from '../translate';

const User = mongoose.model('User');

// Setting Login mutation for keeping it in memory, not generating it all the time
const RegistrationByPhone = getMutationObject('RegistrationByPhone', {});

const loginOrRegister = {
  type: RegistrationByPhone,
  args: {
    phoneNumber: { type: GraphQLString },
    lang: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    let { phoneNumber, lang } = args;

    try {
      const verifyCode = User.generateVerifyCode();
      const smsText = `${Translate('VERIFICATION_CODE', lang)}: ${verifyCode}, ${Translate('REGARDS_GAZAR', lang)}`;
      phoneNumber = await sendSMS(phoneNumber, smsText);

      let user = await User.findOne({ phoneNumber });
      if (!user) {
        await User.create({ phoneNumber, verifyCode });
      } else {
        user.verifyCode = verifyCode;
        user.last_login = Date.now();
        await user.save();
      }

    } catch (e) {
      console.log('NUMBER ----- ', phoneNumber);
      console.log(e);
      return response({}, 'UNABLE_TO_SEND_SMS');
    }

    return response({});
  }
};

const VerifyCodeMutationType = getMutationObject('VerifyCode', { token: { type: GraphQLString } });

const verifyCode = {
  type: VerifyCodeMutationType,
  args: {
    phoneNumber: { type: GraphQLString },
    verifyCode: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    let { verifyCode, phoneNumber } = args;
    try {
      phoneNumber = formatNumber(phoneNumber);
    } catch(e) {}
    const user = await User.findOne({ phoneNumber, verifyCode });
    if (!user) {
      return response({}, 'INVALID_CODE_NUMBER');
    }

    user.verified = true;
    await user.save();
    return response({ token: getJWT(user) });
  }
};

const EmailRegistrationType = getMutationObject('EmailRegistrationType', {});

const emailRegistration = {
  type: EmailRegistrationType,
  args: {
    email: { type: GraphQLString },
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    password: { type: GraphQLString },
    phoneNumber: { type: GraphQLString },
    lang: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    let { email, first_name, last_name, password, phoneNumber, lang } = args;
    if (!User.validateEmail(email)) {
      return response({}, 'INVALID_EMAIL');
    }

    if (!User.validatePassword(password)) {
      return response({}, 'PASSWORD_NOT_SECURE');
    }

    try {
      phoneNumber = formatNumber(phoneNumber);
    } catch (e) {
      return response({}, 'INVALID_PHONE_NUMBER');
    }

    const userCount = await User.countDocuments({ $or: [ { email }, { phoneNumber } ]});
    if (userCount > 0) {
      return response({}, 'USER_ALREADY_EXISTS');
    }

    const user = new User({
      first_name, last_name, email, phoneNumber,
    });

    await user.setPassword(password);
    user.verifyCode = User.generateVerifyCode(true);
    await user.save();
    try {
      await user.sendVerifyEmail(lang);
    } catch (e) {
      console.log('emailRegistration: UNABLE TO SEND EMAIL -> ', e);
    }
    return response({});
  }
};

const emailVerifyCode = {
  type: VerifyCodeMutationType,
  args: {
    verifyCode: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    let { verifyCode } = args;
    const user = await User.findOne({ verifyCode });
    if (!user) {
      return response({}, 'INVALID_CODE_NUMBER');
    }

    user.verified = true;
    await user.save();
    return response({ token: getJWT(user) });
  }
};

const EmailLoginMutationType = getMutationObject('EmailLoginMutationType', { token: { type: GraphQLString } });

const emailLogin = {
  type: EmailLoginMutationType,
  args: {
    email: { type: GraphQLString },
    password: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const { email, password } = args;
    const user = await User.findOne({ email });
    if (!user) {
      return response({}, 'INVALID_EMAIL_OR_PASSWORD');
    }

    if (! (await user.checkPassword(password))) {
      return response({}, 'INVALID_EMAIL_OR_PASSWORD');
    }

    return response({
      token: getJWT(user),
    });
  }
};

const EmailResetPasswordMutationType = getMutationObject('EmailResetPasswordMutationType', {});

const emailResetPassword = {
  type: EmailResetPasswordMutationType,
  args: {
    // could be email or phoneNumber
    login: { type: GraphQLString },
    lang: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const { login, lang } = args;
    let phoneNumber = '++';
    try {
      phoneNumber = formatNumber(login)
    } catch (e) {}
    const user = await User.findOne({$or: [
        { email: login },
        { phoneNumber },
    ]});

    if (user && user.email && user.email.length > 0) {
      user.verifyCode = User.generateVerifyCode(true);
      await user.save();
      await user.sendPasswordResetEmail(lang);
    }

    return response({});
  }
};

const ResetPasswordMutationType = getMutationObject('ResetPasswordMutationType', {});

const resetPassword = {
  type: ResetPasswordMutationType,
  args: {
    verifyCode: { type: GraphQLString },
    password: { type: GraphQLString },
    lang: { type: GraphQLString },
  },
  async resolve(parentValue, args) {
    const { verifyCode, password } = args;
    const user = await User.findOne({ verifyCode });
    if (!user) {
      return response({}, 'WRONG_VERIFY_CODE');
    }

    if (!User.validatePassword(password)) {
      return response({}, 'PASSWORD_NOT_SECURE');
    }

    await user.setPassword(password);
    await user.save();

    return response({});
  }
};

export default {
  loginOrRegister,
  verifyCode,
  emailRegistration,
  emailLogin,
  emailResetPassword,
  resetPassword,
  emailVerifyCode,
}
