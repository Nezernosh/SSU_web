import { connect } from "amqplib";

const RABBITMQ_URL = "amqp://localhost";

let channel;

async function connectQueue() {
  const connection = await connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  await channel.assertExchange("events", "fanout", { durable: true });

  // временная очередь для получения событий
  const { queue } = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(queue, "events", "");

  console.log("Connected to RabbitMQ in Inventory Service");

  channel.consume(queue, async (msg) => {
    const event = JSON.parse(msg.content.toString());
    console.log("Event received in Inventory Service:", event);

    if (event.type === "OrderCreated") {
      const { orderId } = event.data;

      // имитация резерва товара на складе
      console.log(`Reserving inventory for order: ${orderId}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const inventoryEvent = {
        type: "InventoryConfirmed",
        data: { orderId },
      };

      channel.publish(
        "events",
        "",
        Buffer.from(JSON.stringify(inventoryEvent))
      );
      console.log("InventoryConfirmed event published:", inventoryEvent);
    }

    // подтверждаем обработку сообщения
    channel.ack(msg);
  });
}

connectQueue();
