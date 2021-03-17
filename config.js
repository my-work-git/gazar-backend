import path from "path";

export const JWTConfig = {
  secret:
    "W$BEjfv%35?csfAwgVQZX=qr5HZB5pDy4daywnvvBM=-pxQKkY6m+9m&jASCZeCMZYgFxdKjW+hjK6TTc2PRsmH2xDjf6*v9t5yV"
};


export const NikitaConfig = {
  url: "http://45.131.124.7/broker-api/send",
  login: "gazar.am",
  pass: "gzramtrns"
};

export const InternalAPIToken = "VRxywsKKc2Yhujj5WNIh";
export const SuperAdminToken =
  "^*dcRba44y&c&2B6Qj8@=^VZp4XfP2F_*dBq52EG6%3AsmuvPEF^N-&RWxcKgxRH*e&A6-bwsD!DC#_P2P_JC*5^zLkQsTLf#3n6#Wfzt@v=XFaSp@qU@!+Ta&FfAY9h";

export const UploadDirectory =
  process.env.UPLOAD_DIR || path.join(__dirname, "upload");

export const TelegramGroupID = "-1001407373946";
export const TelegramActivityGroupID = "-207094838";

export const SupportUsers = [
  "+37455456454",
  "+37455250676",
  "+37491989398",
  "+37493703775"
];

export const WorkerInterval = 60 * 1000; // execute cron task every 1 minute

// Keeping bonus percent from each order
export const BonusPercent = 2;

export const AmeriaBankCredentials = {
  ClientID: "c3587aa5-ce83-41c8-9191-e89db113dec0",
  Username: "19534094_api",
  Password: "jO66a8p3mq639px",
  callbackUrl: "https://gazar.am/payment/ameria-callback"
};

export const EvocaBankCredentials = {
  Username: "22531609_api",
  Password: "gEbp*12_10_2020",
  callbackUrl: "https://gazar.am/payment/ipay-callback"
};

export const IdramCredentials = Object.freeze({
  EDP_REC_ACCOUNT: "110000212",
  EDP_PIN: "nna9XSNvDCx2Uac2Xnhufuw28ZnXFuH7DxLAtPy8K",
  EDP_SECRET_KEY: "9XSNvDCx2Uac2Xnhufuw28ZnXFuH7DxLAtPy8K"
});
export const MailGunConfig = {
  key: "key-a791a2de38d832924921ebffbc3edf0b",
  username: "api"
};
