import fetch from "node-fetch";
import { IUser } from "@youtube-toolbox/models";

export function fetchCreateOrUpdateUser(user: IUser): Promise<void> {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user.toJson()),
  })
    .then((res) => res.json())
    .then((res) => UserModel.fromJson(res));
}
