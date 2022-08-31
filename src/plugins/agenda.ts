import fp from "fastify-plugin";
import { mongoDbUrl } from "../config";
import { Agenda, Job } from "@hokify/agenda";

// Add the agenda decorator to the type
declare module "fastify" {
  interface FastifyInstance {
    agenda: Agenda;
  }
}

type ScrapeOptions = {
  url: string;
};

export default fp(async (fastify, options) => {
  // Reference: https://github.com/agenda/agenda#example-usage
  const agenda = new Agenda({
    db: { address: mongoDbUrl, collection: "agendaJobs" },
    processEvery: "5 seconds", // Frequency checking database for jobs to run
    maxConcurrency: 20, //Max number of jobs running at any given moment
    defaultConcurrency: 5, // Duplicates of a single job running at a specific moment
  });

  // TODO: save the results to the database: https://github.com/hokify/agenda/issues/29

  // TODO: probably better to automatically define these from the jobs/ folder
  agenda.define("test", async (job: Job<any>) => {
    console.log("test job handler executed!");
    const data = job.attrs.data;
    const jobId = job.attrs._id;
    console.log(`id: ${jobId}, data: ${data}`);
  });

  agenda.define("scrape-url", async (job: Job<ScrapeOptions>) => {
    console.log("scrape-url job handler executed!");
    const { url } = job.attrs.data;
    const jobId = job.attrs._id;
    console.log(`TODO: scrape ${url} (job id: ${jobId})`)
  });

  await agenda.start();
  console.log("agenda started!");

  const gracefulExit = async () => {
    try {
      await agenda.stop();
    } catch (err) {
      throw new Error(`Error stopping agenda: ${err}`);
    }
  };

  // watch for graceful shutdowns so that currently running / grabbed jobs are abandoned and can be re-grabbed later again.
  process.on("SIGTERM", gracefulExit);
  process.on("SIGINT", gracefulExit);

  // Add a hook to clean up agenda (unclear if the other hooks are needed)
  fastify.addHook("onClose", gracefulExit);

  // Add the agenda instance to fastify
  fastify.decorate("agenda", agenda);
});
