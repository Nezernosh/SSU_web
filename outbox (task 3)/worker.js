const amqp = require("amqplib");
const { Client } = require("pg");

const client = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1337228",
  database: "order_service_db",
});

const RABBITMQ_URL = "amqp://localhost";
const QUEUE_NAME = "orderQueue";

let connection;
let channel;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initializeRabbitMQ = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME);
    console.log("RabbitMQ connection established");
  } catch (err) {
    console.error("Failed to connect to RabbitMQ:", err);
    process.exit(1);
  }
};

const processOutbox = async () => {
  try {
    const events = await client.query(
      "SELECT * FROM outbox WHERE status = 'PENDING'"
    );

    for (const event of events.rows) {
      const published = channel.sendToQueue(
        QUEUE_NAME,
        Buffer.from(JSON.stringify(event.payload))
      );

      if (published) {
        await client.query(
          "UPDATE outbox SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1",
          [event.id]
        );
      }
      await delay(1000); // задержка в одну секунду для демо целей
    }
  } catch (err) {
    console.error("Error processing outbox:", err);
  } finally {
    setTimeout(processOutbox, 5000);
  }
};

(async () => {
  await client.connect();
  await initializeRabbitMQ();
  processOutbox();

  process.on("SIGINT", async () => {
    console.log("Closing connections...");
    await client.end();
    await channel.close();
    await connection.close();
    process.exit(0);
  });
})();
