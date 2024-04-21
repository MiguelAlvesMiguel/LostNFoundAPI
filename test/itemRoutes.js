const request = require('supertest');
const app = require('../app');
const pool = require('../db');
const { expect } = require('chai');

describe('Item Routes', () => {
  let authToken;
  let lostItemId;
  let foundItemId;
  
 before(async () => {
    // Authenticate and retrieve the auth token before running the tests
    const response = await request(app)
      .post('/users/login')
      .send({ email: 'testuserr@example.com', password: 'Password123' });
      authToken = response.body['user']['stsTokenManager']['accessToken'];
  });

  after(async () => {
    // Close the database connection after all tests are done
    await pool.end();
  });
  describe('POST /items/lost', () => {
    it('should register a lost item', async () => {
      const response = await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Lost Watch',
          categoria: 'Accessories',
          data_perdido: '2023-06-01',
          localizacao_perdido: { latitude: 40.7128, longitude: -74.0060 },
          ativo: true,
        });

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Lost item registered successfully');
      lostItemId = response.body.itemId;
    });

    it('should return an error for invalid input', async () => {
      const response = await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: '',
          categoria: 'Accessories',
          data_perdido: '2023-06-01',
          localizacao_perdido: { latitude: 40.7128, longitude: -74.0060 },
          ativo: true,
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.exist;
    });
  });

  describe('PUT /items/lost/:itemId', () => {
    it('should update the details of a lost item', async () => {
      const response = await request(app)
        .put(`/items/lost/${lostItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Updated Lost Watch',
          categoria: 'Accessories',
          data_perdido: '2023-06-02',
          localizacao_perdido: { latitude: 40.7128, longitude: -74.0060 },
          ativo: true,
        });

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Lost item details updated');
    });

    it('should return an error for invalid item ID', async () => {
      const response = await request(app)
        .put('/items/lost/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Updated Lost Watch',
          categoria: 'Accessories',
          data_perdido: '2023-06-02',
          localizacao_perdido: { latitude: 40.7128, longitude: -74.0060 },
          ativo: true,
        });

      expect(response.status).to.equal(404);
      expect(response.body.error).to.equal('Item not found or not authorized');
    });
  });

  describe('DELETE /items/lost/:itemId', () => {
    it('should remove a lost item', async () => {
      const response = await request(app)
        .delete(`/items/lost/${lostItemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(204);
    });

    it('should return an error for invalid item ID', async () => {
      const response = await request(app)
        .delete('/items/lost/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.error).to.equal('Item not found or not authorized');
    });
  });

  describe('GET /items/lost/search', () => {
    it('should search lost items by description', async () => {
      const response = await request(app)
        .get('/items/lost/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ description: 'Lost' });

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });

    it('should search lost items by category', async () => {
      const response = await request(app)
        .get('/items/lost/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'Electronics' });

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });
  });

  describe('GET /items/compare/:lostItemId/:foundItemId', () => {
    it('should compare a lost item with a found item', async () => {
      // Retrieve the IDs of existing lost and found items from the database
      const lostItemResult = await pool.query('SELECT ID FROM ObjetoPerdido LIMIT 1');
      const foundItemResult = await pool.query('SELECT ID FROM ObjetoAchado LIMIT 1');
      

      lostItemId = lostItemResult.rows[0].id;
      foundItemId = foundItemResult.rows[0].id;

      const response = await request(app)
        .get(`/items/compare/${lostItemId}/${foundItemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.similarities).to.exist;
      expect(response.body.differences).to.exist;
    });

    it('should return an error for invalid item IDs', async () => {
      const response = await request(app)
        .get('/items/compare/999/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Item not found or not authorized');
    });
  });
  describe('GET /items/found', () => {
    it('should search for found items', async () => {
      const response = await request(app)
        .get('/items/found')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ description: 'Found' });

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });
  });

  describe('GET /items/lost/:itemId/history', () => {
    it('should view the history of a lost item', async () => {
      const response = await request(app)
        .get(`/items/lost/${lostItemId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      //Print lostItemId
      console.log("lostItemid:"+ lostItemId);
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });

    it('should return an error for invalid item ID', async () => {
      const response = await request(app)
        .get('/items/lost/999/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.error).to.equal('Item not found or not authorized');
    });
  });

  describe('POST /items/found/:itemId/deliver', () => {
    it('should register delivery of a found item to its owner', async () => {
      // Ensure that `authToken` belongs to a valid police officer user
      const response = await request(app)
        .post(`/items/found/${foundItemId}/deliver`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ownerId: 'user-12345',
          deliveryDate: '2023-06-10',
        });
    
      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Found item delivery registered');
    });
    
    it('should return an error for invalid item ID', async () => {
      const response = await request(app)
        .post('/items/found/999/deliver')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ownerId: 'user-12345',
          deliveryDate: '2023-06-10',
        });
    
      expect(response.status).to.equal(404);
      expect(response.body.error).to.equal('Item not found');
    });
  });
});