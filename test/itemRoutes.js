const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');
const pool = require('../db');

describe('Item Endpoints', () => {
  let authToken;

  before(async () => {
    // Authenticate and retrieve the auth token before running the tests
    const response = await request(app)
      .post('/users/login')
      .send({ email: 'testuserr@example.com', password: 'Password123' });
      authToken = response.body['user']['stsTokenManager']['accessToken'];
  });

  after(async () => {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    // Clean up the test data from the database after running the tests
    await pool.end();
  });

  describe('POST /items/lost', function () {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    it('should register a lost item', async () => {
      const response = await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Test item',
          categoria: 'Test category',
          data_perdido: '2023-06-09',
          localizacao_perdido: { latitude: 10.123456, longitude: -10.123456 },
          ativo: true,
        });

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Lost item registered successfully');
    });

    it('should return an error for invalid input data', async () => {
      const response = await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: '',
          categoria: '',
          data_perdido: '',
          localizacao_perdido: {},
          ativo: null,
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid input data');
    });
  });

  describe('PUT /items/lost/:itemId', function () {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    it('should update a lost item', async () => {
      // First, create a lost item to update
      const createResponse = await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Test item',
          categoria: 'Test category',
          data_perdido: '2023-06-09',
          localizacao_perdido: { latitude: 10.123456, longitude: -10.123456 },
          ativo: true,
        });
      const itemId = createResponse.body.itemId;

      // Then, update the lost item
      const updateResponse = await request(app)
        .put(`/items/lost/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Updated item',
          categoria: 'Updated category',
          data_perdido: '2023-06-10',
          localizacao_perdido: { latitude: 11.123456, longitude: -11.123456 },
          ativo: false,
        });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.message).to.equal('Lost item details updated');
    });

    it('should return an error for invalid item ID', async () => {
      const response = await request(app)
        .put('/items/lost/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Updated item',
          categoria: 'Updated category',
          data_perdido: '2023-06-10',
          localizacao_perdido: { latitude: 11.123456, longitude: -11.123456 },
          ativo: false,
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid item ID');
    });
  });

  describe('DELETE /items/lost/:itemId', function () {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    it('should remove a lost item', async () => {
      // First, create a lost item to remove
      const createResponse = await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Test item',
          categoria: 'Test category',
          data_perdido: '2023-06-09',
          localizacao_perdido: { latitude: 10.123456, longitude: -10.123456 },
          ativo: true,
        });
      const itemId = createResponse.body.itemId;

      // Then, remove the lost item
      const deleteResponse = await request(app)
        .delete(`/items/lost/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).to.equal(204);
    });

    it('should return an error for invalid item ID', async () => {
      const response = await request(app)
        .delete('/items/lost/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid item ID');
    });
  });

  describe('GET /items/lost/search', function () {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    it('should search lost items by description', async () => {
      // First, create some lost items
      await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Test item 1',
          categoria: 'Test category',
          data_perdido: '2023-06-09',
          localizacao_perdido: { latitude: 10.123456, longitude: -10.123456 },
          ativo: true,
        });
      await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Test item 2',
          categoria: 'Test category',
          data_perdido: '2023-06-09',
          localizacao_perdido: { latitude: 10.123456, longitude: -10.123456 },
          ativo: true,
        });

      // Then, search for lost items by description
      const response = await request(app)
        .get('/items/lost/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ description: 'Test item' });

      expect(response.status).to.equal(200);
      expect(response.body.length).to.be.greaterThan(0);
    });

    it('should return an error for missing description parameter', async () => {
      const response = await request(app)
        .get('/items/lost/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Description parameter is required');
    });
  });

  describe('GET /items/lost/category', function () {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    it('should search lost items by category', async () => {
      // First, create some lost items
      await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Test item 1',
          categoria: 'Category 1',
          data_perdido: '2023-06-09',
          localizacao_perdido: { latitude: 10.123456, longitude: -10.123456 },
          ativo: true,
        });
      await request(app)
        .post('/items/lost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          descricao: 'Test item 2',
          categoria: 'Category 2',
          data_perdido: '2023-06-09',
          localizacao_perdido: { latitude: 10.123456, longitude: -10.123456 },
          ativo: true,
        });

      // Then, search for lost items by category
      const response = await request(app)
        .get('/items/lost/category')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'Category' });

      expect(response.status).to.equal(200);
      expect(response.body.length).to.be.greaterThan(0);
    });

    it('should return an error for missing category parameter', async () => {
      const response = await request(app)
        .get('/items/lost/category/')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Category parameter is required');
    });
  });

  describe('GET /items/compare/:lostItemId/:foundItemId', function () {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    it('should compare a lost item with a found item', async () => {
      // First, create a lost item and a found item
      const lostItemResult = await pool.query('SELECT ID FROM ObjetoPerdido LIMIT 1');
      const foundItemResult = await pool.query('SELECT ID FROM ObjetoAchado LIMIT 1');
      
      lostItemId = lostItemResult.rows[0].id;
      foundItemId = foundItemResult.rows[0].id;
      // Then, compare the lost item with the found item
      const compareResponse = await request(app)
        .get(`/items/compare/${lostItemId}/${foundItemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(compareResponse.status).to.equal(200);
      expect(compareResponse.body).to.have.property('similarities');
      expect(compareResponse.body).to.have.property('differences');
    });

    it('should return an error for invalid item IDs', async () => {
      const response = await request(app)
        .get('/items/compare/invalid-id/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid item IDs');
    });
  });

  describe('GET /items/found', function () {
    this.timeout(5000); // Increase the timeout to 5000ms for this test suite
    it('should search for found items', async () => {
  
      // Then, search for found items
      const response = await request(app)
        .get('/items/found')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ description: 'Found' });

      expect(response.status).to.equal(200);
      expect(response.body.length).to.be.greaterThan(0);
    });

    it('should return an error for missing description parameter', async () => {
      const response = await request(app)
        .get('/items/found')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Description parameter is required');
    });
  });

// describe('POST /items/found/:itemId/deliver', function () {
//   this.timeout(5000); // Increase the timeout to 5000ms for this test suite
//   it('should register delivery of a found item to its owner', async () => {
//     // First, create a found item and an owner
//     const createFoundResponse = await request(app)
//       .post('/items/found')
//       .set('Authorization', `Bearer ${authToken}`)
//       .send({
//         descricao: 'Found item',
//         categoria: 'Test category',
//         data_achado: '2023-06-10',
//         localizacao_achado: { latitude: 11.123456, longitude: -11.123456 },
//         ativo: true,
//       });
//     const foundItemId = createFoundResponse.body.itemId;
//
//     const createOwnerResponse = await request(app)
//       .post('/users/owners')
//       .set('Authorization', `Bearer ${authToken}`)
//       .send({
//         nome: 'Test Owner',
//         email: 'owner@example.com',
//         telefone: '1234567890',
//       });
//     const ownerId = createOwnerResponse.body.ownerId;
//
//     // Then, register the delivery of the found item to its owner
//     const deliverResponse = await request(app)
//       .post(`/items/found/${foundItemId}/deliver`)
//       .set('Authorization', `Bearer ${authToken}`)
//       .send({
//         ownerId: ownerId,
//         deliveryDate: '2023-06-11',
//       });
//
//     expect(deliverResponse.status).to.equal(200);
//     expect(deliverResponse.body.message).to.equal('Found item delivery registered');
//   });
//
//    it('should return an error for invalid item or owner ID', async () => {
//      const response = await request(app)
//        .post('/items/found/invalid-id/deliver')
//        .set('Authorization', `Bearer ${authToken}`)
//        .send({
//          ownerId: 'invalid-id',
//          deliveryDate: '2023-06-11',
//        });
//
//      expect(response.status).to.equal(400);
//      expect(response.body.error).to.equal('Invalid item or owner ID');
//    });
//  });
});