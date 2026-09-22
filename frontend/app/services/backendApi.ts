import axios from "axios";

const BACKEND_URL = "https://study-buddy-yag3.onrender.com";

export const backendApi = axios.create({
    baseURL: BACKEND_URL
});

export { BACKEND_URL };