# How NestJS Works — From `pnpm run start:dev` to a Live Request

> A complete walkthrough of what happens internally when you start the dev server and a request hits the app.

---

## Table of Contents

1. [Phase 1 — pnpm run start:dev](#phase-1--pnpm-run-startdev)
2. [Phase 2 — NestJS CLI Takes Over](#phase-2--nestjs-cli-takes-over)
3. [Phase 3 — TypeScript Compilation](#phase-3--typescript-compilation)
4. [Phase 4 — Node.js Runs dist/main.js](#phase-4--nodejs-runs-distmainjs)
5. [Phase 5 — IoC Container Boots](#phase-5--ioc-container-boots)
6. [Phase 6 — HTTP Server Starts Listening](#phase-6--http-server-starts-listening)
7. [Phase 7 — A Request Comes In](#phase-7--a-request-comes-in)
8. [Phase 8 — Watch Mode](#phase-8--watch-mode)
9. [Full Picture Diagram](#full-picture-diagram)

---

## Phase 1 — `pnpm run start:dev`

`pnpm` reads `package.json` and finds:

```json
"start:dev": "nest start --watch"
```

It hands off to the **NestJS CLI** (`nest` binary inside `node_modules/.bin/`).

---

## Phase 2 — NestJS CLI Takes Over

The CLI reads `nest-cli.json`:

```json
{
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

This tells it:
- Source code lives in `src/`
- Before every build, **delete the old `dist/` folder** completely (clean build)

It then spins up the **TypeScript compiler** in watch mode using settings from `tsconfig.json`.

---

## Phase 3 — TypeScript Compilation

`tsconfig.json` controls how your `.ts` files are compiled to `.js`.

| Setting | What it does |
|---------|-------------|
| `"target": "ES2023"` | Compiles TypeScript down to modern JavaScript |
| `"module": "nodenext"` | Uses Node.js native ES module system |
| `"outDir": "./dist"` | Compiled `.js` files are written into the `dist/` folder |
| `"emitDecoratorMetadata": true` | Makes decorators like `@Injectable()`, `@Controller()` work at runtime — critical for NestJS |
| `"experimentalDecorators": true` | Enables the `@` decorator syntax |
| `"sourceMap": true` | Error stack traces point to your `.ts` source files, not compiled `.js` |
| `"incremental": true` | Only recompiles changed files — faster rebuilds in watch mode |
| `"removeComments": true` | Strips all comments from compiled output |

After compilation, `dist/` contains:

```
dist/
├── main.js
├── app.module.js
├── app.controller.js
└── app.service.js
```

---

## Phase 4 — Node.js Runs `dist/main.js`

The CLI runs:

```
node dist/main.js
```

This executes your compiled `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

`bootstrap()` is called. Everything that follows happens inside this async function.

---

## Phase 5 — IoC Container Boots

`NestFactory.create(AppModule)` is the most important step.

NestJS builds its **IoC (Inversion of Control) container** — a registry of all your classes and their dependencies. It starts by reading `AppModule`:

```typescript
// src/app.module.ts
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

The `@Module` decorator tells NestJS:

| Property | What it means |
|----------|--------------|
| `imports: []` | No external modules needed |
| `controllers: [AppController]` | Register this controller to handle HTTP routes |
| `providers: [AppService]` | Register this as an injectable service |

NestJS then:
1. Instantiates `AppService` first (no dependencies, created directly)
2. Instantiates `AppController` and **automatically injects** `AppService` into its constructor
3. Registers all routes from `AppController` with the HTTP router

```typescript
// src/app.controller.ts
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //          NestJS sees this and injects AppService automatically
  //          You never call new AppService() yourself

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

This automatic injection is called **Dependency Injection (DI)** — one of the core concepts of NestJS.

---

## Phase 6 — HTTP Server Starts Listening

```typescript
await app.listen(process.env.PORT ?? 3000);
```

- Checks the `PORT` environment variable
- Falls back to port `3000` if not set
- Starts an **Express HTTP server** under the hood (`@nestjs/platform-express`)
- Server is now live and waiting for incoming requests

Terminal output:
```
[Nest] LOG  Application is running on: http://[::1]:3000
```

---

## Phase 7 — A Request Comes In

Full journey of `GET http://localhost:3000/`:

```
Browser / Postman / curl
         ↓
  HTTP Request: GET /
         ↓
  Express HTTP Server (inside NestJS)
         ↓
  NestJS Router — matches GET / → AppController.getHello()
         ↓
  AppController.getHello() is called
         ↓
  Calls this.appService.getHello()
         ↓
  AppService.getHello() returns "Hello World!"
         ↓
  NestJS sends HTTP 200 response
  Body: "Hello World!"
         ↓
  Browser / Postman receives the response
```

The service:

```typescript
// src/app.service.ts
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

---

## Phase 8 — Watch Mode

Because you ran `start:dev` (with the `--watch` flag), the TypeScript compiler keeps running in the background watching the `src/` folder.

Every time you **save any `.ts` file**:

```
You save a file
      ↓
TypeScript detects the change (incremental — only changed file recompiles)
      ↓
Updated .js written to dist/
      ↓
NestJS CLI kills the current Node.js process
      ↓
Starts a fresh Node.js process with the updated dist/main.js
      ↓
Server is back up in under a second
```

This is your live-reload development loop.

---

## Full Picture Diagram

```
pnpm run start:dev
        ↓
  nest start --watch                ← NestJS CLI picks up the command
        ↓
  Read nest-cli.json                ← sourceRoot: src, deleteOutDir: true
        ↓
  Delete old dist/                  ← clean build
        ↓
  TypeScript compiler (tsc)         ← compiles src/*.ts → dist/*.js
        ↓
  node dist/main.js                 ← Node.js starts the app
        ↓
  bootstrap() runs
        ↓
  NestFactory.create(AppModule)
        ↓
  IoC Container builds:
    ├── AppService    → new AppService() created
    ├── AppController → new AppController(appService) created
    └── GET /         → route registered in Express router
        ↓
  Express HTTP server listens on :3000
        ↓
  [watch mode active]
  You save a file → recompile → auto-restart → back up in < 1s
        ↓
  Incoming request: GET /
        ↓
  Express → NestJS Router → AppController → AppService → Response
```

---

## Key Concepts Summary

| Concept | What it means in NestJS |
|---------|------------------------|
| **Module** | A logical group of controllers and services. Every app has at least `AppModule` as the root. |
| **Controller** | Handles incoming HTTP requests and returns responses. Decorated with `@Controller()`. |
| **Service** | Contains business logic. Decorated with `@Injectable()`. Never handles HTTP directly. |
| **Provider** | Any class registered in a module's `providers` array. Services are the most common type. |
| **Dependency Injection** | NestJS automatically creates and passes dependencies — you declare what you need, NestJS provides it. |
| **IoC Container** | NestJS's internal registry that manages all class instances and their lifetimes. |
| **Decorator** | The `@` syntax (`@Module`, `@Controller`, `@Get`, `@Injectable`) — metadata that NestJS reads to wire everything together. |

---

*As we add more modules (auth, restaurant, inventory etc.), this same boot process applies — NestJS reads each module, builds the dependency tree, and registers all routes automatically.*
