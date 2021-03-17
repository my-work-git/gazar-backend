import {require_auth, require_super_admin, require_admin, RequireFiles, require_deliveryPartner} from '../helpers';

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


/**
 * exporting Mutations to schema for schema building.
 */
export default mainExport;
