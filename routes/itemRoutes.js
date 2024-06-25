const express = require("express");
const pool = require("../db");
const router = express.Router();
const admin = require("firebase-admin");

const firebaseAuth = require("../middlewares/firebaseAuthMiddleware");
const jwtCheck = require("../middlewares/jwtCheckMiddleware");
const doubleAuthMiddleware = require("../middlewares/doubleAuthMiddleware");
const policeAuthMiddleware = require("../middlewares/policeAuth");

const isAuthenticated = async (req, res, next) => {
  try {
    const { authorization } = req.headers;

    if (authorization && authorization.startsWith("Bearer ")) {
      const idToken = authorization.split("Bearer ")[1];
      console.log("Verifying ID token...");
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log("ID token is valid:", decodedToken);
      req.userId = decodedToken.uid;
      return next();
    }

    console.log("No authorization token was found");
    res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Sanitize input data
const sanitizeInput = (input) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, "");
};

//Get all lost items
router.get("/lost", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM ObjetoPerdido where ativo = true");
    res.json(rows);
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/lost/search", async (req, res) => {
  const { title, description, category } = req.query;

  console.log("Search parameters:", { title, description, category });
  if (!title && !description && !category) {
    console.log("At least one of the following parameters is required: title, description, category");
    return res.status(400).json({ error: "At least one of the following parameters is required: title, description, category" });
  }

  // Sanitize inputs
  const sanitizedTitle = title ? sanitizeInput(title) : null;
  const sanitizedDescription = description ? sanitizeInput(description) : null;
  const sanitizedCategory = category ? sanitizeInput(category) : null;

  // Build the query dynamically
  let query = "SELECT * FROM ObjetoPerdido WHERE ativo = TRUE";
  const queryParams = [];
  let paramIndex = 1;

  if (sanitizedTitle) {
    query += ` AND titulo ILIKE $${paramIndex++}`;
    queryParams.push(`%${sanitizedTitle}%`);
  }
  
  if (sanitizedDescription) {
    query += ` AND descricao ILIKE $${paramIndex++}`;
    queryParams.push(`%${sanitizedDescription}%`);
  }
  
  if (sanitizedCategory) {
    query += ` AND categoria ILIKE $${paramIndex++}`;
    queryParams.push(`%${sanitizedCategory}%`);
  }

  try {
    const result = await pool.query(query, queryParams);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error searching lost items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to search found objects corresponding to lost objects
router.get("/found/search", policeAuthMiddleware,doubleAuthMiddleware, async (req, res) => {
  const { title, description, category } = req.query;

  console.log("Search parameters:", { title, description, category });
  if (!title && !description && !category) {
    console.log("At least one of the following parameters is required: title, description, category");
    return res.status(400).json({ error: "At least one of the following parameters is required: title, description, category" });
  }

  // Sanitize inputs
  const sanitizedTitle = title ? sanitizeInput(title) : null;
  const sanitizedDescription = description ? sanitizeInput(description) : null;
  const sanitizedCategory = category ? sanitizeInput(category) : null;

  // Build the query dynamically
  let query = "SELECT * FROM ObjetoAchado WHERE ativo = TRUE";
  const queryParams = [];
  let paramIndex = 1;

  if (sanitizedTitle) {
    query += ` AND titulo ILIKE $${paramIndex++}`;
    queryParams.push(`%${sanitizedTitle}%`);
  }
  
  if (sanitizedDescription) {
    query += ` AND descricao_curta ILIKE $${paramIndex++}`;
    queryParams.push(`%${sanitizedDescription}%`);
  }
  
  if (sanitizedCategory) {
    query += ` AND categoria ILIKE $${paramIndex++}`;
    queryParams.push(`%${sanitizedCategory}%`);
  }

  try {
    const result = await pool.query(query, queryParams);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error searching found items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


//Get specific lost item
router.get("/lost/:itemId", async (req, res) => {
  const { itemId } = req.params;

  // Input validation
  if (isNaN(parseInt(itemId))) {
    console.log("Invalid Item ID!");
    return res.status(400).json({ error: "Invalid Item ID!" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM ObjetoPerdido WHERE ID = $1",
      [itemId]
    );

    if (result.rowCount === 0) {
      console.log("Lost item not found");
      return res.status(404).json({ error: "Item not found" });
    }

    console.log("Lost item details:", result.rows[0]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching lost item details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//Get especific lost item
router.get("/lost/:itemId", async (req, res) => {
  const { itemId } = req.params;

  // Input validation
  if (isNaN(parseInt(itemId))) {
    console.log("Invalid Item ID!");
    return res.status(400).json({ error: "Invalid Item ID!" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM ObjetoPerdido WHERE ID = $1",
      [itemId]
    );

    console.log("Lost item details:", result);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching lost item details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lost", isAuthenticated, doubleAuthMiddleware, async (req, res) => {
  const { titulo, descricao_curta, descricao, categoria, data_perdido, localizacao_perdido } = req.body;
  const userId =   req.userId;
  const ativo = true;
  
  // Input validation and sanitization
  if (!titulo || !descricao_curta || !descricao || !categoria || !data_perdido || !localizacao_perdido) {
    console.log("Invalid input data");
    return res.status(400).json({ error: "Invalid input data" });
  }

  const sanitizedTitulo = sanitizeInput(titulo);
  const sanitizedDescricaoCurta = sanitizeInput(descricao_curta);
  const sanitizedDescricao = sanitizeInput(descricao);
  const sanitizedCategoria = sanitizeInput(categoria);
  const sanitizedLocalizacao = {
    latitude: sanitizeInput(localizacao_perdido.latitude.toString()),
    longitude: sanitizeInput(localizacao_perdido.longitude.toString()),
  };

  try {
    const result = await pool.query(
      "INSERT INTO ObjetoPerdido (titulo, descricao_curta, descricao, categoria, data_perdido, localizacao_perdido, ativo, utilizador_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ID",
      [
        sanitizedTitulo,
        sanitizedDescricaoCurta,
        sanitizedDescricao,
        sanitizedCategoria,
        data_perdido,
        JSON.stringify(sanitizedLocalizacao),
        ativo,
        userId,
      ]
    );
    const itemId = result.rows[0].id;
    console.log("Lost item registered successfully with ID:", itemId);
    res.status(201).json({ message: "Lost item registered successfully", itemId });
  } catch (error) {
    console.error("Error registering lost item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Edit details of a lost item (RF-06)
router.put("/lost/:itemId", isAuthenticated, doubleAuthMiddleware, async (req, res) => {
  const { itemId } = req.params;
  const { titulo, descricao_curta, descricao, categoria, data_perdido, localizacao_perdido, ativo } = req.body;
  const userId = req.userId;

  // Input validation and sanitization
  if (isNaN(parseInt(itemId))) {
    console.log("Invalid Item ID!");
    return res.status(400).json({ error: "Invalid Item ID!" });
  }

  const sanitizedTitulo = sanitizeInput(titulo);
  const sanitizedDescricaoCurta = sanitizeInput(descricao_curta);
  const sanitizedDescricao = sanitizeInput(descricao);
  const sanitizedCategoria = sanitizeInput(categoria);
  const sanitizedLocalizacao = {
    latitude: sanitizeInput(localizacao_perdido.latitude.toString()),
    longitude: sanitizeInput(localizacao_perdido.longitude.toString()),
  };

  try {
    const result = await pool.query(
      "UPDATE ObjetoPerdido SET titulo = $1, descricao_curta = $2, descricao = $3, categoria = $4, data_perdido = $5, localizacao_perdido = $6, ativo = $7 WHERE ID = $8 AND utilizador_id = $9",
      [
        sanitizedTitulo,
        sanitizedDescricaoCurta,
        sanitizedDescricao,
        sanitizedCategoria,
        data_perdido,
        sanitizedLocalizacao,
        ativo,
        itemId,
        userId,
      ]
    );

    if (result.rowCount === 0) {
      console.log("Lost item not found or not authorized");
      res.status(404).json({ error: "Item not found or not authorized" });
    } else {
      console.log("Lost item details updated successfully");
      res.status(200).json({ message: "Lost item details updated" });
    }
  } catch (error) {
    console.error("Error updating lost item details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove a lost item (RF-06)
router.delete("/lost/:itemId", isAuthenticated,doubleAuthMiddleware, async (req, res) => {
  const { itemId } = req.params;
  const userId = req.userId;

  // Input validation
  if (isNaN(parseInt(itemId))) {
    console.log("Invalid Item ID!");
    return res.status(400).json({ error: "Invalid Item ID!" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM ObjetoPerdido WHERE ID = $1 AND utilizador_id = $2",
      [itemId, userId]
    );

    if (result.rowCount === 0) {
      console.log("Lost item not found or not authorized");
      res.status(404).json({ error: "Item not found or not authorized" });
    } else {
      console.log("Lost item removed successfully");
      res.status(204).end();
    }
  } catch (error) {
    console.error("Error removing lost item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Search lost items by category (RF-11)
router.get("/lost/category", doubleAuthMiddleware, async (req, res) => {
  const { category } = req.query;

  // Input validation and sanitization
  if (!category) {
    console.log("Category parameter is required");
    return res.status(400).json({ error: "Category parameter is required" });
  }

  const sanitizedCategory = sanitizeInput(category);

  try {
    const result = await pool.query(
      "SELECT * FROM ObjetoPerdido WHERE categoria ILIKE $1",
      [`%${sanitizedCategory}%`]
    );
    console.log("Lost items search result:", result.rows);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error searching lost items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Compare a lost item with a found item (RF-13)
router.get(
  "/compare/:lostItemId/:foundItemId",
  doubleAuthMiddleware,
  async (req, res) => {
    const { lostItemId, foundItemId } = req.params;
   

    // Validate item IDs
    if (isNaN(parseInt(lostItemId)) || isNaN(parseInt(foundItemId))) {
      console.log("Invalid Item ID!s");
      return res.status(400).json({ error: "Invalid Item ID!s" });
    }

    // TODO: Check if the user is authorized (e.g., police officer)

    try {
      const lostItemResult = await pool.query(
        "SELECT * FROM ObjetoPerdido WHERE ID = $1",
        [lostItemId]
      );
      const foundItemResult = await pool.query(
        "SELECT * FROM ObjetoAchado WHERE ID = $1",
        [foundItemId]
      );

      if (lostItemResult.rowCount === 0 || foundItemResult.rowCount === 0) {
        console.log("Lost or found item not found or not authorized");
        res.status(400).json({ error: "Item not found or not authorized" });
      } else {
        const lostItem = lostItemResult.rows[0];
        const foundItem = foundItemResult.rows[0];

        const similarities = [];
        const differences = [];

        // Compare properties and populate similarities and differences arrays
        if (lostItem.descricao === foundItem.descricao) {
          similarities.push("descricao");
        } else {
          differences.push("descricao");
        }

        if (lostItem.categoria === foundItem.categoria) {
          similarities.push("categoria");
        } else {
          differences.push("categoria");
        }

        // Compare other properties as needed

        console.log("Comparison result:", { similarities, differences });
        res.status(200).json({ similarities, differences });
      }
    } catch (error) {
      console.error("Error comparing items:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET ALL FOUND ITEMS
router.get("/found", doubleAuthMiddleware,policeAuthMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM ObjetoAchado");
    res.json(rows);
  } catch (error) {
    console.error("Error executing query", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
//GET ESPECIFIC FOUND ITEM
router.get("/found/:itemId",doubleAuthMiddleware,policeAuthMiddleware, async (req, res) => {
  const { itemId } = req.params;

  // Input validation
  if (isNaN(parseInt(itemId))) {
    console.log("Invalid Item ID!");
    return res.status(400).json({ error: "Invalid Item ID!" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM ObjetoAchado WHERE ID = $1",
      [itemId]
    );
    if (result.rowCount === 0) {
      console.log("Found item not found");
      return res.status(404).json({ error: "Item not found" });
    } else {
      return res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error("Error fetching found item details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Register delivery of a found item to its owner (RF-16)
router.post("/found/:itemId/deliver", isAuthenticated,doubleAuthMiddleware, async (req, res) => {
  const { itemId } = req.params;
  const { ownerId, deliveryDate } = req.body;
  const userId = req.userId;

  // Input validation
  if (isNaN(parseInt(itemId)) || isNaN(parseInt(ownerId))) {
    console.log("Invalid item or owner ID");
    return res.status(400).json({ error: "Invalid item or owner ID" });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Validate that the current user is a police officer and authorized to register the delivery
      const userResult = await client.query(
        "SELECT * FROM MembroPolicia WHERE ID = $1",
        [userId]
      );
      if (userResult.rowCount === 0) {
        console.log("User is not authorized to register the delivery");
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const result = await client.query(
        "UPDATE ObjetoAchado SET utilizador_id = $1, data_entrega = $2, ativo = false WHERE ID = $3",
        [ownerId, deliveryDate, itemId]
      );

      if (result.rowCount === 0) {
        console.log("Found item not found");
        res.status(404).json({ error: "Item not found" });
      } else {
        await client.query("COMMIT");
        console.log("Found item delivery registered successfully");
        res.status(200).json({ message: "Found item delivery registered" });
      }
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error registering found item delivery:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});





module.exports = router;
