import axios from "axios";

let axiosInstance = axios.create();

export const setupAxios = () => {
  const baseURL = window.APP_CONFIG?.API_BASE_URL ?? "";
  console.log("✅ axios baseURL 설정:", baseURL);

  axiosInstance = axios.create({
    baseURL,
  });
};

export default () => axiosInstance;
