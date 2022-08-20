import fp from "fastify-plugin";
import { mongoDbUrl } from "../config";
import mongodb from "@fastify/mongodb";

// Reference: https://github.com/fastify/fastify-mongodb
export default fp(async (fastify) => {
  fastify.register(mongodb, {
    // force to close the mongodb connection when app stopped
    // the default value is false
    forceClose: true,
    url: mongoDbUrl,
  });
});
