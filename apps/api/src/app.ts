import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { agencyRouter } from "./modules/agencies/agency.routes.js";
import { tenantRouter } from "./modules/tenants/tenant.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { reportingNinjaRouter } from "./modules/integrations/reportingNinja.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/agencies", agencyRouter);
app.use("/api/tenants", tenantRouter);
app.use("/api/users", userRouter);
app.use("/api/integrations/reporting-ninja", reportingNinjaRouter);

app.use(notFoundHandler);
app.use(errorHandler);
