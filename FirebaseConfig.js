const { initializeApp } = require('firebase/app');

// firebaseConfig.js
const firebaseConfig = {
    apiKey: "AIzaSyDIh_SSraDjx4BJ0vL8nNxiXhY95nmV0MU",
    authDomain: "reclaim-417720.firebaseapp.com",
    projectId: "reclaim-417720",
    storageBucket: "reclaim-417720.appspot.com",
    messagingSenderId: "189016684161",
    appId: "1:189016684161:web:4199fe632fde500d67bf80",
    measurementId: "G-K4RCJMN633"
  };
  

  const firebaseApp = initializeApp(firebaseConfig);
  
  module.exports = firebaseApp;