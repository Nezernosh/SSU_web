import express, { json } from "express";
import { connect } from "amqplib";
const app = express();
const PORT = 3003;
app.use(json());

const RABBITMQ_URL = "amqp://localhost";
let channel, connection;

async function connectQueue() {
  try {
    connection = await connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue("inventoryQueue");

    channel.consume("inventoryQueue", (msg) => {
      const inventory = JSON.parse(msg.content.toString());
      console.log(`Inventory confirmed: ${JSON.stringify(inventory)}`);

      const paymentMessage = {
        orderId: inventory.orderId,
        status: "payment completed",
      };
      console.log(`Payment processed: ${JSON.stringify(paymentMessage)}`);
      channel.ack(msg);
    });
  } catch (error) {
    console.error("Failed to connect to RabbitMQ", error);
  }
}
connectQueue();

app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));
