import express, { json } from "express";
import { connect } from "amqplib";
const app = express();
const PORT = 3001;
app.use(json());

const RABBITMQ_URL = "amqp://localhost";
let channel, connection;

async function connectQueue() {
  try {
    connection = await connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue("orderQueue");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ", error);
  }
}
connectQueue();

app.post("/order", async (req, res) => {
  const { orderId, items } = req.body;
  const orderMessage = { orderId, items, status: "created" };

  channel.sendToQueue("orderQueue", Buffer.from(JSON.stringify(orderMessage)));
  console.log(`Order sent to queue: ${JSON.stringify(orderMessage)}`);
  res.status(200).send("Order placed successfully!");
});

app.listen(PORT, () => console.log(`Order Service running on port ${PORT}`));
