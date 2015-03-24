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

  this.options = {
    transport: new Transport(),
    persistence: new Persistence(),
    heartBeatInterval: 150,
    minElectionTimeout: 450,
    maxElectionTimeout: 900
  };
  this.node = new Node(this.options);
  propagate(this.node, this);

  this.node.handlePeerCall = function(peer, type, args, cb) {
    // TODO: this is where we can intercept custom RPC calls
    Node.prototype.handlePeerCall.call(this.node, peer, type, args, cb);
  }.bind(this);

  this.handlers = {};
  this.options.persistence.on('message', this.onMessage.bind(this));
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

Channel.prototype.registerHandler = function(destination, messageHandler, cb) {
  var handlers = this.handlers[destination];
  if (!handlers) {
    handlers = this.handlers[destination] = [];
  }
  handlers.push(messageHandler);
  if (cb) {
    setImmediate(cb);
  }
};

Channel.prototype.publish = function(destination, message, cb) {
  var command = {
    type: 'publish',
    destination: destination,
    body: message
  };
  this.node.command(command, cb);
};

Channel.prototype.onMessage = function(destination, message) {
  var handlers = this.handlers[destination];
  if (handlers) {
    handlers.forEach(function(handler) {
      handler(message);
    });
  }
};
