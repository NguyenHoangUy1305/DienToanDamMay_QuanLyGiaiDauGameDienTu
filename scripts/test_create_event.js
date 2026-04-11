require('dotenv').config();
const mongoose = require('mongoose');
require('../models/giaidau');
require('../models/nguoichoi');
require('../models/doituyen');
const TranDau = require('../models/trandau');
const googleCalendar = require('../services/googlecalendar');

const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

async function main(id){
  await mongoose.connect(uri);
  const td = await TranDau.findById(id).populate('GiaiDau').lean().exec();
  if(!td){ console.error('Not found'); process.exit(1); }
  console.log('TD loaded, ThoiGian=', td.ThoiGianThiDau);
  try{
    const evt = await googleCalendar.taoSuKienTranDau(td, td.GiaiDau ? td.GiaiDau.TenGiaiDau : null);
    console.log('EVENT CREATED', evt && evt.htmlLink);
  }catch(err){
    console.error('ERROR creating', err && err.message? err.message: err);
  }
  process.exit(0);
}

main(process.argv[2]).catch(e=>{console.error(e); process.exit(1)});
