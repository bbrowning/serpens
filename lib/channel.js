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

function Channel() {
  if (!(this instanceof Channel)) return new Channel();

  var options = {
    transport: new Transport(),
    persistence: new Persistence(),
    heartBeatInterval: 150,
    minElectionTimeout: 450,
    maxElectionTimeout: 900
  };
  this.node = new Node(options);
  propagate(this.node, this);

  options.persistence.on('command publish', this.onPublish.bind(this));
}

var EE          = require('events').EventEmitter,
    Node        = require('skiff-algorithm'),
    Persistence = require('./memory-persistence'),
    Transport   = require('skiff-tcp-msgpack'),
    propagate   = require('propagate'),
    util        = require('util');

util.inherits(Channel, EE);

module.exports = Channel;

Channel.prototype.listen = function(host, port, cb) {
  this.url = 'tcp+msgpack://' + host + ':' + port;
  this.node.listen(this.url, cb);
};

Channel.prototype.join = function(url, cb) {
  if (typeof url === 'object') {
    url = url.url;
  }
  this.node.join(url, cb);
};

Channel.prototype.publish = function(message, cb) {
  var command = {
    type: 'publish',
    body: message
  };
  this.node.command(command, cb);
};

Channel.prototype.onPublish = function(command) {
  this.emit('message', command.body);
};
