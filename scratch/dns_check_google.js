import { resolveSrv, setServers } from 'dns/promises';

async function check() {
  try {
    console.log('Setting DNS servers to 8.8.8.8...');
    setServers(['8.8.8.8']);
    console.log('Checking SRV record for _mongodb._tcp.cluster0.xr4b4vq.mongodb.net...');
    const srv = await resolveSrv('_mongodb._tcp.cluster0.xr4b4vq.mongodb.net');
    console.log('SRV Records:', srv);
  } catch (err) {
    console.error('DNS SRV Error:', err);
  }
}

check();
