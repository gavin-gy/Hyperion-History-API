const async = require('async');
const pmx = require("pmx");
const {amqpConnect} = require("../connections/rabbitmq");
const {routes} = require("../helpers/elastic-routes");

let ch;

const indexingPrefecthCount = parseInt(process.env.INDEX_PREFETCH, 10);

const indexQueue = async.cargo(async.ensureAsync(router), indexingPrefecthCount);

function router(payload, callback) {
    routes[process.env.type](payload, ch, callback);
}

async function run() {
    [ch,] = await amqpConnect();
    try {
        ch.prefetch(indexingPrefecthCount);
        ch.assertQueue(process.env['queue'], {durable: true});
        console.log(`setting up indexer on queue ${process.env['queue']}`);
        ch.consume(process.env['queue'], indexQueue.push);
    } catch (e) {
        console.error('elasticsearch cluster is down!');
        process.exit(1);
    }

    pmx.action('stop', (reply) => {
        ch.close();
        reply({
            event: 'index_channel_closed'
        });
    });
}

module.exports = {run};
