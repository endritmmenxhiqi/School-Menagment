const redis = require('redis');

(async () => {
  const client = redis.createClient({
    password: 'ULxd9l3jPCONQZBUK8hfmgNw18bpw9FE',
    socket: {
      host: 'redis-11394.crce282.eu-west-3-1.ec2.cloud.redislabs.com',
      port: 11394
    }
  });

  client.on('error', err => console.error('Redis error:', err));

  try {
    await client.connect();
    console.log('Connected to Redis.');

    const keys = await client.keys('*');
    const queueKeys = keys.filter(k => k.startsWith('queue:') || k.startsWith('ticket_count:') || k.startsWith('current:'));

    console.log(`Found ${queueKeys.length} keys to delete:`);
    console.log(queueKeys);

    if (queueKeys.length > 0) {
      await client.del(...queueKeys);
      console.log('Deleted keys.');
    } else {
      console.log('No matching keys to delete.');
    }

    await client.quit();
    process.exit(0);
  } catch (err) {
    console.error('Error during reset script:', err);
    process.exit(1);
  }
})();
