import "reflect-metadata";
import * as dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: "http://localhost:3000" });
  await app.listen(3333);
}
bootstrap();
