import { FastifyPluginAsync } from "fastify";

const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/user/:id", async function (req: any, reply) {
    const mongo = fastify.mongo;
    const users = mongo.db?.collection("users");

    // if the id is an ObjectId format, you need to create a new ObjectId
    const id = new mongo.ObjectId(req.params.id);
    try {
      const user = await users?.findOne({ _id: id });
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

  fastify.put("/user", async function (req: any, reply) {
    const mongo = fastify.mongo;
    const users = mongo.db?.collection("users");

    const newUser = req.body;
    newUser._id = undefined;

    try {
      const result = await users?.insertOne(newUser);
      return result;
    } catch (err) {
      reply.status(500);
      return err;
    }
  });
};

export default user;
