const soap = require('strong-soap').soap;

const { createClient } = soap;

/**
 * 1. Getting Payment ID
 * 2. Filling Out iframe/redirect URL for user to fill card information
 * https://testpayments.ameriabank.am/forms/frm_paymentstype.aspx?lang=am&paymentid=A94E4656-5B4D-4C3A-9B43-14BE761DEFD2
 * 3. User redirected back to our given URL "backUrl"
 * 4. We are fetching and showing final payment check with constructing URL
 * https://testpayments.ameriabank.am/forms/frm_checkprint.aspx?paymentid=A94E4656-5B4D-4C3A-9B43-14BE761DEFD2&lang=am
 * @param client
 */
const getPaymentID = client => {
  const params = {
    paymentfields: {
      ClientID: '32c8e4eb-81bf-4051-b6c6-2e8fc79eb1bf',
      Username: '3d19541048',
      Password: 'lazY2k',
      OrderID: 6677, // 8993899,
      Description: 'Gazar.am order',
      PaymentAmount: 5,
      backURL: 'https://gazar.am',
      CardHolderID: 6779,
    }
  };

  client["GetPaymentID"](params, (e, result) => {
    if (e) {
      console.log(e);
      return;
    }

    console.log('RESULT! ', result);
  });
};

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const getPaymentInfo = client => {
  const params = {
    paymentfields: {
      ClientID: '32c8e4eb-81bf-4051-b6c6-2e8fc79eb1bf',
      Username: '3d19541048',
      Password: 'lazY2k',
      OrderID: 8999, // 8993899, // Order ID from our database
      PaymentAmount: 2,
    },
  };

  client['GetPaymentFields'](params, (e, result) => {
    if (e) {
      console.log(e);
      return;
    }

    console.log('RESULT! ', result);
  });
};

createClient('https://testpayments.ameriabank.am/webservice/PaymentService.svc?wsdl', (err, client) => {
  if (err) {
    console.log(err);
    return;
  }

  getPaymentInfo(client);
  // getPaymentID(client);
});
