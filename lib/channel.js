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

  var self = this;

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
    // Hook to allow us to add our own RPC calls
    if (!interceptPeerCall(peer, type, args, cb)) {
      Node.prototype.handlePeerCall.call(self.node, peer, type, args, cb);
    }
  };

  this.handlers = {};
  this.peers = {};
  this.node.on('joined', joined);
  this.node.on('left', left);
  this.node.on('error', function(err) {
    self.emit('error', err);
  });
  this.options.persistence.on('message', onMessage);

  function interceptPeerCall(peer, type, args, cb) {
    switch(type) {
    case 'command':
      onceLoaded(function() {
        runCommand.bind(self)(args.command, cb);
      });
      return true;
      break;
    default:
      return false;
    }
  }

  function onceLoaded(cb) {
    if (!self.node.stopped) {
      self.node.onceLoaded(cb);
    }
  }

  function joined(peer) {
    self.peers[peer.id] = peer;
  }

  function left(peer) {
    delete self.peers[peer.id];
  }


  function onMessage(destination, message) {
    var handlers = self.handlers[destination];
    if (handlers) {
      handlers.forEach(function(handler) {
        handler(message);
      });
    }
  }
}

var EE          = require('events').EventEmitter,
    Node        = require('skiff-algorithm'),
    Persistence = require('./memory-persistence'),
    Transport   = require('./transport/axon-transport'),
    propagate   = require('propagate'),
    util        = require('util');

util.inherits(Channel, EE);

module.exports = Channel;

Channel.prototype.listen = function(host, port, cb) {
  this.url = 'axon://' + host + ':' + port;
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
  var self = this;
  var command = {
    type: 'publish',
    destination: destination,
    body: message
  };
  runCommand.bind(self)(command, cb);
};

function runCommand(command, cb) {
  var self = this;
  if (!cb) {
    cb = function(err) {
      if (err) {
        self.emit('error', err);
      }
    };
  }
  this.node.command(command, function(err) {
    if(err && err.code === 'ENOTLEADER') {
      if (!err.leader) {
        // no leader yet, so try again in a bit
        setTimeout(function() {
          runCommand.bind(self)(command, cb);
        }, 50);
      } else {
        // we're not the leader so forward the command to the leader
        var peer = self.peers[err.leader];
        if (peer) {
          peer.connection.send('command', {command: command}, cb);
        } else {
          // we're not the leader but we don't yet have the leader's info
          setTimeout(function() {
            runCommand.bind(self)(command, cb);
          }, 50);
        }
      }
    } else {
      cb(err);
    }
  });
}
