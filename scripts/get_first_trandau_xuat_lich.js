const http = require('http');
http.get('http://127.0.0.1:3000/trandau', res=>{
  let b=''; res.on('data', c=> b+=c);
  res.on('end', ()=>{
    let re = /href=\"\/trandau\/xuat-lich\/(.*?)\"/g;
    let m = re.exec(b);
    console.log('FOUND', m ? m[1] : null);
  });
}).on('error', e=> console.error(e));
