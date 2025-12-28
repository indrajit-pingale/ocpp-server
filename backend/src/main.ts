import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WSGateway } from "./ocpp/ws-gateway";
import { OcppService } from "./ocpp/ocpp.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // start WebSocket gateway for OCPP devices
  const ocppService = app.get(OcppService);
  const ws = new WSGateway(ocppService);
  ws.start();

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Backend listening on http://0.0.0.0:${port}`);
}

bootstrap();
