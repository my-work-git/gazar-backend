import {RequireFiles, require_auth, require_admin, require_deliveryPartner, require_super_admin} from '../helpers';

let mainExport = {};

RequireFiles(__dirname).map(fileExport => {
  if(!fileExport) return;
  const endpoints = fileExport.default;
  if(!endpoints) return;
  Object.keys(endpoints).map(k => {
    if(typeof endpoints[k].resolve === "function") {
      let resolveCallback = null;
      if (endpoints[k].superAdmin) {
        resolveCallback = require_super_admin;
      }

      if (endpoints[k].admin) {
        resolveCallback = require_admin;
      }

      if (endpoints[k].deliveryPartner) {
        resolveCallback = require_deliveryPartner;
      }

      if (endpoints[k].auth) {
        resolveCallback = require_auth;
      }

      if (resolveCallback) {
        endpoints[k].resolve = resolveCallback(endpoints[k].resolve);
      }
    }
  });
  mainExport = {...mainExport, ...endpoints};
});


export default mainExport;
