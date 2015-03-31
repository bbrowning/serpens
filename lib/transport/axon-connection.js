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

function AxonConnection(localNodeId, localMeta, remoteAddress, remoteMeta, sock) {
  if (!(this instanceof AxonConnection)) {
    return new AxonConnection(localNodeId, localMeta, remoteAddress, remoteMeta);
  }

  AbstractConnection.call(this);

  this.localNodeId = localNodeId;
  this.localMeta = localMeta;
  this.remoteAddress = remoteAddress;
  this.asock = axon.socket('push');

  if (sock) {
    this.asock.type = 'client';
    this.asock.handleErrors(sock);
    this.asock.connected = true;
    this.asock.addSocket(sock);
    this._onConnect();
  }

  this.asock.on('message', this._onMessage.bind(this));

  // Use to correlate responses to requests
  this.ids = 0;
  this.callbacks = {};
}

var AbstractConnection = require('abstract-skiff-transport').Connection,
    axon               = require('axon'),
    util               = require('util');

util.inherits(AxonConnection, AbstractConnection);

module.exports = AxonConnection;

var AC = AxonConnection.prototype;

AC._send = function(type, args, callback) {
  var self = this;
  
  this._onceConnected(function() {
    var id = self.localNodeId + ':' + self.ids++;
    self.callbacks[id] = onResponse;
    self.asock.send({request: [id, type, args]});
  });

  function onResponse(response) {
    callback.apply(null, response);
  }
};

AC._receive = function(fn) {
  var self = this;

  this.on('request', onRequest);

  function onRequest(id, args) {
    fn(args[0], args[1], function() {
      var args = Array.prototype.slice.call(arguments);
      onReply(id, args);
    });
  }

  function onReply(id, args) {
    self._onceConnected(function() {
      args.unshift(id);
      self.asock.send({response: args});
    });
  }
};

AC._close = function(callback) {
};

AC._onceConnected = function(callback) {
  var self = this;
  
  if (this.asock.connected) {
    setImmediate(callback);
  } else {
    this.asock.connect(this.remoteAddress.port, this.remoteAddress.hostname);
    this.asock.on('connect', function() {
      self._onConnect();
      callback();
    });
  }
};

AC._onConnect = function() {
  this.asock.send({hello: {id: this.localNodeId, meta: this.localMeta}});
  this.emit('connected');
};

AC._onMessage = function(message) {
  if (message.response) {
    this._onResponse(message.response);
  } else if (message.request) {
    var request = message.request;
    var id = request.shift();
    this.emit('request', id, request);
  }
  else if (message.hello) {
    this.emit('hello', message.hello);
  }
};

AC._onResponse = function(response) {
  var id = response.shift();
  this.emit('response', response);
  if (this.callbacks[id]) {
    this.callbacks[id](response);
    delete this.callbacks[id];
  }
};
