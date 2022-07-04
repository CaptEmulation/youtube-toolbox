if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
  throw new Error(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Please set it in your environment."
  );
}

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "GOOGLE_CLIENT_SECRET is not set. Please set it in your environment."
  );
}

export const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI) {
  throw new Error(
    "NEXT_PUBLIC_GOOGLE_REDIRECT_URI is not set. Please set it in your environment."
  );
}

export const googleRedirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
