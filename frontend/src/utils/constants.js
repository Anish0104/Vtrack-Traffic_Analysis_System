export const APP_NAME = "Vtrack Analytics";
export const GRADIO_SERVER = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:7860");
