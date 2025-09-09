-- CreateTable
CREATE TABLE "Property" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "title" TEXT,
    "titleImageFull" TEXT,
    "titleImageThumb" TEXT,
    "propertyType" TEXT,
    "status" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" REAL,
    "parkingSpaces" INTEGER,
    "lotSize" REAL,
    "constructionSize" REAL,
    "brokerName" TEXT,
    "locationText" TEXT,
    "operationsJson" TEXT,
    "propertyImagesJson" TEXT,
    "ebDetailJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MediaObject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "filename" TEXT,
    "propertyId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaObject_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "propertyId" INTEGER,
    "propertyPublicId" TEXT,
    "campaignId" TEXT,
    "adsetId" TEXT,
    "adId" TEXT,
    "fbclid" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "pagePath" TEXT,
    "referrer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EgoContact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "personId" TEXT,
    "name" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdText" TEXT,
    "createdAtEgo" DATETIME,
    "responsible" TEXT,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_publicId_key" ON "Property"("publicId");

-- CreateIndex
CREATE INDEX "Property_publicId_idx" ON "Property"("publicId");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "MediaObject_key_key" ON "MediaObject"("key");

-- CreateIndex
CREATE INDEX "MediaObject_propertyId_idx" ON "MediaObject"("propertyId");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_propertyId_idx" ON "Lead"("propertyId");

-- CreateIndex
CREATE INDEX "Lead_utm_source_utm_campaign_idx" ON "Lead"("utm_source", "utm_campaign");

-- CreateIndex
CREATE INDEX "EgoContact_personId_idx" ON "EgoContact"("personId");

-- CreateIndex
CREATE INDEX "EgoContact_email_idx" ON "EgoContact"("email");

-- CreateIndex
CREATE INDEX "EgoContact_phone_idx" ON "EgoContact"("phone");

