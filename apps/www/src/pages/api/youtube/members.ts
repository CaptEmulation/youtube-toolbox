import { NextApiRequest, NextApiResponse } from "next";

// https://www.googleapis.com/youtube/v3/members
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Please set it in your environment."
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  // if (!token) {
  //   return res.status(400).send("Unable to decode token");
  // }
  // console.log(JSON.stringify(token, null, 2));
  // const { accessToken } = token;
  // if (!accessToken) {
  //   return res.status(400).send("No access token found");
  // }
  // const response = await fetch(
  //   `https://www.googleapis.com/youtube/v3/members?part=snippet`,
  //   {
  //     headers: {
  //       Authorization: `Bearer ${accessToken}`,
  //     },
  //   }
  // );
  // const data = await response.json();
  // res.status(200).json(data);
  res.status(200).json({});
}
