import { Router } from 'express';
import bodyParser from 'body-parser';
import FB from 'fb';

FB.setAccessToken('EAAEBPZASvgsEBADEodQzZCFOvldtYi3PFlha5YZAJPLgsDgj9afdbC7VcEZCElaZAtAeHE9RMnBVVpnsZCIPxBjNIGEm5wdsecDM9QG1ZCJ79UaEfgz2VyPKmnRY3DrZCXwPAjUGc4DLijvzhjxfGTmRZCeIr53eIdOrkbZBXdoXauKe7i5k9INxqr');

const route = new Router();

const VERIFY_TOKEN = "J!MP&RRn^TGr5k'yc*$\y?v'&7fYpq-NF,(D~wL!kfeQj$:AK/7C&?^-W?YVQW9E{;B_L~";

route.use(bodyParser.urlencoded({extended: true}));
route.use(bodyParser.json());

route.get('/', (req, res) => {
  res.send(req.query["hub.challenge"]);
});

const testButton = {
  "attachment": {
    "type": "template",
    "payload": {
      "template_type": "list",
      "top_element_style": "compact",
      "elements": [
        {
          "title": "Ձմերուկ",
          "subtitle": "130Դր",
          "image_url": "https://storage.googleapis.com/gazar-am.appspot.com/5b9126db8c34dd8c53c33f68.png",
          "buttons": [
            {
              "title": "View",
              "type": "web_url",
              "url": "https://gazar.am/shop",
              "messenger_extensions": true,
              "webview_height_ratio": "tall",
              "fallback_url": "https://gazar.am/shop"
            }
          ]
        },
        {
          "title": "Լիմոն",
          "subtitle": "200Դր",
          "image_url": "https://storage.googleapis.com/gazar-am.appspot.com/5b9126548c34dd8c53c33f06.png",
          "buttons": [
            {
              "title": "View",
              "type": "web_url",
              "url": "https://gazar.am/shop",
              "messenger_extensions": true,
              "webview_height_ratio": "tall",
              "fallback_url": "https://gazar.am/shop"
            }
          ]
        },
      ],
       "buttons": [
        {
          "title": "View More",
          "type": "postback",
          "payload": "payload"
        }
      ]
    }
  }
};

route.post('/', (req, res) => {
  const { object: bodyObject, entry: entries } = req.body;

  // Checks this is an event from a page subscription
  if (bodyObject === 'page') {

    // Iterates over each entry - there may be multiple if batched
    entries.forEach(function(entry) {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];

      const { message, delivery, read, sender } = webhook_event;

      if (message && !message.is_echo && message.text.toLowerCase() == 'test') {
        console.log("Message: ", message.text, ' ', message.mid);
        FB.api('me/thread_settings', 'post', {
          setting_type: 'domain_whitelisting',
          domain_action_type: 'add',
          whitelisted_domains: [
            'https://storage.googleapis.com',
            'https://gazar.am',
          ],
        }, () => {
          FB.api('me/messages', 'post', { recipient: sender, message: { ...testButton } }, function (res) {
            if(!res || res.error) {
              console.log(!res ? 'error occurred' : res.error);
              return;
            }
            console.log('Post Id: ' + res.id);
          });
        });
      }

      if (delivery) {
        console.log("Delivered: ", delivery.mids[0]);
      }

      if (read) {
        console.log("Read: ", sender);
      }

      // console.log(webhook_event);
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

export default route;
