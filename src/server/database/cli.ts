#!/usr/bin/env bun

import {
  getPendingMigrations,
  rollbackLastMigration,
  runMigrations,
} from "./migrate";

const command = process.argv[2];

switch (command) {
  case "up":
    await runMigrations();
    break;

  case "status": {
    const pending = await getPendingMigrations();
    if (pending.length === 0) {
      console.log("All migrations are up to date");
    } else {
      console.log(`Pending migrations: ${pending.length}`);
      for (const migration of pending) {
        console.log(`  - ${migration}`);
      }
    }
    break;
  }

  case "down":
    await rollbackLastMigration();
    break;

  default:
    console.log("Available commands:");
    console.log("  up     - Run pending migrations");
    console.log("  status - Show migration status");
    console.log("  down   - Rollback the last migration");
    break;
}
