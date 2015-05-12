/*!
 * Copyright 2015 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Channel = require('./lib/channel'),
    cluster = require('cluster');

var NUM_WORKERS  = 2,
    BASE_PORT    = 3000,
    NUM_MESSAGES = 250000;

var node = new Channel();

node.on('error', function(err) {
  console.error('%d: %s', process.pid, err);
  process.exit(1);
});

if (cluster.isMaster) {
  node.listen('localhost', BASE_PORT);
  node.on('joined', onJoin);

  node.once('leader', function() {
    console.log('%d: master ready, booting workers', process.pid);
    function join(url) {
      node.join(url);
    }
    for (var i = 1; i <= NUM_WORKERS; i++) {
      var worker = cluster.fork();
      var port = BASE_PORT + i;
      worker.on('message', join);
      worker.send(port);
    }
    node.registerHandler('foobar', onMessage);
  });
} else if (cluster.isWorker) {
  process.on('message', function(port) {
    console.log('listening on localhost:%d', port);
    node.listen('localhost', port);
    node.registerHandler('foobar', onMessage);
    process.send(node.url);
  });
}

var joined = 0;
function onJoin(peer) {
  joined++;
  console.log('%d: peer %s joined', process.pid, peer.id);
  if (joined === NUM_WORKERS) {
    startBenchmark();
  }
}

var received = 0;
function onMessage(message) {
  received++;;
  // console.log('%d: %d received message %s', process.pid, new Date(), message);
  // console.log('%d: total received: %d', process.pid, received);
}

var start,
    scheduled = 0,
    published = 0;
function startBenchmark() {
  console.log('Benchmarking publishing %d messages to %d nodes',
              NUM_MESSAGES, NUM_WORKERS + 1);
  start = new Date();
  publish();
}

function publish() {
  if (scheduled !== NUM_MESSAGES) {
    node.publish('foobar', 'message ' + scheduled, onPublish);
    scheduled++;
    setImmediate(publish);
  }
}

function onPublish(err) {
  if (!err) {
    published++;
    if (published % 500 === 0) {
      console.log('Published %d', published);
    }
    if (published === NUM_MESSAGES) {
      var elapsed = new Date() - start,
          rate    = NUM_MESSAGES / (elapsed / 1000);
      console.log('Finished benchmark');
      console.log('Elapsed Time: %d ms', elapsed);
      console.log('Rate: %d messages/second', rate.toFixed(2));
      process.exit();
    }
  } else {
    console.error(err);
    process.exit(1);
  }
}
