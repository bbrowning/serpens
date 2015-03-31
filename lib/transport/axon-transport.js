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

function AxonTransport() {
  if (!(this instanceof AxonTransport)) return new AxonTransport();

  AbstractTransport.call(this);
}

var AbstractTransport = require('abstract-skiff-transport').Transport,
    Connection        = require('./axon-connection'),
    axon              = require('axon'),
    util              = require('util');

util.inherits(AxonTransport, AbstractTransport);

module.exports = AxonTransport;

var AT = AxonTransport.prototype;

AT._protocolName = function() {
  return 'axon';
};

AT._connect = function(localNodeId, localMeta, remoteAddress, remoteMeta) {
  return new Connection(localNodeId, localMeta, remoteAddress, remoteMeta);
};

AT._listen = function(localNodeId, address, listener, callback) {
  var asock = axon.socket('push');
  asock.bind(address.port, address.hostname);

  asock.on('connect', function(sock) {
    var conn = new Connection(localNodeId, {}, {}, undefined, sock);
    conn.on('hello', function(peer) {
      listener.call(null, peer.id, peer.meta, conn);
    });
  });
};
