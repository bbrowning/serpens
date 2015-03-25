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

if (cluster.isMaster) {
  node.listen('localhost', BASE_PORT);

  node.once('leader', function() {
    console.log('%d: master ready, booting workers', process.pid);
    for (var i = 1; i <= NUM_WORKERS; i++) {
      var worker = cluster.fork();
      var port = BASE_PORT + i;
      worker.on('message', function(url) {
        node.join(url);
      });
      worker.send(port)
    }
    node.registerHandler('foobar', onMessage);
  });

  node.on('joined', function(peer) {
    console.log('%d: peer %s joined', process.pid, peer.id);
    node.publish('foobar', 'welcome ' + peer.id);
  });
} else if (cluster.isWorker) {
  process.on('message', function(port) {
    node.listen('localhost', port);
    node.registerHandler('foobar', onMessage);
    node.publish('foobar', 'published from node ' + process.pid);
    process.send(node.url);
  });
}

function onMessage(message) {
  console.log('%d: received message %s', process.pid, message);
}
