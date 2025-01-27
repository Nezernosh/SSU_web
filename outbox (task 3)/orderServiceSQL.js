const express = require("express");
const bodyParser = require("body-parser");
const { Client } = require("pg");

const app = express();
app.use(bodyParser.json());

const client = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1337228",
  database: "order_service_db",
});

client
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Database connection error", err));

app.post("/order", async (req, res) => {
  const { orderId, items } = req.body;

  const orderQuery = `
        INSERT INTO orders (order_id, items)
        VALUES ($1, $2)
    `;

  const outboxQuery = `
        INSERT INTO outbox (event_type, payload)
        VALUES ($1, $2)
    `;

  try {
    await client.query("BEGIN");

    await client.query(orderQuery, [orderId, JSON.stringify(items)]);

    const event = {
      orderId,
      items,
      status: "ORDER_CREATED",
    };
    await client.query(outboxQuery, ["OrderCreated", JSON.stringify(event)]);

    await client.query("COMMIT");
    res.status(201).json({ message: "Order created successfully!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating order:", err);
    res.status(500).json({ error: "Could not create order" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Order Service is running on http://localhost:${PORT}`);
});
