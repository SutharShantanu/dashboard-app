import dns from 'dns';

console.log('Default servers:', dns.getServers());

dns.setServers(['8.8.8.8', '1.1.1.1']);
console.log('New servers:', dns.getServers());

dns.resolveSrv('_mongodb._tcp.cluster0.xr4b4vq.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('SRV Resolution Error:', err);
  } else {
    console.log('SRV Addresses:', addresses);
  }
});

dns.resolveTxt('cluster0.xr4b4vq.mongodb.net', (err, records) => {
  if (err) {
    console.error('TXT Resolution Error:', err);
  } else {
    console.log('TXT Records:', records);
  }
});
