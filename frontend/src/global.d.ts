export {};

declare global {
    interface Window {
        APP_CONFIG: {
            API_BASE_URL: string;
        };
    }
}
