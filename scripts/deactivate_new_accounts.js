const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://13hoanguy_db_user:123@ac-63dmeyd-shard-00-00.b8ir9xx.mongodb.net:27017/qlgiaigame?ssl=true&authSource=admin';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const TaiKhoan = require('../models/taikhoan');
    const NguoiChoi = require('../models/nguoichoi');

    const accountIds = [
      '69da02820a06028305752b8d','69da02820a06028305752b8e','69da02820a06028305752b8f','69da02830a06028305752b90','69da02830a06028305752b91',
      '69da02840a06028305752b92','69da02840a06028305752b93','69da02840a06028305752b94','69da02850a06028305752b95','69da02850a06028305752b96',
      '69da02850a06028305752b97','69da02860a06028305752b98','69da02860a06028305752b99','69da02870a06028305752b9a','69da02870a06028305752b9b',
      '69da02870a06028305752b9c','69da02880a06028305752b9d','69da02880a06028305752b9e','69da02890a06028305752b9f','69da02890a06028305752ba0',
      '69da02890a06028305752ba1','69da028a0a06028305752ba2','69da028a0a06028305752ba3','69da028a0a06028305752ba4','69da028b0a06028305752ba5',
      '69da028b0a06028305752ba6','69da028c0a06028305752ba7','69da028c0a06028305752ba8','69da028c0a06028305752ba9','69da028d0a06028305752baa',
      '69da028d0a06028305752bab','69da028d0a06028305752bac','69da028e0a06028305752bad','69da028e0a06028305752bae','69da028f0a06028305752baf',
      '69da028f0a06028305752bb0','69da028f0a06028305752bb1','69da02900a06028305752bb2','69da02900a06028305752bb3','69da02900a06028305752bb4',
      '69da02910a06028305752bb5','69da02910a06028305752bb6','69da02920a06028305752bb7','69da02920a06028305752bb8','69da02920a06028305752bb9',
      '69da02930a06028305752bba','69da02930a06028305752bbb','69da02940a06028305752bbc','69da02940a06028305752bbd','69da02940a06028305752bbe'
    ];

    console.log('Deactivating', accountIds.length, 'accounts...');

    const res1 = await TaiKhoan.updateMany({ _id: { $in: accountIds } }, { $set: { KichHoat: false } }).exec();
    console.log('TaiKhoan modifiedCount:', res1.modifiedCount || res1.nModified || res1.n || 0);

    const res2 = await NguoiChoi.updateMany({ TaiKhoan: { $in: accountIds } }, { $set: { KichHoat: false } }).exec();
    console.log('NguoiChoi modifiedCount:', res2.modifiedCount || res2.nModified || res2.n || 0);

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
