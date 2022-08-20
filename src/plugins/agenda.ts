import fp from "fastify-plugin";
import { mongoDbUrl } from "../config";
import { Agenda, Job } from "agenda";

// Add the agenda decorator to the type
declare module "fastify" {
  interface FastifyInstance {
    agenda: Agenda;
  }
}

export default fp(async (fastify, options) => {
  // Reference: https://github.com/agenda/agenda#example-usage
  const agenda = new Agenda({
    db: { address: mongoDbUrl, collection: "agendaJobs" },
    processEvery: "5 seconds", // Frequency checking database for jobs to run
    maxConcurrency: 20, //Max number of jobs running at any given moment
    defaultConcurrency: 5, // Duplicates of a single job running at a specific moment
  });

  // TODO: probably better to automatically define these from the jobs/ folder
  agenda.define("test", { shouldSaveResult: true }, async (job: Job) => {
    console.log("test job handler executed!");
    const data = job.attrs.data;
    void data;
    // This should be persisted in the database
    return { data: "Hello world!", date: Date.now() };
  });

  agenda.define("scrape-url", { shouldSaveResult: true }, async (job: any) => {
    console.log("scrape-url job handler executed!");
    const { url } = job.attrs.data;
    void url;
    // blah
    return { data: "oh nein" };
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
