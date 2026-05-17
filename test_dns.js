import dns from 'dns';
const dnsPromises = dns.promises;

async function test() {
  try {
    dns.setServers(['8.8.8.8']);
    const records = await dnsPromises.resolveSrv('_mongodb._tcp.cluster0.tenroni.mongodb.net');
    console.log('SRV records:', records);
  } catch (err) {
    console.error('SRV lookup failed:', err);
  }
}

test();
