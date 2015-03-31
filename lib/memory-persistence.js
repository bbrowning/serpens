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

function MemoryPersistence() {
  if (!(this instanceof MemoryPersistence)) return new MemoryPersistence();

  this.meta = {};
  this.commitIndexes = {};
  this.messages = {};
}

var EE       = require('events').EventEmitter,
    Readable = require('stream').Readable,
    Writable = require('stream').Writable,
    util     = require('util');

util.inherits(MemoryPersistence, EE);

module.exports = MemoryPersistence;

var MP = MemoryPersistence.prototype;

MP.saveMeta = function(nodeId, state, callback) {
  setImmediate(function() {
    this.meta[nodeId] = state;
    callback();
  }.bind(this));
};

MP.loadMeta = function(nodeId, callback) {
  setImmediate(function() {
    callback(null, this.meta[nodeId]);
  }.bind(this));
};

MP.lastAppliedCommitIndex = function(nodeId, callback) {
  setImmediate(function() {
    callback(null, this.commitIndexes[nodeId]);
  }.bind(this));
};

MP.saveCommitIndex = function(nodeId, commitIndex, callback) {
  setImmediate(function() {
    this.commitIndexes[nodeId] = commitIndex;
    callback();
  }.bind(this));
};

MP.applyCommand = function(nodeId, commitIndex, command, callback) {
  setImmediate(function() {
    switch(command.type) {
    case 'publish':
      this.publishMessage(nodeId, command);
      break;
    }
    callback();
  }.bind(this));
};

MP.createReadStream = function(nodeId) {
  var stream   = new Readable({objectMode: true}),
      messages = this.messages[nodeId] || [],
      i        = 0;

  stream._read = function() {
    while (i < messages.length && stream.push(messages[i++])) {}
    if (i === messages.length) {
      stream.push(null);
    }
  };

  return stream;
};

MP.createWriteStream = function(nodeId) {
  var self = this,
      stream = new Writable({objectMode: true});

  self.removeAllState(nodeId);

  stream._write = function(chunk, encoding, callback) {
    self.publishMessage(nodeId, chunk);
    setImmediate(callback);
  }

  return stream;
};

MP.removeAllState = function(nodeId, callback) {
  setImmediate(function() {
    this.messages[nodeId] = [];
    if (callback) {
      callback();
    }
  }.bind(this));
};

MP.publishMessage = function(nodeId, command) {
  if (!this.messages[nodeId]) {
    this.messages[nodeId] = [];
  }
  this.messages[nodeId].push(command);
  this.emit('message', command.destination, command.body);
};
