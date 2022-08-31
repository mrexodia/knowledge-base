import { FastifyPluginAsync } from "fastify";

const jobs: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post("/jobs/test", async function (req, reply) {
    const data = req.body;
    const job = await fastify.agenda.schedule("in 15 seconds", "test", data);
    return job.toJson();
  });
  fastify.post("/jobs/scrape-url", async function (req, reply) {
    const data = req.body;
    const job = await fastify.agenda.schedule(
      "in 1 second",
      "scrape-url",
      data
    );
    return job.toJson();
  });
};

export default jobs;
