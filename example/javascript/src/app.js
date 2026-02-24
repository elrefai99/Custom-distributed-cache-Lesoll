import express from "express";
import morgan from "morgan";
import { elrefaiNode } from "../../../dist/src/main.js";

const app = express();

app.use(morgan("dev"));

app.get("/", async (req, res) => {
     const node = new elrefaiNode({
          host: "localhost",
          port: 30000,
     });
     await node.set("key", "valuessssss");
     const value = await node.get("key");
     console.log(value);

     res.send(value);
});

app.listen(3000, () => {
     console.log("Server is running on port 3000");
});
