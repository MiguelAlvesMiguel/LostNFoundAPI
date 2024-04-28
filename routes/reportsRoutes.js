const express = require('express');
const pool = require('../db');
const { getAuth } = require('firebase/auth');

const router = express.Router();
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(require('../adminKey.json')),
  });


 //get reports of lost and found items
 router.get('/reports/items', async (req, res) => {
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
            pool.query('SELECT * FROM objetorecuperado WHERE data_achado BETWEEN $1 AND $2', [startDate, endDate])
        ]);

        // Check if the results are not empty and send them as a response
        if (resultObjectsLost.rows.length === 0 && resultObjectsFound.rows.length === 0) {
            return res.status(404).send('No items found for the given date range.');
        }

        //map objects para ver se foram encontrados
        // Create an empty array to store matched lost and found items
        let lost_and_found_items = [];

        // Iterate over each lost item
        resultObjectsLost.rows.forEach(lostItem => {
            const foundMatch = resultObjectsFound.rows.find(foundItem => 
                lostItem.descricao.toLowerCase() === foundItem.descricao.toLowerCase() && 
                lostItem.categoria.toLowerCase() === foundItem.categoria.toLowerCase() &&
                lostItem.localizacao_perdido.toLowerCase() === foundItem.localizacao_achado.toLowerCase()
            )
             // If a match is found, push the combined information to the lost_and_found_items array
        if (foundMatch) {
            lost_and_found_items.push({
                ...lostItem,
                encontrado: true,
                foundItem: foundMatch // Save the entire found item object, or just the relevant info
            });
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
        let totalFound = resultObjectsFound.rows.length;
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
                lostToFoundRatio,
                averageTimeToFind: averageTimeToFind.toFixed(2) + ' days' // Rounded to two decimal places
            }
        });
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).send('Internal server error while retrieving data.');
    }
});


module.exports = router;