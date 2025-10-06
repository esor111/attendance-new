import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe, VersioningType } from "@nestjs/common";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  
  app.setGlobalPrefix("kattendance/api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });


  const config = new DocumentBuilder()
    .setTitle("KAHA-ATTENDANCE")
    .setDescription("KAHA")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("kattendance/api/v1/docs", app, document);

  await app.listen(3013, () => {
    console.log(`Attendance Server: http://localhost:3013`);
    console.log(`Docs: http://localhost:3013/kattendance/api/v1/docs`);
  });
}
bootstrap();