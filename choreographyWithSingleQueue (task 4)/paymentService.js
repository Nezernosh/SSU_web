import { connect } from "amqplib";

const RABBITMQ_URL = "amqp://localhost";

let channel;

async function connectQueue() {
  const connection = await connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  await channel.assertExchange("events", "fanout", { durable: true });

  const { queue } = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(queue, "events", "");

  console.log("Connected to RabbitMQ in Payment Service");

  channel.consume(queue, async (msg) => {
    const event = JSON.parse(msg.content.toString());
    console.log("Event received in Payment Service:", event);

    if (event.type === "InventoryConfirmed") {
      const { orderId } = event.data;

      // имитация обработки платежа
      console.log(`Processing payment for order: ${orderId}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const paymentEvent = {
        type: "PaymentProcessed",
        data: { orderId },
      };

      console.log("Payment processed:", paymentEvent);
    }

    channel.ack(msg);
  });
}

connectQueue();
