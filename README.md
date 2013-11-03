TaskCo
======
![](https://www.codeship.io/projects/6ed66fe0-17fe-0131-e0ed-0ef248b6a1b0/status)

Distributed priority task queue for node.js

**Note**: this repository is still in early development. My company is preparing to use it in production. While the
core API is in place, we are looking for initial users and contributors.

## Installation

```
npm install taskco
```

## Getting Started

```javascript
// Begin by creating a factory:
var TaskCo = require('taskco').setup();

// Add team to process tasks named "email" using the processEmail function
// This team has 3 concurrent workers removes tasks 5 seconds after completion/failure.
TaskCo.addProcedure('email', processEmail, { removeAfter : 5 }).andTeam(3);

// Create task : if uid is set, it will, in conjuction with the type of task (email)
// enforce uniqueness of that task.
TaskCo.quickEntry('email', { name : 'hello@gmail.com', uid : 'uniqueid' });

```

**Note**: While a TaskCo supports multiple factories, the root object has convenience accessors for the default factory. The
following example uses those methods.


## Procedures

A procedure consists of at least one function, `work`.

```javascript
var processEmail = {
  work: function(task, done) {
    console.log(task.data.name);
    done();
  }
}

```

### Priorities

Tasks can have a priority of any number. The higher the number, the higher the priority. Default priority levels include "low", "normal", "medium", "high", and "critical". Please see examples/priority.js for usage.


## Description

### TaskCo Goals

TaskCo was created with the following features in mind:

1. Extremely modular design: enables easier collaboration.
2. The ability to drop in a store. Currently, Redis is the only supported store.
3. Connection pooling.
4. Task-routing-friendly: while not currently implemented, the infrastructure was design with this in mind.
5. Easy input/output. Lots of convenience functions.
6. As much auto-cleanup as possible (frequent use of `expires`)
7. The ability to enforce task uniqueness.
8. An extensive test suite (help needed here)


### Eventual roadmap:

![](resources/TaskCo.jpg)


## Where you can help:

These are the top priorities currently:

1. Optional logging (to be used for error handling) - this is the first step toward the "monitor".
2. Better error handling (promises consume a lot of errors...should consider emitting them).
3. More tests! I'd like to get a great test suite in place to facilitate pull requests.
4. Separate http server: I prefer to separate this into an additional repo.


## Addendum

### Why another tasks queue for node?

This project started in search of a redis-backed tasks queue. While there are numerous options at the time of publishing,
each of these has its benefits/shortcomings. These are in NO way knocks against the projects, or against the authors, they
simply highlight why we are in need of another solution.

1. Kue (LearnBoost): the most mature, and certainly most beautiful queue around. Fast, and clean code base. Large portions
of this repository were inspired by Kue. Unfortunately, the repo has numerous pull requests outstanding, does not
offer connection pooling, tends to have problems cleaning up tasks, and operates a first-come-first-serve queue.

2. Kue (dfoody): updated with numerous quality-of-service features, it still suffers from lack of connection pooling, and
has not been shown to be compatible past node 0.6.x. To my knowledge, it also does full text indexing in the manner of
Kue (LearnBoost).

3. Convoy: Great work by GoSquared to prevent jammed tasks. Currently does not offer storing additional data (a necessity
for many).

4. Coffee-Resque: a great start in porting Github's own resque, however, the project appears to be not nearly as
fully-featured.

