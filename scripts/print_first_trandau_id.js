const mongoose = require('mongoose');
const TranDau = require('../models/trandau');

const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

async function main(){
  await mongoose.connect(uri);
  const td = await TranDau.findOne().lean().exec();
  if(!td) console.log('NO_MATCHES'); else console.log(td._id.toString());
  process.exit(0);
}

main().catch(err=>{console.error(err); process.exit(1)});
