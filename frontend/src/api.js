import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api', // Cambia si tu backend usa otro puerto
});

export default API;
