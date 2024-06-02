const express = require('express');
const pool = require('../db');
const { getAuth } = require('firebase/auth');

const moment = require('moment');

const router = express.Router();
const admin = require('firebase-admin');

// Sanitize input data
const sanitizeInput = (input) => {
    return input.replace(/[^a-zA-Z0-9\s]/g, '');
  };

 //get reports of lost and found items
 router.get('/items', async (req, res) => {
    const { startDate, endDate } = req.query;

    // Validate date format
    if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).send('Invalid date format. Please use YYYY-MM-DD.');
    }

    // Validate date order
    if (moment(startDate).isAfter(moment(endDate))) {
        return res.status(400).send('Start date must be before or the same as end date.');
    }

    try {
        // Querying the database to get the lost and found items between the start and end date
        const [resultObjectsLost, resultObjectsFound] = await Promise.all([
            pool.query('SELECT * FROM objetoperdido WHERE data_perdido BETWEEN $1 AND $2', [startDate, endDate]),
            pool.query('SELECT * FROM objetoachado WHERE data_achado BETWEEN $1 AND $2', [startDate, endDate])
        ]);

        // Check if the results are not empty and send them as a response
        if (resultObjectsLost.rows.length === 0 && resultObjectsFound.rows.length === 0) {
            return res.status(404).send('No items found for the given date range.');
        }

        //map objects para ver se foram encontrados
        // Create an empty array to store matched lost and found items
        let lost_and_found_items = [];

        //create variable to store number of found items
        let foundItems = 0;

        // Iterate over each lost item
        resultObjectsLost.rows.forEach(lostItem => {
            const foundMatch = resultObjectsFound.rows.find(foundItem => 
                lostItem.descricao_curta.toLowerCase() === foundItem.descricao_curta.toLowerCase() && 
                lostItem.categoria.toLowerCase() === foundItem.categoria.toLowerCase() &&
                lostItem.localizacao_perdido.latitude === foundItem.localizacao_achado.latitude &&
                lostItem.localizacao_perdido.longitude === foundItem.localizacao_achado.longitude
            );
             // If a match is found, push the combined information to the lost_and_found_items array
        if (foundMatch) {
            lost_and_found_items.push({
                ...lostItem,
                encontrado: true,
                foundItem: foundMatch // Save the entire found item object, or just the relevant info
            });
            //increment the foundItems variable
            foundItems++;
        } else {
            // If no match is found, still include the lost item, but indicate it hasn't been found
            lost_and_found_items.push({
                ...lostItem,
                encontrado: false,
                foundItem: null
            });
        }
        });

        // Compute statistics
        let totalLost = resultObjectsLost.rows.length;
        let totalFound = foundItems;
        let lostToFoundRatio = totalFound > 0 ? (totalLost / totalFound) : 0; // Avoid division by zero. condition ? value_if_true : value_if_false

        // Calculate average time to find an item
        let totalDays = 0;
        let countFoundItems = 0;

        lost_and_found_items.forEach(item => {
            if (item.encontrado) {
                let lostDate = new Date(item.data_perdido);
                let foundDate = new Date(item.foundItem.data_achado);
                totalDays += (foundDate - lostDate) / (1000 * 60 * 60 * 24); // Convert milliseconds to days
                countFoundItems++;
            }
        });

        let averageTimeToFind = countFoundItems > 0 ? (totalDays / countFoundItems) : 0;

        // Response with stats
        res.json({
            lost_and_found_items,
            stats: {
                totalLost,
                totalFound,
                lostToFoundRatio: lostToFoundRatio.toFixed(2),
                averageTimeToFind: averageTimeToFind.toFixed(2) + ' days' // Rounded to two decimal places
            }
        });
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).send('Internal server error while retrieving data.');
    }
});

router.get('/auctions', async (req, res) => {
    const { startDate, endDate } = req.query;

    // Validate date format
    if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).send('Invalid date format. Please use YYYY-MM-DD.');
    }

    // Validate date order
    if (moment(startDate).isAfter(moment(endDate))) {
        return res.status(400).send('Start date must be before or the same as end date.');
    }

    try {
        const result = await pool.query(`
            SELECT 
                l.id AS auction_id, 
                COUNT(lic.id) AS total_bids, 
                MAX(lic.valor_licitacao) AS highest_bid, 
                AVG(lic.valor_licitacao) AS average_bid
            FROM 
                leilao l
            LEFT JOIN licitacao lic ON l.id = lic.leilao_id
            WHERE 
                l.data_inicio BETWEEN $1 AND $2
            AND 
                l.ativo = TRUE
            GROUP BY 
                l.id
        `, [startDate, endDate]);

        // Check if there are results
        if (result.rows.length === 0) {
            // No auctions found within the date range
            return res.status(404).json({ message: 'No auctions found for the given date range.' });
        }

        // Send the successful response with the result
        return res.status(200).json(result.rows);
    } catch (error) {
        // Log the error and send an internal server error response
        console.error('Database query error:', error);
        return res.status(500).send('Internal server error while retrieving data.');
    }
});

