declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      EMAIL_USER: string;
      EMAIL_PASS: string;
      JWT_SECRET: string;
      PORT: string;
    }
  }
}

export {}; 