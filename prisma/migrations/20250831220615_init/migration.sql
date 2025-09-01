-- CreateTable
CREATE TABLE "Lore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "biome" TEXT NOT NULL,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Lore_content_key" ON "Lore"("content");
