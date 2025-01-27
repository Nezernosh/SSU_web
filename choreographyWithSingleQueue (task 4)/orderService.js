import express, { json } from "express";
import { connect } from "amqplib";

const app = express();
const PORT = 3001;
app.use(json());

const RABBITMQ_URL = "amqp://localhost";
let channel;

async function connectQueue() {
  const connection = await connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  // обмен типа fanout для рассылки событий
  await channel.assertExchange("events", "fanout", { durable: true });
  console.log("Connected to RabbitMQ in Order Service");
}

app.post("/order", async (req, res) => {
  const { orderId, items } = req.body;

  // формирование события
  const orderEvent = {
    type: "OrderCreated",
    data: { orderId, items },
  };

  // и публикация
  channel.publish("events", "", Buffer.from(JSON.stringify(orderEvent)));
  console.log("OrderCreated event published:", orderEvent);

  res.status(201).send("Order placed successfully!");
});

app.listen(PORT, async () => {
  console.log(`Order Service running on port ${PORT}`);
  await connectQueue();
});
