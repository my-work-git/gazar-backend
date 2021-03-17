import { WorkerInterval } from "../config";
import OrderedProducts from './ordered_products';

export default () => {
  setInterval(async () => {
      console.log('WORKER: START - ', new Date().toISOString());
      try {
        await OrderedProducts();
        // await BusinessSubscriptions();
      } catch (e) {
        console.log('WORKER-ERROR: ', e);
      }
      console.log('WORKER: END - ', new Date().toISOString());
    }, WorkerInterval);
};
