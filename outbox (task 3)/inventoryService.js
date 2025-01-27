import express, { json } from "express";
import { connect } from "amqplib";
const app = express();
const PORT = 3002;
app.use(json());

const RABBITMQ_URL = "amqp://localhost";
let channel, connection;

async function connectQueue() {
  try {
    connection = await connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue("orderQueue");
    await channel.assertQueue("inventoryQueue");

    channel.consume("orderQueue", (msg) => {
      const order = JSON.parse(msg.content.toString());
      console.log(`Order received: ${JSON.stringify(order)}`);

      const inventoryMessage = {
        orderId: order.orderId,
        status: "inventory confirmed",
      };
      channel.sendToQueue(
        "inventoryQueue",
        Buffer.from(JSON.stringify(inventoryMessage))
      );
      channel.ack(msg);
    });
  } catch (error) {
    console.error("Failed to connect to RabbitMQ", error);
  }
}
connectQueue();

app.listen(PORT, () =>
  console.log(`Inventory Service running on port ${PORT}`)
);
