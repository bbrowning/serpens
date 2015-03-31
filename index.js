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

var NUM_WORKERS = 2,
    BASE_PORT   = 3000;

var node = new Channel();

node.on('error', function(err) {
  console.error('%d: %s', process.pid, err);
});

if (cluster.isMaster) {
  node.listen('localhost', BASE_PORT);

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

  node.on('joined', function(peer) {
    console.log('%d: peer %s joined', process.pid, peer.id);
  });

  setTimeout(function() {
    var start     = new Date(),
        published = 0,
        toPublish = 10000;
    console.log('Benchmarking publishing %d messages to %d nodes',
                toPublish, NUM_WORKERS + 1);
    publish();

    function publish() {
      node.publish('foobar', 'message ' + published, function(err) {
        if (!err) {
          published += 1;
          if (published % 500 === 0) {
            console.log('Published %d', published);
          }
          if (published === toPublish) {
            var elapsed = new Date() - start,
            rate    = toPublish / (elapsed / 1000);
            console.log('Finished benchmark');
            console.log('Elapsed Time: %d ms', elapsed);
            console.log('Rate: %d messages/second', rate.toFixed(2));
            process.exit();
          } else {
            publish();
          }
        } else {
          console.error(err);
        }
      });
    }
  }, 3000);
} else if (cluster.isWorker) {
  process.on('message', function(port) {
    console.log('listening on localhost:%d', port);
    node.listen('localhost', port);
    node.registerHandler('foobar', onMessage);
    process.send(node.url);
  });
}

function onMessage(message) {
  // console.log('%d: %d received message %s', process.pid, new Date(), message);
}
