import mongoose from 'mongoose';
import {Router} from 'express';
import bodyParser from 'body-parser';
import _ from 'lodash';
import crypto from 'crypto';
import {IdramCredentials} from '../config';
import moment from 'moment';


const PaymentIdram = mongoose.model('PaymentIdram');
const ShopOrder = mongoose.model('ShopOrder');


const answerIdram = new Router();


answerIdram.use(bodyParser.urlencoded({extended: true}));
answerIdram.use(bodyParser.json());


//validate idram Order Confirmation & Payment confirmation
const validateIdramPost = async (req, res, next) => {
  const body = req.body
  if (
    _.has(body, 'EDP_PRECHECK') &&
    _.isMatch(body, {'EDP_PRECHECK': 'YES'})) {
    if (
      !_.has(body, 'EDP_BILL_NO') &&
      !_.has(body, 'EDP_AMOUNT') &&
      !_.isNaN(body.EDP_AMOUNT) &&
      !_.has(body, 'EDP_REC_ACCOUNT')
    ) {
      console.log('validation dose not pass1')
      return res.send('validation 1 dose not pass')
    }
  } else {
    if (
      !_.has(body, 'EDP_BILL_NO') &&
      !_.has(body, 'EDP_REC_ACCOUNT') &&
      !_.has(body, 'EDP_PAYER_ACCOUNT') &&
      !_.has(body, 'EDP_AMOUNT') &&
      !_.isNaN(body.EDP_AMOUNT) &&
      !_.has(body, 'EDP_TRANS_ID') &&
      !_.has(body, 'EDP_TRANS_DATE') &&
      !_.has(body, 'EDP_CHECKSUM')
    ) {
      return res.send('validation dose not pass')
    }
  }
  next()
}

answerIdram.post('/idram-result', validateIdramPost, (req, res) => {
  const {EDP_PRECHECK, EDP_BILL_NO, EDP_REC_ACCOUNT, EDP_AMOUNT, EDP_PAYER_ACCOUNT, EDP_TRANS_ID, EDP_TRANS_DATE, EDP_CHECKSUM} = _.pick(req.body,
    [
      'EDP_PRECHECK',
      'EDP_BILL_NO',
      'EDP_REC_ACCOUNT',
      'EDP_AMOUNT',
      'EDP_PAYER_ACCOUNT',
      'EDP_TRANS_ID',
      'EDP_TRANS_DATE',
      'EDP_CHECKSUM'
    ])
  const IS_EDP_PRECHECK = _.has(req.body, 'EDP_PRECHECK')
  PaymentIdram.findOne({EDP_BILL_NO, EDP_REC_ACCOUNT, EDP_AMOUNT}).then(async payment => {
    if (payment && IS_EDP_PRECHECK) {
      //order confirmation passed
      res.send('OK')
    } else if (payment) {
      //check sum
      if (checkSum({EDP_AMOUNT, EDP_BILL_NO, EDP_PAYER_ACCOUNT, EDP_TRANS_ID, EDP_TRANS_DATE, EDP_CHECKSUM}, IdramCredentials)) {
        const trans_date = moment(EDP_TRANS_DATE, 'DD/MM/YYYY');
        payment.EDP_PAYER_ACCOUNT = EDP_PAYER_ACCOUNT;
        payment.EDP_TRANS_ID = EDP_TRANS_ID;
        payment.EDP_TRANS_DATE = trans_date.isValid() ? trans_date.toDate() : (new Date());
        payment.EDP_CHECKSUM = EDP_CHECKSUM;
        await payment.save();

        //do staff
        const { unpaidOrder } = payment;
        delete unpaidOrder._id;
        const order = await ShopOrder.create({ ...unpaidOrder });
        await order.notify();

        payment.unpaidOrder = null;
        payment.shopOrder = order;
        await payment.save();

        res.send('OK')

      } else {
        // console.log('chechsumn dose not pass')
        res.send('Chechsum dose not pass')
      }
    } else {
      // console.log('Payment not found')
      res.send('Payment not found')
    }
  }).catch(err => {
    console.log(err)
    res.send('Mongoose error')
  })
})

//check sum helper
function checkSum(params, IdramCredentials) {
  // console.log(params)
  const text = IdramCredentials.EDP_REC_ACCOUNT + ':' + params.EDP_AMOUNT + ':' + IdramCredentials.EDP_SECRET_KEY + ':' + params.EDP_BILL_NO + ':' + params.EDP_PAYER_ACCOUNT + ':' + params.EDP_TRANS_ID + ':' + params.EDP_TRANS_DATE
  const hash = crypto.createHash('md5').update(text).digest("hex").toUpperCase()
  // console.log(params.EDP_CHECKSUM.toUpperCase(), ':::', hash)
  return params.EDP_CHECKSUM.toUpperCase() === hash
}

export default answerIdram;
