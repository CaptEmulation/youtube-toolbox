import express from "express";
import { createSocket } from "./socket/create";

const app = express();
const { io, server, broadcast } = createSocket(app);