// Get user activity report
router.get('/user-activity/:userId', async (req, res) => {
    const sanitizedUserId = sanitizeInput(req.params.userId);
    try {
        // Check if user exists in the database
        const userExistResult = await pool.query(`
            SELECT COUNT(*) AS "userExists"
            FROM utilizador
            WHERE firebase_uid = $1 AND ativo = TRUE
            `, [sanitizedUserId]);

        if (parseInt(userExistResult.rows[0].userExists) === 0) {
            return res.status(404).send('User not found or inactive.');
        }

        // Query to count total lost items by user
        const lostItemsResult = await pool.query(`
            SELECT COUNT(*) AS "totalItemsLost"
            FROM objetoperdido
            WHERE utilizador_id = $1 AND ativo = TRUE
            `, [sanitizedUserId]);

        const totalItemsLost = lostItemsResult.rows[0].totalItemsLost;

        // Query to count auctions participated by the user
        const auctionsParticipatedResult = await pool.query(`
            SELECT COUNT(DISTINCT leilao_id) AS "auctionsParticipated"
            FROM licitacao
            WHERE utilizador_id = $1
            `, [sanitizedUserId]);

        const auctionsParticipated = auctionsParticipatedResult.rows[0].auctionsParticipated;

        // Query to get details of lost items
        const lostItemsDetailsResult = await pool.query(`
            SELECT id, titulo, descricao, data_perda, localizacao
            FROM objetoperdido
            WHERE utilizador_id = $1 AND ativo = TRUE
            `, [sanitizedUserId]);

        const lostItemsDetails = lostItemsDetailsResult.rows;

        // Query to get details of auctions participated
        const auctionsDetailsResult = await pool.query(`
            SELECT leilao.id, leilao.titulo, leilao.descricao, leilao.data_inicio, leilao.data_fim, leilao.valor_base, leilao.localizacao
            FROM leilao
            JOIN licitacao ON leilao.id = licitacao.leilao_id
            WHERE licitacao.utilizador_id = $1
            GROUP BY leilao.id
            `, [sanitizedUserId]);

        const auctionsDetails = auctionsDetailsResult.rows;

        // Prepare the response object
        const response = {
            totalItemsLost: parseInt(totalItemsLost),
            lostItemsDetails,
            auctionsParticipated: parseInt(auctionsParticipated),
            auctionsDetails
        };

        // Send the successful response with the result
        res.status(200).json(response);

    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).send('Internal server error');
    }
});

// Define the GET endpoint to retrieve found objects by a police officer
router.get('/reports/found-objects/:firebaseUid', policeAuthMiddleware, async (req, res) => {
    const firebaseUid = sanitizeInput(req.params.firebaseUid);
  
    if (!firebaseUid) {
      return res.status(400).json({ error: 'Invalid firebaseUid. It must be a valid string.' });
    }
  
    try {
      // Check if the user exists in the Utilizador table and is active
      const userCheckQuery = 'SELECT 1 FROM Utilizador WHERE firebase_uid = $1 AND ativo = TRUE';
      const userCheckResult = await pool.query(userCheckQuery, [firebaseUid]);
  
      if (userCheckResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found or inactive.' });
      }
  
      // Check if the police member exists in the MembroPolicia table
      const checkQuery = 'SELECT id FROM MembroPolicia WHERE utilizador_id = (SELECT id FROM Utilizador WHERE firebase_uid = $1)';
      const checkResult = await pool.query(checkQuery, [firebaseUid]);
  
      if (checkResult.rowCount === 0) {
        return res.status(404).json({ error: 'Police member not found.' });
      }
  
      const policialId = checkResult.rows[0].id;
  
      // Retrieve the found objects by the police officer
      const foundObjectsQuery = `
        SELECT id, localizacao_achado, data_limite, ativo, valor_monetario, policial_id, data_achado, titulo, descricao_curta, descricao, categoria, imageurl
        FROM ObjetoAchado
        WHERE policial_id = $1
      `;
      const foundObjectsResult = await pool.query(foundObjectsQuery, [policialId]);
  
      // Return the found objects
      res.status(200).json(foundObjectsResult.rows);
  
    } catch (error) {
      console.error('Error retrieving found objects:', error);
      res.status(500).json({ error: 'Server error while retrieving found objects.' });
    }
  });

// Define the GET endpoint to retrieve average statistics of lost and found objects per month
router.get('/reports/statistics', policeAuthMiddleware, async (req, res) => {
    try {
      // Average objects lost per month
      const averageLostPerMonthQuery = `
        SELECT COUNT(*)::float / EXTRACT(MONTH FROM AGE(MIN(data_perdido), CURRENT_DATE)) AS average_lost
        FROM ObjetoPerdido
      `;
      const averageLostPerMonthResult = await pool.query(averageLostPerMonthQuery);
  
      // Average objects found per month
      const averageFoundPerMonthQuery = `
        SELECT COUNT(*)::float / EXTRACT(MONTH FROM AGE(MIN(data_achado), CURRENT_DATE)) AS average_found
        FROM ObjetoAchado
      `;
      const averageFoundPerMonthResult = await pool.query(averageFoundPerMonthQuery);
  
      const response = {
        averageObjectsLostPerMonth: parseFloat(averageLostPerMonthResult.rows[0].average_lost).toFixed(2),
        averageObjectsFoundPerMonth: parseFloat(averageFoundPerMonthResult.rows[0].average_found).toFixed(2),
      };
  
      res.status(200).json(response);
    } catch (error) {
      console.error('Error retrieving statistics:', error);
      res.status(500).json({ error: 'Server error while retrieving statistics.' });
    }
  });
  

module.exports = router;