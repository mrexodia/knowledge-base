"use strict";

const mongoDbUrl = "mongodb://127.0.0.1:27017/app";

/**
 * Function that handles routing
 * @param {import("fastify").FastifyInstance} fastify
 * @param {import("fastify").FastifyServerOptions} options
 */
async function routes(fastify, options) {
  const Agenda = require("agenda");
  // Reference: https://github.com/agenda/agenda#example-usage
  const agenda = new Agenda({
    db: { address: mongoDbUrl, collection: "agendaJobs" },
    processEvery: "5 seconds", // Frequency checking database for jobs to run
    maxConcurrency: 20, //Max number of jobs running at any given moment
    defaultConcurrency: 5, // Duplicates of a single job running at a specific moment
  });

  agenda.define("test", { shouldSaveResult: true }, async (job) => {
    console.log("Test job handler executed!");
    const data = job.attrs.data;
    // This should be persisted in the database
    return { data: "Hello world!", date: Date.now(), post_data: data };
  });

  // TODO: graceful shutdown on SIGTERM etc https://github.com/agenda/agenda/issues/749

  await agenda.start();
  console.log("agenda.start returned!");

  // Reference: https://github.com/fastify/fastify-mongodb
  fastify.register(require("@fastify/mongodb"), {
    // force to close the mongodb connection when app stopped
    // the default value is false
    forceClose: true,
    url: mongoDbUrl,
  });

  fastify.post("/jobs/test", async function (req, reply) {
    const data = req.body;
    const job = await agenda.schedule("in 15 seconds", "test", data);
    return job;
  });

  fastify.get("/user/:id", async function (req, reply) {
    const users = this.mongo.db.collection("users");

    // if the id is an ObjectId format, you need to create a new ObjectId
    const id = this.mongo.ObjectId(req.params.id);
    try {
      const user = await users.findOne({ _id: id });
      if (user === null) {
        reply.status(404);
      } else {
        return user;
      }
    } catch (err) {
      reply.status(500);
      return err;
    }
  });

  fastify.put("/user", async function (req, reply) {
    const users = this.mongo.db.collection("users");

    const newUser = req.body;
    newUser._id = undefined;

    try {
      const result = await users.insertOne(newUser);
      return result;
    } catch (error) {
      reply.status(500);
      return err;
    }
  });
}

module.exports = routes;
