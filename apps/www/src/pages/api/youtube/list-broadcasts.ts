import { NextApiRequest, NextApiResponse } from "next";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Please set it in your environment."
  );
}

if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
  throw new Error(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Please set it in your environment."
  );
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "GOOGLE_CLIENT_SECRET is not set. Please set it in your environment."
  );
}

if (!process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI) {
  throw new Error(
    "NEXT_PUBLIC_GOOGLE_REDIRECT_URI is not set. Please set it in your environment."
  );
}

// const db = getDb();
// const userDao = new UserDao(db);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  // if (!token) {
  //   return res.status(400).send("Unable to decode token");
  // }
  // if (!token.sub) {
  //   return res.status(400).send("No user id found in token");
  // }
  // const user = await userDao.getUser(token.sub);

  // if (!user) {
  //   return res.status(400).send("No user found for id");
  // }

  // const oauth2Client = new google.auth.OAuth2(
  //   process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  //   process.env.GOOGLE_CLIENT_SECRET,
  //   process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  // );

  // const youtube = google.youtube({
  //   version: "v3",
  //   auth: oauth2Client,
  // });
  // oauth2Client.setCredentials({
  //   refresh_token: user.refreshToken,
  // });

  // const response = await youtube.liveBroadcasts.list({
  //   part: ["snippet", "contentDetails", "status"],
  //   broadcastStatus: "active",
  //   broadcastType: "all",
  // });

  // if (response.status !== 200) {
  //   return res.status(400).send("Unable to get live broadcasts");
  // }
  // res.status(200).json(response.data);
  res.status(200).json({});
}
