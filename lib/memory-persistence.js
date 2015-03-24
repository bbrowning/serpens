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
  this.commands = {};
  this.messages = [];
}

var EE   = require('events').EventEmitter,
    util = require('util');

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
    if (!this.commands[nodeId]) {
      this.commands[nodeId] = [];
    }
    switch(command.type) {
    case 'publish':
      this.publishMessage(command);
      break;
    }
    callback();
  }.bind(this));
};

MP.createReadStream = function(nodeId) {
  throw 'createReadStream not implemented'
};

MP.createWriteStream = function(nodeId) {
  throw 'createWriteStream not implemented'
};

MP.removeAllState = function(nodeId, callback) {
  setImmediate(function() {
    this.commands[nodeId] = [];
    callback();
  }.bind(this));
};

MP.publishMessage = function(command) {
  this.messages.push(command);
  this.emit('message', command.destination, command.body);
};
