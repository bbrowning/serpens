# Serpens - Reliable messaging based on Raft consensus protocol

This is a proof-of-concept for reliable messaging among Node processes
using the [Raft consensus protocol][raft]. We're using a fork of
[Skiff][] (forked only for bug fixes so far, which will hopefully make
their way upstream) for the Raft consensus along with a custom
transport based on [Axon][] for the actual communication between
servers. Messages are only retained in memory for now. Other Skiff
persistence stores are not supported yet, but it shouldn't be too hard
to add support for the existing LevelDB store. We probably want to
write a custom store based on an embedded Node database as well.

Right now all messages get distributed through consensus and because
of this throughput is fairly limited (about 2700 messages/second on my
Lenovo T530 for a 3 node cluster). There should be some opportunities
to improve throughput by modifying Skiff to do command batching like
other more mature Raft implementations use.

After cloning this repository, you can test the messaging throughput
for a 3 node cluster on your machine by doing:

    npm install
    node index.js

This is not yet usable as an NPM module, but will be soon enough. The
public-facing API needs a bit of work first.

[raft]: http://raftconsensus.github.io/
[skiff]: https://github.com/bbrowning/skiff-algorithm
[axon]: https://github.com/tj/axon
